import { toQueryString } from './query';
import { apiClient } from './client';
import { AuditLogItem } from '@mrikipos/shared-types';

export interface AuditQueryParams {
  page?: number;
  limit?: number;
  user_id?: string;
  action?: string;
  entity_type?: string;
  date_from?: string;
  date_to?: string;
}

export const getAuditLogs = async (params?: AuditQueryParams) => {
  const query = toQueryString(params as Record<string, unknown>);
  const endpoint = query ? `/v1/audit-logs?${query}` : '/v1/audit-logs';
  return apiClient<AuditLogItem[]>(endpoint, { method: 'GET' });
};

export const getAuditLog = async (id: string) => {
  return apiClient<AuditLogItem>(`/v1/audit-logs/${id}`, { method: 'GET' });
};
