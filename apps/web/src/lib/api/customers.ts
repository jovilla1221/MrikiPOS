import { toQueryString } from './query';
import { apiClient } from './client';
import { Customer } from '@mrikipos/shared-types';

export interface CreateCustomerPayload {
  nama: string;
  phone?: string;
  alamat?: string;
}

export interface UpdateCustomerPayload {
  nama?: string;
  phone?: string;
  alamat?: string;
}

export interface CustomerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const getCustomers = async (params?: CustomerQueryParams) => {
  const query = toQueryString(params as Record<string, unknown>);
  const endpoint = query ? `/v1/customers?${query}` : '/v1/customers';
  return apiClient<Customer[]>(endpoint, { method: 'GET' });
};

export const getCustomer = async (id: string) => {
  return apiClient<Customer>(`/v1/customers/${id}`, { method: 'GET' });
};

export const createCustomer = async (payload: CreateCustomerPayload) => {
  return apiClient<Customer>('/v1/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateCustomer = async (id: string, payload: UpdateCustomerPayload) => {
  return apiClient<Customer>(`/v1/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const deleteCustomer = async (id: string) => {
  return apiClient<{ message: string }>(`/v1/customers/${id}`, {
    method: 'DELETE',
  });
};

export const getCustomerHistory = async (id: string, page = 1, limit = 20) => {
  return apiClient<any[]>(`/v1/customers/${id}/history?page=${page}&limit=${limit}`, {
    method: 'GET',
  });
};
