export interface Category {
  id: string;
  tenant_id: string;
  outlet_id: string;
  nama: string;
  parent_id?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  nama: string;
  sku?: string | null;
  harga_jual: number;
  stok: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  outlet_id: string;
  category_id?: string | null;
  nama: string;
  sku?: string | null;
  barcode?: string | null;
  harga_jual: number;
  harga_beli?: number | null;
  stok: number;
  stok_minimum: number;
  satuan?: string | null;
  foto_url?: string | null;
  category?: Category | null;
  variants?: ProductVariant[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockHistory {
  id: string;
  tenant_id: string;
  outlet_id: string;
  product_id: string;
  tipe: 'IN' | 'OUT' | 'ADJUSTMENT';
  qty: number;
  stok_sebelum: number;
  stok_sesudah: number;
  keterangan?: string | null;
  reference_id?: string | null;
  product?: { nama: string; sku?: string | null };
  created_at: string;
}

export interface ImportResult {
  total_rows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; field: string; message: string }[];
}
