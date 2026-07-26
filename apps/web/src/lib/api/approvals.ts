import { toQueryString } from './query';
import { apiClient } from './client';
import { ApprovalLogItem, ApprovalType, ApprovalStatus } from '@mrikipos/shared-types';

export interface CreateApprovalPayload {
  type: ApprovalType;
  reference_id: string;
  catatan?: string;
  metadata?: Record<string, any>;
  outlet_id?: string;
}

export interface ApprovalDecisionPayload {
  catatan?: string;
}

export interface ApprovalQueryParams {
  page?: number;
  limit?: number;
  type?: ApprovalType;
  status?: ApprovalStatus;
  requested_by?: string;
  outlet_id?: string;
}

export const getApprovals = async (params?: ApprovalQueryParams) => {
  const query = toQueryString(params as Record<string, unknown>);
  const endpoint = query ? `/v1/approvals?${query}` : '/v1/approvals';
  return apiClient<ApprovalLogItem[]>(endpoint, { method: 'GET' });
};

export const getMyApprovals = async (params?: ApprovalQueryParams) => {
  const query = toQueryString(params as Record<string, unknown>);
  const endpoint = query ? `/v1/approvals/mine?${query}` : '/v1/approvals/mine';
  return apiClient<ApprovalLogItem[]>(endpoint, { method: 'GET' });
};

export const getApproval = async (id: string) => {
  return apiClient<ApprovalLogItem>(`/v1/approvals/${id}`, { method: 'GET' });
};

export const createApproval = async (payload: CreateApprovalPayload) => {
  return apiClient<ApprovalLogItem>('/v1/approvals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const approveRequest = async (id: string, payload?: ApprovalDecisionPayload) => {
  return apiClient<{ approval: ApprovalLogItem; execution: any }>(`/v1/approvals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
};

export const rejectRequest = async (id: string, payload?: ApprovalDecisionPayload) => {
  return apiClient<ApprovalLogItem>(`/v1/approvals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
};
