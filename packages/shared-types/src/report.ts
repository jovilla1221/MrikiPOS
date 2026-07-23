// Report shared types — Sprint 5
// Phase C: Shared types for Report module

export interface SalesReportItem {
  /** date string format: YYYY-MM-DD (daily), YYYY-W## (weekly), YYYY-MM (monthly) */
  period: string;
  total_penjualan: number;
  total_transaksi: number;
  total_diskon: number;
  total_pajak: number;
}

export interface ProfitLossReport {
  total_penjualan: number;
  total_modal: number;
  total_laba_kotor: number;
  /** jumlah item yang memiliki harga_beli (ikut kalkulasi) */
  items_dihitung: number;
  /** jumlah item yang dilewati karena harga_beli null */
  items_tanpa_modal: number;
}

export interface TopProduct {
  product_id: string;
  nama: string;
  category_name?: string | null;
  qty_terjual: number;
  total_penjualan: number;
}

export interface CashierReportItem {
  kasir_id: string;
  kasir_nama: string;
  total_transaksi: number;
  total_penjualan: number;
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';
export type ExportFormat = 'csv' | 'xlsx' | 'pdf';
