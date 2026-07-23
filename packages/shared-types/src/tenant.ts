export enum TenantPlan {
  FREE = 'FREE',
  UMKM = 'UMKM',
  BISNIS = 'BISNIS',
  KOMUNITAS = 'KOMUNITAS',
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export interface TenantSettings {
  store_name?: string;
  store_phone?: string;
  store_address?: string;
  receipt_header?: string;
  receipt_footer?: string;
  receipt_show_address?: boolean;
  receipt_show_phone?: boolean;
  tax_enabled?: boolean;
  tax_rate?: number;
  tax_inclusive?: boolean;
  currency?: string;
  timezone?: string;
}

export interface Tenant {
  id: string;
  nama: string;
  phone: string;
  email?: string | null;
  plan: TenantPlan;
  status: TenantStatus;
  settings: TenantSettings;
  created_at: string;
  updated_at: string;
}

export interface Outlet {
  id: string;
  tenant_id: string;
  nama: string;
  alamat?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
