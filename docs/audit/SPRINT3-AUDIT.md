# MrikiPOS — Sprint 3 Security Audit Report

> **Audited with:** PentesterFlow playbooks (`webvuln`, `race`, `recon`)  
> **Scope:** PWA offline-first — Service Worker, Dexie/IndexedDB, Sync Engine,  
> `POST /v1/transactions/sync`, product cache, offline transaction queue  
> **Date:** 21 Juli 2026  
> **Auditor:** ZCode Agent

---

## 📊 Executive Summary

| Metrik                     | Nilai                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| **Area baru**              | Offline queue, IndexedDB cache, SW, batch sync API                                              |
| **File utama**             | `public/sw.js`, `src/lib/db/dexie.ts`, `src/lib/db/sync.ts`, `transaction.service.ts#syncBatch` |
| **Severity Breakdown**     | 🔴 Critical: 3 \| 🟡 Medium: 6 \| 🟢 Low: 5 \| 💡 Info: 8                                       |
| **Overall Sprint 3 Score** | **6.5/10** (offline = attack surface besar)                                                     |

### Apa yang sudah bagus ✅

- Service Worker **tidak cache** request `/v1/` (biarkan API + Dexie handle)
- SW hanya intercept **GET same-origin**
- Offline create → queue IndexedDB → batch sync saat online
- Dedup offline sync (attempted) via tag di `catatan`
- `create()` server-side masih resolve harga dari DB (fix TXN-003 tetap berlaku saat sync)
- SW register **hanya production** (`NODE_ENV === 'production'`)
- Offline banner + manual “Sync Sekarang”
- `retry_count < 5` untuk failed items

---

## 🔴 CRITICAL FINDINGS

### **OFF-001: IndexedDB Tidak Di-isolate per Tenant/Outlet**

| Field            | Value                                              |
| ---------------- | -------------------------------------------------- |
| **Severity**     | 🔴 **Critical**                                    |
| **Category**     | Broken Access Control / Multi-Tenant Data Leak     |
| **File**         | `apps/web/src/lib/db/dexie.ts:113-120`             |
| **Playbook Ref** | `webvuln` — access control / IDOR on local storage |

**Problem:** `getCachedProducts()` hanya filter `is_active`, **tidak filter `tenant_id` / `outlet_id`**.

```typescript
export async function getCachedProducts(): Promise<CachedProduct[]> {
  return await db.products.filter((p) => p.is_active).toArray();
}
```

Database IndexedDB global: `mrikipos_db` — satu DB untuk semua user di browser yang sama.

**Attack Scenario:**

1. Kasir A (Tenant X) login → products Tenant X di-cache
2. Logout, Kasir B (Tenant Y) login di HP/browser yang sama
3. Offline / network error → `useProducts` fallback ke cache
4. Kasir B melihat **katalog Tenant X** (harga, stok, SKU)

**Remediation:**

1. Selalu filter: `db.products.where({ tenant_id, outlet_id }).filter(p => p.is_active)`
2. Ambil `tenant_id`/`outlet_id` dari auth store saat read/write
3. Saat logout: `db.products.clear()`, `db.categories.clear()`, `db.pending_sync.clear()` (atau clear per tenant)
4. Pertimbangkan DB name per tenant: `mrikipos_db_${tenantId}`

---

### **OFF-002: Offline Queue Tidak Mengunci Tenant/Outlet Saat Sync**

| Field        | Value                                                |
| ------------ | ---------------------------------------------------- |
| **Severity** | 🔴 **Critical**                                      |
| **Category** | Broken Access Control / Cross-Outlet Data Corruption |
| **File**     | `apps/web/src/lib/db/sync.ts:14-22`, `405-458` (API) |

**Problem:** `PendingSyncTransaction` punya field opsional `tenant_id` / `outlet_id`, tapi `queueOfflineTransaction()` **tidak mengisi keduanya**. Saat sync, server memakai JWT **saat ini**.

```typescript
const pendingItem: PendingSyncTransaction = {
  local_id,
  payload, // ← no tenant/outlet snapshot
  created_at,
  sync_status: 'PENDING',
  retry_count: 0,
};
```

**Attack / Misuse Scenario:**

1. Kasir buat 5 transaksi offline di Outlet A
2. Owner pindah session / ganti outlet ke Outlet B (JWT baru)
3. Koneksi kembali → sync jalan
4. 5 transaksi offline **tercatat ke Outlet B** (salah outlet, stok B berkurang)

