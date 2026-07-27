import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { ReportService } from '../../modules/report/report.service';
import { TransactionService } from '../../modules/transaction/transaction.service';
import { PrismaService } from '../prisma.service';

async function main() {
  console.log('🚀 Starting Service Benchmark for 1000+ transactions dataset...');

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const reportService = moduleRef.get<ReportService>(ReportService);
  const transactionService = moduleRef.get<TransactionService>(TransactionService);
  const prisma = moduleRef.get<PrismaService>(PrismaService);

  // Get Tenant 1 Owner
  const tenant = await prisma.tenant.findFirst({
    where: { phone: '081100000001' },
    include: { outlets: true },
  });

  if (!tenant) {
    console.error('❌ Tenant not found.');
    process.exit(1);
  }

  const tenantId = tenant.id;
  const outletId = tenant.outlets[0].id;

  const benchmarks = [
    {
      name: 'ReportService.getSales()',
      fn: () =>
        reportService.getSales(tenantId, outletId, {
          date_from: '2026-01-01T00:00:00.000Z',
          date_to: '2026-12-31T23:59:59.999Z',
        }),
    },
    {
      name: 'ReportService.exportReport(xlsx)',
      fn: () =>
        reportService.exportReport(
          {
            format: 'xlsx',
            report_type: 'sales',
            date_from: '2026-01-01T00:00:00.000Z',
            date_to: '2026-12-31T23:59:59.999Z',
          },
          tenantId,
          outletId,
        ),
    },
    {
      name: 'TransactionService.getSummary()',
      fn: () =>
        transactionService.getSummary(
          tenantId,
          outletId,
          '2026-01-01T00:00:00.000Z',
          '2026-12-31T23:59:59.999Z',
        ),
    },
  ];

  console.log('\n📊 BENCHMARK RESULTS (1000+ Transactions Dataset):');

  for (const b of benchmarks) {
    const times: number[] = [];
    // Warmup
    await b.fn();

    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      await b.fn();
      const duration = performance.now() - start;
      times.push(duration);
    }

    times.sort((a, b) => a - b);
    const p50 = times[Math.floor(times.length * 0.5)];
    const p95 = times[Math.floor(times.length * 0.95)];
    const max = times[times.length - 1];
    const avg = times.reduce((a, b) => a + b, 0) / times.length;

    console.log(`\nFeature: ${b.name}`);
    console.log(`  Count: ${times.length}`);
    console.log(`  Avg:   ${avg.toFixed(2)} ms`);
    console.log(`  p50:   ${p50.toFixed(2)} ms`);
    console.log(
      `  p95:   ${p95.toFixed(2)} ms (Budget <= 3000 ms: ${p95 <= 3000 ? '✅ PASSED' : '❌ FAILED'})`,
    );
    console.log(`  Max:   ${max.toFixed(2)} ms`);
  }

  await moduleRef.close();
}

main().catch((e) => {
  console.error('❌ Benchmark error:', e);
  process.exit(1);
});
