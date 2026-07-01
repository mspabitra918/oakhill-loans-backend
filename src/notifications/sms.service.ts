import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio, { Twilio } from 'twilio';

/**
 * Transactional SMS via Twilio. Runs in "log mode" when credentials are blank.
 */
@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private client: Twilio | null = null;
  private from = '';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    this.from = this.config.get<string>('TWILIO_PHONE_NUMBER') ?? '';
    if (sid && token) {
      this.client = twilio(sid, token);
    } else {
      this.logger.warn(
        'TWILIO credentials not set — SMS runs in log mode (no real sends).',
      );
    }
  }

  async send(to: string, body: string): Promise<void> {
    if (!this.client) {
      this.logger.log(`[sms:log-mode] to=${to} body="${body}"`);
      return;
    }
    try {
      await this.client.messages.create({ to, from: this.from, body });
    } catch (err) {
      this.logger.error(`Twilio send failed to ${to}: ${String(err)}`);
    }
  }

  verificationReminder(to: string, body: string) {
    return this.send(to, body);
  }
}
