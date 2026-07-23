import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../../database/redis.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@mrikipos/shared-types';

describe('User Module & Lifecycle Safeguards (S7-B3)', () => {
  let service: UserService;
  let prisma: any;
  let auditService: any;

  const mockTenantId = 'tenant-1111-1111-1111-111111111111';
  const mockOutletId = 'outlet-2222-2222-2222-222222222222';

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      outlet: {
        findFirst: jest.fn(),
      },
      refreshToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: RedisService, useValue: { set: jest.fn() } },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('Last Active OWNER Protection', () => {
    it('should block deactivation of the last active OWNER', async () => {
      const ownerUser = {
        id: 'owner-1',
        tenant_id: mockTenantId,
        role: UserRole.OWNER,
        is_active: true,
      };

      prisma.user.findFirst.mockResolvedValue(ownerUser);
      prisma.user.count.mockResolvedValue(1); // Only 1 active owner

      await expect(service.remove('owner-1', mockTenantId, 'actor-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow deactivation if more than 1 active OWNER exists', async () => {
      const ownerUser = {
        id: 'owner-1',
        tenant_id: mockTenantId,
        role: UserRole.OWNER,
        is_active: true,
      };

      prisma.user.findFirst.mockResolvedValue(ownerUser);
      prisma.user.count.mockResolvedValue(2); // 2 active owners
      prisma.user.update.mockResolvedValue({ ...ownerUser, is_active: false });

      const result = await service.remove('owner-1', mockTenantId, 'actor-1');
      expect(result.is_active).toBe(false);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'owner-1', revoked: false },
        data: { revoked: true, revoked_at: expect.any(Date) },
      });
    });
  });

  describe('Response Safety', () => {
    it('should return user detail without pin_hash field', async () => {
      const safeUser = {
        id: 'user-1',
        tenant_id: mockTenantId,
        outlet_id: mockOutletId,
        nama: 'Kasir Budi',
        phone: '081234567890',
        role: UserRole.KASIR,
        is_active: true,
      };

      prisma.user.findFirst.mockResolvedValue(safeUser);

      const res = await service.findOne('user-1', mockTenantId);
      expect(res).toEqual(safeUser);
      expect(res).not.toHaveProperty('pin_hash');
    });
  });
});
