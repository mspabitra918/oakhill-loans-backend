import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Disbursement } from './models/disbursement.model';
import { AuditLog } from './models/audit-log.model';
import { UnderwritingService } from './underwriting.service';
import { UnderwritingController } from './underwriting.controller';
import { ApplicationsModule } from '../applications/applications.module';
import { BankDetailsModule } from '../bank-details/bank-details.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Disbursement, AuditLog]),
    ApplicationsModule,
    BankDetailsModule,
    UsersModule,
  ],
  controllers: [UnderwritingController],
  providers: [UnderwritingService],
})
export class UnderwritingModule {}
