import { toQueryString } from './query';
import { apiClient } from './client';
import { ApiResponse, Transaction, TransactionStatus } from '@mrikipos/shared-types';

export interface CreateTransactionPayload {
  items: {
    product_id: string;
    variant_id?: string | null;
    qty: number;
    harga: number;
    diskon_item?: number;
    catatan?: string | null;
  }[];
  customer_id?: string | null;
  diskon?: number;
  catatan?: string | null;
  payments: {
    metode: string;
    jumlah: number;
  }[];
}

export interface TransactionQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  date_from?: string;
  date_to?: string;
  status?: TransactionStatus;
}

export const createTransaction = async (data: CreateTransactionPayload) => {
  return apiClient<Transaction & { kembalian?: number }>('/v1/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getTransactions = async (params?: TransactionQueryParams) => {
  const query = toQueryString(params as Record<string, unknown>);
  const endpoint = query ? `/v1/transactions?${query}` : '/v1/transactions';
  return apiClient<Transaction[]>(endpoint, { method: 'GET' });
};

export const getTransaction = async (id: string) => {
  return apiClient<Transaction>(`/v1/transactions/${id}`, { method: 'GET' });
};

export const voidTransaction = async (id: string, pin: string, alasan: string) => {
  return apiClient<{ message: string }>(`/v1/transactions/${id}/void`, {
    method: 'POST',
    body: JSON.stringify({ pin, alasan }),
  });
};

export const getTransactionSummary = async (date_from?: string, date_to?: string) => {
  const queryParams: any = {};
  if (date_from) queryParams.date_from = date_from;
  if (date_to) queryParams.date_to = date_to;
  const query = new URLSearchParams(queryParams).toString();
  const endpoint = query ? `/v1/transactions/summary?${query}` : '/v1/transactions/summary';

  return apiClient<any>(endpoint, { method: 'GET' });
};

export interface SyncBatchPayload {
  transactions: (CreateTransactionPayload & { local_id: string; created_at?: string })[];
}

export interface SyncBatchResult {
  synced: number;
  failed: number;
  results: {
    local_id: string;
    server_id?: string;
    status: 'synced' | 'failed';
    error?: string;
  }[];
}

export const syncTransactions = async (payload: SyncBatchPayload) => {
  return apiClient<SyncBatchResult>('/v1/transactions/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};
