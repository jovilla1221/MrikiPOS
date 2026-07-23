import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateApprovalDto, ApprovalDecisionDto, ApprovalQueryDto } from './approval.dto';
import { canApprove, canRequestApproval } from '../../common/rbac/rbac-policy';
import { ApprovalStatus, ApprovalType, UserRole } from '@mrikipos/shared-types';
import { Prisma } from '@prisma/client';

const APPROVAL_SELECT_FIELDS = {
  id: true,
  tenant_id: true,
  outlet_id: true,
  type: true,
  reference_id: true,
  requested_by: true,
  approved_by: true,
  status: true,
  catatan: true,
  metadata: true,
  created_at: true,
  updated_at: true,
  requester: {
    select: {
      id: true,
      nama: true,
      role: true,
    },
  },
  approver: {
    select: {
      id: true,
      nama: true,
      role: true,
    },
  },
};

@Injectable()
export class ApprovalService {
  private domainExecutors = new Map<
    string,
    (tx: Prisma.TransactionClient, approval: any) => Promise<any>
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  registerExecutor(
    type: ApprovalType | string,
    executor: (tx: Prisma.TransactionClient, approval: any) => Promise<any>,
  ) {
    this.domainExecutors.set(type, executor);
  }

  async create(
    dto: CreateApprovalDto,
    tenantId: string,
    requesterId: string,
    requesterRole: UserRole,
    userOutletId: string,
  ) {
    if (!canRequestApproval(dto.type, requesterRole)) {
      throw new ForbiddenException(
        `Role ${requesterRole} tidak diizinkan membuat request approval ${dto.type}`,
      );
    }

    if (dto.type === ApprovalType.REFUND) {
      throw new BadRequestException(
        'APPROVAL_ACTION_UNSUPPORTED: Refund belum memiliki executor atomik',
      );
    }

    let referenceOutletId: string;

    // Validate reference target entity per type
    if (dto.type === ApprovalType.VOID) {
      const tx = await this.prisma.transaction.findFirst({
        where: { id: dto.reference_id, tenant_id: tenantId },
      });
      if (!tx) {
        throw new NotFoundException('Transaksi referensi tidak ditemukan');
      }
      referenceOutletId = tx.outlet_id;
    } else if (dto.type === ApprovalType.PRICE_CHANGE) {
      const product = await this.prisma.product.findFirst({
        where: { id: dto.reference_id, tenant_id: tenantId },
      });
      if (!product) {
        throw new NotFoundException('Produk referensi tidak ditemukan');
      }
      referenceOutletId = product.outlet_id;
      if (
        typeof dto.metadata?.harga_jual_baru !== 'number' ||
        !Number.isFinite(dto.metadata.harga_jual_baru) ||
        dto.metadata.harga_jual_baru <= 0
      ) {
        throw new BadRequestException('Metadata harga_jual_baru harus berupa angka positif');
      }
    } else if (dto.type === ApprovalType.SHIFT_CLOSE) {
      const shift = await this.prisma.shift.findFirst({
        where: { id: dto.reference_id, tenant_id: tenantId, status: 'OPEN' },
      });
      if (!shift) {
        throw new BadRequestException('Shift referensi tidak ditemukan atau sudah CLOSED');
      }
      referenceOutletId = shift.outlet_id;
    } else if (dto.type === ApprovalType.STOCK_TRANSFER) {
      throw new BadRequestException(
        'APPROVAL_ACTION_UNSUPPORTED: Stock transfer belum didukung pada versi ini',
      );
    } else {
      throw new BadRequestException('Tipe approval belum didukung');
    }

    if (dto.outlet_id && dto.outlet_id !== referenceOutletId) {
      throw new BadRequestException('Outlet approval tidak sesuai dengan resource referensi');
    }

    if (requesterRole !== UserRole.OWNER && referenceOutletId !== userOutletId) {
      throw new ForbiddenException('Resource approval berada di outlet lain');
    }

    const outletId = referenceOutletId;

    const approval = await this.prisma.$transaction(async (tx) => {
      const newApproval = await tx.approvalLog.create({
        data: {
          tenant_id: tenantId,
          outlet_id: outletId,
          type: dto.type,
          reference_id: dto.reference_id,
          requested_by: requesterId,
          status: ApprovalStatus.PENDING,
          catatan: dto.catatan,
          metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
        select: APPROVAL_SELECT_FIELDS,
      });

      await this.auditService.log(
        {
          tenantId,
          userId: requesterId,
          action: 'APPROVAL_REQUESTED',
          entityType: 'ApprovalLog',
          entityId: newApproval.id,
          newValues: {
            type: newApproval.type,
            reference_id: newApproval.reference_id,
            metadata: newApproval.metadata,
          },
        },
        tx,
      );

      return newApproval;
    });

    return approval;
  }

  async findAll(
    tenantId: string,
    userRole: UserRole,
    userOutletId: string,
    query: ApprovalQueryDto,
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      tenant_id: tenantId,
    };

    if (userRole === UserRole.MANAGER && userOutletId) {
      where.outlet_id = userOutletId;
    } else if (query.outlet_id) {
      where.outlet_id = query.outlet_id;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.requested_by) {
      where.requested_by = query.requested_by;
    }

    const [total, data] = await Promise.all([
      this.prisma.approvalLog.count({ where }),
      this.prisma.approvalLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: APPROVAL_SELECT_FIELDS,
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findMine(tenantId: string, userId: string, query: ApprovalQueryDto) {
    return this.findAll(tenantId, UserRole.KASIR, '', {
      ...query,
      requested_by: userId,
    });
  }

  private async loadOne(id: string, tenantId: string) {
    const approval = await this.prisma.approvalLog.findFirst({
      where: { id, tenant_id: tenantId },
      select: APPROVAL_SELECT_FIELDS,
    });

    if (!approval) {
      throw new NotFoundException('Permintaan approval tidak ditemukan');
    }

    return approval;
  }

  async findOne(
    id: string,
    tenantId: string,
    actorId?: string,
    actorRole?: UserRole,
    actorOutletId?: string,
  ) {
    const approval = await this.loadOne(id, tenantId);

    const isOwner = actorRole === UserRole.OWNER;
    const isRequester = approval.requested_by === actorId;
    const isManagerInOutlet =
      actorRole === UserRole.MANAGER && approval.outlet_id === actorOutletId;

    if (actorId && actorRole && !isOwner && !isRequester && !isManagerInOutlet) {
      throw new NotFoundException('Permintaan approval tidak ditemukan');
    }

    return approval;
  }

  async approve(
    id: string,
    dto: ApprovalDecisionDto,
    tenantId: string,
    approverId: string,
    approverRole: UserRole,
    approverOutletId?: string,
    domainExecutor?: (tx: Prisma.TransactionClient, approval: any) => Promise<any>,
  ) {
    const approval = await this.loadOne(id, tenantId);

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new ConflictException(
        `Permintaan approval sudah dalam status terminal ${approval.status}`,
      );
    }

    if (approval.requested_by === approverId) {
      throw new ForbiddenException('Requester tidak boleh menyetujui permintaannya sendiri');
    }

    if (!canApprove(approval.type as ApprovalType, approverRole)) {
      throw new ForbiddenException(
        `Role ${approverRole} tidak memiliki wewenang approve untuk ${approval.type}`,
      );
    }

    if (approverRole === UserRole.MANAGER && approval.outlet_id !== approverOutletId) {
      throw new ForbiddenException('Approval berada di outlet lain');
    }

    const executorToRun = domainExecutor || this.domainExecutors.get(approval.type);
    if (!executorToRun) {
      throw new BadRequestException(
        `APPROVAL_ACTION_UNSUPPORTED: Executor ${approval.type} belum tersedia`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Race-safe claim using conditional update
      const claimResult = await tx.approvalLog.updateMany({
        where: {
          id,
          tenant_id: tenantId,
          status: ApprovalStatus.PENDING,
        },
        data: {
          status: ApprovalStatus.APPROVED,
          approved_by: approverId,
          catatan: dto.catatan || null,
        },
      });

      if (claimResult.count === 0) {
        throw new ConflictException('Permintaan approval sudah diproses oleh pengguna lain');
      }

      // Pass the claiming approver to the domain executor without trusting the
      // stale pre-claim row returned by loadOne().
      const approvalForExecution = { ...approval, approved_by: approverId };
      const executionData = await executorToRun(tx, approvalForExecution);

      await this.auditService.log(
        {
          tenantId,
          userId: approverId,
          action: 'APPROVAL_APPROVED',
          entityType: 'ApprovalLog',
          entityId: id,
          oldValues: { status: 'PENDING' },
          newValues: {
            status: 'APPROVED',
            approved_by: approverId,
            catatan: dto.catatan,
          },
        },
        tx,
      );

      const updatedApproval = await tx.approvalLog.findUnique({
        where: { id },
        select: APPROVAL_SELECT_FIELDS,
      });

      return {
        approval: updatedApproval,
        execution: executionData,
      };
    });
  }

  async reject(
    id: string,
    dto: ApprovalDecisionDto,
    tenantId: string,
    approverId: string,
    approverRole: UserRole,
    approverOutletId?: string,
  ) {
    const approval = await this.loadOne(id, tenantId);

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new ConflictException(
        `Permintaan approval sudah dalam status terminal ${approval.status}`,
      );
    }

    if (!canApprove(approval.type as ApprovalType, approverRole)) {
      throw new ForbiddenException(
        `Role ${approverRole} tidak memiliki wewenang menolak request ${approval.type}`,
      );
    }

    if (approverRole === UserRole.MANAGER && approval.outlet_id !== approverOutletId) {
      throw new ForbiddenException('Approval berada di outlet lain');
    }

    return this.prisma.$transaction(async (tx) => {
      const claimResult = await tx.approvalLog.updateMany({
        where: {
          id,
          tenant_id: tenantId,
          status: ApprovalStatus.PENDING,
        },
        data: {
          status: ApprovalStatus.REJECTED,
          approved_by: approverId,
          catatan: dto.catatan || null,
        },
      });

      if (claimResult.count === 0) {
        throw new ConflictException('Permintaan approval sudah diproses oleh pengguna lain');
      }

      await this.auditService.log(
        {
          tenantId,
          userId: approverId,
          action: 'APPROVAL_REJECTED',
          entityType: 'ApprovalLog',
          entityId: id,
          oldValues: { status: 'PENDING' },
          newValues: {
            status: 'REJECTED',
            approved_by: approverId,
            catatan: dto.catatan,
          },
        },
        tx,
      );

      return tx.approvalLog.findUnique({
        where: { id },
        select: APPROVAL_SELECT_FIELDS,
      });
    });
  }
}
