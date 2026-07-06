import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './decorators/current-user.decorator';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CreateAdminDto } from '../admin/dto/create-admin.dto';
import { AdminService } from '../admin/admin.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminService: AdminService,
  ) {}

  logger = new Logger(AuthController.name);

  @Post('admin/register')
  @UseGuards(JwtAuthGuard)
  async register(@Body() dto: CreateAdminDto) {
    try {
      return await this.adminService.create(dto);
    } catch (err) {
      console.error('Registration error:', err);
      throw err;
    }
  }

  @Post('admin/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP to email' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email' })
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    try {
      return await this.authService.sendOtp(sendOtpDto.email);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.warn(`Failed to send OTP: ${message}`, stack);

      throw error;
    }
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and login/register' })
  @ApiResponse({ status: 200, description: 'OTP verified, user logged in' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    try {
      return await this.authService.verifyOtp(
        verifyOtpDto.email,
        verifyOtpDto.otp,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to verify OTP for ${verifyOtpDto.email}: ${message}`,
      );

      throw error;
    }
  }
}
