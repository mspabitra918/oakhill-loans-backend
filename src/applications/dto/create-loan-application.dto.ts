import { OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { CreateApplicationDto } from './create-application.dto';
import { CreateBankDetailDto } from '../../bank-details/dto/create-bank-detail.dto';

// `userId` is generated when the user row is inserted inside the transaction,
// so the client never sends it.
export class LoanApplicationDetailsDto extends OmitType(CreateApplicationDto, [
  'userId',
] as const) {}

// `applicationId` is generated when the application row is inserted inside the
// transaction, so the client never sends it.
export class LoanBankDetailsDto extends OmitType(CreateBankDetailDto, [
  'applicationId',
] as const) {}

/**
 * Single request body for POST /applications/loan-applications. Bundles the
 * three records that are written atomically (user + application + bank).
 */
export class CreateLoanApplicationDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateUserDto)
  user!: CreateUserDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LoanApplicationDetailsDto)
  application!: LoanApplicationDetailsDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LoanBankDetailsDto)
  bank!: LoanBankDetailsDto;
}
