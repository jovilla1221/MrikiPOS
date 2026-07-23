export enum ApprovalType {
  REFUND = 'REFUND',
  VOID = 'VOID',
  STOCK_TRANSFER = 'STOCK_TRANSFER',
  SHIFT_CLOSE = 'SHIFT_CLOSE',
  PRICE_CHANGE = 'PRICE_CHANGE',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface ApprovalLogItem {
  id: string;
  tenant_id: string;
  outlet_id?: string | null;
  type: ApprovalType;
  reference_id: string;
  requested_by: string;
  approved_by?: string | null;
  status: ApprovalStatus;
  catatan?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  requester?: {
    id: string;
    nama: string;
    role: string;
  };
  approver?: {
    id: string;
    nama: string;
    role: string;
  } | null;
}
