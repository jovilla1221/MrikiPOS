import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { WhatsAppService } from '../../integrations/whatsapp/whatsapp.service';
import { OtpType } from './auth.dto';

describe('AuthService - SEC-OTP-001 Cryptographic OTP Generator', () => {
  let authService: AuthService;
  let sentOtpCode: string | undefined;

  const mockWhatsApp = {
    sendOtp: jest.fn(async (phone: string, code: string) => {
      sentOtpCode = code;
    }),
  };

  const mockPrisma = {
    otpCode: {
      create: jest.fn().mockResolvedValue({ id: 'otp-1' }),
    },
  };

  beforeEach(async () => {
    sentOtpCode = undefined;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn() } },
        { provide: ConfigService, useValue: { getOrThrow: jest.fn() } },
        { provide: WhatsAppService, useValue: mockWhatsApp },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should generate a 6-digit string OTP code using cryptographic random generator', async () => {
    const res = await authService.sendOtp({ phone: '081234567890', type: OtpType.REGISTER });

    expect(res.otp_sent).toBe(true);
    expect(sentOtpCode).toBeDefined();
    expect(typeof sentOtpCode).toBe('string');
    expect(sentOtpCode?.length).toBe(6);

    const numericCode = parseInt(sentOtpCode!, 10);
    expect(numericCode).toBeGreaterThanOrEqual(100000);
    expect(numericCode).toBeLessThan(1000000);
  });
});
