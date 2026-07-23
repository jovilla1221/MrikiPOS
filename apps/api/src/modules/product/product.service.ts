import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApprovalService } from '../approval/approval.service';
import { AuditService } from '../audit/audit.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './product.dto';
import { ApprovalType, UserRole } from '@mrikipos/shared-types';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit() {
    this.approvalService.registerExecutor(ApprovalType.PRICE_CHANGE, (tx, approval) =>
      this.executePriceChangeApproved(tx, approval),
    );
  }

  async findAll(tenantId: string, outletId: string, query: ProductQueryDto) {
    const { page = 1, limit = 20, category_id, is_active, low_stock, search } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      tenant_id: tenantId,
      outlet_id: outletId,
    };

    if (category_id) whereClause.category_id = category_id;
    if (is_active !== undefined) whereClause.is_active = is_active;
    if (search) {
      whereClause.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Low stock filter logic is handled by joining with stock_minimum logic in Prisma or finding all and filtering.
    // However, Prisma doesn't support where: { stok: { lt: prisma.product.stok_minimum } } directly in where objects yet.
    // We can do it by raw query or just fetch all active and filter, or fetch those where stok is less than stok_minimum.
    // Wait, prisma 6 supports column comparisons in raw queries or we can just filter it.
    // Let's keep it simple: Prisma 6 still doesn't natively do field1 < field2 without raw query or `where` raw.
    // If low_stock is true, we should get low stock. In inventory.service, I can fetch all active products and filter.
    // For now, let's just handle it.

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip,
        include: {
          category: true,
          variants: true,
        },
      }),
      this.prisma.product.count({ where: whereClause }),
    ]);

    // Handle low_stock post-query if low_stock is requested here, or we ignore it here because getLowStock is used in inventory.
    let finalData = data;
    if (low_stock) {
      finalData = finalData.filter((p) => p.stok <= p.stok_minimum);
    }

    return {
      data: finalData,
      meta: {
        page,
        limit,
        total: low_stock ? finalData.length : total, // approx if low_stock used here
        totalPages: Math.ceil((low_stock ? finalData.length : total) / limit),
      },
    };
  }

  async findOne(id: string, tenantId: string, outletId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenant_id: tenantId, outlet_id: outletId },
      include: {
        category: true,
        variants: true,
        stockHistory: {
          take: 10,
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }
    return product;
  }

  async search(tenantId: string, outletId: string, q: string) {
    return this.prisma.product.findMany({
      where: {
        tenant_id: tenantId,
        outlet_id: outletId,
        is_active: true,
        OR: [
          { nama: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
  }

  async create(dto: CreateProductDto, tenantId: string, outletId: string) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.barcode) {
        const existing = await tx.product.findFirst({
          where: { tenant_id: tenantId, barcode: dto.barcode },
        });
        if (existing) {
          throw new ConflictException('Barcode sudah digunakan produk lain');
        }
      }
      if (dto.sku) {
        const existingSku = await tx.product.findFirst({
          where: { tenant_id: tenantId, sku: dto.sku },
        });
        if (existingSku) {
          throw new ConflictException('SKU sudah digunakan produk lain');
        }
      }

      const product = await tx.product.create({
        data: {
          nama: dto.nama,
          harga_jual: dto.harga_jual,
          harga_beli: dto.harga_beli,
          stok: dto.stok || 0,
          stok_minimum: dto.stok_minimum || 5,
          barcode: dto.barcode,
          sku: dto.sku,
          satuan: dto.satuan,
          category_id: dto.category_id,
          foto_url: dto.foto_url,
          tenant_id: tenantId,
          outlet_id: outletId,
          variants: dto.variants
            ? {
                create: dto.variants.map((v) => ({
                  nama: v.nama,
                  sku: v.sku,
                  harga_jual: v.harga_jual,
                  stok: v.stok || 0,
                })),
              }
            : undefined,
        },
        include: {
          variants: true,
        },
      });

      if (product.stok > 0) {
        await tx.stockHistory.create({
          data: {
            tenant_id: tenantId,
            outlet_id: outletId,
            product_id: product.id,
            tipe: 'IN',
            qty: product.stok,
            stok_sebelum: 0,
            stok_sesudah: product.stok,
            keterangan: 'Stok awal produk',
          },
        });
      }

      return product;
    });
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    tenantId: string,
    outletId: string,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id, tenant_id: tenantId, outlet_id: outletId },
      });

      if (!product) {
        throw new NotFoundException('Produk tidak ditemukan');
      }

      if (dto.barcode && dto.barcode !== product.barcode) {
        const existing = await tx.product.findFirst({
          where: { tenant_id: tenantId, barcode: dto.barcode, id: { not: id } },
        });
        if (existing) throw new ConflictException('Barcode sudah digunakan produk lain');
      }

      if (dto.sku && dto.sku !== product.sku) {
        const existingSku = await tx.product.findFirst({
          where: { tenant_id: tenantId, sku: dto.sku, id: { not: id } },
        });
        if (existingSku) throw new ConflictException('SKU sudah digunakan produk lain');
      }

      const { stok, ...updateData } = dto;

      const updated = await tx.product.update({
        where: { id },
        data: updateData,
      });

      await this.auditService.log(
        {
          tenantId,
          userId: actorId,
          action: 'PRODUCT_UPDATED',
          entityType: 'Product',
          entityId: id,
          oldValues: {
            nama: product.nama,
            harga_jual: Number(product.harga_jual),
            harga_beli: product.harga_beli === null ? null : Number(product.harga_beli),
            stok_minimum: product.stok_minimum,
            is_active: product.is_active,
          },
          newValues: {
            nama: updated.nama,
            harga_jual: Number(updated.harga_jual),
            harga_beli: updated.harga_beli === null ? null : Number(updated.harga_beli),
            stok_minimum: updated.stok_minimum,
            is_active: updated.is_active,
          },
        },
        tx,
      );

      return updated;
    });
  }

  async remove(id: string, tenantId: string, outletId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenant_id: tenantId, outlet_id: outletId },
      include: {
        _count: {
          select: { transactionItems: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    if (product._count.transactionItems > 0) {
      throw new ConflictException(
        'Tidak dapat menghapus produk karena pernah digunakan dalam transaksi',
      );
    }

    return this.prisma.product.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async createPriceChangeRequest(
    id: string,
    hargaJualBaru: number,
    tenantId: string,
    outletId: string,
    requesterId: string,
    requesterRole: UserRole,
  ) {
    const product = await this.findOne(id, tenantId, outletId);

    if (hargaJualBaru <= 0) {
      throw new BadRequestException('Harga jual baru harus angka positif');
    }

    return this.approvalService.create(
      {
        type: ApprovalType.PRICE_CHANGE,
        reference_id: id,
        catatan: `Perubahan harga ${product.nama} dari ${product.harga_jual} ke ${hargaJualBaru}`,
        metadata: {
          harga_jual_lama: Number(product.harga_jual),
          harga_jual_baru: hargaJualBaru,
        },
      },
      tenantId,
      requesterId,
      requesterRole,
      outletId,
    );
  }

  async executePriceChangeApproved(tx: Prisma.TransactionClient, approval: any) {
    const product = await tx.product.findFirst({
      where: {
        id: approval.reference_id,
        tenant_id: approval.tenant_id,
        ...(approval.outlet_id ? { outlet_id: approval.outlet_id } : {}),
      },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    const newPrice = approval.metadata?.harga_jual_baru;
    if (!newPrice || typeof newPrice !== 'number' || newPrice <= 0) {
      throw new BadRequestException('Metadata harga_jual_baru tidak valid');
    }

    const updated = await tx.product.update({
      where: { id: product.id },
      data: { harga_jual: newPrice },
    });

    return { product_id: product.id, old_price: Number(product.harga_jual), new_price: newPrice };
  }
}
