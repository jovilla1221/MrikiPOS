import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, getAuditLog, AuditQueryParams } from '@/lib/api/audit';

export const auditKeys = {
  all: ['auditLogs'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters: string) => [...auditKeys.lists(), { filters }] as const,
  details: () => [...auditKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditKeys.details(), id] as const,
};

export const useAuditLogs = (params?: AuditQueryParams) => {
  return useQuery({
    queryKey: auditKeys.list(JSON.stringify(params || {})),
    queryFn: () => getAuditLogs(params),
  });
};

export const useAuditLog = (id: string) => {
  return useQuery({
    queryKey: auditKeys.detail(id),
    queryFn: () => getAuditLog(id),
    enabled: !!id,
  });
};
