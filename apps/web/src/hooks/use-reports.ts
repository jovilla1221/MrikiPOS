import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getSalesReport,
  getProfitLoss,
  getTopProducts,
  getCashierReport,
  downloadReport,
  ReportQueryParams,
  ExportReportParams,
} from '@/lib/api/reports';
import { toast } from 'sonner';

export const reportKeys = {
  all: ['reports'] as const,
  sales: (params: ReportQueryParams) => ['reports', 'sales', params] as const,
  profitLoss: (params: ReportQueryParams) => ['reports', 'profit-loss', params] as const,
  topProducts: (params: ReportQueryParams) => ['reports', 'top-products', params] as const,
  cashier: (params: ReportQueryParams) => ['reports', 'cashier', params] as const,
};

// ── Sales Report ──────────────────────────────────────────────────────────────

export const useSalesReport = (params: ReportQueryParams, enabled = true) => {
  return useQuery({
    queryKey: reportKeys.sales(params),
    queryFn: () => getSalesReport(params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 menit
  });
};

// ── Profit Loss ───────────────────────────────────────────────────────────────

export const useProfitLoss = (params: ReportQueryParams, enabled = true) => {
  return useQuery({
    queryKey: reportKeys.profitLoss(params),
    queryFn: () => getProfitLoss(params),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};

// ── Top Products ──────────────────────────────────────────────────────────────

export const useTopProducts = (params: ReportQueryParams, enabled = true) => {
  return useQuery({
    queryKey: reportKeys.topProducts(params),
    queryFn: () => getTopProducts(params),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};

// ── Cashier Report ────────────────────────────────────────────────────────────

export const useCashierReport = (params: ReportQueryParams, enabled = true) => {
  return useQuery({
    queryKey: reportKeys.cashier(params),
    queryFn: () => getCashierReport(params),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};

// ── Export ────────────────────────────────────────────────────────────────────

export const useExportReport = () => {
  return useMutation({
    mutationFn: (params: ExportReportParams) => downloadReport(params),
    onSuccess: () => {
      toast.success('Laporan berhasil diunduh');
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Gagal mengunduh laporan');
    },
  });
};
