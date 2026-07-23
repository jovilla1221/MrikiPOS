import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getApprovals,
  getMyApprovals,
  getApproval,
  createApproval,
  approveRequest,
  rejectRequest,
  ApprovalQueryParams,
  CreateApprovalPayload,
  ApprovalDecisionPayload,
} from '@/lib/api/approvals';

export const approvalKeys = {
  all: ['approvals'] as const,
  lists: () => [...approvalKeys.all, 'list'] as const,
  list: (filters: string) => [...approvalKeys.lists(), { filters }] as const,
  mine: (filters: string) => [...approvalKeys.all, 'mine', { filters }] as const,
  details: () => [...approvalKeys.all, 'detail'] as const,
  detail: (id: string) => [...approvalKeys.details(), id] as const,
};

export const useApprovals = (params?: ApprovalQueryParams) => {
  return useQuery({
    queryKey: approvalKeys.list(JSON.stringify(params || {})),
    queryFn: () => getApprovals(params),
  });
};

export const useMyApprovals = (params?: ApprovalQueryParams) => {
  return useQuery({
    queryKey: approvalKeys.mine(JSON.stringify(params || {})),
    queryFn: () => getMyApprovals(params),
  });
};

export const useApproval = (id: string) => {
  return useQuery({
    queryKey: approvalKeys.detail(id),
    queryFn: () => getApproval(id),
    enabled: !!id,
  });
};

export const useCreateApproval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateApprovalPayload) => createApproval(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
};

export const useApproveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: ApprovalDecisionPayload }) =>
      approveRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
};

export const useRejectRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: ApprovalDecisionPayload }) =>
      rejectRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
};
