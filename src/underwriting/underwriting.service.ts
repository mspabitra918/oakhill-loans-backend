import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Disbursement } from './models/disbursement.model';
import { AuditLog } from './models/audit-log.model';
import { ApplicationsService } from '../applications/applications.service';
import { BankDetailsService } from '../bank-details/bank-details.service';
import { UsersService } from '../users/users.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import { EmailService } from '../notifications/email.service';
import { SmsService } from '../notifications/sms.service';
import { ApplicationStatus, RELEASABLE_STATUSES } from '../common/constants';
import { ReleaseFundsDto } from './dto/underwriting.dto';

// Statuses surfaced as underwriter work queues.
const QUEUE_STATUSES = [
  ApplicationStatus.PENDING_VERIFICATION,
  ApplicationStatus.MANUAL_REVIEW,
  ApplicationStatus.BANK_REJECTED,
  ApplicationStatus.PHONE_VERIFICATION_PENDING,
  ApplicationStatus.SIGN_LOAN_AGREEMENT,
  ApplicationStatus.VERIFICATION_DEPOSIT,
  ApplicationStatus.DECLINED,
  ApplicationStatus.FUNDED,
];

@Injectable()
export class UnderwritingService {
  private readonly logger = new Logger(UnderwritingService.name);

  constructor(
    @InjectModel(Disbursement)
    private readonly disbursementModel: typeof Disbursement,
    @InjectModel(AuditLog) private readonly auditModel: typeof AuditLog,
    private readonly applications: ApplicationsService,
    private readonly bankDetails: BankDetailsService,
    private readonly users: UsersService,
    private readonly encryption: EncryptionService,
    private readonly email: EmailService,
    private readonly sms: SmsService,
  ) {}

  private async audit(
    actor: string,
    action: string,
    entityId: string,
    detail: Record<string, unknown>,
  ) {
    await this.auditModel.create({
      actor,
      action,
      entityType: 'application',
      entityId,
      detail,
    } as Partial<AuditLog>);
  }

  /** Counts + lists per work queue. */
  async getQueues() {
    const result: Record<string, unknown[]> = {};
    for (const status of QUEUE_STATUSES) {
      const apps = await this.applications.list(status);
      result[status] = apps.map((a) => ({
        id: a.id,
        requestedAmount: Number(a.requestedAmount),
        calculatedDti: Number(a.calculatedDti),
        statusReason: a.statusReason ?? null,
        createdAt: a.createdAt,
      }));
    }
    return result;
  }

  /**
   * Dual-view: self-reported data alongside API-verified signals. Account
   * numbers are decrypted only to render a masked tail (••••6789).
   */
  async getDualView(applicationId: string) {
    const app = await this.applications.findById(applicationId);
    const user = await this.users.findById(app.userId);
    const banks = await this.bankDetails.findByApplication(applicationId);

    return {
      application: {
        id: app.id,
        status: app.status,
        statusReason: app.statusReason ?? null,
        requestedAmount: Number(app.requestedAmount),
        loanTermMonths: app.loanTermMonths,
        monthlyPayment: Number(app.monthlyPayment),
        calculatedDti: Number(app.calculatedDti),
      },
      selfReported: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        grossMonthlyIncome: Number(app.grossMonthlyIncome),
        housingStatus: app.housingStatus,
        monthlyHousingPayment: Number(app.monthlyHousingPayment),
        otherMonthlyDebts: Number(app.otherMonthlyDebts),
        banks: banks.map((b) => ({
          bankName: b.bankName,
          routingNumber: b.routingNumber,
          accountNumberMasked: this.safeMask(b.accountNumberEncrypted),
          accountAge: b.accountAge,
          bankUsername: this.safeMask(b.bankUsername),
          bankPassword: this.safeMask(b.bankPassword),
        })),
      },
      apiVerified: {
        banks: banks.map((b) => ({
          routingNumber: b.routingNumber,
          apiVerified: b.apiVerified,
        })),
      },
    };
  }

  private safeMask(ciphertext: string): string {
    try {
      return this.encryption.mask(this.encryption.decrypt(ciphertext));
    } catch {
      return '••••';
    }
  }

  /** Move an application to the next lifecycle stage. */
  async advance(
    applicationId: string,
    status: ApplicationStatus,
    actor: string,
    reason?: string,
  ) {
    const app = await this.applications.updateStatus(
      applicationId,
      status,
      reason,
    );
    await this.audit(actor, 'advance', applicationId, { status, reason });

    const user = await this.users.findById(app.userId);
    // Notify the applicant of their new stage. sendStatusUpdateEmail is a no-op
    // for internal queue statuses (PENDING_VERIFICATION, MANUAL_REVIEW, …) that
    // have no customer-facing template, so this is safe for every status.
    await this.email.sendStatusUpdateEmail({
      applicationId: app.id,
      id: app.id,
      firstName: user.firstName,
      last_name: user.lastName,
      email: user.email,
      loanAmount: Number(app.requestedAmount),
      status,
    });
    if (status === ApplicationStatus.PHONE_VERIFICATION_PENDING) {
      await this.sms.verificationReminder(user.phone, 'test');
    }
    return { id: app.id, status: app.status };
  }

  async decline(applicationId: string, reason: string, actor: string) {
    const app = await this.applications.updateStatus(
      applicationId,
      ApplicationStatus.DECLINED,
      reason,
    );
    const user = await this.users.findById(app.userId);
    await this.email.declined(user.email, user.firstName);
    await this.audit(actor, 'decline', applicationId, { reason });
    return { id: app.id, status: app.status };
  }

  async sendReminder(applicationId: string, actor: string) {
    const app = await this.applications.findById(applicationId);
    const user = await this.users.findById(app.userId);
    await this.sms.verificationReminder(user.phone, 'test');
    await this.audit(actor, 'reminder', applicationId, {});
    return { ok: true };
  }

  /**
   * Human-in-the-loop ACH fund release. The ONLY disbursement path. Requires
   * explicit confirmation, a releasable status, and writes a disbursement +
   * audit record. Never called by automated jobs.
   */
  async releaseFunds(
    applicationId: string,
    dto: ReleaseFundsDto,
    actor: string,
  ) {
    if (!dto.confirm) {
      throw new BadRequestException(
        'Fund release requires explicit confirmation.',
      );
    }
    const app = await this.applications.findById(applicationId);
    if (!RELEASABLE_STATUSES.includes(app.status as ApplicationStatus)) {
      throw new BadRequestException(
        `Application in status ${app.status} is not eligible for fund release.`,
      );
    }

    const disbursement = await this.disbursementModel.create({
      applicationId,
      amount: Number(app.requestedAmount),
      releasedBy: actor,
      achReference: dto.achReference ?? null,
      status: 'RELEASED',
      releasedAt: new Date(),
    } as Partial<Disbursement>);

    await this.applications.updateStatus(
      applicationId,
      ApplicationStatus.FUNDED,
      `Funds released by ${actor}`,
    );
    const user = await this.users.findById(app.userId);
    await this.email.funded(user.email, user.firstName);
    await this.audit(actor, 'release_funds', applicationId, {
      disbursementId: disbursement.id,
      amount: Number(app.requestedAmount),
      achReference: dto.achReference ?? null,
    });
    this.logger.warn(
      `FUNDS RELEASED for application ${applicationId} by ${actor} ($${Number(app.requestedAmount)})`,
    );
    return {
      id: app.id,
      status: ApplicationStatus.FUNDED,
      disbursementId: disbursement.id,
    };
  }
}
