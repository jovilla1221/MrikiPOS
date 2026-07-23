'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  useSalesReport,
  useProfitLoss,
  useTopProducts,
  useCashierReport,
  useExportReport,
} from '@/hooks/use-reports';

const SalesChart = dynamic(
  () => import('./_components/sales-chart').then((mod) => mod.SalesChart),
  {
    ssr: false,
    loading: () => <div className="h-[300px] bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />,
  }
);
import { ProfitLossCard } from './_components/profit-loss-card';
import { TopProductsTable } from './_components/top-products-table';
import { CashierTable } from './_components/cashier-table';
import {
  ReportFilters,
  FilterValues,
  defaultFilters,
  ReportType,
} from './_components/report-filters';
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  BarChart3,
  Package,
  Users,
  Loader2,
  WifiOff,
} from 'lucide-react';

// ── Sales table inline ──────────────────────────────────────────────────────
import { SalesReportItem } from '@mrikipos/shared-types';
import { formatRupiah } from '@mrikipos/shared-utils';

function SalesTable({ data, isLoading }: { data: SalesReportItem[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <p className="text-center text-slate-400 text-sm py-10">Tidak ada data untuk periode ini.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-left">
              Periode
            </th>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">
              Total Penjualan
            </th>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">
              Transaksi
            </th>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">
              Diskon
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {data.map((row) => (
            <tr
              key={row.period}
              className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                {row.period}
              </td>
              <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 font-semibold">
                {formatRupiah(row.total_penjualan)}
              </td>
              <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                {row.total_transaksi.toLocaleString('id-ID')}
              </td>
              <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                {formatRupiah(row.total_diskon)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 dark:bg-slate-800">
          <tr>
            <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Total</td>
            <td className="px-4 py-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
              {formatRupiah(data.reduce((s, r) => s + r.total_penjualan, 0))}
            </td>
            <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-200">
              {data.reduce((s, r) => s + r.total_transaksi, 0).toLocaleString('id-ID')}
            </td>
            <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
              {formatRupiah(data.reduce((s, r) => s + r.total_diskon, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Tipe report meta ─────────────────────────────────────────────────────────

const REPORT_META: Record<
  ReportType,
  { icon: React.ReactNode; title: string; description: string }
> = {
  sales: {
    icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
    title: 'Laporan Penjualan',
    description: 'Ringkasan penjualan berdasarkan periode yang dipilih.',
  },
  'profit-loss': {
    icon: <BarChart3 className="h-5 w-5 text-blue-600" />,
    title: 'Laba Rugi',
    description: 'Kalkulasi laba kotor berdasarkan harga beli dan harga jual produk.',
  },
  'top-products': {
    icon: <Package className="h-5 w-5 text-amber-600" />,
    title: 'Produk Terlaris',
    description: 'Daftar produk yang paling banyak terjual pada periode ini.',
  },
  cashier: {
    icon: <Users className="h-5 w-5 text-purple-600" />,
    title: 'Rekap Kasir',
    description: 'Ringkasan penjualan per kasir pada periode yang dipilih.',
  },
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const exportMutation = useExportReport();

  const reportParams = {
    date_from: filters.date_from,
    date_to: filters.date_to,
    period: filters.period,
    limit: 10,
  };

  // Fetch semua jenis report tapi hanya enable sesuai aktif
  const salesQuery = useSalesReport(reportParams, filters.report_type === 'sales');
  const profitQuery = useProfitLoss(reportParams, filters.report_type === 'profit-loss');
  const topProductsQuery = useTopProducts(reportParams, filters.report_type === 'top-products');
  const cashierQuery = useCashierReport(reportParams, filters.report_type === 'cashier');

  const isLoading =
    (filters.report_type === 'sales' && salesQuery.isLoading) ||
    (filters.report_type === 'profit-loss' && profitQuery.isLoading) ||
    (filters.report_type === 'top-products' && topProductsQuery.isLoading) ||
    (filters.report_type === 'cashier' && cashierQuery.isLoading);

  const isError =
    (filters.report_type === 'sales' && salesQuery.isError) ||
    (filters.report_type === 'profit-loss' && profitQuery.isError) ||
    (filters.report_type === 'top-products' && topProductsQuery.isError) ||
    (filters.report_type === 'cashier' && cashierQuery.isError);

  const meta = REPORT_META[filters.report_type];

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    if (format === 'pdf') {
      window.print();
      return;
    }
    exportMutation.mutate({
      ...reportParams,
      format,
      report_type: filters.report_type,
    });
  };

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-600" />
            Laporan
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Analisis penjualan, laba rugi, produk terlaris, dan rekap kasir.
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2 print:hidden">
          <button
            id="export-csv-btn"
            onClick={() => handleExport('csv')}
            disabled={exportMutation.isPending || isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            CSV
          </button>
          <button
            id="export-xlsx-btn"
            onClick={() => handleExport('xlsx')}
            disabled={exportMutation.isPending || isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Excel
          </button>
          <button
            id="export-pdf-btn"
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Filters — tersembunyi saat print */}
      <div className="print:hidden">
        <ReportFilters
          values={filters}
          onChange={setFilters}
          onReset={() => setFilters(defaultFilters)}
        />
      </div>

      {/* Report Content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 print:border-none print:p-0 print:shadow-none">
        {/* Title */}
        <div className="flex items-center gap-2 mb-5">
          {meta.icon}
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{meta.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {meta.description} Periode: {filters.date_from} s.d. {filters.date_to}
            </p>
          </div>
        </div>

        {/* Error state */}
        {isError && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-4">
            <WifiOff className="h-5 w-5 shrink-0" />
            <span>Gagal memuat laporan. Periksa koneksi internet Anda dan coba lagi.</span>
          </div>
        )}

        {/* Sales */}
        {filters.report_type === 'sales' && (
          <div className="space-y-6">
            <SalesChart data={salesQuery.data ?? []} />
            <SalesTable data={salesQuery.data ?? []} isLoading={salesQuery.isLoading} />
          </div>
        )}

        {/* Profit Loss */}
        {filters.report_type === 'profit-loss' && (
          <ProfitLossCard data={profitQuery.data} isLoading={profitQuery.isLoading} />
        )}

        {/* Top Products */}
        {filters.report_type === 'top-products' && (
          <TopProductsTable
            data={topProductsQuery.data ?? []}
            isLoading={topProductsQuery.isLoading}
          />
        )}

        {/* Cashier */}
        {filters.report_type === 'cashier' && (
          <CashierTable data={cashierQuery.data ?? []} isLoading={cashierQuery.isLoading} />
        )}
      </div>

      {/* Print footer */}
      <div className="hidden print:block text-xs text-slate-400 text-center pt-4 border-t border-slate-200">
        Dicetak dari MrikiPOS — {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })} —{' '}
        {new Date().toLocaleTimeString('id-ID')}
      </div>
    </div>
  );
}
