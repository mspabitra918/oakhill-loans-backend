import { Type } from 'class-transformer';
import { IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';
import {
  LoanApplicationDetailsDto,
  LoanBankDetailsDto,
} from './create-loan-application.dto';

/**
 * Request body for POST /applications/loan-applications/existing.
 *
 * Used when a returning, authenticated user starts another loan. The user
 * already exists, so the client sends only the userId plus the new application
 * and bank details — no personal data is re-collected or changed.
 */
export class CreateExistingUserLoanApplicationDto {
  @IsUUID()
  userId!: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LoanApplicationDetailsDto)
  application!: LoanApplicationDetailsDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LoanBankDetailsDto)
  bank!: LoanBankDetailsDto;
}
