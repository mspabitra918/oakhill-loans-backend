import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'audit_logs', timestamps: false })
export class AuditLog extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING(255) })
  declare actor: string;

  @Column({ type: DataType.STRING(100) })
  declare action: string;

  @Column({ type: DataType.STRING(100), field: 'entity_type' })
  declare entityType: string;

  @Column({ type: DataType.UUID, field: 'entity_id' })
  declare entityId: string;

  @Column({ type: DataType.JSONB })
  declare detail: Record<string, unknown>;

  @Column({ type: DataType.DATE, field: 'created_at' })
  declare createdAt: Date;
}
