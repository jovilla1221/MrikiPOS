'use client';

import { CashierReportItem } from '@mrikipos/shared-types';
import { formatRupiah } from '@mrikipos/shared-utils';
import { Users } from 'lucide-react';

interface Props {
  data: CashierReportItem[];
  isLoading: boolean;
}

export function CashierTable({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Users className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm">Tidak ada data kasir untuk periode ini.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800 text-left">
          <tr>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Kasir</th>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">
              Jumlah Transaksi
            </th>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">
              Total Penjualan
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {data.map((item) => (
            <tr
              key={item.kasir_id}
              className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                {/* React JSX auto-escapes — aman dari XSS */}
                {item.kasir_nama}
              </td>
              <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-200">
                {item.total_transaksi.toLocaleString('id-ID')}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                {formatRupiah(item.total_penjualan)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
