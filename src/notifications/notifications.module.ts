import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

// Global so the Gatekeeper and underwriting flows can inject these anywhere.
@Global()
@Module({
  providers: [EmailService, SmsService],
  exports: [EmailService, SmsService],
})
export class NotificationsModule {}
