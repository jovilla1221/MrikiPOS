import { toQueryString } from './query';
import { apiClient } from './client';
import { ApiResponse, Product } from '@mrikipos/shared-types';

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  category_id?: string;
}

export const getProducts = async (params?: ProductQueryParams) => {
  const query = toQueryString(params as Record<string, unknown>);
  const endpoint = query ? `/v1/products?${query}` : '/v1/products';
  return apiClient<any>(endpoint, { method: 'GET' });
};

export const getProduct = async (id: string) =>
  apiClient<Product>(`/v1/products/${id}`, { method: 'GET' });

export const createProduct = async (data: any) =>
  apiClient<Product>('/v1/products', { method: 'POST', body: JSON.stringify(data) });

export const updateProduct = async (id: string, data: any) =>
  apiClient<Product>(`/v1/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteProduct = async (id: string) =>
  apiClient<void>(`/v1/products/${id}`, { method: 'DELETE' });

export const adjustStock = async (id: string, data: any) =>
  apiClient<Product>(`/v1/products/${id}/stock`, { method: 'POST', body: JSON.stringify(data) });

export const getCategories = async () => {
  return apiClient<any[]>('/v1/categories', { method: 'GET' });
};

export const createCategory = async (data: { nama: string; deskripsi?: string }) =>
  apiClient<any>('/v1/categories', { method: 'POST', body: JSON.stringify(data) });

export const updateCategory = async (id: string, data: { nama: string; deskripsi?: string }) =>
  apiClient<any>(`/v1/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteCategory = async (id: string) =>
  apiClient<void>(`/v1/categories/${id}`, { method: 'DELETE' });
