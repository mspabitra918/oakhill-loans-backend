import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class TrackingService {
  constructor(private readonly http: HttpService) {}

  private hash(value: string) {
    return crypto
      .createHash('sha256')
      .update(value.trim().toLowerCase())
      .digest('hex');
  }

  async applicationSubmitted(user: { email: string; phone: string }) {
    const pixelId = process.env.META_PIXEL_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;

    const payload = {
      data: [
        {
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          user_data: {
            em: [this.hash(user.email)],
            ph: [this.hash(user.phone)],
          },
          custom_data: {
            currency: 'USD',
            value: 1,
          },
        },
      ],
    };

    await firstValueFrom(
      this.http.post(
        `https://graph.facebook.com/v23.0/${pixelId}/events?access_token=${accessToken}`,
        payload,
      ),
    );
  }
}