**Remediation:**

1. Snapshot `tenant_id`, `outlet_id`, `user_id` saat queue
2. Saat sync: reject item jika snapshot ≠ JWT current (status `failed` + error jelas)
3. Atau force re-login / block outlet switch jika `pendingCount > 0`

---

### **OFF-003: Idempotency Offline Sync Lemah (Tidak Pakai Kolom `local_id`)**

| Field        | Value                                                                                 |
| ------------ | ------------------------------------------------------------------------------------- |
| **Severity** | 🔴 **Critical**                                                                       |
| **Category** | Race / Duplicate Transaction / Integrity                                              |
| **File**     | `apps/api/src/modules/transaction/transaction.service.ts:410-434`                     |
| **Schema**   | `schema.prisma` sudah punya `local_id` + index, **tapi tidak dipakai di create/sync** |

**Problem:** Dedup mengandalkan string di field `catatan`:

```typescript
const syncTag = `[OFFLINE_SYNC:${item.local_id}]`;
const existingTxn = await this.prisma.transaction.findFirst({
  where: {
    tenant_id: tenantId,
    outlet_id: outletId,
    catatan: { contains: syncTag },  // ← fragile
  },
});
// ...
const res = await this.create({ ...item, catatan: updatedCatatan }, ...);
// create() TIDAK set field local_id di DB
```

**Risiko:**

1. `catatan` bisa diedit user (UI catatan pesanan) → tag hilang / bentrok
2. `contains` bisa false-positive jika local_id substring bentrok (jarang tapi mungkin)
3. Kolom `local_id` di schema **idle** — sumber kebenaran yang benar tidak dipakai
4. Race: dua request sync paralel dengan `local_id` sama → dual create sebelum salah satu commit (TOCTOU pada `findFirst` + `create`)

**Remediation:**

```typescript
// 1. Unique constraint (tenant_id, local_id) WHERE local_id IS NOT NULL
// 2. Pada create/sync:
data: { ..., local_id: item.local_id }
// 3. Dedup:
const existing = await tx.transaction.findFirst({
  where: { tenant_id, outlet_id, local_id: item.local_id },
});
// 4. Wrap check+create dalam $transaction + unique constraint sebagai safety net
```

---

## 🟡 MEDIUM FINDINGS

### **OFF-004: Tidak Ada Batas Ukuran Batch Sync (DoS)**

| Field        | Value                                                   |
| ------------ | ------------------------------------------------------- |
| **Severity** | 🟡 **Medium**                                           |
| **Category** | Denial of Service / Resource Exhaustion                 |
| **File**     | `transaction.dto.ts` `SyncTransactionsDto`, `syncBatch` |

**Problem:** `transactions: CreateOfflineTransactionDto[]` tidak ada `@ArrayMaxSize()`. Attacker authenticated bisa POST ribuan transaksi dalam satu request → CPU/DB spike (setiap item loop + `$transaction` create).

**Remediation:**

```typescript
@ArrayMaxSize(50) // atau 100
transactions!: CreateOfflineTransactionDto[];
```

Plus rate limit khusus endpoint `/v1/transactions/sync` (mis. 10 req/menit).

---

### **OFF-005: XSS / Data Theft via IndexedDB (No Encryption)**

| Field        | Value                   |
| ------------ | ----------------------- |
| **Severity** | 🟡 **Medium**           |
| **Category** | Sensitive Data Exposure |
| **File**     | `dexie.ts`, `sync.ts`   |

**Problem:** Pending transactions + product catalog tersimpan **plaintext** di IndexedDB. XSS di domain app → script bisa:

```js
const db = await indexedDB.open('mrikipos_db');
// dump pending_sync → lihat semua penjualan offline, metode bayar, qty
```

**Remediation:**

1. Harden XSS (CSP ketat di Next.js headers — saat ini hanya X-Frame-Options, nosniff, Referrer-Policy)
2. Jangan simpan data sensitif berlebih offline
3. Optional: encrypt payload dengan key dari session (kompleks; Sprint 8)
4. Clear IndexedDB on logout

---

### **OFF-006: Offline Receipt & Local Stock Trust Client Price/Qty**

| Field        | Value                                      |
| ------------ | ------------------------------------------ |
| **Severity** | 🟡 **Medium**                              |
| **Category** | Business Logic / Client Trust              |
| **File**     | `sync.ts:31-35`, `updateLocalProductStock` |

**Problem:**

