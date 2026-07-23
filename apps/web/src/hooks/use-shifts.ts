import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  openShift,
  closeShift,
  getCurrentShift,
  getShifts,
  getShift,
  OpenShiftPayload,
  CloseShiftPayload,
  ShiftQueryParams,
} from '@/lib/api/shifts';

export const shiftKeys = {
  all: ['shifts'] as const,
  current: ['shifts', 'current'] as const,
  lists: () => [...shiftKeys.all, 'list'] as const,
  list: (filters: string) => [...shiftKeys.lists(), { filters }] as const,
  details: () => [...shiftKeys.all, 'detail'] as const,
  detail: (id: string) => [...shiftKeys.details(), id] as const,
};

export const useCurrentShift = () => {
  return useQuery({
    queryKey: shiftKeys.current,
    queryFn: () => getCurrentShift(),
    staleTime: 15 * 1000,
  });
};

export const useShifts = (params?: ShiftQueryParams) => {
  return useQuery({
    queryKey: shiftKeys.list(JSON.stringify(params || {})),
    queryFn: () => getShifts(params),
  });
};

export const useOpenShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OpenShiftPayload) => openShift(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.all });
    },
  });
};

export const useCloseShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CloseShiftPayload) => closeShift(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.all });
    },
  });
};
