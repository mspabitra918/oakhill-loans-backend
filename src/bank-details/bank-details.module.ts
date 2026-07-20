import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BankDetail } from './models/bank-detail.model';
import { BankDetailsService } from './bank-details.service';
import { BankDetailsController } from './bank-details.controller';
import { GatekeeperService } from './gatekeeper.service';
import { ApplicationsModule } from '../applications/applications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    SequelizeModule.forFeature([BankDetail]),
    UsersModule,
    forwardRef(() => ApplicationsModule),
  ],
  controllers: [BankDetailsController],
  providers: [BankDetailsService, GatekeeperService],
  exports: [BankDetailsService, GatekeeperService, SequelizeModule],
})
export class BankDetailsModule {}
