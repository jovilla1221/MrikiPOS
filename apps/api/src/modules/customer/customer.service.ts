import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from './customer.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List customers with pagination + search by nama or phone.
   * Always scoped to tenant_id + outlet_id.
   */
  async findAll(tenantId: string, outletId: string, query: CustomerQueryDto) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      tenant_id: tenantId,
      outlet_id: outletId,
      ...(search
        ? {
            OR: [
              { nama: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { nama: 'asc' },
        take: limit,
        skip,
        select: {
          id: true,
          nama: true,
          phone: true,
          alamat: true,
          total_belanja: true,
          poin: true,
          created_at: true,
          updated_at: true,
          _count: { select: { credits: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: data.map((c) => ({
        ...c,
        total_belanja: Number(c.total_belanja),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get single customer detail (scoped tenant + outlet).
   */
  async findOne(id: string, tenantId: string, outletId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenant_id: tenantId, outlet_id: outletId },
      include: {
        _count: { select: { credits: true, transactions: true } },
      },
    });

    if (!customer) throw new NotFoundException('Pelanggan tidak ditemukan');

    return {
      ...customer,
      total_belanja: Number(customer.total_belanja),
    };
  }

  /**
   * Create a new customer. Phone must be unique per tenant.
   */
  async create(dto: CreateCustomerDto, tenantId: string, outletId: string) {
    // S2: Phone uniqueness per tenant
    if (dto.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { tenant_id: tenantId, phone: dto.phone },
      });
      if (existing) {
        throw new ConflictException('Nomor HP sudah terdaftar untuk pelanggan lain');
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        tenant_id: tenantId,
        outlet_id: outletId,
        nama: dto.nama,
        phone: dto.phone,
        alamat: dto.alamat,
      },
    });

    return { ...customer, total_belanja: Number(customer.total_belanja) };
  }

  /**
   * Update customer. total_belanja/poin NOT updatable via client (D-rule).
   */
  async update(id: string, dto: UpdateCustomerDto, tenantId: string, outletId: string) {
    const customer = await this.findOne(id, tenantId, outletId);

    // S2: Phone uniqueness per tenant (exclude self)
    if (dto.phone && dto.phone !== customer.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { tenant_id: tenantId, phone: dto.phone, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Nomor HP sudah terdaftar untuk pelanggan lain');
      }
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        nama: dto.nama,
        phone: dto.phone,
        alamat: dto.alamat,
      },
    });

    return { ...updated, total_belanja: Number(updated.total_belanja) };
  }

  /**
   * Hard delete — only allowed if customer has 0 transactions and 0 credits.
   */
  async remove(id: string, tenantId: string, outletId: string) {
    const customer = await this.findOne(id, tenantId, outletId);

    const [txnCount, creditCount] = await Promise.all([
      this.prisma.transaction.count({ where: { customer_id: id } }),
      this.prisma.customerCredit.count({ where: { customer_id: id } }),
    ]);

    if (txnCount > 0 || creditCount > 0) {
      throw new ConflictException(
        'Pelanggan memiliki riwayat transaksi atau kasbon dan tidak dapat dihapus',
      );
    }

    await this.prisma.customer.delete({ where: { id } });
    return { message: 'Pelanggan berhasil dihapus' };
  }

  /**
   * Get transaction history for a customer (paginated).
   */
  async getHistory(id: string, tenantId: string, outletId: string, page = 1, limit = 20) {
    // Verify customer belongs to tenant+outlet
    await this.findOne(id, tenantId, outletId);

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { customer_id: id, tenant_id: tenantId, outlet_id: outletId },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip,
        select: {
          id: true,
          nomor: true,
          grand_total: true,
          metode_bayar: true,
          status: true,
          created_at: true,
        },
      }),
      this.prisma.transaction.count({
        where: { customer_id: id, tenant_id: tenantId, outlet_id: outletId },
      }),
    ]);

    return {
      data: data.map((t) => ({ ...t, grand_total: Number(t.grand_total) })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
