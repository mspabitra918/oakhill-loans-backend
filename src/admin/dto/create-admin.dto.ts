// users/dto/create-user.dto.ts

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Role } from 'src/common/constants';

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  declare name: string;

  @IsEmail()
  declare email: string;

  @IsString()
  declare password: string;

  @IsString()
  declare role: Role;
}
