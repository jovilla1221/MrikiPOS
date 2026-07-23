import { apiClient } from './client';
import { User, UserRole } from '@mrikipos/shared-types';

export interface CreateUserPayload {
  nama: string;
  phone: string;
  pin: string;
  role: UserRole;
  outlet_id: string;
}

export interface UpdateUserPayload {
  nama?: string;
  phone?: string;
  role?: UserRole;
  outlet_id?: string;
  is_active?: boolean;
}

export interface ResetUserPinPayload {
  new_pin: string;
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  outlet_id?: string;
  is_active?: boolean;
}

export const getUsers = async (params?: UserQueryParams) => {
  const query = new URLSearchParams(params as any).toString();
  const endpoint = query ? `/v1/users?${query}` : '/v1/users';
  return apiClient<User[]>(endpoint, { method: 'GET' });
};

export const getUser = async (id: string) => {
  return apiClient<User>(`/v1/users/${id}`, { method: 'GET' });
};

export const createUser = async (payload: CreateUserPayload) => {
  return apiClient<User>('/v1/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateUser = async (id: string, payload: UpdateUserPayload) => {
  return apiClient<User>(`/v1/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const resetUserPin = async (id: string, payload: ResetUserPinPayload) => {
  return apiClient<{ message: string }>(`/v1/users/${id}/pin`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const setUserStatus = async (id: string, is_active: boolean) => {
  return apiClient<User>(`/v1/users/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ is_active }),
  });
};

export const deleteUser = async (id: string) => {
  return apiClient<User>(`/v1/users/${id}`, {
    method: 'DELETE',
  });
};
