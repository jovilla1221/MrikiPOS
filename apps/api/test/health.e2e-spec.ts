/**
 * E2E Test: Health Endpoints
 * S8-03: Dasar E2E — verifikasi endpoint publik tidak membutuhkan auth
 *
 * Test ini menggunakan mock providers langsung karena HealthModule
 * tidak mengimport PrismaModule/RedisModule — sesuai G1.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { HealthModule } from '../src/modules/health/health.module';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';

describe('Health Endpoints (E2E)', () => {
  let app: INestApplication;
  let mockPrismaQueryRaw: jest.Mock;

  beforeAll(async () => {
    mockPrismaQueryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);

    const mockPrisma = {
      $queryRaw: mockPrismaQueryRaw,
    };

    const mockRedis = {
      get: jest.fn().mockResolvedValue('ok'),
      set: jest.fn().mockResolvedValue('OK'),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .useMocker((token) => {
        if (token === PrismaService) return mockPrisma;
        if (token === RedisService) return mockRedis;
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('GET /health', () => {
    it('should return status ok without auth', async () => {
      const response = await supertest(app.getHttpServer()).get('/health').expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /health/live', () => {
    it('should return alive status with uptime and memory', async () => {
      const response = await supertest(app.getHttpServer()).get('/health/live').expect(200);

      expect(response.body).toMatchObject({
        status: 'alive',
      });
      expect(response.body.uptime).toBeGreaterThan(0);
      expect(response.body.memory).toBeDefined();
      expect(response.body.memory.used_mb).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready status when DB and Redis are connected', async () => {
      mockPrismaQueryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      const response = await supertest(app.getHttpServer()).get('/health/ready').expect(200);

      expect(response.body.status).toBe('ready');
      expect(response.body.checks.database).toBe('connected');
    });

    it('should return degraded when DB is unavailable', async () => {
      mockPrismaQueryRaw.mockRejectedValueOnce(new Error('Connection refused'));

      const response = await supertest(app.getHttpServer()).get('/health/ready').expect(200);

      expect(response.body.status).toBe('degraded');
      expect(response.body.checks.database).toBe('disconnected');
    });
  });
});
