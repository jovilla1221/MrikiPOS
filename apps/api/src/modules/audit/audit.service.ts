import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditQueryDto, CreateAuditLogInput } from './audit.dto';
import { Prisma } from '@prisma/client';

const SENSITIVE_KEYS = new Set([
  'pin',
  'pin_hash',
  'otp',
  'token',
  'secret',
  'authorization',
  'password',
  'code_hash',
  'token_hash',
  'refresh_token',
  'access_token',
  'new_pin',
  'old_pin',
]);

export function redactSensitiveData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: CreateAuditLogInput, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    const sanitizedOld = input.oldValues ? redactSensitiveData(input.oldValues) : undefined;
    const sanitizedNew = input.newValues ? redactSensitiveData(input.newValues) : undefined;

    await client.auditLog.create({
      data: {
        tenant_id: input.tenantId,
        user_id: input.userId,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        old_values: sanitizedOld !== undefined ? (sanitizedOld as Prisma.InputJsonValue) : Prisma.JsonNull,
        new_values: sanitizedNew !== undefined ? (sanitizedNew as Prisma.InputJsonValue) : Prisma.JsonNull,
        ip_address: input.ipAddress,
        user_agent: input.userAgent,
      },
    });
  }

  async findAll(tenantId: string, query: AuditQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      tenant_id: tenantId,
    };

    if (query.user_id) {
      where.user_id = query.user_id;
    }

    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }

    if (query.entity_type) {
      where.entity_type = query.entity_type;
    }

    if (query.date_from || query.date_to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.date_from) {
        createdAt.gte = new Date(query.date_from);
      }
      if (query.date_to) {
        const toDate = new Date(query.date_to);
        toDate.setHours(23, 59, 59, 999);
        createdAt.lte = toDate;
      }

      if (query.date_from && query.date_to) {
        const diffDays =
          (new Date(query.date_to).getTime() - new Date(query.date_from).getTime()) /
          (1000 * 60 * 60 * 24);
        if (diffDays > 366) {
          throw new BadRequestException('Rentang tanggal maksimal 366 hari');
        }
      }

      where.created_at = createdAt;
    }

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              phone: true,
              role: true,
            },
          },
        },
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
    const auditLog = await this.prisma.auditLog.findFirst({
      where: {
        id,
        tenant_id: tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (!auditLog) {
      throw new NotFoundException('Audit log tidak ditemukan');
    }

    return auditLog;
  }
}
