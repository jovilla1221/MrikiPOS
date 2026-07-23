import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface VerifiedGoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class GoogleAuthService {
  private readonly client = new OAuth2Client();

  constructor(private readonly configService: ConfigService) {}

  async verifyCredential(credential: string): Promise<VerifiedGoogleProfile> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    if (!clientId) {
      throw new ServiceUnavailableException({
        success: false,
        error: {
          code: 'GOOGLE_AUTH_NOT_CONFIGURED',
          message: 'Login Google belum dikonfigurasi oleh administrator.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new Error('Google account does not have a verified email');
      }

      return {
        sub: payload.sub,
        email: payload.email.toLowerCase(),
        name: payload.name?.trim() || payload.email.split('@')[0],
        picture: payload.picture,
      };
    } catch {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_GOOGLE_CREDENTIAL',
          message: 'Sesi Google tidak valid atau telah kedaluwarsa. Silakan coba lagi.',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
