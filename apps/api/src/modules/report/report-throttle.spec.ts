/**
 * Unit Test: Report Export Throttle
 * S8-05: Verifikasi throttle dekorator terpasang di endpoint export,
 * dan report biasa tidak terpengaruh throttle khusus.
 *
 * Test ini memverifikasi bahwa @Throttle({ default: { limit: 10, ttl: 60000 } })
 * terpasang di method exportReport dan tidak terpasang di endpoint report biasa.
 */
import { Throttle } from '@nestjs/throttler';
import { ReportController } from './report.controller';

describe('ReportController Export Throttle (S8-05 G2)', () => {
  describe('Export endpoint throttle decorator', () => {
    it('exportReport method should have @Throttle decorator with limit 10 per 60s', () => {
      const throttleLimit = Reflect.getMetadata(
        'THROTTLER:LIMITdefault',
        ReportController.prototype.exportReport,
      );
      expect(throttleLimit).toBe(10);
    });

    it('getSales method should NOT have custom @Throttle decorator (uses global limit)', () => {
      const throttleLimit = Reflect.getMetadata(
        'THROTTLER:LIMITdefault',
        ReportController.prototype.getSales,
      );
      expect(throttleLimit).toBeUndefined();
    });

    it('getProfitLoss method should NOT have custom @Throttle decorator', () => {
      const throttleLimit = Reflect.getMetadata(
        'THROTTLER:LIMITdefault',
        ReportController.prototype.getProfitLoss,
      );
      expect(throttleLimit).toBeUndefined();
    });

    it('getTopProducts method should NOT have custom @Throttle decorator', () => {
      const throttleLimit = Reflect.getMetadata(
        'THROTTLER:LIMITdefault',
        ReportController.prototype.getTopProducts,
      );
      expect(throttleLimit).toBeUndefined();
    });
  });

  describe('Export throttle limit configuration', () => {
    it('export throttle limit should be 10 requests per minute (ttl=60000ms)', () => {
      const throttleLimit = Reflect.getMetadata(
        'THROTTLER:LIMITdefault',
        ReportController.prototype.exportReport,
      );
      const throttleTtl = Reflect.getMetadata(
        'THROTTLER:TTLdefault',
        ReportController.prototype.exportReport,
      );

      expect(throttleLimit).toBe(10);
      expect(throttleTtl).toBe(60000);
    });
  });
});
