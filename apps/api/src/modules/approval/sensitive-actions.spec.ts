import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from '../transaction/transaction.service';
import { ProductService } from '../product/product.service';
import { ShiftService } from '../shift/shift.service';
import { ApprovalService } from './approval.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TransactionStatus, ShiftStatus, UserRole } from '@mrikipos/shared-types';
import { BadRequestException } from '@nestjs/common';

describe('Sensitive Actions Approval Integration (S7-D1, S7-D2, S7-D3)', () => {
  let transactionService: TransactionService;
  let productService: ProductService;
  let shiftService: ShiftService;
  let approvalService: ApprovalService;
  let prisma: any;

  const mockTenantId = 'tenant-1111-1111-1111-111111111111';
  const mockOutletId = 'outlet-2222-2222-2222-222222222222';

  beforeEach(async () => {
    prisma = {
      transaction: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      product: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      stockHistory: {
        create: jest.fn(),
      },
      shift: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { jumlah: 100000 } }),
      },
      approvalLog: {
        create: jest.fn().mockImplementation((args) => ({ id: 'app-1', ...args.data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        ProductService,
        ShiftService,
        ApprovalService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    transactionService = module.get<TransactionService>(TransactionService);
    productService = module.get<ProductService>(ProductService);
    shiftService = module.get<ShiftService>(ShiftService);
    approvalService = module.get<ApprovalService>(ApprovalService);

    // Initialize handlers
    transactionService.onModuleInit();
    productService.onModuleInit();
    shiftService.onModuleInit();
  });

  describe('Void Approval Integration (S7-D1)', () => {
    it('should restore stock, update shift, and set transaction status VOIDED when void executor is executed', async () => {
      const mockTx = {
        id: 'tx-1',
        nomor: 'TXN-20260722-001',
        tenant_id: mockTenantId,
        outlet_id: mockOutletId,
        shift_id: 'shift-1',
        status: TransactionStatus.COMPLETED,
        grand_total: 50000,
        items: [{ product_id: 'prod-1', qty: 2 }],
      };

      const mockProduct = { id: 'prod-1', stok: 10 };

      prisma.transaction.findFirst.mockResolvedValue(mockTx);
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      const approval = {
        id: 'app-1',
        tenant_id: mockTenantId,
        reference_id: 'tx-1',
        catatan: 'Diskon salah',
      };

      const res = await transactionService.executeVoidApproved(prisma, approval);

      expect(res.status).toBe('VOIDED');
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 'tx-1', status: TransactionStatus.COMPLETED }),
        data: expect.objectContaining({ status: TransactionStatus.VOIDED }),
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stok: { increment: 2 } },
      });
      expect(prisma.shift.update).toHaveBeenCalledWith({
        where: { id: 'shift-1' },
        data: { total_penjualan: { decrement: 50000 }, total_transaksi: { decrement: 1 } },
      });
    });

    it('does not restore stock when the transaction was claimed by another void request', async () => {
      prisma.transaction.updateMany.mockResolvedValue({ count: 0 });

      prisma.transaction.findFirst.mockResolvedValue({
        id: 'tx-1',
        tenant_id: mockTenantId,
        outlet_id: mockOutletId,
        status: TransactionStatus.COMPLETED,
        items: [{ product_id: 'prod-1', qty: 1 }],
      });

      await expect(
        transactionService.executeVoidApproved(prisma, {
          tenant_id: mockTenantId,
          outlet_id: mockOutletId,
          reference_id: 'tx-1',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe('Price Change Approval Integration (S7-D2)', () => {
    it('should update selling price of product when price change approval executor is executed', async () => {
      const mockProduct = { id: 'prod-1', harga_jual: 15000 };
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.product.update.mockResolvedValue({ ...mockProduct, harga_jual: 20000 });

      const approval = {
        id: 'app-2',
        tenant_id: mockTenantId,
        reference_id: 'prod-1',
        metadata: { harga_jual_baru: 20000 },
      };

      const res = await productService.executePriceChangeApproved(prisma, approval);

      expect(res.new_price).toBe(20000);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { harga_jual: 20000 },
      });
    });
  });

  describe('Shift Close Threshold Integration (S7-D3)', () => {
    it('should return approval_required when variance selisih_kas exceeds Rp50.000', async () => {
      const mockShift = {
        id: 'shift-1',
        tenant_id: mockTenantId,
        outlet_id: mockOutletId,
        user_id: 'user-kasir-1',
        modal_awal: 100000,
        status: ShiftStatus.OPEN,
      };

      prisma.shift.findFirst.mockResolvedValue(mockShift);

      // totalCash = 100,000. perkiraanKas = 200,000. kas_aktual = 100,000 -> selisih = -100,000 (diff > 50k)
      const res = await shiftService.close(
        { shift_id: 'shift-1', kas_aktual: 100000 },
        'user-kasir-1',
        'KASIR',
        mockTenantId,
        mockOutletId,
      );

      expect(res.approval_required).toBe(true);
      expect(res.selisih_kas).toBe(-100000);
      expect(prisma.approvalLog.create).toHaveBeenCalled();
      expect(prisma.shift.update).not.toHaveBeenCalled();
    });

    it('should claim an open shift within the approval outlet before closing it', async () => {
      prisma.shift.findFirst.mockResolvedValue({
        id: 'shift-1',
        tenant_id: mockTenantId,
        outlet_id: mockOutletId,
        status: ShiftStatus.OPEN,
        modal_awal: 100000,
        catatan: null,
      });

      const result = await shiftService.executeShiftCloseApproved(prisma, {
        reference_id: 'shift-1',
        tenant_id: mockTenantId,
        outlet_id: mockOutletId,
        metadata: { kas_aktual: 200000 },
      });

      expect(result.status).toBe('CLOSED');
      expect(prisma.shift.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: 'shift-1',
          tenant_id: mockTenantId,
          outlet_id: mockOutletId,
          status: ShiftStatus.OPEN,
        }),
        data: expect.objectContaining({ status: ShiftStatus.CLOSED }),
      });
    });

    it('should not close a shift after another request claims it', async () => {
      prisma.shift.findFirst.mockResolvedValue({
        id: 'shift-1',
        tenant_id: mockTenantId,
        outlet_id: mockOutletId,
        status: ShiftStatus.OPEN,
        modal_awal: 100000,
        catatan: null,
      });
      prisma.shift.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        shiftService.executeShiftCloseApproved(prisma, {
          reference_id: 'shift-1',
          tenant_id: mockTenantId,
          outlet_id: mockOutletId,
          metadata: { kas_aktual: 100000 },
        }),
      ).rejects.toThrow();
    });
  });
});
