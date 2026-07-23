'use client';

import { useAuthStore } from '@/stores/auth.store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShoppingCart, Package, TrendingUp, Users, Loader2, FileText } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { getTransactionSummary } from '@/lib/api/transactions';
import { getLowStockProducts } from '@/lib/api/inventory';
import { formatRupiah } from '@mrikipos/shared-utils';

import { getCreditSummary } from '@/lib/api/credits';

// Hari ini dalam format YYYY-MM-DD
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export default function DashboardHome() {
  const { user } = useAuthStore();

  // Phase B: Multi-query parallel
  const results = useQueries({
    queries: [
      {
        queryKey: ['transaction-summary', 'today'],
        queryFn: () => getTransactionSummary(todayISO(), todayISO()),
        staleTime: 30 * 1000,
        refetchInterval: 30 * 1000,
      },
      {
        queryKey: ['low-stock-count'],
        queryFn: () => getLowStockProducts(),
        staleTime: 60 * 1000,
      },
      {
        queryKey: ['credit-summary'],
        queryFn: () => getCreditSummary(),
        staleTime: 30 * 1000,
      },
    ],
  });

  const [summaryQuery, lowStockQuery, creditSummaryQuery] = results;

  const summary = summaryQuery.data?.summary;
  const lowStockCount = lowStockQuery.data?.length ?? 0;
  const creditSummary = creditSummaryQuery.data;
  const isLoadingSummary = summaryQuery.isLoading;
  const isLoadingLowStock = lowStockQuery.isLoading;
  const isLoadingCredit = creditSummaryQuery.isLoading;

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Selamat Datang, {user?.nama || 'Pengusaha'}! 👋
          </h1>
          <p className="text-sm text-slate-500">Berikut ringkasan aktivitas toko Anda hari ini.</p>
        </div>
        <Link href="/pos">
          <Button size="lg" className="gap-2">
            <ShoppingCart className="h-5 w-5" />
            <span>Mulai Transaksi Kasir</span>
          </Button>
        </Link>
      </div>

      {/* Overview Cards — B3: Data real dari API */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Penjualan Hari Ini */}
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">
                Total Penjualan Hari Ini
              </p>
              {isLoadingSummary ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  <span className="text-sm text-slate-400">Memuat...</span>
                </div>
              ) : (
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {formatRupiah(summary?.total_penjualan ?? 0)}
                </p>
              )}
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg text-emerald-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </Card>

        {/* Jumlah Transaksi */}
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Jumlah Transaksi</p>
              {isLoadingSummary ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  <span className="text-sm text-slate-400">Memuat...</span>
                </div>
              ) : (
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {(summary?.total_transaksi ?? 0).toLocaleString('id-ID')}
                </p>
              )}
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-blue-600">
              <ShoppingCart className="h-6 w-6" />
            </div>
          </div>
        </Card>

        {/* Stok Menipis */}
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Stok Menipis</p>
              {isLoadingLowStock ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  <span className="text-sm text-slate-400">Memuat...</span>
                </div>
              ) : (
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {lowStockCount} Produk
                </p>
              )}
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-amber-600">
              <Package className="h-6 w-6" />
            </div>
          </div>
        </Card>

        {/* Kasbon Belum Lunas — Sprint 6 */}
        <Card className="border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Kasbon Belum Lunas</p>
              {isLoadingCredit ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  <span className="text-sm text-slate-400">Memuat...</span>
                </div>
              ) : (
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {formatRupiah(creditSummary?.total_sisa ?? 0)}
                </p>
              )}
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg text-purple-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Action Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="p-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
              Langkah Pertama
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Siapkan toko Anda dalam 3 langkah sederhana untuk mulai jualan.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col gap-2">
                <span className="text-xs font-bold text-emerald-600">Langkah 1</span>
                <h4 className="font-semibold text-sm">Tambah Produk Pertama</h4>
                <p className="text-xs text-slate-500">
                  Masukkan nama, harga, dan stok barang dagangan Anda.
                </p>
                <Link
                  href="/products"
                  className="text-xs font-medium text-emerald-600 hover:underline mt-auto"
                >
                  Kelola Produk &rarr;
                </Link>
              </div>
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col gap-2">
                <span className="text-xs font-bold text-blue-600">Langkah 2</span>
                <h4 className="font-semibold text-sm">Buka Kasir (POS)</h4>
                <p className="text-xs text-slate-500">
                  Mulai layani pembeli dengan antarmuka cepat &amp; simpel.
                </p>
                <Link
                  href="/pos"
                  className="text-xs font-medium text-blue-600 hover:underline mt-auto"
                >
                  Buka Halaman POS &rarr;
                </Link>
              </div>
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col gap-2">
                <span className="text-xs font-bold text-purple-600">Langkah 3</span>
                <h4 className="font-semibold text-sm">Cetak atau Kirim Struk</h4>
                <p className="text-xs text-slate-500">
                  Kirim struk digital ke WhatsApp pembeli atau cetak thermal.
                </p>
                <span className="text-xs text-slate-400 mt-auto">Otomatis saat transaksi</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Shortcut ke Laporan */}
        <Card>
          <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Laporan Cepat</h3>
            </div>
            <p className="text-xs text-slate-500">
              Analisis penjualan, laba rugi, dan produk terlaris.
            </p>
            <div className="space-y-2 mt-auto">
              <Link
                href="/reports"
                className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-1.5 border-b border-slate-100 dark:border-slate-800"
              >
                Laporan Penjualan <span>&rarr;</span>
              </Link>
              <Link
                href="/reports?type=profit-loss"
                className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-1.5 border-b border-slate-100 dark:border-slate-800"
              >
                Laba Rugi <span>&rarr;</span>
              </Link>
              <Link
                href="/reports?type=top-products"
                className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-1.5"
              >
                Produk Terlaris <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
