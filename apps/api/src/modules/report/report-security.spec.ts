import { Test, TestingModule } from '@nestjs/testing';
import { ReportService, sanitizeCsvCell } from './report.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('ReportService - SEC-REPORT-001 Report Security & CSV Sanitization', () => {
  let reportService: ReportService;

  const mockPrisma = {
    transaction: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    transactionItem: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    reportService = module.get<ReportService>(ReportService);
    jest.clearAllMocks();
  });

  describe('CSV Cell Sanitization', () => {
    it('should prefix dangerous formula injection characters with single quote', () => {
      expect(sanitizeCsvCell('=1+1')).toBe("'=1+1");
      expect(sanitizeCsvCell('+cmd|/c')).toBe("'+cmd|/c");
      expect(sanitizeCsvCell('-SUM(12)')).toBe("'-SUM(12)");
      expect(sanitizeCsvCell('@calc')).toBe("'@calc");
    });

    it('should escape double quotes and wrap fields with commas/newlines in quotes', () => {
      expect(sanitizeCsvCell('Product, Special')).toBe('"Product, Special"');
      expect(sanitizeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
      expect(sanitizeCsvCell('Product "Name"')).toBe('"Product ""Name"""');
      expect(sanitizeCsvCell('=Product, "Dangerous"')).toBe('"\'=Product, ""Dangerous"""');
    });
  });

  describe('Date Range Constraints', () => {
    it('should reject date_from greater than date_to', async () => {
      await expect(
        reportService.getSales('t-1', 'o-1', {
          date_from: '2026-12-31',
          date_to: '2026-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject date ranges exceeding 366 days', async () => {
      await expect(
        reportService.getSales('t-1', 'o-1', {
          date_from: '2024-01-01',
          date_to: '2026-01-01', // 2 years > 366 days
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid date ranges within 1 year', async () => {
      const res = await reportService.getSales('t-1', 'o-1', {
        date_from: '2026-01-01',
        date_to: '2026-06-30',
      });
      expect(Array.isArray(res)).toBe(true);
    });
  });

  describe('Tenant & Outlet Scoping in Secondary Lookups', () => {
    it('should query top products with matching tenant_id and outlet_id filters', async () => {
      mockPrisma.transactionItem.groupBy.mockResolvedValue([
        { product_id: 'prod-1', _sum: { qty: 5, subtotal: 50000 } },
      ]);

      await reportService.getTopProducts('t-1', 'o-1', {});

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['prod-1'] },
          tenant_id: 't-1',
          outlet_id: 'o-1',
        },
        select: {
          id: true,
          nama: true,
          category: { select: { nama: true } },
        },
      });
    });

    it('should query cashier summary users with matching tenant_id and outlet_id filters', async () => {
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { kasir_id: 'usr-1', _count: { id: 3 }, _sum: { grand_total: 100000 } },
      ]);

      await reportService.getCashierSummary('t-1', 'o-1', {});

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['usr-1'] },
          tenant_id: 't-1',
          outlet_id: 'o-1',
        },
        select: { id: true, nama: true },
      });
    });
  });
});