- Receipt offline menghitung total dari **harga di payload client**
- `updateLocalProductStock` mengurangi stok lokal berdasarkan qty client
- Saat sync, server **benar** (harga dari DB), tapi:
  - Struk offline bisa menampilkan harga palsu
  - Stok lokal bisa dimanipulasi (DevTools → IndexedDB) → kasir lihat stok salah

**Remediation:**

1. Offline display: ambil `harga_jual` dari cached product by `product_id`, jangan dari cart payload
2. Validasi qty ≤ cached stok saat queue
3. Setelah sync sukses: re-fetch products & overwrite cache

---

### **OFF-007: Service Worker Cache Shell Tanpa Auth Guard**

| Field        | Value                             |
| ------------ | --------------------------------- |
| **Severity** | 🟡 **Medium**                     |
| **Category** | Information Disclosure (UI Shell) |
| **File**     | `public/sw.js`                    |

**Problem:** SW pre-cache `'/pos'` dan offline navigate fallback ke `/pos`. Siapa pun yang pernah buka app (atau force-cache) bisa dapat shell POS offline. Data API tetap butuh token, tapi UI/branding/structure terekspos.

```javascript
const STATIC_ASSETS = ['/', '/pos', '/manifest.json', '/favicon.ico'];
// ...
if (event.request.mode === 'navigate') {
  return caches.match('/pos') || caches.match('/');
}
```

**Remediation:** Acceptable untuk PWA POS, tapi:

1. Pastikan dashboard layout redirect ke login jika tidak authenticated (client-side)
2. Jangan cache halaman yang memuat data sensitif di HTML SSR
3. Version cache agresif saat logout (`caches.delete`)

---

### **OFF-008: Sync Error Message Leak ke Client**

| Field        | Value                            |
| ------------ | -------------------------------- |
| **Severity** | 🟡 **Medium**                    |
| **Category** | Information Disclosure           |
| **File**     | `transaction.service.ts:442-448` |

```typescript
error: err?.message || 'Gagal menyinkronkan transaksi',
```

`err.message` dari Prisma/Nest bisa leak constraint name, column, dsb. ke response batch.

**Remediation:** Map ke pesan generik; detail hanya ke `this.logger.error`.

---

### **OFF-009: Categories Tidak Di-cache Offline**

| Field        | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| **Severity** | 🟡 **Medium** (Functional + partial security consistency)      |
| **File**     | `use-products.ts` `useCategories`, `dexie.ts` categories table |

**Problem:** Table `categories` didefinisikan di Dexie tapi **tidak ada** `cacheCategories` / offline fallback di `useCategories`. POS offline filter kategori rusak / kosong; inkonsisten dengan product cache isolation issues.

**Remediation:** Mirror pattern product cache + filter tenant/outlet.

---

## 🟢 LOW FINDINGS

### **OFF-010: Manifest Icon Path Salah**

| Field        | Value                  |
| ------------ | ---------------------- |
| **Severity** | 🟢 **Low**             |
| **File**     | `public/manifest.json` |

```json
"src": "/docs/logo-mrikipos.jpg"
```

Path ini merujuk ke docs repo, **bukan** `public/`. PWA install icon gagal / 404.

**Remediation:** Copy logo ke `public/icons/icon-512.png` dan update manifest (sertakan 192 & 512).

---

### **OFF-011: SW Hanya Production — Offline Sulit Ditest di Dev**

| Field        | Value             |
| ------------ | ----------------- |
| **Severity** | 🟢 **Low**        |
| **File**     | `sw-register.tsx` |

Bukan bug keamanan; dokumentasikan cara test offline (Chrome DevTools → Application → Service Workers, atau flag env `NEXT_PUBLIC_ENABLE_SW=true`).

---

### **OFF-012: Cache Version Statis `mrikipos-cache-v1`**

| Field        | Value      |
| ------------ | ---------- |
| **Severity** | 🟢 **Low** |
| **File**     | `sw.js`    |

Update app bisa menyisakan shell lama sampai activate. Gunakan build hash / version bump otomatis.

---

### **OFF-013: Tidak Ada `Background Sync` API / Periodic Background Sync**

| Field        | Value                    |
| ------------ | ------------------------ |
| **Severity** | 🟢 **Low** (reliability) |
| **File**     | `sync.ts`                |

Hanya `online` event + `setInterval` 30s saat tab terbuka. Jika tab ditutup offline lalu dibuka online singkat, sync bergantung interval. Bukan security critical.

