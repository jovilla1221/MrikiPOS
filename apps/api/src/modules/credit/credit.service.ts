import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WhatsAppService } from '../../integrations/whatsapp/whatsapp.service';
import { CreateCreditDto, PayCreditDto, CreditQueryDto } from './credit.dto';
import { CreditStatus, Prisma } from '@prisma/client';

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  /**
   * Lazily resolve OVERDUE status for a credit record.
   * D7: jika jatuh_tempo < today && UNPAID/PARTIAL → treat as OVERDUE.
   */
  private resolveStatus(status: CreditStatus, jatuh_tempo: Date | null): CreditStatus {
    if (
      (status === CreditStatus.UNPAID || status === CreditStatus.PARTIAL) &&
      jatuh_tempo &&
      jatuh_tempo < new Date(new Date().setHours(0, 0, 0, 0))
    ) {
      return CreditStatus.OVERDUE;
    }
    return status;
  }

  private formatCredit(c: any) {
    return {
      ...c,
      jumlah: Number(c.jumlah),
      sisa: Number(c.sisa),
      status: this.resolveStatus(c.status, c.jatuh_tempo),
    };
  }

  /**
   * List credits with pagination + filters (customer_id, status, date range).
   * Always scoped to tenant_id.
   */
  async findAll(tenantId: string, outletId: string, query: CreditQueryDto) {
    const { page = 1, limit = 20, customer_id, status, date_from, date_to } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerCreditWhereInput = {
      tenant_id: tenantId,
      outlet_id: outletId,
      ...(customer_id ? { customer_id } : {}),
      ...(status ? { status: status as CreditStatus } : {}),
      ...(date_from || date_to
        ? {
            created_at: {
              ...(date_from ? { gte: new Date(date_from) } : {}),
              ...(date_to ? { lte: new Date(new Date(date_to).setHours(23, 59, 59, 999)) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.customerCredit.findMany({
        where,
        include: {
          customer: { select: { id: true, nama: true, phone: true } },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.customerCredit.count({ where }),
    ]);

    return {
      data: data.map((c) => this.formatCredit(c)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get single credit (scoped to tenant + outlet).
   */
  async findOne(id: string, tenantId: string, outletId: string) {
    const credit = await this.prisma.customerCredit.findFirst({
      where: { id, tenant_id: tenantId, outlet_id: outletId },
      include: { customer: { select: { id: true, nama: true, phone: true } } },
    });

    if (!credit) throw new NotFoundException('Kasbon tidak ditemukan');
    return this.formatCredit(credit);
  }

  /**
   * List overdue credits (UNPAID/PARTIAL with jatuh_tempo < today).
   * Roles: OWNER, MANAGER only (per S7).
   */
  async findOverdue(tenantId: string, outletId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = await this.prisma.customerCredit.findMany({
      where: {
        tenant_id: tenantId,
        outlet_id: outletId,
        jatuh_tempo: { lt: today },
        status: { in: [CreditStatus.UNPAID, CreditStatus.PARTIAL] },
      },
      include: { customer: { select: { id: true, nama: true, phone: true } } },
      orderBy: { jatuh_tempo: 'asc' },
    });

    return data.map((c) => this.formatCredit(c));
  }

  /**
   * Dashboard summary: SUM(sisa) where status in (UNPAID, PARTIAL, OVERDUE).
   * D8: ganti stub Sprint 5.
   */
  async getSummary(tenantId: string, outletId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Include UNPAID/PARTIAL that are still active OR overdue
    const agg = await this.prisma.customerCredit.aggregate({
      where: {
        tenant_id: tenantId,
        outlet_id: outletId,
        status: { in: [CreditStatus.UNPAID, CreditStatus.PARTIAL, CreditStatus.OVERDUE] },
      },
      _sum: { sisa: true },
      _count: { id: true },
    });

    // Count by resolved status (includes lazy overdue calculation)
    const unpaidCount = await this.prisma.customerCredit.count({
      where: {
        tenant_id: tenantId,
        outlet_id: outletId,
        status: CreditStatus.UNPAID,
        OR: [{ jatuh_tempo: null }, { jatuh_tempo: { gte: today } }],
      },
    });

    const partialCount = await this.prisma.customerCredit.count({
      where: {
        tenant_id: tenantId,
        outlet_id: outletId,
        status: CreditStatus.PARTIAL,
        OR: [{ jatuh_tempo: null }, { jatuh_tempo: { gte: today } }],
      },
    });

    const overdueCount = await this.prisma.customerCredit.count({
      where: {
        tenant_id: tenantId,
        outlet_id: outletId,
        status: { in: [CreditStatus.UNPAID, CreditStatus.PARTIAL, CreditStatus.OVERDUE] },
        jatuh_tempo: { lt: today },
      },
    });

    return {
      total_sisa: agg._sum.sisa ? Number(agg._sum.sisa) : 0,
      count_unpaid: unpaidCount,
      count_partial: partialCount,
      count_overdue: overdueCount,
    };
  }

  /**
   * Create a new kasbon entry.
   * B3: customer must exist and belong to tenant/outlet.
   */
  async create(dto: CreateCreditDto, tenantId: string, outletId: string) {
    // Verify customer scoped to tenant+outlet
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customer_id, tenant_id: tenantId, outlet_id: outletId },
    });

    if (!customer) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    const credit = await this.prisma.customerCredit.create({
      data: {
        tenant_id: tenantId,
        outlet_id: outletId,
        customer_id: dto.customer_id,
        jumlah: dto.jumlah,
        sisa: dto.jumlah, // sisa = jumlah awal
        keterangan: dto.keterangan,
        jatuh_tempo: dto.jatuh_tempo ? new Date(dto.jatuh_tempo) : null,
        status: CreditStatus.UNPAID,
      },
      include: { customer: { select: { id: true, nama: true, phone: true } } },
    });

    return this.formatCredit(credit);
  }

  /**
   * Pay a credit (partial or full).
   * S3: concurrent-safe via $transaction + re-read sisa.
   */
  async pay(id: string, dto: PayCreditDto, tenantId: string, outletId: string) {
    if (!dto.jumlah_bayar || dto.jumlah_bayar <= 0 || !Number.isFinite(dto.jumlah_bayar)) {
      throw new BadRequestException('Jumlah bayar harus angka positif');
    }

    return this.prisma.$transaction(async (tx) => {
      // Re-read inside transaction to handle concurrency (S3)
      const credit = await tx.customerCredit.findFirst({
        where: { id, tenant_id: tenantId, outlet_id: outletId },
      });

      if (!credit) throw new NotFoundException('Kasbon tidak ditemukan');

      if (credit.status === CreditStatus.PAID) {
        throw new BadRequestException('Kasbon sudah lunas');
      }

      // SEC-CREDIT-001: Atomic conditional update to prevent overpayment and negative balance under race conditions
      const updateResult = await tx.customerCredit.updateMany({
        where: {
          id,
          tenant_id: tenantId,
          outlet_id: outletId,
          sisa: { gte: dto.jumlah_bayar },
          status: { in: [CreditStatus.UNPAID, CreditStatus.PARTIAL, CreditStatus.OVERDUE] },
        },
        data: {
          sisa: { decrement: dto.jumlah_bayar },
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException(
          `Jumlah bayar (${dto.jumlah_bayar}) melebihi sisa kasbon saat ini atau kasbon sudah lunas`,
        );
      }

      // Re-query updated record to determine new status & sisa
      const updatedCredit = await tx.customerCredit.findFirst({
        where: { id, tenant_id: tenantId, outlet_id: outletId },
      });

      if (!updatedCredit) throw new NotFoundException('Kasbon tidak ditemukan');

      const sisaBaru = Number(updatedCredit.sisa);
      const newStatus = sisaBaru === 0 ? CreditStatus.PAID : CreditStatus.PARTIAL;

      const finalCredit = await tx.customerCredit.update({
        where: { id },
        data: {
          status: newStatus,
          paid_at: newStatus === CreditStatus.PAID ? new Date() : undefined,
          keterangan: dto.catatan
            ? `${credit.keterangan ? credit.keterangan + ' | ' : ''}Bayar: ${dto.catatan}`
            : credit.keterangan,
        },
        include: { customer: { select: { id: true, nama: true, phone: true } } },
      });

      this.logger.log(
        `Credit ${id} paid: ${dto.jumlah_bayar}, sisa: ${sisaBaru}, status: ${newStatus}`,
      );

      return this.formatCredit(finalCredit);
    });
  }

  /**
   * Send WA reminder for a credit (manual trigger).
   * S6: customer must have phone; rate-limit skipped for MVP.
   */
  async sendReminder(id: string, tenantId: string, outletId: string) {
    const credit = await this.findOne(id, tenantId, outletId);

    if (credit.status === CreditStatus.PAID) {
      throw new BadRequestException('Kasbon sudah lunas, tidak perlu pengingat');
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: credit.customer_id, tenant_id: tenantId, outlet_id: outletId },
    });

    if (!customer) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    if (!customer.phone) {
      throw new BadRequestException('Pelanggan tidak memiliki nomor HP untuk dikirim pengingat');
    }

    const sent = await this.whatsAppService.sendCreditReminder(customer.phone, {
      customerNama: customer.nama,
      sisa: credit.sisa,
      jatuhTempo: credit.jatuh_tempo,
    });

    return { sent, message: sent ? 'Pengingat berhasil dikirim' : 'Gagal mengirim pengingat' };
  }
}
