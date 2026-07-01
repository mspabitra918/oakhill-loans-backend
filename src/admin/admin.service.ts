import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcryptjs';
import { Admin } from './models/admin.model';
import { Role } from '../common/constants';

const SALT_ROUNDS = 10;

@Injectable()
export class AdminService {
  constructor(@InjectModel(Admin) private readonly adminModel: typeof Admin) {}

  findByEmail(email: string): Promise<Admin | null> {
    return this.adminModel.findOne({ where: { email } });
  }

  /** Constant-time bcrypt comparison of a plaintext password against a hash. */
  verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /**
   * Creates an admin/underwriter, hashing the password before persistence.
   * Used by the seeder to bootstrap the first admin and by any future
   * admin-management endpoint.
   */
  async create(params: {
    name: string;
    email: string;
    password: string;
    role?: Role;
  }): Promise<Admin> {
    const existing = await this.findByEmail(params.email);
    if (existing) {
      throw new BadRequestException('An admin with this email already exists.');
    }
    const passwordHash = await bcrypt.hash(params.password, SALT_ROUNDS);
    return this.adminModel.create({
      name: params.name,
      email: params.email,
      passwordHash,
      role: params.role ?? Role.ADMIN,
    } as Partial<Admin>);
  }
}
