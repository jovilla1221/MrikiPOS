import { apiClient } from './client';
import { QrisChargeResponse, PaymentStatusResponse, ApiResponse } from '@mrikipos/shared-types';

export const createQrisPayment = async (transaction_id: string) => {
  return apiClient<QrisChargeResponse>('/v1/payments/qris', {
    method: 'POST',
    body: JSON.stringify({ transaction_id }),
  });
};

export const getPaymentStatus = async (paymentId: string) => {
  return apiClient<PaymentStatusResponse>(`/v1/payments/${paymentId}/status`, {
    method: 'GET',
  });
};

export const mockPay = async (paymentId: string) => {
  return apiClient<any>(`/v1/payments/${paymentId}/mock-pay`, {
    method: 'POST',
  });
};
