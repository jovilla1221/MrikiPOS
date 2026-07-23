import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { WhatsAppService } from '../../integrations/whatsapp/whatsapp.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService & JwtStrategy - SEC-AUTH-001 Revocation per jti', () => {
  let authService: AuthService;
  let jwtStrategy: JwtStrategy;
  let redisStore: Map<string, string>;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'ref-1' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'test_access_secret_12345678901234567890';
      if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret_12345678901234567890';
      return null;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'test_access_secret_12345678901234567890';
      if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret_12345678901234567890';
      throw new Error(`Config key ${key} is missing`);
    }),
  };

  const mockWhatsApp = {
    sendOtp: jest.fn(),
  };

  beforeEach(async () => {
    redisStore = new Map<string, string>();

    const mockRedis = {
      get: jest.fn(async (key: string) => redisStore.get(key) || null),
      set: jest.fn(async (key: string, val: string) => {
        redisStore.set(key, val);
        return 'OK';
      }),
      del: jest.fn(async (key: string) => {
        redisStore.delete(key);
        return 1;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtStrategy,
        JwtService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
        { provide: WhatsAppService, useValue: mockWhatsApp },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);

    jest.clearAllMocks();
  });

  it('should include jti in generated access tokens and allow access before logout', async () => {
    const fakeUser = {
      id: 'usr-1',
      tenant_id: 'tenant-1',
      outlet_id: 'outlet-1',
      role: 'OWNER',
      phone: '081234567890',
      nama: 'Test Owner',
    };

    mockPrisma.user.findFirst.mockResolvedValue(fakeUser);

    const tokens = await (authService as any).generateTokens(fakeUser);
    expect(tokens.access_token).toBeDefined();

    const jwtService = new JwtService();
    const payload = jwtService.decode(tokens.access_token) as any;
    expect(payload.jti).toBeDefined();
    expect(typeof payload.jti).toBe('string');

    // Validating payload with JwtStrategy before logout
    const result = await jwtStrategy.validate(payload);
    expect(result.id).toBe('usr-1');
  });

  it('should revoke access token on logout using jti without blocking newly logged in sessions', async () => {
    const fakeUser = {
      id: 'usr-1',
      tenant_id: 'tenant-1',
      outlet_id: 'outlet-1',
      role: 'OWNER',
      phone: '081234567890',
      nama: 'Test Owner',
    };

    mockPrisma.user.findFirst.mockResolvedValue(fakeUser);

    // Session 1: Login & get Token 1
    const tokens1 = await (authService as any).generateTokens(fakeUser);
    const jwtService = new JwtService();
    const payload1 = jwtService.decode(tokens1.access_token) as any;

    // Logout Session 1 (passing token payload / jti)
    await authService.logout(fakeUser.id, payload1.jti);

    // Token 1 should now be rejected by JwtStrategy
    await expect(jwtStrategy.validate(payload1)).rejects.toThrow(UnauthorizedException);

    // Session 2: User logs in again immediately and gets Token 2
    const tokens2 = await (authService as any).generateTokens(fakeUser);
    const payload2 = jwtService.decode(tokens2.access_token) as any;

    expect(payload2.jti).not.toEqual(payload1.jti);

    // Token 2 MUST be accepted (not blocked by previous logout!)
    const result2 = await jwtStrategy.validate(payload2);
    expect(result2.id).toBe('usr-1');
  });

  it('should reject access tokens issued before a user session revocation', async () => {
    const fakeUser = {
      id: 'usr-1',
      tenant_id: 'tenant-1',
      outlet_id: 'outlet-1',
      role: 'OWNER',
      phone: '081234567890',
      nama: 'Test Owner',
    };

    mockPrisma.user.findFirst.mockResolvedValue(fakeUser);
    const tokens = await (authService as any).generateTokens(fakeUser);
    const payload = new JwtService().decode(tokens.access_token) as any;

    redisStore.set(`revoked_after:${fakeUser.id}`, String(payload.iat + 1));

    await expect(jwtStrategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
