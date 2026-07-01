import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { User } from './models/user.model';
import { CreateUserDto } from './dto/create-user.dto';
import { EncryptionService } from '../common/crypto/encryption.service';
import { toE164US } from '../common/phone';

/**
 * Normalizes a date of birth to ISO `YYYY-MM-DD` for storage. Accepts both the
 * `MM/DD/YYYY` format the apply form sends and an already-normalized
 * `YYYY-MM-DD` value (so re-submitting a stored dob is idempotent). Returns
 * undefined for empty/unparseable input rather than producing a string with
 * `undefined` segments.
 */
function normalizeDob(dob?: string): string | undefined {
  if (!dob) return undefined;
  const trimmed = dob.trim();

  // Already ISO (YYYY-MM-DD): keep as-is.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // MM/DD/YYYY (or MM-DD-YYYY): reorder to ISO.
  const match = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(trimmed);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month}-${day}`;
  }

  return undefined;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Creates a user and captures TCPA consent metadata server-side. The consent
   * timestamp and IP are stamped here (not trusted from the client) for an
   * auditable record. SSN is encrypted before persistence.
   */
  async create(
    dto: CreateUserDto,
    ipAddress: string,
    transaction?: Transaction,
  ): Promise<User> {
    const formattedDob = normalizeDob(dto.dob);

    if (!dto.tcpaConsent) {
      throw new BadRequestException('TCPA consent is required to proceed.');
    }

    const existing = await this.userModel.findOne({
      where: { email: dto.email },
      transaction,
    });
    if (existing) {
      throw new BadRequestException(
        'An account with this email already exists.',
      );
    }

    return this.userModel.create(
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        // Store in E.164 so OTP login (which looks up by E.164) can find them.
        phone: toE164US(dto.phone),
        dob: formattedDob,
        address: dto?.address,
        city: dto?.city,
        state: dto?.state,
        zipCode: dto?.zipCode,
        ssnEncrypted: dto.ssn ? this.encryption.encrypt(dto.ssn) : null,
        tcpaConsent: true,
        tcpaTimestamp: new Date(),
        tcpaIpAddress: ipAddress,
      } as Partial<User>,
      { transaction },
    );
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findByPk(id);
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } });
  }
  async findByPhone(phone: string): Promise<User | null> {
    return this.userModel.findOne({ where: { phone } });
  }

  /**
   * Resolves a guest (not-logged-in) loan applicant to a user record.
   *
   * Both email and phone are checked because either can uniquely identify an
   * existing account. There are three outcomes:
   *   - both email and phone match the SAME account -> returning user, reused.
   *   - NEITHER email nor phone matches any account -> null, caller creates one.
   *   - exactly one matches (or they match two different accounts) -> we can't
   *     safely attach the application, so we reject with a 409 Conflict.
   *
   * Phone is normalized to E.164 first because that's how it's stored (see
   * `create`), otherwise a raw "(555) 123-4567" would never match.
   */
  async findByEmailExistingUser(
    email: string,
    phone: string,
    transaction?: Transaction,
  ): Promise<User | null> {
    const normalizedPhone = toE164US(phone);

    const [userByEmail, userByPhone] = await Promise.all([
      this.userModel.findOne({ where: { email }, transaction }),
      this.userModel.findOne({
        where: { phone: normalizedPhone },
        transaction,
      }),
    ]);

    // Neither exists -> brand-new applicant, caller will create the user.
    if (!userByEmail && !userByPhone) {
      return null;
    }

    // Both exist and point to the same account -> genuine returning user.
    if (userByEmail && userByPhone && userByEmail.id === userByPhone.id) {
      return userByEmail;
    }

    // Only the email is on file (phone is new or belongs to someone else).
    if (userByEmail && !userByPhone) {
      throw new ConflictException(
        'An account with this email already exists, but the phone number does not match. Please log in or use the phone number on file.',
      );
    }

    // Only the phone is on file (email is new or belongs to someone else).
    if (!userByEmail && userByPhone) {
      throw new ConflictException(
        'An account with this phone number already exists, but the email does not match. Please log in or use the email on file.',
      );
    }

    // Both exist but resolve to two different accounts.
    throw new ConflictException(
      'The email and phone number belong to different accounts. Please log in to continue.',
    );
  }
}
