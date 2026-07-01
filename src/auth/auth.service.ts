import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AdminService } from '../admin/admin.service';
import { Role } from '../common/constants';
import { toE164US } from '../common/phone';
import { LoginDto } from './dto/login.dto';
import { Twilio } from 'twilio';

interface OtpEntry {
  otp: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  private otpStore: Map<string, OtpEntry> = new Map();
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly twilioClient: Twilio;

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly admins: AdminService,
    private readonly configService: ConfigService,
  ) {
    this.twilioClient = new Twilio(
      this.configService.get<string>('TWILIO_ACCOUNT_SID'),
      this.configService.get<string>('TWILIO_AUTH_TOKEN'),
    );
  }

  /**
   * Two paths:
   *  - Admin/underwriter: looked up in the `admins` table; the supplied password
   *    is verified against the stored bcrypt hash. The signed token carries the
   *    admin's own role (admin vs underwriter).
   *  - Customer: passwordless lookup by email (the users table has no password
   *    column). A production build would add proper credential/OTP auth.
   */
  async login(dto: LoginDto) {
    const admin = await this.admins.findByEmail(dto.email);
    if (admin) {
      if (
        !dto.password ||
        !(await this.admins.verifyPassword(dto.password, admin.passwordHash))
      ) {
        throw new UnauthorizedException('Invalid admin credentials.');
      }
      return this.sign({
        sub: admin.id,
        email: admin.email,
        role: admin.role,
      });
    }

    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('No account found for this email.');
    }
    return this.sign({
      sub: user.id,
      email: user.email,
      role: Role.CUSTOMER,
    });
  }

  private sign(payload: { sub: string; email: string; role: Role }) {
    const token = this.jwt.sign(payload);
    return { accessToken: token, ...payload };
  }

  // Generate a 6-digit OTP
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // async sendOtp(
  //   phone: string,
  // ): Promise<{ success: boolean; message: string; otp?: string }> {
  //   const twilioPhone = toE164US(phone);

  //   const user = await this.users.findByPhone(twilioPhone);

  //   if (!user) {
  //     throw new UnauthorizedException(
  //       'No account found with this phone number.',
  //     );
  //   }

  //   const otp = this.generateOtp();

  //   const expiresAt = new Date(
  //     Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
  //   );

  //   this.otpStore.set(twilioPhone, {
  //     otp,
  //     expiresAt,
  //   });

  //   try {
  //     await this.twilioClient.messages.create({
  //       body: `Your OTP is ${otp}. It is valid for ${this.OTP_EXPIRY_MINUTES} minutes.`,
  //       from: this.configService.get<string>('TWILIO_PHONE_NUMBER'),
  //       to: twilioPhone, // normalized E.164, e.g. +14155550182
  //     });

  //     return {
  //       success: true,
  //       message: 'OTP sent successfully',
  //     };
  //   } catch (error) {
  //     console.error('Twilio Error:', error);

  //     throw new Error('Failed to send OTP');
  //   }
  // }

  // // Verify OTP and login/register user
  // async verifyOtp(phone: string, otp: string) {
  //   const normalizedPhone = toE164US(phone);

  //   const otpEntry = this.otpStore.get(normalizedPhone);

  //   if (!otpEntry) {
  //     throw new BadRequestException('OTP not found. Please request a new OTP.');
  //   }

  //   if (new Date() > otpEntry.expiresAt) {
  //     this.otpStore.delete(normalizedPhone);
  //     throw new BadRequestException(
  //       'OTP has expired. Please request a new OTP.',
  //     );
  //   }

  //   if (otpEntry.otp !== otp) {
  //     throw new BadRequestException('Invalid OTP');
  //   }

  //   this.otpStore.delete(normalizedPhone);

  //   const user = await this.users.findByPhone(normalizedPhone);

  //   if (!user) {
  //     throw new UnauthorizedException(
  //       'No account found with this phone number.',
  //     );
  //   }

  //   const payload = {
  //     email: user.email,
  //     sub: user.id,
  //     role: Role.CUSTOMER,
  //   };

  //   return {
  //     access_token: this.jwt.sign(payload),
  //     user: {
  //       id: user.id,
  //       email: user.email,
  //       name: `${user.firstName} ${user.lastName ?? ''}`.trim(),
  //       phone: user.phone,
  //     },
  //   };
  // }

  async sendOtp(
    phone: string,
  ): Promise<{ success: boolean; message: string; otp?: string }> {
    // Don't normalize the phone
    console.log('Request Phone:', phone);
    const twilioPhone = toE164US(phone);

    const user = await this.users.findByPhone(twilioPhone);

    console.log('User:', user);

    if (!user) {
      throw new UnauthorizedException(
        'No account found with this phone number.',
      );
    }

    const otp = this.generateOtp();

    const expiresAt = new Date(
      Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    this.otpStore.set(twilioPhone, {
      otp,
      expiresAt,
    });

    console.log('===========================');
    console.log(`Phone: ${phone}`);
    console.log(`OTP: ${otp}`);
    console.log('===========================');

    return {
      success: true,
      message: 'OTP generated successfully',
      otp, // Remove this in production
    };
  }

  async verifyOtp(phone: string, otp: string) {
    const twilioPhone = toE164US(phone);
    const otpEntry = this.otpStore.get(twilioPhone);

    console.log('SET KEY:', twilioPhone);
    console.log(this.otpStore);

    if (!otpEntry) {
      throw new BadRequestException('OTP not found. Please request a new OTP.');
    }

    if (new Date() > otpEntry.expiresAt) {
      this.otpStore.delete(twilioPhone);
      throw new BadRequestException(
        'OTP has expired. Please request a new OTP.',
      );
    }

    if (otpEntry.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    this.otpStore.delete(twilioPhone);

    const user = await this.users.findByPhone(twilioPhone);

    if (!user) {
      throw new UnauthorizedException(
        'No account found with this phone number.',
      );
    }

    const payload = {
      email: user.email,
      sub: user.id,
      role: Role.CUSTOMER,
      phone: user.phone, // Include phone in the payload
    };

    return {
      access_token: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName ?? ''}`.trim(),
        phone: user.phone,
      },
    };
  }
}
