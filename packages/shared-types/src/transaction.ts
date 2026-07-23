export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  VOIDED = 'VOIDED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  QRIS = 'QRIS',
  TRANSFER = 'TRANSFER',
  EWALLET = 'EWALLET',
  MULTI = 'MULTI',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  variant_id?: string | null;
  nama_produk: string;
  qty: number;
  harga: number;
  diskon_item: number;
  subtotal: number;
  catatan?: string | null;
}

export interface Payment {
  id: string;
  transaction_id: string;
  metode: PaymentMethod;
  jumlah: number;
  status: PaymentStatus;
  referensi?: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  outlet_id: string;
  shift_id?: string | null;
  kasir_id: string;
  customer_id?: string | null;
  nomor: string;
  subtotal: number;
  diskon: number;
  pajak: number;
  grand_total: number;
  metode_bayar: PaymentMethod;
  status: TransactionStatus;
  catatan?: string | null;
  local_id?: string | null;
  items?: TransactionItem[];
  payments?: Payment[];
  created_at: string;
  synced_at?: string | null;
  updated_at: string;
}
