import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { PrismaService } from '../../database/prisma.service';
import { ApprovalService } from '../approval/approval.service';
import { BadRequestException } from '@nestjs/common';

describe('TransactionService - SEC-TX-003 Discount Invariant Protection', () => {
  let transactionService: TransactionService;

  const mockProduct = {
    id: 'prod-disc-1',
    tenant_id: 't-1',
    outlet_id: 'o-1',
    nama: 'Discountable Product',
    harga_jual: 20000,
    stok: 50,
    is_active: true,
  };

  beforeEach(async () => {
    const mockPrisma = {
      $transaction: jest.fn((cb) => cb(mockPrisma)),
      product: {
        findFirst: jest.fn().mockResolvedValue(mockProduct),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      stockHistory: {
        create: jest.fn(),
      },
      shift: { findFirst: jest.fn().mockResolvedValue(null) },
      transaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'txn-disc-1',
          nomor: 'TXN-20260722-001-A1B2',
          subtotal: 20000,
          diskon: 5000,
          grand_total: 15000,
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

  it('should reject negative item discount', async () => {
    const dto = {
      items: [{ product_id: 'prod-disc-1', qty: 1, harga: 20000, diskon_item: -5000 }],
      payments: [{ metode: 'CASH' as any, jumlah: 20000 }],
    };

    await expect(transactionService.create(dto, 'usr-1', 't-1', 'o-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject item discount exceeding product selling price', async () => {
    const dto = {
      items: [{ product_id: 'prod-disc-1', qty: 1, harga: 20000, diskon_item: 25000 }],
      payments: [{ metode: 'CASH' as any, jumlah: 20000 }],
    };

    await expect(transactionService.create(dto, 'usr-1', 't-1', 'o-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject total transaction discount exceeding calculated subtotal', async () => {
    const dto = {
      items: [{ product_id: 'prod-disc-1', qty: 1, harga: 20000, diskon_item: 0 }],
      diskon: 25000, // Subtotal is 20000, total discount 25000 exceeds subtotal!
      payments: [{ metode: 'CASH' as any, jumlah: 20000 }],
    };

    await expect(transactionService.create(dto, 'usr-1', 't-1', 'o-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should allow valid item discount and total discount within bounds', async () => {
    const dto = {
      items: [{ product_id: 'prod-disc-1', qty: 1, harga: 20000, diskon_item: 2000 }], // Item subtotal = 18000
      diskon: 3000, // Grand total = 15000
      payments: [{ metode: 'CASH' as any, jumlah: 15000 }],
    };

    const res = await transactionService.create(dto, 'usr-1', 't-1', 'o-1');
    expect(res.id).toBe('txn-disc-1');
  });
});
