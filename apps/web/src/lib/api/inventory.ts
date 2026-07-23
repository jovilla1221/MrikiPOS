import { apiClient } from './client';
import { useAuthStore } from '@/stores/auth.store';

export interface StockHistoryQueryParams {
  page?: number;
  limit?: number;
  product_id?: string;
  type?: 'IN' | 'OUT' | 'ADJUSTMENT';
  date_from?: string;
  date_to?: string;
}

export const getStockHistory = async (params?: StockHistoryQueryParams) => {
  const query = new URLSearchParams(params as any).toString();
  const endpoint = query ? `/v1/stock/history?${query}` : '/v1/stock/history';
  return apiClient<any>(endpoint, { method: 'GET' });
};

export const getLowStockProducts = async () => {
  return apiClient<any[]>('/v1/stock/low', { method: 'GET' });
};

export const importProducts = async (file: File, mode: 'create' | 'upsert') => {
  const { accessToken } = useAuthStore.getState();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  const response = await fetch(`${API_BASE_URL}/v1/products/import`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    const errorMessage = data.error?.message || 'Terjadi kesalahan saat import';
    throw new Error(errorMessage);
  }

  return data.data;
};
