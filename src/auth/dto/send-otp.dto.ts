import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    example: '+919876543210',
    description: 'Phone number with country code',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\(\d{3}\)\s\d{3}-\d{4}$/, {
    message: 'Phone number must be in the format (123) 456-7890',
  })
  declare phone: string;
}
