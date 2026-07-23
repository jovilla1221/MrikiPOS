import { apiClient } from './client';
import { apiClientBlob } from './client-blob';
import {
  SalesReportItem,
  ProfitLossReport,
  TopProduct,
  CashierReportItem,
  ReportPeriod,
  ExportFormat,
} from '@mrikipos/shared-types';

export interface ReportQueryParams {
  date_from?: string;
  date_to?: string;
  period?: ReportPeriod;
  kasir_id?: string;
  limit?: number;
}

export interface ExportReportParams extends ReportQueryParams {
  format: ExportFormat;
  report_type: 'sales' | 'profit-loss' | 'top-products' | 'cashier';
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      q.set(key, String(value));
    }
  }
  return q.toString();
}

// ── Sales Report ──────────────────────────────────────────────────────────────

export const getSalesReport = async (params: ReportQueryParams): Promise<SalesReportItem[]> => {
  const query = buildQuery(params as Record<string, string | number | undefined>);
  const endpoint = query ? `/v1/reports/sales?${query}` : '/v1/reports/sales';
  return apiClient<SalesReportItem[]>(endpoint, { method: 'GET' });
};

// ── Profit Loss ───────────────────────────────────────────────────────────────

export const getProfitLoss = async (params: ReportQueryParams): Promise<ProfitLossReport> => {
  const query = buildQuery(params as Record<string, string | number | undefined>);
  const endpoint = query ? `/v1/reports/profit-loss?${query}` : '/v1/reports/profit-loss';
  return apiClient<ProfitLossReport>(endpoint, { method: 'GET' });
};

// ── Top Products ──────────────────────────────────────────────────────────────

export const getTopProducts = async (params: ReportQueryParams): Promise<TopProduct[]> => {
  const query = buildQuery(params as Record<string, string | number | undefined>);
  const endpoint = query ? `/v1/reports/products/top?${query}` : '/v1/reports/products/top';
  return apiClient<TopProduct[]>(endpoint, { method: 'GET' });
};

// ── Cashier Report ────────────────────────────────────────────────────────────

export const getCashierReport = async (params: ReportQueryParams): Promise<CashierReportItem[]> => {
  const query = buildQuery(params as Record<string, string | number | undefined>);
  const endpoint = query ? `/v1/reports/cashier?${query}` : '/v1/reports/cashier';
  return apiClient<CashierReportItem[]>(endpoint, { method: 'GET' });
};

// ── Export Download ───────────────────────────────────────────────────────────

/**
 * Download laporan sebagai file (CSV/XLSX).
 * D5: Generate dari server, trigger download di browser.
 * PDF via window.print() — tidak ada server-side PDF.
 */
export const downloadReport = async (params: ExportReportParams): Promise<void> => {
  if (params.format === 'pdf') {
    // D4: PDF via browser print — tidak perlu server
    window.print();
    return;
  }

  const query = buildQuery(params as unknown as Record<string, string | number | undefined>);
  const endpoint = query ? `/v1/reports/export?${query}` : '/v1/reports/export';

  const blob = await apiClientBlob(endpoint, { method: 'GET' });

  const dateStr = new Date().toISOString().split('T')[0];
  const ext = params.format === 'xlsx' ? 'xlsx' : 'csv';
  const filename = `laporan-${params.report_type}-${dateStr}.${ext}`;

  // Trigger download — tidak menggunakan innerHTML (XSS safe)
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // Cleanup — revoke URL dan hapus elemen
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
