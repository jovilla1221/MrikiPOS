import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, outletId: string) {
    return this.prisma.category.findMany({
      where: { tenant_id: tenantId, outlet_id: outletId, is_active: true },
      orderBy: { sort_order: 'asc' },
      include: {
        children: true,
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async findOne(id: string, tenantId: string, outletId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenant_id: tenantId, outlet_id: outletId, is_active: true },
      include: {
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }
    return category;
  }

  async create(dto: CreateCategoryDto, tenantId: string, outletId: string) {
    if (dto.parent_id) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parent_id, tenant_id: tenantId, outlet_id: outletId },
      });
      if (!parent) {
        throw new NotFoundException('Kategori induk tidak ditemukan');
      }
    }

    return this.prisma.category.create({
      data: {
        ...dto,
        tenant_id: tenantId,
        outlet_id: outletId,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto, tenantId: string, outletId: string) {
    await this.findOne(id, tenantId, outletId); // ensure it exists

    if (dto.parent_id) {
      if (dto.parent_id === id) {
        throw new BadRequestException('Kategori tidak bisa menjadi induk untuk dirinya sendiri');
      }
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parent_id, tenant_id: tenantId, outlet_id: outletId },
      });
      if (!parent) {
        throw new NotFoundException('Kategori induk tidak ditemukan');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, tenantId: string, outletId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenant_id: tenantId, outlet_id: outletId },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    if (category._count.products > 0) {
      throw new ConflictException(
        'Tidak dapat menghapus kategori karena masih ada produk yang terhubung',
      );
    }

    return this.prisma.category.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
