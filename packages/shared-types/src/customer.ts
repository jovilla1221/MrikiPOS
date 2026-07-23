// Customer, CustomerCredit, Shift shared types — Sprint 6

export enum CreditStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum ShiftStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export interface Customer {
  id: string;
  tenant_id: string;
  outlet_id: string;
  nama: string;
  phone?: string | null;
  alamat?: string | null;
  total_belanja: number;
  poin: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerCredit {
  id: string;
  tenant_id: string;
  outlet_id: string;
  customer_id: string;
  customer?: Pick<Customer, 'id' | 'nama' | 'phone'>;
  jumlah: number;
  sisa: number;
  keterangan?: string | null;
  jatuh_tempo?: string | null;
  status: CreditStatus;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditSummary {
  total_sisa: number;
  count_unpaid: number;
  count_partial: number;
  count_overdue: number;
}

export interface Shift {
  id: string;
  tenant_id: string;
  outlet_id: string;
  user_id: string;
  user?: { id: string; nama: string };
  modal_awal: number;
  total_penjualan: number;
  total_transaksi: number;
  kas_aktual?: number | null;
  selisih_kas?: number | null;
  catatan?: string | null;
  status: ShiftStatus;
  opened_at: string;
  closed_at?: string | null;
  updated_at: string;
}
