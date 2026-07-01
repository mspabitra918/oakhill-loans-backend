import { IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  // Required for admin/underwriter; customers log in passwordless (demo).
  @IsOptional()
  @IsString()
  password?: string;
}
