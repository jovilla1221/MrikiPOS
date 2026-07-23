import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { ApprovalService } from '../approval/approval.service';

describe('TransactionService - SEC-TX-001 Outlet Isolation Scope', () => {
  let transactionService: TransactionService;

  const mockPrisma = {
    $transaction: jest.fn((cb) => cb(mockPrisma)),
    transaction: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    stockHistory: {
      create: jest.fn(),
    },
    shift: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ApprovalService, useValue: { create: jest.fn(), registerExecutor: jest.fn() } },
      ],
    }).compile();

    transactionService = module.get<TransactionService>(TransactionService);
    jest.clearAllMocks();
  });

  it('should reject transaction when attempting to sell a product belonging to another outlet within the same tenant', async () => {
    // Product belongs to Outlet A ('outlet-A')
    const productOutletA = {
      id: 'prod-A-1',
      tenant_id: 'tenant-1',
      outlet_id: 'outlet-A',
      nama: 'Outlet A Product',
      harga_jual: 15000,
      stok: 20,
      is_active: true,
    };

    // Simulated query when Outlet B ('outlet-B') searches for products matching outlet-B
    mockPrisma.product.findFirst.mockImplementation(async (params) => {
      if (
        params.where.id === 'prod-A-1' &&
        params.where.tenant_id === 'tenant-1' &&
        params.where.outlet_id === 'outlet-B'
      ) {
        return null; // Product not found in Outlet B!
      }
      return productOutletA;
    });

    const createDto = {
      items: [{ product_id: 'prod-A-1', qty: 1, harga: 15000 }],
      payments: [{ metode: 'CASH' as any, jumlah: 20000 }],
    };

    // Attempting to sell Outlet A's product from Outlet B
    await expect(
      transactionService.create(createDto, 'usr-1', 'tenant-1', 'outlet-B'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow transaction when product belongs to the matching outlet', async () => {
    const productOutletB = {
      id: 'prod-B-1',
      tenant_id: 'tenant-1',
      outlet_id: 'outlet-B',
      nama: 'Outlet B Product',
      harga_jual: 15000,
      stok: 20,
      is_active: true,
    };

    mockPrisma.product.findFirst.mockImplementation(async (params) => {
      if (
        params.where.id === 'prod-B-1' &&
        params.where.tenant_id === 'tenant-1' &&
        params.where.outlet_id === 'outlet-B'
      ) {
        return productOutletB;
      }
      return null;
    });

    mockPrisma.shift.findFirst.mockResolvedValue(null);
    mockPrisma.transaction.findFirst.mockResolvedValue(null);
    mockPrisma.transaction.create.mockResolvedValue({
      id: 'txn-1',
      nomor: 'TXN-20260722-001',
      grand_total: 15000,
      status: 'COMPLETED',
      items: [],
      payments: [],
    });

    const createDto = {
      items: [{ product_id: 'prod-B-1', qty: 1, harga: 15000 }],
      payments: [{ metode: 'CASH' as any, jumlah: 20000 }],
    };

    const res = await transactionService.create(createDto, 'usr-1', 'tenant-1', 'outlet-B');
    expect(res.id).toBe('txn-1');
    expect(res.kembalian).toBe(5000);
  });
});
