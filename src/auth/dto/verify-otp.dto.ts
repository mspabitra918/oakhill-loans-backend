import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\(\d{3}\)\s\d{3}-\d{4}$/, {
    message: 'Phone number must be in the format (123) 456-7890',
  })
  declare phone: string;
  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  declare otp: string;
}
