import Dexie, { Table } from 'dexie';
import { Product, Category } from '@mrikipos/shared-types';

export interface CachedProduct {
  id: string;
  tenant_id: string;
  outlet_id?: string | null;
  category_id?: string | null;
  nama: string;
  sku?: string | null;
  barcode?: string | null;
  harga_jual: number;
  harga_beli?: number | null;
  stok: number;
  stok_minimum?: number;
  satuan?: string | null;
  foto_url?: string | null;
  is_active: boolean;
  category?: { id: string; nama: string } | null;
  updated_at?: string;
}

export interface CachedCategory {
  id: string;
  tenant_id: string;
  outlet_id?: string | null;
  nama: string;
  sort_order?: number;
  parent_id?: string | null;
  is_active?: boolean;
}

export interface PendingSyncTransaction {
  local_id: string;
  tenant_id: string;
  outlet_id: string;
  user_id: string;
  payload: {
    items: {
      product_id: string;
      variant_id?: string | null;
      qty: number;
      harga: number;
      diskon_item?: number;
      catatan?: string | null;
    }[];
    customer_id?: string | null;
    diskon?: number;
    catatan?: string | null;
    payments: {
      metode: string;
      jumlah: number;
    }[];
  };
  created_at: string;
  sync_status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retry_count: number;
  last_error?: string | null;
}

export interface SyncedTransactionRecord {
  local_id: string;
  server_id: string;
  nomor?: string;
  grand_total?: number;
  synced_at: string;
}

export class MrikiPosDB extends Dexie {
  products!: Table<CachedProduct, string>;
  categories!: Table<CachedCategory, string>;
  pending_sync!: Table<PendingSyncTransaction, string>;
  synced_transactions!: Table<SyncedTransactionRecord, string>;

  constructor() {
    super('mrikipos_db');
    this.version(1).stores({
      products: 'id, tenant_id, outlet_id, category_id, nama, barcode, sku, is_active',
      categories: 'id, tenant_id, outlet_id, nama, sort_order',
      pending_sync: 'local_id, tenant_id, outlet_id, sync_status, created_at',
      synced_transactions: 'local_id, server_id, synced_at',
    });
  }
}

export const db = new MrikiPosDB();

/** OFF-001 FIX: Cache products into IndexedDB */
export async function cacheProducts(products: Product[]): Promise<void> {
  try {
    const formatted: CachedProduct[] = products.map((p) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      outlet_id: p.outlet_id,
      category_id: p.category_id,
      nama: p.nama,
      sku: p.sku,
      barcode: p.barcode,
      harga_jual: Number(p.harga_jual),
      harga_beli: p.harga_beli ? Number(p.harga_beli) : null,
      stok: p.stok,
      stok_minimum: p.stok_minimum,
      satuan: p.satuan,
      foto_url: p.foto_url,
      is_active: p.is_active,
      category: p.category ? { id: p.category.id, nama: p.category.nama } : null,
      updated_at: new Date().toISOString(),
    }));

    await db.products.bulkPut(formatted);
  } catch (error) {
    console.error('Failed to cache products in IndexedDB:', error);
  }
}

/** OFF-001 FIX: Get cached products strictly filtered by tenant_id & outlet_id */
export async function getCachedProducts(
  tenantId?: string,
  outletId?: string,
): Promise<CachedProduct[]> {
  try {
    return await db.products
      .filter((p) => {
        if (!p.is_active) return false;
        if (tenantId && p.tenant_id !== tenantId) return false;
        if (outletId && p.outlet_id && p.outlet_id !== outletId) return false;
        return true;
      })
      .toArray();
  } catch (error) {
    console.error('Failed to read products from IndexedDB:', error);
    return [];
  }
}

/** OFF-009 FIX: Cache categories into IndexedDB */
export async function cacheCategories(categories: Category[]): Promise<void> {
  try {
    const formatted: CachedCategory[] = categories.map((c) => ({
      id: c.id,
      tenant_id: c.tenant_id,
      outlet_id: c.outlet_id,
      nama: c.nama,
      sort_order: c.sort_order,
      parent_id: c.parent_id,
      is_active: c.is_active,
    }));

    await db.categories.bulkPut(formatted);
  } catch (error) {
    console.error('Failed to cache categories in IndexedDB:', error);
  }
}

/** OFF-009 FIX: Get cached categories filtered by tenant_id & outlet_id */
export async function getCachedCategories(
  tenantId?: string,
  outletId?: string,
): Promise<CachedCategory[]> {
  try {
    return await db.categories
      .filter((c) => {
        if (c.is_active === false) return false;
        if (tenantId && c.tenant_id !== tenantId) return false;
        if (outletId && c.outlet_id && c.outlet_id !== outletId) return false;
        return true;
      })
      .toArray();
  } catch (error) {
    console.error('Failed to read categories from IndexedDB:', error);
    return [];
  }
}

/** Deduct stock locally when offline transaction is created */
export async function updateLocalProductStock(
  items: { product_id: string; qty: number }[],
): Promise<void> {
  try {
    await db.transaction('rw', db.products, async () => {
      for (const item of items) {
        const product = await db.products.get(item.product_id);
        if (product) {
          const newStok = Math.max(0, product.stok - item.qty);
          await db.products.update(item.product_id, { stok: newStok });
        }
      }
    });
  } catch (error) {
    console.error('Failed to update local product stock:', error);
  }
}

/** OFF-001 FIX: Clear all local cache on user logout to prevent cross-tenant data leak */
export async function clearLocalCache(): Promise<void> {
  try {
    await Promise.all([
      db.products.clear(),
      db.categories.clear(),
      db.pending_sync.clear(),
      db.synced_transactions.clear(),
    ]);
  } catch (error) {
    console.error('Failed to clear local Dexie cache:', error);
  }
}
