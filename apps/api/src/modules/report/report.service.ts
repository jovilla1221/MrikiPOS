import { Injectable, Logger, BadRequestException, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TransactionStatus } from '@mrikipos/shared-types';
import {
  SalesReportItem,
  ProfitLossReport,
  TopProduct,
  CashierReportItem,
} from '@mrikipos/shared-types';
import { ReportQueryDto, ExportQueryDto } from './report.dto';

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Sanitasi satu cell untuk mencegah formula injection & CSV delimiter breakage.
 * S5: prefix dengan apostrof jika cell dimulai dengan karakter berbahaya.
 */
export function sanitizeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  let sanitized = str;
  // Prefix apostrof untuk formula injection prevention
  if (/^[=+\-@\t\r]/.test(sanitized)) {
    sanitized = `'${sanitized}`;
  }
  // Escape quotes, commas, and newlines for CSV compliance
  if (/[",\n\r]/.test(sanitized)) {
    sanitized = `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

function buildDateFilter(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) {
    // Default hari ini
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  const filter: { gte?: Date; lte?: Date } = {};
  let start: Date | undefined;
  let end: Date | undefined;

  if (dateFrom) {
    start = new Date(dateFrom);
    if (isNaN(start.getTime())) {
      throw new BadRequestException('Format date_from tidak valid');
    }
    start.setHours(0, 0, 0, 0);
    filter.gte = start;
  }

  if (dateTo) {
    end = new Date(dateTo);
    if (isNaN(end.getTime())) {
      throw new BadRequestException('Format date_to tidak valid');
    }
    end.setHours(23, 59, 59, 999);
    filter.lte = end;
  }

  if (start && end) {
    if (start > end) {
      throw new BadRequestException(
        'Tanggal awal (date_from) tidak boleh setelah tanggal akhir (date_to)',
      );
    }
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 366) {
      throw new BadRequestException('Rentang tanggal laporan maksimal 1 tahun (366 hari)');
    }
  }

  return filter;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── A3.1: Sales Report ────────────────────────────────────────────────────

  /**
   * Laporan penjualan agregat.
   * Jika period = daily  → group by DATE(created_at)
   * Jika period = monthly → group by YYYY-MM
   * Jika period = weekly  → group by ISO-week
   * Selalu filter tenant_id + outlet_id (S1)
   */
  async getSales(
    tenantId: string,
    outletId: string,
    query: ReportQueryDto,
  ): Promise<SalesReportItem[]> {
    const { date_from, date_to, period = 'daily' } = query;

    // S1: Wajib filter tenant_id + outlet_id
    const transactions = await this.prisma.transaction.findMany({
      where: {
        tenant_id: tenantId,
        outlet_id: outletId,
        status: TransactionStatus.COMPLETED,
        created_at: buildDateFilter(date_from, date_to),
      },
      select: {
        created_at: true,
        grand_total: true,
        diskon: true,
      },
      orderBy: { created_at: 'asc' },
    });

    // Group di-memory — aman karena jumlah transaksi normal per-periode terbatas
    const map = new Map<string, SalesReportItem>();

    for (const txn of transactions) {
      const key = this.getPeriodKey(txn.created_at, period);

      if (!map.has(key)) {
        map.set(key, {
          period: key,
          total_penjualan: 0,
          total_transaksi: 0,
          total_diskon: 0,
          total_pajak: 0,
        });
      }

      const row = map.get(key)!;
      row.total_penjualan += Number(txn.grand_total);
      row.total_transaksi += 1;
      row.total_diskon += Number(txn.diskon ?? 0);
      // pajak Sprint 5: selalu 0
    }

    return Array.from(map.values());
  }

  private getPeriodKey(date: Date, period: string): string {
    const d = new Date(date);
    if (period === 'monthly') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    if (period === 'weekly') {
      // ISO-week: YYYY-W##
      const thursday = new Date(d);
      thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
      const jan4 = new Date(thursday.getFullYear(), 0, 4);
      const week = Math.round(((thursday.getTime() - jan4.getTime()) / 86400000 + 1) / 7);
      return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }
    // default daily: YYYY-MM-DD
    return d.toISOString().split('T')[0];
  }

  // ── A3.2: Profit-Loss ─────────────────────────────────────────────────────

  /**
   * Hitung laba kotor dari transaction_items.
   * D3: Hitung di service, bukan DB aggregation.
   * Skip produk tanpa harga_beli (catat count).
   * S1: Wajib filter tenant_id + outlet_id.
   */
  async getProfitLoss(
    tenantId: string,
    outletId: string,
    query: ReportQueryDto,
  ): Promise<ProfitLossReport> {
    const { date_from, date_to } = query;

    // A4: Query pattern sesuai plan — anti SQL injection via Prisma ORM
    const items = await this.prisma.transactionItem.findMany({
      where: {
        transaction: {
          tenant_id: tenantId,
          outlet_id: outletId,
          status: TransactionStatus.COMPLETED,
          created_at: buildDateFilter(date_from, date_to),
        },
      },
      select: {
        qty: true,
        subtotal: true,
        product: {
          select: {
            harga_beli: true,
            nama: true,
          },
        },
      },
    });

    let totalPenjualan = 0;
    let totalModal = 0;
    let itemsDihitung = 0;
    let itemsTanpaModal = 0;

    for (const item of items) {
      const hargaBeli =
        item.product?.harga_beli !== null && item.product?.harga_beli !== undefined
          ? Number(item.product.harga_beli)
          : null;

      totalPenjualan += Number(item.subtotal);

      if (hargaBeli !== null && !isNaN(hargaBeli)) {
        totalModal += hargaBeli * item.qty;
        itemsDihitung++;
      } else {
        itemsTanpaModal++;
      }
    }

    return {
      total_penjualan: totalPenjualan,
      total_modal: totalModal,
      total_laba_kotor: totalPenjualan - totalModal,
      items_dihitung: itemsDihitung,
      items_tanpa_modal: itemsTanpaModal,
    };
  }

  // ── A3.3: Top Products ────────────────────────────────────────────────────

  /**
   * Top N produk terlaris berdasarkan qty.
   * S1: filter tenant_id + outlet_id.
   */
  async getTopProducts(
    tenantId: string,
    outletId: string,
    query: ReportQueryDto,
  ): Promise<TopProduct[]> {
    const { date_from, date_to, limit = 10 } = query;

    // Gunakan groupBy Prisma — aman dari SQL injection
    const grouped = await this.prisma.transactionItem.groupBy({
      by: ['product_id'],
      where: {
        transaction: {
          tenant_id: tenantId,
          outlet_id: outletId,
          status: TransactionStatus.COMPLETED,
          created_at: buildDateFilter(date_from, date_to),
        },
      },
      _sum: {
        qty: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          qty: 'desc',
        },
      },
      take: limit,
    });

    if (grouped.length === 0) return [];

    // Fetch product detail untuk nama & kategori (S1: tenant_id & outlet_id filter)
    const productIds = grouped.map((g) => g.product_id);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        tenant_id: tenantId,
        outlet_id: outletId,
      },
      select: {
        id: true,
        nama: true,
        category: { select: { nama: true } },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return grouped.map((g) => {
      const product = productMap.get(g.product_id);
      return {
        product_id: g.product_id,
        nama: product?.nama ?? 'Produk Dihapus',
        category_name: product?.category?.nama ?? null,
        qty_terjual: g._sum.qty ?? 0,
        total_penjualan: Number(g._sum.subtotal ?? 0),
      };
    });
  }

  // ── A3.4: Cashier Summary ─────────────────────────────────────────────────

  /**
   * Rekap penjualan per kasir.
   * S1: filter tenant_id + outlet_id.
   */
  async getCashierSummary(
    tenantId: string,
    outletId: string,
    query: ReportQueryDto,
  ): Promise<CashierReportItem[]> {
    const { date_from, date_to } = query;

    const grouped = await this.prisma.transaction.groupBy({
      by: ['kasir_id'],
      where: {
        tenant_id: tenantId,
        outlet_id: outletId,
        status: TransactionStatus.COMPLETED,
        created_at: buildDateFilter(date_from, date_to),
      },
      _count: { id: true },
      _sum: { grand_total: true },
    });

    if (grouped.length === 0) return [];

    const kasirIds = grouped.map((g) => g.kasir_id);
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: kasirIds },
        tenant_id: tenantId,
        outlet_id: outletId,
      },
      select: { id: true, nama: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return grouped.map((g) => ({
      kasir_id: g.kasir_id,
      kasir_nama: userMap.get(g.kasir_id)?.nama ?? 'Kasir Tidak Dikenal',
      total_transaksi: g._count.id,
      total_penjualan: Number(g._sum.grand_total ?? 0),
    }));
  }

  // ── A5: Export ────────────────────────────────────────────────────────────

  /**
   * Generate CSV string dari data sales.
   * S5: Sanitasi formula injection di setiap cell.
   * S6: Tidak disimpan ke disk — return string langsung.
   */
  async exportReport(
    query: ExportQueryDto,
    tenantId: string,
    outletId: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const { format, report_type } = query;

    // Collect data berdasarkan jenis report
    let csvRows: string[] = [];
    let filename = `laporan-${report_type}`;

    if (report_type === 'sales') {
      const data = await this.getSales(tenantId, outletId, query);
      csvRows = this.salesToCsv(data);
      filename = `laporan-penjualan`;
    } else if (report_type === 'profit-loss') {
      const data = await this.getProfitLoss(tenantId, outletId, query);
      csvRows = this.profitLossToCsv(data);
      filename = `laporan-laba-rugi`;
    } else if (report_type === 'top-products') {
      const data = await this.getTopProducts(tenantId, outletId, query);
      csvRows = this.topProductsToCsv(data);
      filename = `laporan-produk-terlaris`;
    } else if (report_type === 'cashier') {
      const data = await this.getCashierSummary(tenantId, outletId, query);
      csvRows = this.cashierToCsv(data);
      filename = `laporan-kasir`;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    filename = `${filename}-${dateStr}`;

    if (format === 'csv') {
      const csvContent = csvRows.join('\n');
      return {
        buffer: Buffer.from(csvContent, 'utf-8'),
        contentType: 'text/csv; charset=utf-8',
        filename: `${filename}.csv`,
      };
    }

    if (format === 'xlsx') {
      return this.toXlsx(csvRows, filename);
    }

    // format === 'pdf' — tidak didukung server-side (D4: PDF via frontend window.print)
    throw new BadRequestException(
      'Export PDF tidak didukung dari server. Gunakan tombol Print di browser.',
    );
  }

  // ── CSV builders ──────────────────────────────────────────────────────────

  private salesToCsv(data: SalesReportItem[]): string[] {
    const header = [
      'Periode',
      'Total Penjualan (Rp)',
      'Jumlah Transaksi',
      'Total Diskon (Rp)',
      'Total Pajak (Rp)',
    ];
    const rows = data.map((row) => [
      sanitizeCsvCell(row.period),
      sanitizeCsvCell(row.total_penjualan),
      sanitizeCsvCell(row.total_transaksi),
      sanitizeCsvCell(row.total_diskon),
      sanitizeCsvCell(row.total_pajak),
    ]);
    return [header.join(','), ...rows.map((r) => r.join(','))];
  }

  private profitLossToCsv(data: ProfitLossReport): string[] {
    const header = ['Keterangan', 'Nilai (Rp)'];
    return [
      header.join(','),
      [sanitizeCsvCell('Total Penjualan'), sanitizeCsvCell(data.total_penjualan)].join(','),
      [sanitizeCsvCell('Total Modal (HPP)'), sanitizeCsvCell(data.total_modal)].join(','),
      [sanitizeCsvCell('Laba Kotor'), sanitizeCsvCell(data.total_laba_kotor)].join(','),
      [sanitizeCsvCell('Item Dihitung'), sanitizeCsvCell(data.items_dihitung)].join(','),
      [sanitizeCsvCell('Item Tanpa Modal'), sanitizeCsvCell(data.items_tanpa_modal)].join(','),
    ];
  }

  private topProductsToCsv(data: TopProduct[]): string[] {
    const header = ['Produk', 'Kategori', 'Qty Terjual', 'Total Penjualan (Rp)'];
    const rows = data.map((row) => [
      sanitizeCsvCell(row.nama),
      sanitizeCsvCell(row.category_name ?? '-'),
      sanitizeCsvCell(row.qty_terjual),
      sanitizeCsvCell(row.total_penjualan),
    ]);
    return [header.join(','), ...rows.map((r) => r.join(','))];
  }

  private cashierToCsv(data: CashierReportItem[]): string[] {
    const header = ['Kasir', 'Jumlah Transaksi', 'Total Penjualan (Rp)'];
    const rows = data.map((row) => [
      sanitizeCsvCell(row.kasir_nama),
      sanitizeCsvCell(row.total_transaksi),
      sanitizeCsvCell(row.total_penjualan),
    ]);
    return [header.join(','), ...rows.map((r) => r.join(','))];
  }

  // ── XLSX builder ──────────────────────────────────────────────────────────

  /**
   * D5: Excel via `xlsx` library (sudah terinstall Sprint 2).
   * S6: Generate buffer → return, tidak disimpan ke disk.
   */
  private async toXlsx(
    csvRows: string[],
    filename: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx');

    const wsData = csvRows.map((row) =>
      row.split(',').map((cell) => {
        // Strip sanitasi apostrof untuk XLSX (XLSX handle natively)
        return cell.startsWith("'") ? cell.slice(1) : cell;
      }),
    );

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    const buffer: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${filename}.xlsx`,
    };
  }
}
