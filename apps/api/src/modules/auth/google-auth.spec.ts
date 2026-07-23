import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { WhatsAppService } from '../../integrations/whatsapp/whatsapp.service';
import { GoogleAuthService } from '../../integrations/google/google-auth.service';

describe('AuthService - Google authentication', () => {
  let authService: AuthService;
  let prisma: any;
  let redis: any;
  let googleAuth: any;

  const profile = {
    sub: 'google-sub-123',
    email: 'owner@gmail.com',
    name: 'Owner Google',
    picture: 'https://example.com/photo.jpg',
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'refresh-1' }),
      },
    };
    redis = {
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn().mockResolvedValue(1),
      expireIfNotSet: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue('OK'),
    };
    googleAuth = {
      verifyCredential: jest.fn().mockResolvedValue(profile),
    };

    const config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test_access_secret_12345678901234567890';
        if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret_12345678901234567890';
        throw new Error(`Missing ${key}`);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: ConfigService, useValue: config },
        { provide: WhatsAppService, useValue: { sendOtp: jest.fn() } },
        { provide: GoogleAuthService, useValue: googleAuth },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it('returns a link request for a Google account that is not known yet', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const result = await authService.googleAuth({ credential: 'valid-google-token' });

    expect(result).toEqual({
      link_required: true,
      profile: {
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      },
    });
    expect(googleAuth.verifyCredential).toHaveBeenCalledWith('valid-google-token');
  });

  it('logs in an account that is already linked by google_sub', async () => {
    const linkedUser = {
      id: 'user-1',
      tenant_id: 'tenant-1',
      outlet_id: 'outlet-1',
      nama: 'Owner',
      phone: '081234567890',
      email: profile.email,
      google_sub: profile.sub,
      role: 'OWNER',
      is_active: true,
      tenant: { id: 'tenant-1' },
      outlet: { id: 'outlet-1', nama: 'Outlet Utama' },
    };
    prisma.user.findFirst.mockResolvedValue(linkedUser);
    prisma.user.update.mockResolvedValue(linkedUser);

    const result = await authService.googleAuth({ credential: 'valid-google-token' });

    expect(result.link_required).toBe(false);
    expect(result.user).toEqual(expect.objectContaining({ id: 'user-1', email: profile.email }));
    expect(result.tokens?.access_token).toBeDefined();
  });

  it('links a legacy phone/PIN account and logs it in', async () => {
    const pinHash = await bcrypt.hash('123456', 4);
    const legacyUser = {
      id: 'user-legacy',
      tenant_id: 'tenant-1',
      outlet_id: 'outlet-1',
      nama: 'Owner Lama',
      phone: '081234567890',
      email: null,
      google_sub: null,
      pin_hash: pinHash,
      role: 'OWNER',
      is_active: true,
      tenant: { id: 'tenant-1' },
      outlet: { id: 'outlet-1', nama: 'Outlet Utama' },
    };
    const linkedUser = {
      ...legacyUser,
      email: profile.email,
      google_sub: profile.sub,
    };
    prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(legacyUser);
    prisma.user.update.mockResolvedValue(linkedUser);

    const result = await authService.googleAuth({
      credential: 'valid-google-token',
      phone: '081234567890',
      pin: '123456',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-legacy' },
        data: expect.objectContaining({
          email: profile.email,
          google_sub: profile.sub,
        }),
      }),
    );
    expect(result.user).toEqual(expect.objectContaining({ id: 'user-legacy' }));
    expect(result.tokens?.refresh_token).toBeDefined();
  });
});
