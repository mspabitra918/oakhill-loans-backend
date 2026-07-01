import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { createHash } from 'crypto';
import { Application } from './models/application.model';
import { LoanAgreement } from './models/loan-agreement.model';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationStatus, HousingStatus, LOAN } from '../common/constants';
import { calculateDti, monthlyPayment } from '../common/finance';
import { UsersService } from '../users/users.service';
import { EmailService } from '../notifications/email.service';
import { CreateBankDetailDto } from 'src/bank-details/dto/create-bank-detail.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { BankDetailsService } from '../bank-details/bank-details.service';
import { TrackingService } from 'src/tracking/tracking.service';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectModel(Application) private readonly appModel: typeof Application,
    @InjectModel(LoanAgreement)
    private readonly agreementModel: typeof LoanAgreement,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => BankDetailsService))
    private readonly bankDetailsService: BankDetailsService,
    private readonly email: EmailService,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly trackingService: TrackingService,
  ) {}

  /**
   * Step 3 of the funnel. Validates the request, computes the amortized monthly
   * payment and DTI (always logged), and records the application as submitted.
   * The full Gatekeeper routing runs once bank details arrive.
   */
  // async create(dto: CreateApplicationDto): Promise<Application> {
  //   if (
  //     dto.requestedAmount < LOAN.minAmount ||
  //     dto.requestedAmount > LOAN.maxAmount
  //   ) {
  //     throw new BadRequestException(
  //       `Requested amount must be between $${LOAN.minAmount} and $${LOAN.maxAmount}.`,
  //     );
  //   }
  //   if (!LOAN.terms.includes(dto.loanTermMonths as never)) {
  //     throw new BadRequestException(
  //       `Loan term must be one of: ${LOAN.terms.join(', ')} months.`,
  //     );
  //   }

  //   const user = await this.usersService.findById(dto.userId);

  //   // OWN_PAID has no housing payment.
  //   const housingPayment =
  //     dto.housingStatus === HousingStatus.OWN_PAID
  //       ? 0
  //       : dto.monthlyHousingPayment;

  //   const payment = monthlyPayment(
  //     dto.requestedAmount,
  //     LOAN.apr,
  //     dto.loanTermMonths,
  //   );
  //   const dti = calculateDti({
  //     monthlyHousingPayment: housingPayment,
  //     otherMonthlyDebts: dto.otherMonthlyDebts,
  //     newLoanPayment: payment,
  //     grossMonthlyIncome: dto.grossMonthlyIncome,
  //   });

  //   const application = await this.appModel.create({
  //     userId: dto.userId,
  //     requestedAmount: dto.requestedAmount,
  //     loanTermMonths: dto.loanTermMonths,
  //     grossMonthlyIncome: dto.grossMonthlyIncome,
  //     housingStatus: dto.housingStatus,
  //     monthlyHousingPayment: housingPayment,
  //     otherMonthlyDebts: dto.otherMonthlyDebts,
  //     monthlyPayment: payment,
  //     calculatedDti: dti,
  //     status: ApplicationStatus.APPLICATION_SUBMITTED,
  //   } as Partial<Application>);

  //   await this.email.applicationReceived(user.email, user.firstName, user?.id);
  //   this.logger.log(
  //     `Application ${application.id} created: amount=${dto.requestedAmount} dti=${dti}% payment=${payment}`,
  //   );
  //   return application;
  // }

  async createLoanApplications(
    userDto: CreateUserDto,
    dto: Omit<CreateApplicationDto, 'userId'>,
    bankDto: Omit<CreateBankDetailDto, 'applicationId'>,
    ip: string,
  ): Promise<Application> {
    if (
      dto.requestedAmount < LOAN.minAmount ||
      dto.requestedAmount > LOAN.maxAmount
    ) {
      throw new BadRequestException(
        `Requested amount must be between $${LOAN.minAmount} and $${LOAN.maxAmount}.`,
      );
    }
    if (!LOAN.terms.includes(dto.loanTermMonths as never)) {
      throw new BadRequestException(
        `Loan term must be one of: ${LOAN.terms.join(', ')} months.`,
      );
    }

    // OWN_PAID has no housing payment.
    const housingPayment =
      dto.housingStatus === HousingStatus.OWN_PAID
        ? 0
        : dto.monthlyHousingPayment;

    const payment = monthlyPayment(
      dto.requestedAmount,
      LOAN.apr,
      dto.loanTermMonths,
    );
    const dti = calculateDti({
      monthlyHousingPayment: housingPayment,
      otherMonthlyDebts: dto.otherMonthlyDebts,
      newLoanPayment: payment,
      grossMonthlyIncome: dto.grossMonthlyIncome,
    });

    // Atomic write across the three tables (users -> applications ->
    // bank_details). If any insert throws, the transaction callback rejects,
    // Sequelize rolls back every row, and the error propagates to the caller.
    const { user, application, bank } = await this.sequelize.transaction(
      async (t) => {
        // const user = await this.usersService.create(userDto, ip, t);

        // Step 1: Find existing user
        let user = await this.usersService.findByEmailExistingUser(
          userDto.email,
          userDto.phone,
          t,
        );

        if (!user) {
          user = await this.usersService.create(userDto, ip, t);
        }

        const application = await this.appModel.create(
          {
            userId: user.id,
            requestedAmount: dto.requestedAmount,
            loanTermMonths: dto.loanTermMonths,
            loanPurpose: dto.loanPurpose,
            grossMonthlyIncome: dto.grossMonthlyIncome,
            housingStatus: dto.housingStatus,
            monthlyHousingPayment: housingPayment,
            otherMonthlyDebts: dto.otherMonthlyDebts,
            monthlyPayment: payment,
            calculatedDti: dti,
            status: ApplicationStatus.APPLICATION_SUBMITTED,
          } as Partial<Application>,
          { transaction: t },
        );

        const bank = await this.bankDetailsService.createRecord(
          { ...bankDto, applicationId: application.id },
          { userId: user.id, transaction: t },
        );

        return { user, application, bank };
      },
    );

    // Side effects run only after the commit succeeds, so we never email or
    // route an application that was rolled back.
    await this.bankDetailsService.runGatekeeper(application.id, bank.id);
    await this.email.applicationReceived(
      user.email,
      user.firstName,
      application?.id,
    );
    // await this.trackingService.applicationSubmitted({
    //   email: user.email,
    //   phone: user.phone,
    // });

    this.logger.log(
      `Application ${application.id} created: amount=${dto.requestedAmount} dti=${dti}% payment=${payment}`,
    );

    // Re-read so the returned status reflects the Gatekeeper's routing rather
    // than the stale `APPLICATION_SUBMITTED` we inserted above.
    return this.findById(application.id);
  }

  /**
   * Creates a new application + bank record for an already-existing,
   * authenticated user. Personal details are read from the stored user record
   * and are never re-collected or modified here — the returning-user flow only
   * lets the applicant change the loan and bank information.
   */
  async createLoanApplicationForExistingUser(
    userId: string,
    dto: Omit<CreateApplicationDto, 'userId'>,
    bankDto: Omit<CreateBankDetailDto, 'applicationId'>,
  ): Promise<Application> {
    if (
      dto.requestedAmount < LOAN.minAmount ||
      dto.requestedAmount > LOAN.maxAmount
    ) {
      throw new BadRequestException(
        `Requested amount must be between $${LOAN.minAmount} and $${LOAN.maxAmount}.`,
      );
    }
    if (!LOAN.terms.includes(dto.loanTermMonths as never)) {
      throw new BadRequestException(
        `Loan term must be one of: ${LOAN.terms.join(', ')} months.`,
      );
    }

    // Confirms the user exists before we open the transaction.
    const user = await this.usersService.findById(userId);

    // OWN_PAID has no housing payment.
    const housingPayment =
      dto.housingStatus === HousingStatus.OWN_PAID
        ? 0
        : dto.monthlyHousingPayment;

    const payment = monthlyPayment(
      dto.requestedAmount,
      LOAN.apr,
      dto.loanTermMonths,
    );
    const dti = calculateDti({
      monthlyHousingPayment: housingPayment,
      otherMonthlyDebts: dto.otherMonthlyDebts,
      newLoanPayment: payment,
      grossMonthlyIncome: dto.grossMonthlyIncome,
    });

    const { application, bank } = await this.sequelize.transaction(
      async (t) => {
        const application = await this.appModel.create(
          {
            userId: user.id,
            requestedAmount: dto.requestedAmount,
            loanTermMonths: dto.loanTermMonths,
            loanPurpose: dto.loanPurpose,
            grossMonthlyIncome: dto.grossMonthlyIncome,
            housingStatus: dto.housingStatus,
            monthlyHousingPayment: housingPayment,
            otherMonthlyDebts: dto.otherMonthlyDebts,
            monthlyPayment: payment,
            calculatedDti: dti,
            status: ApplicationStatus.APPLICATION_SUBMITTED,
          } as Partial<Application>,
          { transaction: t },
        );

        const bank = await this.bankDetailsService.createRecord(
          { ...bankDto, applicationId: application.id },
          { userId: user.id, transaction: t },
        );

        return { application, bank };
      },
    );

    await this.bankDetailsService.runGatekeeper(application.id, bank.id);
    await this.email.applicationReceived(
      user.email,
      user.firstName,
      application?.id,
    );

    this.logger.log(
      `Application ${application.id} created for existing user ${user.id}: amount=${dto.requestedAmount} dti=${dti}% payment=${payment}`,
    );

    return this.findById(application.id);
  }

  async findById(id: string): Promise<Application> {
    const app = await this.appModel.findByPk(id);
    if (!app) throw new NotFoundException('Application not found.');
    return app;
  }

  formatPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '').slice(0, 10);

    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    return phone;
  };

  /**
   * The most recent application for a user. Drives the customer dashboard after
   * OTP login, where we have the user's id but not a specific application id.
   */
  async findLatestByPhone(phone: string): Promise<Application> {
    // const formattedPhone = this.formatPhoneNumber(phone);

    const user = await this.usersService.findByPhone(phone);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const app = await this.appModel.findOne({
      where: { userId: user.id },
      order: [['created_at', 'DESC']],
    });

    if (!app) {
      throw new NotFoundException('No application found for this user.');
    }

    return app;
  }

  async findAllApplicationByUser(phone: string): Promise<Application[]> {
    // const formattedPhone = this.formatPhoneNumber(phone);

    const user = await this.usersService.findByPhone(phone);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.appModel.findAll({
      where: { userId: user.id },
      order: [['created_at', 'DESC']],
    });
  }

  async updateStatus(
    id: string,
    status: ApplicationStatus,
    reason?: string,
  ): Promise<Application> {
    const app = await this.findById(id);
    app.status = status;
    if (reason !== undefined) app.statusReason = reason;
    app.updatedAt = new Date();
    await app.save();
    this.logger.log(
      `Application ${id} -> ${status}${reason ? ` (${reason})` : ''}`,
    );
    return app;
  }

  async list(status?: string): Promise<Application[]> {
    return this.appModel.findAll({
      where: status ? { status } : undefined,
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Records an e-signature for the loan agreement and advances the lifecycle to
   * the verification-deposit step.
   */
  async esign(id: string, ip: string): Promise<Application> {
    const app = await this.findById(id);
    if (app.status !== ApplicationStatus.SIGN_LOAN_AGREEMENT) {
      throw new BadRequestException(
        'Application is not awaiting an e-signature.',
      );
    }
    const hash = createHash('sha256')
      .update(
        `${app.id}:${app.requestedAmount}:${LOAN.apr}:${app.loanTermMonths}`,
      )
      .digest('hex');
    await this.agreementModel.create({
      applicationId: app.id,
      documentHash: hash,
      signedAt: new Date(),
      signedIp: ip,
    } as Partial<LoanAgreement>);
    return this.updateStatus(id, ApplicationStatus.VERIFICATION_DEPOSIT);
  }
}
