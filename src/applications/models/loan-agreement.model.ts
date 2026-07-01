import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Application } from './application.model';

@Table({ tableName: 'loan_agreements', timestamps: false })
export class LoanAgreement extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Application)
  @Column({ type: DataType.UUID, field: 'application_id' })
  declare applicationId: string;

  @Column({ type: DataType.STRING(128), field: 'document_hash' })
  declare documentHash: string;

  @Column({ type: DataType.DATE, field: 'signed_at' })
  declare signedAt: Date;

  @Column({ type: DataType.STRING(45), field: 'signed_ip' })
  declare signedIp: string;

  @Column({ type: DataType.DATE, field: 'created_at' })
  declare createdAt: Date;

  @BelongsTo(() => Application)
  declare application: Application;
}
