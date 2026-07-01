import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApplicationStatus } from '../../common/constants';

export class AdvanceDto {
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class DeclineDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class ReleaseFundsDto {
  // Explicit human confirmation — funds never release without it.
  @IsBoolean()
  confirm!: boolean;

  @IsOptional()
  @IsString()
  achReference?: string;
}
