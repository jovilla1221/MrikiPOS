export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  KASIR = 'KASIR',
  STAFF = 'STAFF',
}

export interface User {
  id: string;
  tenant_id: string;
  outlet_id: string;
  nama: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  last_login?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  nama: string;
  phone: string;
  role: UserRole;
  tenant_id: string;
  outlet_id: string;
  outlet_nama?: string;
}
