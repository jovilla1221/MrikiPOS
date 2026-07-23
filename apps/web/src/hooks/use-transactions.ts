import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTransactions,
  getTransaction,
  createTransaction,
  voidTransaction,
  getTransactionSummary,
  TransactionQueryParams,
  CreateTransactionPayload,
} from '@/lib/api/transactions';
import { queueOfflineTransaction } from '@/lib/db/sync';
import { toast } from 'sonner';

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: string) => [...transactionKeys.lists(), { filters }] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
  summary: (dateRange: string) => [...transactionKeys.all, 'summary', dateRange] as const,
};

export const useTransactions = (params?: TransactionQueryParams) => {
  return useQuery({
    queryKey: transactionKeys.list(JSON.stringify(params)),
    queryFn: () => getTransactions(params),
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useTransaction = (id: string) => {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => getTransaction(id),
    enabled: !!id,
  });
};

export const useTransactionSummary = (dateFrom?: string, dateTo?: string) => {
  return useQuery({
    queryKey: transactionKeys.summary(`${dateFrom}-${dateTo}`),
    queryFn: () => getTransactionSummary(dateFrom, dateTo),
  });
};

import { useAuthStore } from '@/stores/auth.store';

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTransactionPayload) => {
      const { user } = useAuthStore.getState();
      if (!user?.tenant_id || !user?.outlet_id || !user?.id) {
        throw new Error('Sesi kasir tidak aktif. Silakan login kembali.');
      }

      const tenantId = user.tenant_id;
      const outletId = user.outlet_id;
      const userId = user.id;

      const isQris = data.payments.some((p) => p.metode === 'QRIS');

      if (typeof window !== 'undefined' && !navigator.onLine) {
        if (isQris) {
          throw new Error(
            'QRIS memerlukan koneksi internet dan tidak dapat diproses secara offline.',
          );
        }
        toast.warning('Mode Offline: Transaksi disimpan secara lokal di perangkat.');
        return queueOfflineTransaction(data, tenantId, outletId, userId);
      }
      try {
        return await createTransaction(data);
      } catch (error: any) {
        if (
          typeof window !== 'undefined' &&
          (!navigator.onLine || error?.message?.includes('Failed to fetch'))
        ) {
          if (isQris) {
            throw new Error(
              'QRIS memerlukan koneksi internet dan tidak dapat diproses secara offline.',
            );
          }
          toast.warning('Mode Offline: Transaksi disimpan secara lokal di perangkat.');
          return queueOfflineTransaction(data, tenantId, outletId, userId);
        }
        throw error;
      }
    },

    onSuccess: (res: any) => {
      if (!res?.is_offline) {
        toast.success('Transaksi berhasil disimpan');
      }
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.all }); // Invalidating all to update summary
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Invalidate products as stock decreased
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error?.message || error?.message || 'Gagal menyimpan transaksi',
      );
    },
  });
};

export const useVoidTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, pin, alasan }: { id: string; pin: string; alasan: string }) =>
      voidTransaction(id, pin, alasan),
    onSuccess: (_, variables) => {
      toast.success('Transaksi berhasil dibatalkan (void)');
      queryClient.invalidateQueries({ queryKey: transactionKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Gagal membatalkan transaksi');
    },
  });
};
