import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import supertest from 'supertest';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ReportController } from '../src/modules/report/report.controller';
import { ReportService } from '../src/modules/report/report.service';

describe('Report export throttle (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 100,
          },
        ]),
      ],
      controllers: [ReportController],
      providers: [
        {
          provide: ReportService,
          useValue: {
            exportReport: jest.fn().mockResolvedValue({
              buffer: Buffer.from('header\nvalue'),
              contentType: 'text/csv',
              filename: 'report.csv',
            }),
          },
        },
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 on request 11 within one minute', async () => {
    const endpoint = '/v1/reports/export?format=csv&report_type=sales';

    for (let requestNumber = 1; requestNumber <= 10; requestNumber += 1) {
      await supertest(app.getHttpServer()).get(endpoint).expect(200);
    }

    await supertest(app.getHttpServer()).get(endpoint).expect(429);
  });
});
