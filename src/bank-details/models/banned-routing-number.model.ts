import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'banned_routing_numbers', timestamps: false })
export class BannedRoutingNumber extends Model {
  @Column({
    type: DataType.STRING(9),
    primaryKey: true,
    field: 'routing_number',
  })
  declare routingNumber: string;

  @Column({ type: DataType.STRING, field: 'bank_name' })
  declare bankName: string;

  @Column({ type: DataType.STRING })
  declare reason: string;
}
