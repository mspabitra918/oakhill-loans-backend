import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { Role } from '../../common/constants';

// Back-office account (admin or underwriter) for the underwriting portal.
// Separate from the User model, which represents loan applicants.
@Table({ tableName: 'admins', timestamps: false })
export class Admin extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  declare email: string;

  // bcrypt hash — never expose this in API responses.
  @Column({ type: DataType.TEXT, allowNull: false, field: 'password_hash' })
  declare passwordHash: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: Role.ADMIN,
  })
  declare role: Role;

  @Column({ type: DataType.DATE, field: 'created_at' })
  declare createdAt: Date;
}
