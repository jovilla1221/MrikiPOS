import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApprovalService } from '../approval/approval.service';
import { OpenShiftDto, CloseShiftDto, ShiftQueryDto } from './shift.dto';
import { ShiftStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { ApprovalType, UserRole } from '@mrikipos/shared-types';

@Injectable()
export class ShiftService implements OnModuleInit {
  private readonly logger = new Logger(ShiftService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
  ) {}

  onModuleInit() {
    this.approvalService.registerExecutor(ApprovalType.SHIFT_CLOSE, (tx, approval) =>
      this.executeShiftCloseApproved(tx, approval),
    );
  }

  private formatShift(shift: any) {
    return {
      ...shift,
      modal_awal: Number(shift.modal_awal),
      total_penjualan: Number(shift.total_penjualan),
      kas_aktual: shift.kas_aktual !== null ? Number(shift.kas_aktual) : null,
      selisih_kas: shift.selisih_kas !== null ? Number(shift.selisih_kas) : null,
    };
  }

  /**
   * Buka shift baru.
   * D2: Maksimal 1 shift OPEN per user per outlet.
   */
  async open(dto: OpenShiftDto, userId: string, tenantId: string, outletId: string) {
    const existingOpen = await this.prisma.shift.findFirst({
      where: {
        tenant_id: tenantId,
        outlet_id: outletId,
        user_id: userId,
        status: ShiftStatus.OPEN,
      },
    });

    if (existingOpen) {
      throw new ConflictException('Anda sudah memiliki shift yang masih terbuka (OPEN)');
    }

    const shift = await this.prisma.shift.create({
      data: {
        tenant_id: tenantId,
        outlet_id: outletId,
        user_id: userId,
        modal_awal: dto.modal_awal,
        catatan: dto.catatan,
        status: ShiftStatus.OPEN,
      },
      include: {
        user: { select: { id: true, nama: true } },
      },
    });

    this.logger.log(`Shift opened ID ${shift.id} by user ${userId} with modal ${dto.modal_awal}`);
    return this.formatShift(shift);
  }

  /**
   * Get active/current OPEN shift for current user.
   */
  async getCurrent(userId: string, tenantId: string, outletId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: {
        tenant_id: tenantId,
        outlet_id: outletId,
        user_id: userId,
        status: ShiftStatus.OPEN,
      },
      include: {
        user: { select: { id: true, nama: true } },
      },
    });

    if (!shift) return null;

    // Calculate total cash payments for this shift (D4b)
    const cashAgg = await this.prisma.payment.aggregate({
      where: {
        transaction: { shift_id: shift.id },
        metode: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
      },
      _sum: { jumlah: true },
    });

    const totalCash = cashAgg._sum.jumlah ? Number(cashAgg._sum.jumlah) : 0;
    const perkiraanKasLaci = Number(shift.modal_awal) + totalCash;

    return {
      ...this.formatShift(shift),
      total_cash: totalCash,
      perkiraan_kas_laci: perkiraanKasLaci,
    };
  }

  /**
   * Tutup shift.
   * D4b logic: selisih_kas = kas_aktual - (modal_awal + total_cash).
   * S4: KASIR only close own shift; OWNER/MANAGER can close any shift in outlet.
   */
  async close(
    dto: CloseShiftDto,
    userId: string,
    userRole: string,
    tenantId: string,
    outletId: string,
  ) {
    let shift;

    if (dto.shift_id) {
      shift = await this.prisma.shift.findFirst({
        where: { id: dto.shift_id, tenant_id: tenantId, outlet_id: outletId },
      });
    } else {
      shift = await this.prisma.shift.findFirst({
        where: {
          tenant_id: tenantId,
          outlet_id: outletId,
          user_id: userId,
          status: ShiftStatus.OPEN,
        },
      });
    }

    if (!shift) {
      throw new NotFoundException('Shift terbuka tidak ditemukan');
    }

    if (shift.status === ShiftStatus.CLOSED) {
      throw new BadRequestException('Shift ini sudah ditutup');
    }

    // S4: Role check
    if (userRole === 'KASIR' && shift.user_id !== userId) {
      throw new ForbiddenException('Kasir hanya dapat menutup shift milik sendiri');
    }

    // Hitung total tunai (CASH) dari pembayaran transaksi shift ini (D4b)
    const cashAgg = await this.prisma.payment.aggregate({
      where: {
        transaction: { shift_id: shift.id },
        metode: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
      },
      _sum: { jumlah: true },
    });

    const totalCash = cashAgg._sum.jumlah ? Number(cashAgg._sum.jumlah) : 0;
    const modalAwal = Number(shift.modal_awal);
    const perkiraanKas = modalAwal + totalCash;
    const selisihKas = dto.kas_aktual - perkiraanKas;

    if (Math.abs(selisihKas) > 50000) {
      const approval = await this.approvalService.create(
        {
          type: ApprovalType.SHIFT_CLOSE,
          reference_id: shift.id,
          catatan: `Penutupan shift dengan selisih Rp${selisihKas} (kas aktual: ${dto.kas_aktual})`,
          metadata: {
            kas_aktual: dto.kas_aktual,
            selisih_kas: selisihKas,
            catatan: dto.catatan,
          },
        },
        tenantId,
        userId,
        userRole as UserRole,
        outletId,
      );

      return {
        approval_required: true,
        approval_id: approval.id,
        selisih_kas: selisihKas,
        message: 'Selisih kas melebihi threshold Rp50.000, membutuhkan approval Manager/Owner',
      };
    }

    const closed = await this.prisma.shift.update({
      where: { id: shift.id },
      data: {
        status: ShiftStatus.CLOSED,
        kas_aktual: dto.kas_aktual,
        selisih_kas: selisihKas,
        closed_at: new Date(),
        catatan: dto.catatan
          ? `${shift.catatan ? shift.catatan + ' | ' : ''}${dto.catatan}`
          : shift.catatan,
      },
      include: {
        user: { select: { id: true, nama: true } },
      },
    });

    this.logger.log(
      `Shift ${shift.id} closed. Kas aktual: ${dto.kas_aktual}, Selisih: ${selisihKas}`,
    );

    return {
      ...this.formatShift(closed),
      total_cash: totalCash,
      perkiraan_kas_laci: perkiraanKas,
    };
  }

  async executeShiftCloseApproved(tx: Prisma.TransactionClient, approval: any) {
    const shift = await tx.shift.findFirst({
      where: {
        id: approval.reference_id,
        tenant_id: approval.tenant_id,
        ...(approval.outlet_id ? { outlet_id: approval.outlet_id } : {}),
        status: ShiftStatus.OPEN,
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift tidak ditemukan atau sudah CLOSED');
    }

    const kasAktual = approval.metadata?.kas_aktual;
    if (kasAktual === undefined || typeof kasAktual !== 'number') {
      throw new BadRequestException('Metadata kas_aktual tidak valid');
    }

    const cashAgg = await tx.payment.aggregate({
      where: {
        transaction: { shift_id: shift.id },
        metode: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
      },
      _sum: { jumlah: true },
    });

    const totalCash = cashAgg._sum.jumlah ? Number(cashAgg._sum.jumlah) : 0;
    const modalAwal = Number(shift.modal_awal);
    const perkiraanKas = modalAwal + totalCash;
    const selisihKas = kasAktual - perkiraanKas;

    const claimResult = await tx.shift.updateMany({
      where: {
        id: shift.id,
        tenant_id: approval.tenant_id,
        ...(approval.outlet_id ? { outlet_id: approval.outlet_id } : {}),
        status: ShiftStatus.OPEN,
      },
      data: {
        status: ShiftStatus.CLOSED,
        kas_aktual: kasAktual,
        selisih_kas: selisihKas,
        closed_at: new Date(),
        catatan: approval.catatan
          ? `${shift.catatan ? shift.catatan + ' | ' : ''}${approval.catatan}`
          : shift.catatan,
      },
    });

    if (claimResult.count !== 1) {
      throw new ConflictException('Shift sudah diproses oleh request lain');
    }

    const closed = {
      ...shift,
      status: ShiftStatus.CLOSED,
      kas_aktual: kasAktual,
      selisih_kas: selisihKas,
    };

    return {
      shift_id: closed.id,
      kas_aktual: kasAktual,
      selisih_kas: selisihKas,
      status: 'CLOSED',
    };
  }

  /**
   * Shift history paginated.
   */
  async findAll(tenantId: string, outletId: string, query: ShiftQueryDto) {
    const { page = 1, limit = 20, user_id, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ShiftWhereInput = {
      tenant_id: tenantId,
      outlet_id: outletId,
      ...(user_id ? { user_id } : {}),
      ...(status ? { status: status as ShiftStatus } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.shift.findMany({
        where,
        include: {
          user: { select: { id: true, nama: true } },
        },
        orderBy: { opened_at: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.shift.count({ where }),
    ]);

    return {
      data: data.map((s) => this.formatShift(s)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Detail shift.
   */
  async findOne(id: string, tenantId: string, outletId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id, tenant_id: tenantId, outlet_id: outletId },
      include: {
        user: { select: { id: true, nama: true } },
        _count: { select: { transactions: true } },
      },
    });

    if (!shift) throw new NotFoundException('Shift tidak ditemukan');

    const cashAgg = await this.prisma.payment.aggregate({
      where: {
        transaction: { shift_id: shift.id },
        metode: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
      },
      _sum: { jumlah: true },
    });

    const totalCash = cashAgg._sum.jumlah ? Number(cashAgg._sum.jumlah) : 0;

    return {
      ...this.formatShift(shift),
      total_cash: totalCash,
    };
  }
}