---

### **OFF-014: Offline Item Name Hardcoded**

| Field        | Value        |
| ------------ | ------------ |
| **Severity** | 🟢 **Low**   |
| **File**     | `sync.ts:48` |

```typescript
nama_produk: 'Produk (Offline)',
```

UX issue; ambil nama dari product cache by id.

---

## 💡 INFO / BEST PRACTICE

| ID           | Item                                                                             |
| ------------ | -------------------------------------------------------------------------------- |
| **INFO-021** | SW skip `/v1/` — keputusan arsitektur yang benar                                 |
| **INFO-022** | `skipWaiting` + `clients.claim` — update SW cepat (baik)                         |
| **INFO-023** | Stale-while-revalidate untuk static assets — baik untuk POS                      |
| **INFO-024** | Security headers di `next.config.ts` ada (XFO, nosniff) — tambah CSP di Sprint 8 |
| **INFO-025** | `retry_count < 5` mencegah infinite retry loop                                   |
| **INFO-026** | Offline banner UX jelas (Mode Offline / pending count)                           |
| **INFO-027** | Server `create()` masih validasi stok saat sync — double protection              |
| **INFO-028** | Schema sudah siapkan `local_id` + index — tinggal dipakai                        |

---

## 📋 REMEDIATION PRIORITY MATRIX

| Priority | Finding                                              | Effort  | Sprint              |
| -------- | ---------------------------------------------------- | ------- | ------------------- |
| **P0**   | OFF-001 Tenant isolation IndexedDB                   | Medium  | **Sprint 3 Hotfix** |
| **P0**   | OFF-002 Snapshot tenant/outlet di queue              | Low     | **Sprint 3 Hotfix** |
| **P0**   | OFF-003 Gunakan kolom `local_id` + unique constraint | Medium  | **Sprint 3 Hotfix** |
| **P1**   | OFF-004 ArrayMaxSize + rate limit sync               | Low     | Sprint 3            |
| **P1**   | OFF-005 Clear IDB on logout + CSP                    | Medium  | Sprint 3/8          |
| **P1**   | OFF-006 Offline price from cache not cart            | Low     | Sprint 3            |
| **P2**   | OFF-007–009                                          | Low–Med | Sprint 3            |
| **P3**   | OFF-010–014                                          | Low     | Sprint 3/4          |

---

## ✅ VERIFICATION CHECKLIST

- [ ] Filter semua Dexie query by `tenant_id` + `outlet_id`
- [ ] Clear / scope IndexedDB on logout & tenant switch
- [ ] Simpan snapshot outlet/tenant di `pending_sync`; validasi saat sync
- [ ] Persist `local_id` ke kolom DB; unique `(tenant_id, local_id)`
- [ ] Dedup + create dalam satu DB transaction
- [ ] `@ArrayMaxSize(50)` pada `SyncTransactionsDto`
- [ ] Generic error message di `syncBatch` catch
- [ ] Cache categories offline
- [ ] Fix manifest icons ke `public/icons/`
- [ ] Offline receipt: resolve product name/price dari cache
- [ ] Manual test: 2 akun beda tenant di 1 browser offline
- [ ] Manual test: offline sale → ganti outlet → sync (harus gagal/benar outlet)
- [ ] Manual test: double sync same `local_id` → 1 row di server

---

## 📈 Cumulative Security Score

| Sprint       | Score       | Critical open                   | Catatan                       |
| ------------ | ----------- | ------------------------------- | ----------------------------- |
| Sprint 0     | ~7.5/10     | 0 (sengaja skip RBAC default)   | Auth foundation               |
| Sprint 1     | ~8.0/10     | 0 (race/IDOR/price fixed)       | POS core                      |
| Sprint 2     | ~7.5/10     | 2 (low stock race, upload path) | Inventory                     |
| **Sprint 3** | **~6.5/10** | **3**                           | Offline = data lokal sensitif |

**Rekomendasi:** Jangan anggap Sprint 3 “done” sebelum **OFF-001, OFF-002, OFF-003** di-fix. Offline-first tanpa isolasi tenant = risiko data leak antar UMKM di perangkat bersama (warung multi-kasir / HP bekas login).

---

_Metodologi: PentesterFlow webvuln + race + recon pada PWA/offline surface._  
_File audit terkait: `FINDINGS-SPRINT0.md`, `SPRINT1-AUDIT.md`, `SPRINT2-AUDIT.md`._
