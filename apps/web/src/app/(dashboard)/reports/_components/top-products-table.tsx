'use client';

import { TopProduct } from '@mrikipos/shared-types';
import { formatRupiah } from '@mrikipos/shared-utils';
import { Package } from 'lucide-react';

interface Props {
  data: TopProduct[];
  isLoading: boolean;
}

export function TopProductsTable({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Package className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm">Tidak ada data produk untuk periode ini.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800 text-left">
          <tr>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">#</th>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Produk</th>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Kategori</th>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">
              Qty Terjual
            </th>
            <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 text-right">
              Total Penjualan
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {data.map((item, idx) => (
            <tr
              key={item.product_id}
              className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                {/* React JSX auto-escapes — aman dari XSS */}
                {item.nama}
              </td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                {item.category_name ?? '-'}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                {item.qty_terjual.toLocaleString('id-ID')}
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
