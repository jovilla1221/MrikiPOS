import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalService } from './approval.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ForbiddenException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalType, ApprovalStatus, UserRole } from '@mrikipos/shared-types';

describe('Approval Core & State Machine (S7-C4)', () => {
  let service: ApprovalService;
  let prisma: any;
  let auditService: any;

  const mockTenantId = 'tenant-1111-1111-1111-111111111111';
  const mockOutletId = 'outlet-2222-2222-2222-222222222222';

  beforeEach(async () => {
    prisma = {
      approvalLog: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      transaction: {
        findFirst: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
      },
      shift: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<ApprovalService>(ApprovalService);
  });

  describe('Self-Approval Protection', () => {
    it('should block requester from approving their own request', async () => {
      const approval = {
        id: 'approval-1',
        tenant_id: mockTenantId,
        type: ApprovalType.VOID,
        status: ApprovalStatus.PENDING,
        requested_by: 'user-manager-1',
      };

      prisma.approvalLog.findFirst.mockResolvedValue(approval);

      await expect(
        service.approve(
          'approval-1',
          {},
          mockTenantId,
          'user-manager-1', // Same user ID as requester
          UserRole.MANAGER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Concurrency & Idempotency Safety', () => {
    it('should return ConflictException (409) if approval is already claimed or not PENDING', async () => {
      const approval = {
        id: 'approval-1',
        tenant_id: mockTenantId,
        type: ApprovalType.VOID,
        status: ApprovalStatus.PENDING,
        requested_by: 'user-kasir-1',
      };

      prisma.approvalLog.findFirst.mockResolvedValue(approval);
      prisma.approvalLog.updateMany.mockResolvedValue({ count: 0 }); // Claim failed (another worker processed first)

      await expect(
        service.approve(
          'approval-1',
          {},
          mockTenantId,
          'user-owner-1',
          UserRole.OWNER,
          undefined,
          async () => undefined,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Unsupported Action Handling', () => {
    it('should reject STOCK_TRANSFER approval creation with 400', async () => {
      await expect(
        service.create(
          {
            type: ApprovalType.STOCK_TRANSFER,
            reference_id: 'ref-1',
          },
          mockTenantId,
          'user-1',
          UserRole.MANAGER,
          mockOutletId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject REFUND approval creation until a refund executor exists', async () => {
      await expect(
        service.create(
          {
            type: ApprovalType.REFUND,
            reference_id: 'ref-1',
          },
          mockTenantId,
          'user-1',
          UserRole.MANAGER,
          mockOutletId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a reference from another outlet', async () => {
      prisma.transaction.findFirst.mockResolvedValue({
        id: 'tx-1',
        tenant_id: mockTenantId,
        outlet_id: 'outlet-other',
      });

      await expect(
        service.create(
          {
            type: ApprovalType.VOID,
            reference_id: 'tx-1',
          },
          mockTenantId,
          'user-1',
          UserRole.KASIR,
          mockOutletId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Detail Access Scope', () => {
    it('should hide another outlet approval from a non-manager user', async () => {
      prisma.approvalLog.findFirst.mockResolvedValue({
        id: 'approval-2',
        tenant_id: mockTenantId,
        outlet_id: 'outlet-other',
        requested_by: 'user-other',
      });

      await expect(
        service.findOne(
          'approval-2',
          mockTenantId,
          'user-kasir-1',
          UserRole.KASIR,
          mockOutletId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow a manager to view approvals in the same outlet', async () => {
      const approval = {
        id: 'approval-3',
        tenant_id: mockTenantId,
        outlet_id: mockOutletId,
        requested_by: 'user-other',
      };
      prisma.approvalLog.findFirst.mockResolvedValue(approval);

      await expect(
        service.findOne(
          'approval-3',
          mockTenantId,
          'manager-1',
          UserRole.MANAGER,
          mockOutletId,
        ),
      ).resolves.toEqual(approval);
    });
  });
});
