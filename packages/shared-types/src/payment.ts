import { PaymentMethod, PaymentStatus } from './transaction';

export interface QrisChargeResponse {
  payment_id: string;
  order_id: string;
  qr_string?: string | null;
  qr_url?: string | null;
  expires_at?: string | null;
  status: PaymentStatus;
  amount: number;
}

export interface PaymentStatusResponse {
  id: string;
  transaction_id: string;
  transaction_nomor: string;
  transaction_status: string;
  status: PaymentStatus;
  metode: PaymentMethod;
  jumlah: number;
  referensi?: string | null;
  expires_at?: string | null;
  paid_at?: string | null;
}
