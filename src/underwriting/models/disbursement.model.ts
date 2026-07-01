import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Application } from '../../applications/models/application.model';

@Table({ tableName: 'disbursements', timestamps: false })
export class Disbursement extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Application)
  @Column({ type: DataType.UUID, field: 'application_id' })
  declare applicationId: string;

  @Column({ type: DataType.DECIMAL(10, 2) })
  declare amount: number;

  @Column({ type: DataType.STRING(255), field: 'released_by' })
  declare releasedBy: string;

  @Column({ type: DataType.STRING(100), field: 'ach_reference' })
  declare achReference: string;

  @Column({ type: DataType.STRING(50), defaultValue: 'RELEASED' })
  declare status: string;

  @Column({ type: DataType.DATE, field: 'released_at' })
  declare releasedAt: Date;

  @BelongsTo(() => Application)
  declare application: Application;
}
