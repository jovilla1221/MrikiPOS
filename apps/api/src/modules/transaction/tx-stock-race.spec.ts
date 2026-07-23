import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { PrismaService } from '../../database/prisma.service';
import { ApprovalService } from '../approval/approval.service';
import { BadRequestException } from '@nestjs/common';

describe('TransactionService - SEC-TX-002 Stock Race Condition Protection', () => {
  let transactionService: TransactionService;
  let currentStock: number;

  beforeEach(async () => {
    currentStock = 1; // Stock is initially 1

    const mockPrisma = {
      $transaction: jest.fn((cb) => cb(mockPrisma)),
      product: {
        findFirst: jest.fn().mockImplementation(async () => ({
          id: 'prod-race-1',
          tenant_id: 't-1',
          outlet_id: 'o-1',
          nama: 'Limited Stock Item',
          harga_jual: 10000,
          stok: currentStock,
          is_active: true,
        })),
        updateMany: jest.fn().mockImplementation(async (params) => {
          // Atomic conditional update: decrement ONLY IF stock >= qty
          const qtyNeeded = params.where.stok.gte;
          if (params.where.id === 'prod-race-1' && currentStock >= qtyNeeded) {
            currentStock -= qtyNeeded;
            return { count: 1 };
          }
          return { count: 0 };
        }),
      },
      stockHistory: {
        create: jest.fn(),
      },
      shift: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      transaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'txn-race-1',
          nomor: 'TXN-20260722-001-A1B2',
          grand_total: 10000,
          status: 'COMPLETED',
          items: [],
          payments: [],
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ApprovalService, useValue: { create: jest.fn(), registerExecutor: jest.fn() } },
      ],
    }).compile();

    transactionService = module.get<TransactionService>(TransactionService);
  });

  it('should allow exactly 1 transaction to succeed and reject the 2nd when stock = 1 under parallel requests', async () => {
    const createDto = {
      items: [{ product_id: 'prod-race-1', qty: 1, harga: 10000 }],
      payments: [{ metode: 'CASH' as any, jumlah: 10000 }],
    };

    const promises = [
      transactionService.create(createDto, 'usr-1', 't-1', 'o-1'),
      transactionService.create(createDto, 'usr-2', 't-1', 'o-1'),
    ].map((p) =>
      p
        .then((res) => ({ status: 'fulfilled', value: res }))
        .catch((err) => ({ status: 'rejected', reason: err })),
    );

    const results = await Promise.all(promises);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect((rejected[0] as any).reason).toBeInstanceOf(BadRequestException);
    expect(currentStock).toBe(0); // Stock must be exactly 0, NEVER negative!
  });
});
