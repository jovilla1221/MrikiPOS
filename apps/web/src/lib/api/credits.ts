import { toQueryString } from './query';
import { apiClient } from './client';
import { CustomerCredit, CreditSummary } from '@mrikipos/shared-types';

export interface CreateCreditPayload {
  customer_id: string;
  jumlah: number;
  keterangan?: string;
  jatuh_tempo?: string;
}

export interface PayCreditPayload {
  jumlah_bayar: number;
  catatan?: string;
}

export interface CreditQueryParams {
  page?: number;
  limit?: number;
  customer_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export const getCredits = async (params?: CreditQueryParams) => {
  const query = toQueryString(params as Record<string, unknown>);
  const endpoint = query ? `/v1/credits?${query}` : '/v1/credits';
  return apiClient<CustomerCredit[]>(endpoint, { method: 'GET' });
};

export const getCreditSummary = async () => {
  return apiClient<CreditSummary>('/v1/credits/summary', { method: 'GET' });
};

export const getOverdueCredits = async () => {
  return apiClient<CustomerCredit[]>('/v1/credits/overdue', { method: 'GET' });
};

export const getCredit = async (id: string) => {
  return apiClient<CustomerCredit>(`/v1/credits/${id}`, { method: 'GET' });
};

export const createCredit = async (payload: CreateCreditPayload) => {
  return apiClient<CustomerCredit>('/v1/credits', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const payCredit = async (id: string, payload: PayCreditPayload) => {
  return apiClient<CustomerCredit>(`/v1/credits/${id}/pay`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const remindCredit = async (id: string) => {
  return apiClient<{ sent: boolean; message: string }>(`/v1/credits/${id}/remind`, {
    method: 'POST',
  });
};
