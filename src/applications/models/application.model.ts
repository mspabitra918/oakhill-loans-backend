import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
  HasMany,
  HasOne,
} from 'sequelize-typescript';
import { User } from '../../users/models/user.model';
import { ApplicationStatus } from '../../common/constants';
import { BankDetail } from '../../bank-details/models/bank-detail.model';
import { LoanAgreement } from './loan-agreement.model';

@Table({ tableName: 'applications', timestamps: false })
export class Application extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, field: 'user_id' })
  declare userId: string;

  @Column({ type: DataType.DECIMAL(10, 2), field: 'requested_amount' })
  declare requestedAmount: number;

  @Column({ type: DataType.INTEGER, field: 'loan_term_months' })
  declare loanTermMonths: number;

  @Column({ type: DataType.STRING, field: 'loan_purpose' })
  declare loanPurpose: string;

  @Column({ type: DataType.DECIMAL(10, 2), field: 'gross_monthly_income' })
  declare grossMonthlyIncome: number;

  @Column({ type: DataType.STRING(50), field: 'housing_status' })
  declare housingStatus: string;

  @Column({ type: DataType.DECIMAL(10, 2), field: 'monthly_housing_payment' })
  declare monthlyHousingPayment: number;

  @Column({ type: DataType.DECIMAL(10, 2), field: 'other_monthly_debts' })
  declare otherMonthlyDebts: number;

  // Populated by the Gatekeeper rules engine.
  @Column({ type: DataType.DECIMAL(5, 2), field: 'calculated_dti' })
  declare calculatedDti: number;

  @Column({ type: DataType.DECIMAL(10, 2), field: 'monthly_payment' })
  declare monthlyPayment: number;

  @Column({
    type: DataType.STRING(50),
    defaultValue: ApplicationStatus.PENDING,
  })
  declare status: string;

  @Column({ type: DataType.STRING(255), field: 'status_reason' })
  declare statusReason: string;

  @Column({ type: DataType.DATE, field: 'created_at' })
  declare createdAt: Date;

  @Column({ type: DataType.DATE, field: 'updated_at' })
  declare updatedAt: Date;

  @BelongsTo(() => User)
  declare user: User;

  @HasMany(() => BankDetail)
  declare bankDetails: BankDetail[];

  @HasOne(() => LoanAgreement)
  declare loanAgreement: LoanAgreement;
}
