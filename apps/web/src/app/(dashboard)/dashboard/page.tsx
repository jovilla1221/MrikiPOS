'use client';

import { useAuthStore } from '@/stores/auth.store';
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

function todayLabel(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function StatValue({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  if (loading) {
    return (
      <div className="flex items-center gap-1.5">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        <span className="text-sm text-slate-400">Memuat...</span>
      </div>
    );
  }
  return (
    <p className="text-[30px] font-extrabold leading-tight tracking-tight text-slate-900">
      {children}
    </p>
  );
}

const STEPS = [
  {
    n: 1,
    title: 'Tambah Produk Pertama',
    desc: 'Masukkan nama, harga, dan stok barang dagangan Anda.',
    href: '/products',
    cta: 'Kelola Produk →',
  },
  {
    n: 2,
    title: 'Buka Kasir (POS)',
    desc: 'Layani pembeli dengan antarmuka yang cepat dan sederhana.',
    href: '/pos',
    cta: 'Buka Halaman POS →',
  },
  {
    n: 3,
    title: 'Cetak atau Kirim Struk',
    desc: 'Kirim struk digital ke WhatsApp pembeli atau cetak thermal.',
    href: null,
    cta: 'Otomatis saat transaksi',
  },
];

const REPORT_LINKS = [
  { label: 'Laporan Penjualan', href: '/reports' },
  { label: 'Laba Rugi', href: '/reports?type=profit-loss' },
  { label: 'Produk Terlaris', href: '/reports?type=top-products' },
];

export default function DashboardHome() {
  const { user } = useAuthStore();

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

  const statCards = [
    {
      label: 'Total Penjualan Hari Ini',
      value: formatRupiah(summary?.total_penjualan ?? 0),
      loading: summaryQuery.isLoading,
      tint: 'bg-[#ecfdf5]',
      icon: <TrendingUp className="h-[22px] w-[22px] text-[#047857]" />,
      delay: '0s',
    },
    {
      label: 'Jumlah Transaksi',
      value: (summary?.total_transaksi ?? 0).toLocaleString('id-ID'),
      loading: summaryQuery.isLoading,
      tint: 'bg-[#eff6ff]',
      icon: <ShoppingCart className="h-[22px] w-[22px] text-[#2563eb]" />,
      delay: '.06s',
    },
    {
      label: 'Stok Menipis',
      value: `${lowStockCount} Produk`,
      loading: lowStockQuery.isLoading,
      tint: 'bg-[#fffbeb]',
      icon: <Package className="h-[22px] w-[22px] text-[#d97706]" />,
      delay: '.12s',
    },
    {
      label: 'Kasbon Belum Lunas',
      value: formatRupiah(creditSummary?.total_sisa ?? 0),
      loading: creditSummaryQuery.isLoading,
      tint: 'bg-[#faf5ff]',
      icon: <Users className="h-[22px] w-[22px] text-[#9333ea]" />,
      delay: '.18s',
    },
  ];

  return (
    <div className="flex flex-col gap-[26px]">
      {/* Welcome Header */}
      <div className="flex flex-wrap items-center justify-between gap-[18px] [animation:fadeUp_.4s_ease_both]">
        <div>
          <p className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#047857]">
            {todayLabel()}
          </p>
          <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">
            Selamat Datang, {user?.nama || 'Pengusaha'}
          </h1>
          <p className="mt-1.5 text-[15px] text-slate-500">
            Berikut ringkasan aktivitas toko Anda hari ini.
          </p>
        </div>
        <Link
          href="/pos"
          className="inline-flex h-14 items-center gap-2.5 rounded-[14px] bg-[#059669] px-7 text-base font-bold text-white shadow-[0_6px_16px_-6px_rgba(5,150,105,0.5)] transition-all hover:-translate-y-px hover:bg-[#047857] hover:shadow-[0_10px_22px_-6px_rgba(5,150,105,0.55)] active:scale-[0.98]"
        >
          <ShoppingCart className="h-5 w-5" />
          <span>Mulai Transaksi Kasir</span>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(235px,1fr))] gap-[18px]">
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{ animationDelay: card.delay }}
            className="flex flex-col gap-3.5 rounded-[18px] border border-[#e8ede9] bg-white p-6 transition-all [animation:fadeUp_.5s_ease_both] hover:-translate-y-[3px] hover:shadow-[0_12px_24px_-12px_rgba(15,23,42,0.15)]"
          >
            <div className="flex items-center justify-between gap-2.5">
              <p className="text-[13px] font-semibold text-slate-500">{card.label}</p>
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.tint}`}
              >
                {card.icon}
              </div>
            </div>
            <StatValue loading={card.loading}>{card.value}</StatValue>
          </div>
        ))}
      </div>

      {/* Langkah Pertama + Laporan Cepat */}
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-3">
        <div className="rounded-[18px] border border-[#e8ede9] bg-white p-7 [animation:fadeUp_.55s_ease_both] [animation-delay:.15s] lg:col-span-2">
          <h3 className="mb-1.5 text-lg font-bold tracking-tight text-slate-900">
            Langkah Pertama
          </h3>
          <p className="mb-5 text-sm text-slate-500">
            Siapkan toko Anda dalam 3 langkah sederhana untuk mulai berjualan.
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(185px,1fr))] gap-3.5">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="flex flex-col gap-2.5 rounded-[14px] border-[1.5px] border-[#e8ede9] p-[18px] transition-all hover:border-[#059669]"
              >
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[#ecfdf5] text-sm font-extrabold text-[#047857]">
                  {step.n}
                </span>
                <h4 className="text-[15px] font-bold text-slate-900">{step.title}</h4>
                <p className="text-[13px] leading-relaxed text-slate-500">{step.desc}</p>
                {step.href ? (
                  <Link
                    href={step.href}
                    className="mt-auto text-[13px] font-bold text-[#047857] hover:text-[#065f46]"
                  >
                    {step.cta}
                  </Link>
                ) : (
                  <span className="mt-auto text-[13px] font-semibold text-slate-400">
                    {step.cta}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-[18px] border border-[#e8ede9] bg-white p-7 [animation:fadeUp_.6s_ease_both] [animation-delay:.2s]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-[#ecfdf5]">
              <FileText className="h-5 w-5 text-[#047857]" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">Laporan Cepat</h3>
          </div>
          <p className="text-sm text-slate-500">
            Analisis penjualan, laba rugi, dan produk terlaris.
          </p>
          <div className="mt-auto flex flex-col">
            {REPORT_LINKS.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between py-3 text-sm font-semibold text-slate-700 transition-all hover:pl-1 hover:text-[#047857] ${
                  i < REPORT_LINKS.length - 1 ? 'border-b border-[#f0f4f1]' : ''
                }`}
              >
                {link.label} <span className="text-[#047857]">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
