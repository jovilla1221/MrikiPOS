import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { RedisService } from '../../../database/redis.service';
import { TokenPayload } from '@mrikipos/shared-types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    const secret = configService.getOrThrow<string>('JWT_ACCESS_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'], // Explicitly require HS256 to reject 'none' algorithm
    });
  }

  async validate(payload: TokenPayload) {
    const { sub: userId, tenant_id } = payload;

    // Check if user exists & is active
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenant_id: tenant_id,
        is_active: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Pengguna tidak ditemukan atau akun dinonaktifkan',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check token revocation blacklist in Redis (per-jti token revocation)
    if (payload.jti) {
      const isRevoked = await this.redis.get(`revoked_jti:${payload.jti}`);
      if (isRevoked) {
        throw new UnauthorizedException({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Sesi telah diakhiri. Silakan login kembali.',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    const revokedAfter = await this.redis.get(`revoked_after:${user.id}`);
    if (payload.iat && revokedAfter && payload.iat <= Number(revokedAfter)) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sesi telah dicabut. Silakan login kembali.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return {
      id: user.id,
      tenant_id: user.tenant_id,
      outlet_id: user.outlet_id,
      role: user.role,
      phone: user.phone,
      nama: user.nama,
      jti: payload.jti,
    };
  }
}
