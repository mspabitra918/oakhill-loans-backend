import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Admin } from './models/admin.model';
import { AdminService } from './admin.service';

@Module({
  imports: [SequelizeModule.forFeature([Admin])],
  providers: [AdminService],
  exports: [AdminService, SequelizeModule],
})
export class AdminModule {}
