'use client';

import { ProfitLossReport } from '@mrikipos/shared-types';
import { formatRupiah } from '@mrikipos/shared-utils';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface Props {
  data: ProfitLossReport | undefined;
  isLoading: boolean;
}

export function ProfitLossCard({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-slate-100 dark:bg-slate-800 rounded-xl p-5 animate-pulse h-28"
          />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const isProfit = data.total_laba_kotor >= 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Penjualan */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase mb-1">
            Total Penjualan
          </p>
          <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
            {formatRupiah(data.total_penjualan)}
          </p>
        </div>

        {/* Total Modal (HPP) */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase mb-1">
            Total Modal (HPP)
          </p>
          <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
            {formatRupiah(data.total_modal)}
          </p>
        </div>

        {/* Laba Kotor */}
        <div
          className={`border rounded-xl p-5 ${
            isProfit
              ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
          }`}
        >
          <p
            className={`text-xs font-medium uppercase mb-1 ${
              isProfit ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
            }`}
          >
            Laba Kotor
          </p>
          <div className="flex items-center gap-2">
            {isProfit ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <p
              className={`text-2xl font-bold ${
                isProfit ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
              }`}
            >
              {formatRupiah(data.total_laba_kotor)}
            </p>
          </div>
        </div>
      </div>

      {/* Info produk tanpa modal */}
      {data.items_tanpa_modal > 0 && (
        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>{data.items_tanpa_modal} item</strong> tidak memiliki harga beli (HPP) dan tidak
            ikut kalkulasi laba. Silakan perbarui harga beli produk untuk kalkulasi yang akurat.
          </span>
        </div>
      )}
    </div>
  );
}
