import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Application } from './models/application.model';
import { LoanAgreement } from './models/loan-agreement.model';
import { ApplicationsService } from './applications.service';
import { AgreementService } from './agreement.service';
import { ApplicationsController } from './applications.controller';
import { UsersModule } from '../users/users.module';
import { BankDetailsModule } from '../bank-details/bank-details.module';
import { TrackingModule } from 'src/tracking/tracking.module';
import { UploadService } from 'src/upload/upload.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Application, LoanAgreement]),
    UsersModule,
    forwardRef(() => BankDetailsModule),
    TrackingModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, AgreementService, UploadService],
  // Export the service + the Application repository so the Gatekeeper and
  // underwriting modules can reuse them.
  exports: [ApplicationsService, SequelizeModule],
})
export class ApplicationsModule {}
