'use client';

import { ReportPeriod } from '@mrikipos/shared-types';
import { Filter, RotateCcw } from 'lucide-react';

export type ReportType = 'sales' | 'profit-loss' | 'top-products' | 'cashier';

export interface FilterValues {
  report_type: ReportType;
  period: ReportPeriod;
  date_from: string;
  date_to: string;
}

interface Props {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onReset: () => void;
}

const REPORT_TYPE_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'sales', label: 'Laporan Penjualan' },
  { value: 'profit-loss', label: 'Laba Rugi' },
  { value: 'top-products', label: 'Produk Terlaris' },
  { value: 'cashier', label: 'Rekap Kasir' },
];

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'custom', label: 'Kustom' },
];

const todayISO = () => new Date().toISOString().split('T')[0];

export const defaultFilters: FilterValues = {
  report_type: 'sales',
  period: 'daily',
  date_from: todayISO(),
  date_to: todayISO(),
};

export function ReportFilters({ values, onChange, onReset }: Props) {
  const handleChange = (key: keyof FilterValues, value: string) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filter Laporan</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tipe Laporan */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="report-type-select"
            className="text-xs font-medium text-slate-500 dark:text-slate-400"
          >
            Jenis Laporan
          </label>
          <select
            id="report-type-select"
            value={values.report_type}
            onChange={(e) => handleChange('report_type', e.target.value)}
            className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {REPORT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Periode (hanya relevan untuk sales) */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="period-select"
            className="text-xs font-medium text-slate-500 dark:text-slate-400"
          >
            Granularitas
          </label>
          <select
            id="period-select"
            value={values.period}
            onChange={(e) => handleChange('period', e.target.value)}
            disabled={values.report_type !== 'sales'}
            className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="date-from-input"
            className="text-xs font-medium text-slate-500 dark:text-slate-400"
          >
            Dari Tanggal
          </label>
          <input
            id="date-from-input"
            type="date"
            value={values.date_from}
            max={values.date_to}
            onChange={(e) => handleChange('date_from', e.target.value)}
            className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Date To */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="date-to-input"
            className="text-xs font-medium text-slate-500 dark:text-slate-400"
          >
            Sampai Tanggal
          </label>
          <input
            id="date-to-input"
            type="date"
            value={values.date_to}
            min={values.date_from}
            onChange={(e) => handleChange('date_to', e.target.value)}
            className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Reset */}
      <div className="mt-3 flex justify-end">
        <button
          id="reset-filter-btn"
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Filter
        </button>
      </div>
    </div>
  );
}
