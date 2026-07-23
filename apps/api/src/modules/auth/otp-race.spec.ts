import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { WhatsAppService } from '../../integrations/whatsapp/whatsapp.service';
import { BadRequestException } from '@nestjs/common';
import { OtpType } from './auth.dto';

describe('AuthService - SEC-OTP-002 OTP Verification Concurrency', () => {
  let authService: AuthService;
  let isOtpVerified: boolean;

  const rawCode = '123456';
  let hashedCode: string;

  beforeAll(async () => {
    hashedCode = await bcrypt.hash(rawCode, 8);
  });

  beforeEach(async () => {
    isOtpVerified = false;

    const mockPrisma = {
      otpCode: {
        findFirst: jest.fn().mockImplementation(async () => {
          return {
            id: 'otp-1',
            phone: '081234567890',
            type: 'login',
            code_hash: hashedCode,
            verified: isOtpVerified,
            attempts: 0,
            expires_at: new Date(Date.now() + 300000),
          };
        }),
        updateMany: jest.fn().mockImplementation(async (params) => {
          // Simulate atomic conditional update: update ONLY IF verified: false
          if (params.where.id === 'otp-1' && params.where.verified === false && !isOtpVerified) {
            isOtpVerified = true;
            return { count: 1 };
          }
          return { count: 0 };
        }),
        update: jest.fn(),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'usr-1',
          nama: 'Test User',
          phone: '081234567890',
          role: 'OWNER',
          tenant_id: 't-1',
          outlet_id: 'o-1',
          outlet: { nama: 'Main Outlet' },
        }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rf-1' }),
      },
    };

    const mockConfig = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test_access_secret_12345678901234567890';
        if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret_12345678901234567890';
        throw new Error('missing key');
      }),
    };

    const mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
        { provide: WhatsAppService, useValue: { sendOtp: jest.fn() } },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should allow exactly 1 request to succeed and reject 9 concurrent requests when 10 requests try to verify the same OTP simultaneously', async () => {
    const promises = Array.from({ length: 10 }).map(() =>
      authService
        .verifyOtp({
          phone: '081234567890',
          code: rawCode,
          type: OtpType.LOGIN,
        })
        .then((res) => ({ status: 'fulfilled', value: res }))
        .catch((err) => ({ status: 'rejected', reason: err })),
    );

    const results = await Promise.all(promises);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(9);

    rejected.forEach((r: any) => {
      expect(r.reason).toBeInstanceOf(BadRequestException);
    });
  });
});
