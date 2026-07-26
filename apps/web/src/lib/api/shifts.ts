import { toQueryString } from './query';
import { apiClient } from './client';
import { Shift } from '@mrikipos/shared-types';

export interface OpenShiftPayload {
  modal_awal: number;
  catatan?: string;
}

export interface CloseShiftPayload {
  shift_id?: string;
  kas_aktual: number;
  catatan?: string;
}

export interface ShiftQueryParams {
  page?: number;
  limit?: number;
  user_id?: string;
  status?: string;
}

export interface CurrentShiftInfo extends Shift {
  total_cash: number;
  perkiraan_kas_laci: number;
}

export const openShift = async (payload: OpenShiftPayload) => {
  return apiClient<Shift>('/v1/shifts/open', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const closeShift = async (payload: CloseShiftPayload) => {
  return apiClient<Shift & { total_cash: number; perkiraan_kas_laci: number }>('/v1/shifts/close', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const getCurrentShift = async () => {
  return apiClient<CurrentShiftInfo | null>('/v1/shifts/current', { method: 'GET' });
};

export const getShifts = async (params?: ShiftQueryParams) => {
  const query = toQueryString(params as Record<string, unknown>);
  const endpoint = query ? `/v1/shifts?${query}` : '/v1/shifts';
  return apiClient<Shift[]>(endpoint, { method: 'GET' });
};

export const getShift = async (id: string) => {
  return apiClient<Shift & { total_cash?: number }>(`/v1/shifts/${id}`, { method: 'GET' });
};
