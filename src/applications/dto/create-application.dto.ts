import {
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { HousingStatus } from '../../common/constants';

export class CreateApplicationDto {
  @IsUUID()
  userId!: string;

  @IsNumber()
  @Min(0)
  requestedAmount!: number;

  @IsInt()
  loanTermMonths!: number;

  @IsString()
  loanPurpose!: string;

  @IsNumber()
  @Min(0)
  grossMonthlyIncome!: number;

  @IsEnum(HousingStatus)
  housingStatus!: HousingStatus;

  @IsNumber()
  @Min(0)
  monthlyHousingPayment!: number;

  @IsNumber()
  @Min(0)
  otherMonthlyDebts!: number;
}
