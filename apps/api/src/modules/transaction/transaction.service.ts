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
import {
  CreateTransactionDto,
  VoidTransactionDto,
  RefundTransactionDto,
  TransactionQueryDto,
  SyncTransactionsDto,
} from './transaction.dto';

import {
  TransactionStatus,
  PaymentMethod,
  PaymentStatus,
  ApprovalType,
  UserRole,
} from '@mrikipos/shared-types';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionService implements OnModuleInit {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
  ) {}

  onModuleInit() {
    this.approvalService.registerExecutor(ApprovalType.VOID, (tx, approval) =>
      this.executeVoidApproved(tx, approval),
    );
  }

  /**
   * Create a new POS transaction
   * TXN-001 FIX: All validation & writes inside single $transaction to minimize TOCTOU
   * TXN-003 FIX: Harga resolved from DB, not trusted from client
   */
  async create(
    dto: CreateTransactionDto,
    userId: string,
    tenantId: string,
    outletId: string,
    localId?: string,
  ) {
    if (dto.items.length === 0) {
      throw new BadRequestException('Keranjang belanja kosong');
    }

    if (dto.payments.length === 0) {
      throw new BadRequestException('Metode pembayaran tidak disertakan');
    }

    // TXN-001 FIX: Everything inside $transaction to serialize reads+writes
    const result = await this.prisma.$transaction(async (tx) => {
      // OFF-003: Deduplicate using local_id column if provided
      if (localId) {
        const existing = await tx.transaction.findFirst({
          where: { tenant_id: tenantId, outlet_id: outletId, local_id: localId },
        });
        if (existing) {
          return { transaction: existing, kembalian: 0 };
        }
      }

      // 1. Validasi produk, stok, dan resolve harga dari DB (TXN-003 FIX)
      let subtotal = 0;
      const itemsData: any[] = [];
      const productUpdates: any[] = [];

      for (const item of dto.items) {
        const product = await tx.product.findFirst({
          where: {
            id: item.product_id,
            tenant_id: tenantId,
            outlet_id: outletId,
            is_active: true,
          },
        });

        if (!product) {
          throw new BadRequestException('Produk tidak ditemukan atau tidak aktif');
        }

        if (product.stok < item.qty) {
          throw new BadRequestException(
            `Stok produk ${product.nama} tidak mencukupi (Sisa: ${product.stok})`,
          );
        }

        // TXN-003 FIX: Gunakan harga dari DB, BUKAN dari client
        const hargaFromDb = Number(product.harga_jual);
        const itemDiskon = item.diskon_item || 0;

        // SEC-TX-003: Server-side invariant validation for item discount
        if (!Number.isFinite(itemDiskon) || itemDiskon < 0) {
          throw new BadRequestException(`Diskon item untuk produk ${product.nama} tidak valid`);
        }
        if (itemDiskon > hargaFromDb) {
          throw new BadRequestException(
            `Diskon item untuk produk ${product.nama} (Rp ${itemDiskon}) melebihi harga jual (Rp ${hargaFromDb})`,
          );
        }

        const itemSubtotal = (hargaFromDb - itemDiskon) * item.qty;
        subtotal += itemSubtotal;

        itemsData.push({
          product_id: item.product_id,
          variant_id: item.variant_id,
          nama_produk: product.nama,
          qty: item.qty,
          harga: hargaFromDb, // TXN-003: harga dari DB, bukan client
          diskon_item: itemDiskon,
          subtotal: itemSubtotal,
          catatan: item.catatan,
        });

        productUpdates.push({
          id: item.product_id,
          qty: item.qty,
          stok_sebelum: product.stok,
        });
      }

      // 2. Kalkulasi total
      const diskonTotal = dto.diskon || 0;

      // SEC-TX-003: Server-side invariant validation for total transaction discount
      if (!Number.isFinite(diskonTotal) || diskonTotal < 0) {
        throw new BadRequestException('Diskon total transaksi tidak valid');
      }
      if (diskonTotal > subtotal) {
        throw new BadRequestException(
          `Diskon total (Rp ${diskonTotal}) melebihi subtotal transaksi (Rp ${subtotal})`,
        );
      }
      const pajak = 0; // Sprint 1: pajak di-set 0
      const grandTotal = subtotal - diskonTotal + pajak;

      const totalBayar = dto.payments.reduce((acc, p) => acc + p.jumlah, 0);
      if (totalBayar < grandTotal) {
        throw new BadRequestException(
          `Jumlah bayar (Rp ${totalBayar}) kurang dari total (Rp ${grandTotal})`,
        );
      }

      // 3. Generate Nomor Transaksi (inside transaction to prevent duplicates — TXN-001)
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const lastTxn = await tx.transaction.findFirst({
        where: {
          outlet_id: outletId,
          created_at: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
        orderBy: { created_at: 'desc' },
      });

      let counter = 1;
      if (lastTxn && lastTxn.nomor.includes(dateStr)) {
        const parts = lastTxn.nomor.split('-');
        if (parts.length >= 3) {
          counter = parseInt(parts[2], 10) + 1;
        }
      }
      const randomSuffix = randomBytes(2).toString('hex').toUpperCase();
      const nomor = `TXN-${dateStr}-${counter.toString().padStart(3, '0')}-${randomSuffix}`;

      // Check if transaction payment is QRIS (PENDING until webhook confirms)
      const isQris = dto.payments.some(
        (p) => p.metode === PaymentMethod.QRIS || (p.metode as string) === 'QRIS',
      );

      const initialTxnStatus = isQris ? TransactionStatus.PENDING : TransactionStatus.COMPLETED;
      const initialPaymentStatus = isQris ? PaymentStatus.PENDING : PaymentStatus.PAID;

      // Find current open shift for this kasir (D3/D4)
      const openShift = await tx.shift.findFirst({
        where: {
          tenant_id: tenantId,
          outlet_id: outletId,
          user_id: userId,
          status: 'OPEN',
        },
      });

      // 4. Buat Transaksi
      const transaction = await tx.transaction.create({
        data: {
          tenant_id: tenantId,
          outlet_id: outletId,
          shift_id: openShift ? openShift.id : null,
          kasir_id: userId,
          customer_id: dto.customer_id,
          nomor,
          subtotal: subtotal,
          diskon: diskonTotal,
          pajak: pajak,
          grand_total: grandTotal,
          metode_bayar: dto.payments.length > 1 ? PaymentMethod.MULTI : dto.payments[0].metode,
          status: initialTxnStatus,
          catatan: dto.catatan,
          local_id: localId || null,
          synced_at: localId ? now : null,
          items: {
            create: itemsData,
          },
          payments: {
            create: dto.payments.map((p) => ({
              metode: p.metode,
              jumlah: p.jumlah,
              status: initialPaymentStatus,
            })),
          },
        },
        include: {
          items: true,
          payments: true,
          kasir: { select: { id: true, nama: true } },
        },
      });

      // 5. Update Stok, Shift Aggregates & Customer Total Belanja (HANYA jika bukan QRIS / status COMPLETED)
      if (!isQris) {
        for (const update of productUpdates) {
          // SEC-TX-002: Atomic conditional stock decrement to prevent negative stock
          const updateResult = await tx.product.updateMany({
            where: {
              id: update.id,
              stok: { gte: update.qty },
            },
            data: {
              stok: { decrement: update.qty },
            },
          });

          if (updateResult.count === 0) {
            throw new BadRequestException(`Stok produk tidak mencukupi saat memproses transaksi`);
          }

          await tx.stockHistory.create({
            data: {
              tenant_id: tenantId,
              outlet_id: outletId,
              product_id: update.id,
              tipe: 'OUT',
              qty: update.qty,
              stok_sebelum: update.stok_sebelum,
              stok_sesudah: update.stok_sebelum - update.qty,
              keterangan: `Terjual (Trx: ${nomor})`,
              reference_id: transaction.id,
            },
          });
        }

        // Update Shift totals if attached (D4)
        if (openShift) {
          await tx.shift.update({
            where: { id: openShift.id },
            data: {
              total_penjualan: { increment: grandTotal },
              total_transaksi: { increment: 1 },
            },
          });
        }

        // Update Customer total_belanja if specified
        if (dto.customer_id) {
          await tx.customer.update({
            where: { id: dto.customer_id },
            data: {
              total_belanja: { increment: grandTotal },
            },
          });
        }
      }

      return { transaction, kembalian: isQris ? 0 : totalBayar - grandTotal };
    });

    // TODO: Emit websocket event `transaction:completed`
    // TODO: Check low stock alert

    return {
      ...result.transaction,
      kembalian: result.kembalian,
    };
  }

  /**
   * Get all transactions with pagination and filters
   */
  async findAll(tenantId: string, outletId: string, query: TransactionQueryDto) {
    const { page = 1, limit = 20, date_from, date_to, status, search } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      tenant_id: tenantId,
      outlet_id: outletId,
    };

    if (status) whereClause.status = status;
    if (search) whereClause.nomor = { contains: search, mode: 'insensitive' };

    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) {
        const fromDate = new Date(date_from);
        fromDate.setHours(0, 0, 0, 0);
        whereClause.created_at.gte = fromDate;
      }
      if (date_to) {
        const toDate = new Date(date_to);
        toDate.setHours(23, 59, 59, 999);
        whereClause.created_at.lte = toDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: whereClause,
        include: {
          kasir: { select: { nama: true } },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.transaction.count({ where: whereClause }),
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

  /**
   * Get single transaction detail
   * TXN-002 FIX: Filter by outlet_id to prevent cross-outlet data leakage
   */
  async findOne(id: string, tenantId: string, outletId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, tenant_id: tenantId, outlet_id: outletId },
      include: {
        items: true,
        payments: true,
        kasir: { select: { id: true, nama: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    return transaction;
  }

  /**
   * Void transaction
   */
  async voidTransaction(
    id: string,
    tenantId: string,
    outletId: string,
    dto: VoidTransactionDto,
    userId: string,
  ) {
    const transaction = await this.findOne(id, tenantId, outletId);

    if (transaction.status === TransactionStatus.VOIDED) {
      throw new BadRequestException('Transaksi ini sudah divoid');
    }

    // Validasi PIN User yang meminta void
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenant_id: tenantId },
    });

    if (!user || user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Hanya Owner yang dapat melakukan direct void transaksi');
    }

    const isPinValid = await bcrypt.compare(dto.pin, user.pin_hash);
    if (!isPinValid) {
      throw new ForbiddenException('PIN salah');
    }

    // Lakukan proses Void di dalam transaction
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.transaction.findFirst({
        where: {
          id,
          tenant_id: tenantId,
          outlet_id: outletId,
          status: TransactionStatus.COMPLETED,
        },
        include: { items: true },
      });

      if (!current) {
        throw new BadRequestException('Transaksi sudah diproses atau tidak dapat divoid');
      }

      const claimResult = await tx.transaction.updateMany({
        where: {
          id,
          tenant_id: tenantId,
          outlet_id: outletId,
          status: TransactionStatus.COMPLETED,
        },
        data: {
          status: TransactionStatus.VOIDED,
          catatan: current.catatan
            ? `${current.catatan} | VOID: ${dto.alasan}`
            : `VOID: ${dto.alasan}`,
        },
      });

      if (claimResult.count !== 1) {
        throw new ConflictException('Transaksi sedang diproses oleh request void lain');
      }

      // 2. Kembalikan stok
      for (const item of current.items) {
        const product = await tx.product.findFirst({
          where: { id: item.product_id, tenant_id: tenantId, outlet_id: outletId },
        });
        if (product) {
          await tx.product.update({
            where: { id: item.product_id },
            data: { stok: { increment: item.qty } },
          });

          await tx.stockHistory.create({
            data: {
              tenant_id: tenantId,
              outlet_id: current.outlet_id,
              product_id: item.product_id,
              tipe: 'IN',
              qty: item.qty,
              stok_sebelum: product.stok,
              stok_sesudah: product.stok + item.qty,
              keterangan: `Void Transaksi: ${current.nomor}`,
              reference_id: current.id,
            },
          });
        }
      }

      // 3. Decrement shift totals if shift_id set (D5)
      if (current.shift_id) {
        const shift = await tx.shift.findUnique({ where: { id: current.shift_id } });
        if (shift) {
          const currentPenjualan = Number(shift.total_penjualan);
          const grandTotalNum = Number(current.grand_total);
          await tx.shift.update({
            where: { id: current.shift_id },
            data: {
              total_penjualan: Math.max(0, currentPenjualan - grandTotalNum),
              total_transaksi: Math.max(0, shift.total_transaksi - 1),
            },
          });
        }
      }
    });

    return { message: 'Transaksi berhasil divoid' };
  }

  /**
   * Get Sales Summary
   */
  async getSummary(tenantId: string, outletId: string, dateFrom?: string, dateTo?: string) {
    const whereClause: any = {
      tenant_id: tenantId,
      outlet_id: outletId,
      status: TransactionStatus.COMPLETED,
    };

    if (dateFrom || dateTo) {
      whereClause.created_at = {};
      if (dateFrom) whereClause.created_at.gte = new Date(dateFrom);
      if (dateTo) whereClause.created_at.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    } else {
      // Default hari ini
      const today = new Date();
      whereClause.created_at = {
        gte: new Date(today.setHours(0, 0, 0, 0)),
        lte: new Date(today.setHours(23, 59, 59, 999)),
      };
    }

    const aggregations = await this.prisma.transaction.aggregate({
      where: whereClause,
      _sum: {
        grand_total: true,
        diskon: true,
      },
      _count: {
        id: true,
      },
    });

    const total_penjualan = aggregations._sum.grand_total
      ? Number(aggregations._sum.grand_total)
      : 0;
    const total_transaksi = aggregations._count.id;
    const rata_rata_transaksi = total_transaksi > 0 ? total_penjualan / total_transaksi : 0;

    // Ambil rekap metode bayar
    const payments = await this.prisma.payment.groupBy({
      by: ['metode'],
      where: {
        transaction: whereClause,
        status: PaymentStatus.PAID,
      },
      _sum: {
        jumlah: true,
      },
      _count: {
        id: true,
      },
    });

    const by_payment_method = payments.map((p) => ({
      metode: p.metode,
      jumlah: p._sum.jumlah ? Number(p._sum.jumlah) : 0,
      count: p._count.id,
    }));

    return {
      period: 'custom',
      summary: {
        total_penjualan,
        total_transaksi,
        rata_rata_transaksi,
        total_diskon: aggregations._sum.diskon ? Number(aggregations._sum.diskon) : 0,
        total_pajak: 0,
        net_sales: total_penjualan, // disederhanakan
      },
      by_payment_method,
    };
  }

  /**
   * Batch sync offline transactions
   */
  async syncBatch(dto: SyncTransactionsDto, userId: string, tenantId: string, outletId: string) {
    const results: Array<{
      local_id: string;
      server_id?: string;
      status: 'synced' | 'failed';
      error?: string;
    }> = [];
    let synced = 0;
    let failed = 0;

    for (const item of dto.transactions) {
      try {
        // OFF-003: Query local_id column directly for robust idempotency
        const existingTxn = await this.prisma.transaction.findFirst({
          where: {
            tenant_id: tenantId,
            outlet_id: outletId,
            local_id: item.local_id,
          },
        });

        if (existingTxn) {
          results.push({
            local_id: item.local_id,
            server_id: existingTxn.id,
            status: 'synced',
          });
          synced++;
          continue;
        }

        const res = await this.create(item, userId, tenantId, outletId, item.local_id);

        results.push({
          local_id: item.local_id,
          server_id: res.id,
          status: 'synced',
        });
        synced++;
      } catch (err: any) {
        this.logger.error(
          `Error syncing transaction local_id ${item.local_id}: ${err?.message}`,
          err?.stack,
        );
        // OFF-008: Generic Indonesian error message to prevent leaking internal database/Prisma details
        results.push({
          local_id: item.local_id,
          status: 'failed',
          error: 'Gagal memproses transaksi offline',
        });
        failed++;
      }
    }

    return {
      synced,
      failed,
      results,
    };
  }

  async createVoidRequest(
    id: string,
    tenantId: string,
    outletId: string,
    alasan: string,
    requesterId: string,
    requesterRole: UserRole,
  ) {
    const transaction = await this.findOne(id, tenantId, outletId);

    if (transaction.status === TransactionStatus.VOIDED) {
      throw new BadRequestException('Transaksi ini sudah divoid');
    }

    return this.approvalService.create(
      {
        type: ApprovalType.VOID,
        reference_id: id,
        catatan: alasan,
        metadata: { alasan },
      },
      tenantId,
      requesterId,
      requesterRole,
      outletId,
    );
  }

  async executeVoidApproved(tx: Prisma.TransactionClient, approval: any) {
    const transaction = await tx.transaction.findFirst({
      where: {
        id: approval.reference_id,
        tenant_id: approval.tenant_id,
        ...(approval.outlet_id ? { outlet_id: approval.outlet_id } : {}),
        status: TransactionStatus.COMPLETED,
      },
      include: { items: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    const claimResult = await tx.transaction.updateMany({
      where: {
        id: transaction.id,
        tenant_id: approval.tenant_id,
        status: TransactionStatus.COMPLETED,
        ...(approval.outlet_id ? { outlet_id: approval.outlet_id } : {}),
      },
      data: {
        status: TransactionStatus.VOIDED,
        catatan: transaction.catatan
          ? `${transaction.catatan} | VOID Approved: ${approval.catatan || 'Approved'}`
          : `VOID Approved: ${approval.catatan || 'Approved'}`,
      },
    });

    if (claimResult.count !== 1) {
      throw new BadRequestException('Transaksi sudah diproses atau tidak dapat divoid');
    }

    for (const item of transaction.items) {
      const product = await tx.product.findFirst({
        where: {
          id: item.product_id,
          tenant_id: approval.tenant_id,
          outlet_id: transaction.outlet_id,
        },
      });
      if (product) {
        await tx.product.update({
          where: { id: item.product_id },
          data: { stok: { increment: item.qty } },
        });

        await tx.stockHistory.create({
          data: {
            tenant_id: approval.tenant_id,
            outlet_id: transaction.outlet_id,
            product_id: item.product_id,
            tipe: 'IN',
            qty: item.qty,
            stok_sebelum: product.stok,
            stok_sesudah: product.stok + item.qty,
            keterangan: `Void Approved: ${transaction.nomor}`,
            reference_id: transaction.id,
          },
        });
      }
    }

    if (transaction.shift_id) {
      await tx.shift.update({
        where: { id: transaction.shift_id },
        data: {
          total_penjualan: { decrement: transaction.grand_total },
          total_transaksi: { decrement: 1 },
        },
      });
    }

    return { transaction_id: transaction.id, nomor: transaction.nomor, status: 'VOIDED' };
  }
}
