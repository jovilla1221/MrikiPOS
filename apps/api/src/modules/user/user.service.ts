import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../../database/redis.service';
import { CreateUserDto, UpdateUserDto, ResetUserPinDto, UserQueryDto } from './user.dto';
import { UserRole } from '@mrikipos/shared-types';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

type UserDbClient = PrismaService | Prisma.TransactionClient;

const USER_SELECT_FIELDS = {
  id: true,
  tenant_id: true,
  outlet_id: true,
  nama: true,
  phone: true,
  role: true,
  is_active: true,
  last_login: true,
  created_at: true,
  updated_at: true,
  outlet: {
    select: {
      id: true,
      nama: true,
    },
  },
};

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly redis: RedisService,
  ) {}

  private async revokeUserSessions(userId: string) {
    // Revoke all refresh tokens for target user in DB
    await this.prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked: false },
      data: { revoked: true, revoked_at: new Date() },
    });
    await this.redis.set(`revoked_after:${userId}`, String(Math.floor(Date.now() / 1000)), 15 * 60);
  }

  private async checkLastOwnerProtection(
    targetUserId: string,
    tenantId: string,
    client: UserDbClient = this.prisma,
  ) {
    const targetUser = await client.user.findFirst({
      where: { id: targetUserId, tenant_id: tenantId },
    });

    if (!targetUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (targetUser.role === UserRole.OWNER && targetUser.is_active) {
      const activeOwnersCount = await client.user.count({
        where: {
          tenant_id: tenantId,
          role: UserRole.OWNER,
          is_active: true,
        },
      });

      if (activeOwnersCount <= 1) {
        throw new ForbiddenException(
          'Tidak dapat menonaktifkan atau mengubah role Owner aktif terakhir',
        );
      }
    }

    return targetUser;
  }

  async findAll(tenantId: string, query: UserQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      tenant_id: tenantId,
    };

    if (query.role) {
      where.role = query.role;
    }

    if (query.outlet_id) {
      where.outlet_id = query.outlet_id;
    }

    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }

    if (query.search) {
      where.OR = [
        { nama: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: USER_SELECT_FIELDS,
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

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
      select: USER_SELECT_FIELDS,
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return user;
  }

  async create(dto: CreateUserDto, tenantId: string, actorId: string) {
    // 1. Verify outlet belongs to tenant
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: dto.outlet_id, tenant_id: tenantId },
    });
    if (!outlet) {
      throw new BadRequestException('Outlet tidak ditemukan pada tenant ini');
    }

    // 2. Verify phone uniqueness per tenant
    const existingPhone = await this.prisma.user.findFirst({
      where: { tenant_id: tenantId, phone: dto.phone },
    });
    if (existingPhone) {
      throw new ConflictException('Nomor telepon sudah terdaftar pada tenant ini');
    }

    // 3. Hash PIN cost 12
    const pin_hash = await bcrypt.hash(dto.pin, 12);

    // 4. Create user inside transaction with audit
    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenant_id: tenantId,
          outlet_id: dto.outlet_id,
          nama: dto.nama,
          phone: dto.phone,
          pin_hash,
          role: dto.role,
          is_active: true,
        },
        select: USER_SELECT_FIELDS,
      });

      await this.auditService.log(
        {
          tenantId,
          userId: actorId,
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: user.id,
          newValues: {
            nama: user.nama,
            phone: user.phone,
            role: user.role,
            outlet_id: user.outlet_id,
          },
        },
        tx,
      );

      return user;
    });

    return newUser;
  }

  async update(id: string, dto: UpdateUserDto, tenantId: string, actorId: string) {
    const targetUser = await this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!targetUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Protection for last owner
    if (
      (dto.role && dto.role !== targetUser.role) ||
      (dto.is_active !== undefined && !dto.is_active)
    ) {
      await this.checkLastOwnerProtection(id, tenantId);
    }

    if (dto.outlet_id) {
      const outlet = await this.prisma.outlet.findFirst({
        where: { id: dto.outlet_id, tenant_id: tenantId },
      });
      if (!outlet) {
        throw new BadRequestException('Outlet tidak ditemukan pada tenant ini');
      }
    }

    if (dto.phone && dto.phone !== targetUser.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: { tenant_id: tenantId, phone: dto.phone, NOT: { id } },
      });
      if (existingPhone) {
        throw new ConflictException('Nomor telepon sudah terdaftar pada tenant ini');
      }
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      if (
        (dto.role && dto.role !== targetUser.role) ||
        (dto.is_active !== undefined && !dto.is_active)
      ) {
        await this.checkLastOwnerProtection(id, tenantId, tx);
      }

      const user = await tx.user.update({
        where: { id },
        data: {
          ...(dto.nama && { nama: dto.nama }),
          ...(dto.phone && { phone: dto.phone }),
          ...(dto.role && { role: dto.role }),
          ...(dto.outlet_id && { outlet_id: dto.outlet_id }),
          ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        },
        select: USER_SELECT_FIELDS,
      });

      await this.auditService.log(
        {
          tenantId,
          userId: actorId,
          action: 'USER_UPDATED',
          entityType: 'User',
          entityId: user.id,
          oldValues: {
            nama: targetUser.nama,
            phone: targetUser.phone,
            role: targetUser.role,
            outlet_id: targetUser.outlet_id,
            is_active: targetUser.is_active,
          },
          newValues: {
            nama: user.nama,
            phone: user.phone,
            role: user.role,
            outlet_id: user.outlet_id,
            is_active: user.is_active,
          },
        },
        tx,
      );

      return user;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // Revoke session if role or status changed
    if (
      (dto.role && dto.role !== targetUser.role) ||
      (dto.is_active !== undefined && dto.is_active !== targetUser.is_active)
    ) {
      await this.revokeUserSessions(id);
    }

    return updatedUser;
  }

  async resetPin(id: string, dto: ResetUserPinDto, tenantId: string, actorId: string) {
    const targetUser = await this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!targetUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const pin_hash = await bcrypt.hash(dto.new_pin, 12);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { pin_hash },
      });

      await this.auditService.log(
        {
          tenantId,
          userId: actorId,
          action: 'USER_PIN_RESET',
          entityType: 'User',
          entityId: id,
        },
        tx,
      );
    });

    await this.revokeUserSessions(id);

    return { message: 'PIN berhasil diperbarui' };
  }

  async setStatus(id: string, is_active: boolean, tenantId: string, actorId: string) {
    return this.update(id, { is_active }, tenantId, actorId);
  }

  async remove(id: string, tenantId: string, actorId: string) {
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await this.checkLastOwnerProtection(id, tenantId, tx);

      const user = await tx.user.update({
        where: { id },
        data: { is_active: false },
        select: USER_SELECT_FIELDS,
      });

      await this.auditService.log(
        {
          tenantId,
          userId: actorId,
          action: 'USER_DEACTIVATED',
          entityType: 'User',
          entityId: id,
        },
        tx,
      );

      return user;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await this.revokeUserSessions(id);

    return updatedUser;
  }
}
