import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createQrisPayment, getPaymentStatus, mockPay } from '@/lib/api/payments';
import { toast } from 'sonner';

export const paymentKeys = {
  all: ['payments'] as const,
  detail: (id: string) => [...paymentKeys.all, 'detail', id] as const,
  status: (id: string) => [...paymentKeys.all, 'status', id] as const,
};

export const useCreateQrisPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) => createQrisPayment(transactionId),
    onSuccess: (res) => {
      if (res?.payment_id) {
        queryClient.invalidateQueries({ queryKey: paymentKeys.status(res.payment_id) });
      }
    },
  });
};

export const usePaymentStatus = (paymentId?: string, enabled = true) => {
  return useQuery({
    queryKey: paymentKeys.status(paymentId || ''),
    queryFn: () => getPaymentStatus(paymentId!),
    enabled: !!paymentId && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'PAID' || data?.status === 'FAILED' || data?.status === 'EXPIRED') {
        return false;
      }
      return 2500; // Poll every 2.5s while PENDING
    },
  });
};

export const useMockPay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => mockPay(paymentId),
    onSuccess: (_, paymentId) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.status(paymentId) });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Simulasi pembayaran gagal');
    },
  });
};
