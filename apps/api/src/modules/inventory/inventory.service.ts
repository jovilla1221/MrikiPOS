import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StockAdjustmentDto, StockHistoryQueryDto } from './inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async adjustStock(
    productId: string,
    dto: StockAdjustmentDto,
    tenantId: string,
    outletId: string,
    userId: string,
  ) {
    if (dto.qty === 0) {
      throw new BadRequestException('Kuantitas tidak boleh 0');
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, tenant_id: tenantId, outlet_id: outletId },
      });

      if (!product) {
        throw new NotFoundException('Produk tidak ditemukan');
      }

      const stokSebelum = product.stok;
      let stokSesudah: number;
      let prismaStockType: 'IN' | 'OUT' | 'ADJUSTMENT';

      switch (dto.type) {
        case 'in':
          if (dto.qty < 0) throw new BadRequestException('Kuantitas masuk tidak boleh negatif');
          stokSesudah = stokSebelum + dto.qty;
          prismaStockType = 'IN';
          break;
        case 'out':
          if (dto.qty < 0) throw new BadRequestException('Kuantitas keluar tidak boleh negatif');
          if (stokSebelum < dto.qty) {
            throw new BadRequestException('Stok tidak mencukupi untuk dikeluarkan');
          }
          stokSesudah = stokSebelum - dto.qty;
          prismaStockType = 'OUT';
          break;
        case 'adjustment':
          stokSesudah = stokSebelum + dto.qty; // qty can be negative for adjustment
          if (stokSesudah < 0) {
            throw new BadRequestException(
              'Hasil penyesuaian (adjustment) stok tidak boleh negatif',
            );
          }
          prismaStockType = 'ADJUSTMENT';
          break;
        default:
          throw new BadRequestException('Tipe tidak valid');
      }

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stok: stokSesudah },
      });

      await tx.stockHistory.create({
        data: {
          tenant_id: tenantId,
          outlet_id: outletId,
          product_id: productId,
          tipe: prismaStockType,
          qty: dto.qty,
          stok_sebelum: stokSebelum,
          stok_sesudah: stokSesudah,
          keterangan: dto.keterangan,
        },
      });

      return updatedProduct;
    });
  }

  async getHistory(tenantId: string, outletId: string, query: StockHistoryQueryDto) {
    const { page = 1, limit = 20, product_id, type, date_from, date_to } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      tenant_id: tenantId,
      outlet_id: outletId,
    };

    if (product_id) whereClause.product_id = product_id;
    if (type) whereClause.tipe = type;

    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) whereClause.created_at.gte = new Date(date_from);
      if (date_to)
        whereClause.created_at.lte = new Date(new Date(date_to).setHours(23, 59, 59, 999));
    }

    const [data, total] = await Promise.all([
      this.prisma.stockHistory.findMany({
        where: whereClause,
        include: {
          product: {
            select: { nama: true, sku: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.stockHistory.count({ where: whereClause }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLowStock(tenantId: string, outletId: string) {
    // Database-level filtering for low stock instead of fetching all products into memory
    const lowStockProducts: any[] = await this.prisma.$queryRaw`
      SELECT 
        p.id, p.tenant_id, p.outlet_id, p.category_id, p.nama, p.sku, p.barcode,
        p.harga_jual, p.harga_beli, p.stok, p.stok_minimum, p.satuan, p.foto_url,
        p.is_active, p.created_at, p.updated_at,
        CASE 
          WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'nama', c.nama)
          ELSE NULL 
        END as category
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.tenant_id = ${tenantId}::uuid
        AND p.outlet_id = ${outletId}::uuid
        AND p.is_active = true
        AND p.stok <= p.stok_minimum
      ORDER BY p.stok ASC
    `;

    return lowStockProducts;
  }
}
