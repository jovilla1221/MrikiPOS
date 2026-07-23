import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCredits,
  getCreditSummary,
  getOverdueCredits,
  getCredit,
  createCredit,
  payCredit,
  remindCredit,
  CreditQueryParams,
  CreateCreditPayload,
  PayCreditPayload,
} from '@/lib/api/credits';

export const creditKeys = {
  all: ['credits'] as const,
  lists: () => [...creditKeys.all, 'list'] as const,
  list: (filters: string) => [...creditKeys.lists(), { filters }] as const,
  summary: ['credits', 'summary'] as const,
  overdue: ['credits', 'overdue'] as const,
  details: () => [...creditKeys.all, 'detail'] as const,
  detail: (id: string) => [...creditKeys.details(), id] as const,
};

export const useCredits = (params?: CreditQueryParams) => {
  return useQuery({
    queryKey: creditKeys.list(JSON.stringify(params || {})),
    queryFn: () => getCredits(params),
  });
};

export const useCreditSummary = () => {
  return useQuery({
    queryKey: creditKeys.summary,
    queryFn: () => getCreditSummary(),
    staleTime: 30 * 1000,
  });
};

export const useOverdueCredits = () => {
  return useQuery({
    queryKey: creditKeys.overdue,
    queryFn: () => getOverdueCredits(),
  });
};

export const useCreateCredit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCreditPayload) => createCredit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditKeys.all });
    },
  });
};

export const usePayCredit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PayCreditPayload }) =>
      payCredit(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditKeys.all });
    },
  });
};

export const useRemindCredit = () => {
  return useMutation({
    mutationFn: (id: string) => remindCredit(id),
  });
};
