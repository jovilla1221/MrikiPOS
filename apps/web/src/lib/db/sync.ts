import { db, PendingSyncTransaction, updateLocalProductStock } from './dexie';
import { useSyncStore } from '@/stores/sync.store';
import { useAuthStore } from '@/stores/auth.store';
import { CreateTransactionPayload, syncTransactions } from '@/lib/api/transactions';
import { toast } from 'sonner';

/** Update pending count scoped strictly to active tenant_id & outlet_id */
export async function updatePendingCount(tenantId?: string, outletId?: string): Promise<number> {
  if (!tenantId || !outletId) {
    useSyncStore.getState().setPendingCount(0);
    return 0;
  }
  try {
    const count = await db.pending_sync
      .filter(
        (item) =>
          item.tenant_id === tenantId &&
          item.outlet_id === outletId &&
          item.sync_status === 'PENDING',
      )
      .count();
    useSyncStore.getState().setPendingCount(count);
    return count;
  } catch {
    useSyncStore.getState().setPendingCount(0);
    return 0;
  }
}

/** OFF-002, OFF-006, OFF-014 & Gap 4 FIX: Queue offline transaction to IndexedDB with verified cached prices and tenant snapshot */
export async function queueOfflineTransaction(
  payload: CreateTransactionPayload,
  tenantId: string,
  outletId: string,
  userId: string,
) {
  const local_id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const created_at = new Date().toISOString();

  // Gap 4 FIX: Override item price in payload using verified cached product price from IndexedDB
  const verifiedPayloadItems = await Promise.all(
    payload.items.map(async (item) => {
      const cachedProd = await db.products.get(item.product_id);
      const harga = cachedProd ? cachedProd.harga_jual : item.harga;
      return {
        ...item,
        harga,
      };
    }),
  );

  const verifiedPayload: CreateTransactionPayload = {
    ...payload,
    items: verifiedPayloadItems,
  };

  // OFF-002 FIX: Snapshot tenant_id, outlet_id, user_id
  const pendingItem: PendingSyncTransaction = {
    local_id,
    tenant_id: tenantId,
    outlet_id: outletId,
    user_id: userId,
    payload: verifiedPayload,
    created_at,
    sync_status: 'PENDING',
    retry_count: 0,
  };

  await db.pending_sync.put(pendingItem);

  // Update stok lokal agar di UI kasir stok langsung berkurang
  await updateLocalProductStock(verifiedPayload.items);

  // Gap 1 FIX: Update tenant-scoped pending count
  await updatePendingCount(tenantId, outletId);

  // OFF-006 & OFF-014 FIX: Resolve genuine product names for receipt UI
  const resolvedItems = await Promise.all(
    verifiedPayload.items.map(async (item, idx) => {
      const cachedProd = await db.products.get(item.product_id);
      const nama_produk = cachedProd?.nama || 'Produk Kasir';
      const harga = item.harga;
      const diskon_item = item.diskon_item || 0;
      const itemSubtotal = (harga - diskon_item) * item.qty;

      return {
        id: `item-${idx}`,
        product_id: item.product_id,
        nama_produk,
        qty: item.qty,
        harga,
        diskon_item,
        subtotal: itemSubtotal,
      };
    }),
  );

  const subtotal = resolvedItems.reduce((acc, i) => acc + i.subtotal, 0);
  const grand_total = Math.max(0, subtotal - (verifiedPayload.diskon || 0));
  const totalBayar = verifiedPayload.payments.reduce((acc, p) => acc + p.jumlah, 0);
  const kembalian = Math.max(0, totalBayar - grand_total);

  return {
    id: local_id,
    nomor: `TXN-OFFLINE-${local_id.slice(0, 6).toUpperCase()}`,
    subtotal,
    diskon: verifiedPayload.diskon || 0,
    pajak: 0,
    grand_total,
    items: resolvedItems,
    payments: verifiedPayload.payments.map((p) => ({
      metode: p.metode,
      jumlah: p.jumlah,
      status: 'PAID',
    })),
    kembalian,
    status: 'COMPLETED',
    created_at,
    is_offline: true,
  };
}

/** OFF-002 FIX: Synchronize pending transactions strictly matching current user's tenant & outlet */
export async function syncPendingTransactions() {
  const store = useSyncStore.getState();
  const { user } = useAuthStore.getState();

  if (!navigator.onLine || store.isSyncing) {
    return;
  }

  if (!user?.tenant_id || !user?.outlet_id) {
    return;
  }

  try {
    // OFF-002 FIX: Filter items matching current user's active tenant_id & outlet_id
    const pendingItems = await db.pending_sync
      .filter(
        (item) =>
          item.tenant_id === user.tenant_id &&
          item.outlet_id === user.outlet_id &&
          (item.sync_status === 'PENDING' ||
            (item.sync_status === 'FAILED' && item.retry_count < 5)),
      )
      .toArray();

    if (pendingItems.length === 0) {
      await updatePendingCount(user.tenant_id, user.outlet_id);
      return;
    }

    store.setSyncing(true);
    store.setSyncError(null);

    const batchPayload = {
      transactions: pendingItems.map((item) => ({
        local_id: item.local_id,
        created_at: item.created_at,
        ...item.payload,
      })),
    };

    const res = await syncTransactions(batchPayload);

    let successCount = 0;

    for (const result of res.results) {
      if (result.status === 'synced') {
        successCount++;
        await db.synced_transactions.put({
          local_id: result.local_id,
          server_id: result.server_id || '',
          synced_at: new Date().toISOString(),
        });
        await db.pending_sync.delete(result.local_id);
      } else {
        const item = await db.pending_sync.get(result.local_id);
        if (item) {
          await db.pending_sync.update(result.local_id, {
            sync_status: 'FAILED',
            retry_count: item.retry_count + 1,
            last_error: result.error || 'Gagal sync ke server',
          });
        }
      }
    }

    await updatePendingCount(user.tenant_id, user.outlet_id);
    store.setLastSyncedAt(new Date());

    if (successCount > 0) {
      toast.success(`${successCount} transaksi offline berhasil disinkronkan ke server!`);
    }
  } catch (error: any) {
    console.error('Offline sync error:', error);
    store.setSyncError(error?.message || 'Gagal menghubungkan ke server untuk sync');
  } finally {
    store.setSyncing(false);
  }
}

/** Initialize Sync Engine event listeners and background timers */
export function initSyncEngine() {
  if (typeof window === 'undefined') return;

  const updateOnlineStatus = () => {
    const isOnline = navigator.onLine;
    useSyncStore.getState().setOnline(isOnline);

    if (isOnline) {
      toast.info('Koneksi internet terhubung kembali. Memulai sinkronisasi...');
      syncPendingTransactions();
    } else {
      toast.warning('Koneksi internet terputus. Menggunakan Mode Offline.');
    }
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Set initial status
  useSyncStore.getState().setOnline(navigator.onLine);

  // Fetch initial pending count from Dexie for active user
  const { user } = useAuthStore.getState();
  if (user?.tenant_id && user?.outlet_id) {
    updatePendingCount(user.tenant_id, user.outlet_id);
  }

  // Background sync timer (every 30 seconds when online)
  const intervalId = setInterval(() => {
    if (navigator.onLine) {
      syncPendingTransactions();
    }
  }, 30000);

  return () => {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
    clearInterval(intervalId);
  };
}
