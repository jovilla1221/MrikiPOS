# Sprint 5 — Implementation Plan

> **Dashboard, Reports, Export PDF/Excel**  
> **Audience:** Agent / developer yang mengerjakan Sprint 5  
> **Status:** ⬜ Planned  
> **Durasi target:** ~2 minggu  
> **Dokumen acuan wajib:** `docs/SYSTEM_PROMPT.md`, `docs/PRD.md` (Section 3, 7, 11), `docs/ADR.md`, audit di `docs/audit/SPRINT*.md`, implementasi plan Sprint 1–4 di `docs/plans/`

---

## 0. Cara pakai dokumen ini

1. Baca **Section 1–4** dulu (goal, scope, prasyarat, aturan).
2. Kerjakan **Phase A → E** berurutan. Phase A (ReportService) di-backend dulu, baru Phase D–E frontend.
3. Setiap PR/task patuhi checklist di **Section 8**.
4. Setelah selesai: update task board **Section 9** + minta security audit (`docs/audit/SPRINT5-AUDIT.md`).
5. **Jangan** install package baru tanpa dicatat di plan ini / approval user (lihat SYSTEM_PROMPT §2.2).

---

## 1. Goal Sprint 5

### In scope (Wajib)

| #   | Deliverable                                | Detail                                                                      |
| --- | ------------------------------------------ | --------------------------------------------------------------------------- |
| 1   | **Dashboard landing page**                 | Angka real-time dari API summary (ganti placeholder `Rp 0`)                 |
| 2   | **ReportService backend**                  | Endpoint aggregate penjualan, laba-rugi, produk terlaris, laporan per kasir |
| 3   | **Re-use `GET /v1/transactions/summary`**  | Yang sudah ada (Sprint 1) + ekstensi untuk custom period                    |
| 4   | **Sales report (harian/mingguan/bulanan)** | API hitung total penjualan, diskon, pajak, jumlah transaksi                 |
| 5   | **Profit-loss report**                     | `harga_beli` + `harga_jual` dari items → laba kotor per produk/periode      |
| 6   | **Top products report**                    | Produk terlaris berdasarkan kuantitas/grand_total                           |
| 7   | **Cashier report**                         | Rekap penjualan per kasir per periode                                       |
| 8   | **Export PDF/Excel**                       | Download report dalam format PDF (table sederhana) dan CSV/Excel            |
| 9   | **Chart visualisasi**                      | POS chart library (recharts/chart.js) untuk dashboard                       |
| 10  | **UI Halaman Reports**                     | Filter tanggal + pilih report type + tabel + tombol export                  |

### Out of scope (JANGAN dikerjakan di Sprint 5)

- Format laporan bank/KUR (PRD P1 — Sprint 6+)
- Multi-role RBAC filtering full (Sprint 7)
- Report scheduling / cron + WA blast (Sprint 6 + BullMQ)
- Realtime WebSocket dashboard (Socket.io belum diimplementasi)
- Advanced filtering di luar `date_from`, `date_to`, `kasir_id`, `product_id`

---

## 2. Prasyarat (harus sudah ada)

| Area                       | Status          | Lokasi                                                  |
| -------------------------- | --------------- | ------------------------------------------------------- |
| Transaction CRUD + summary | ✅              | `modules/transaction/transaction.service.ts:getSummary` |
| Product `harga_beli` field | ✅              | `schema.prisma` — kolom `harga_beli` available          |
| Payment module + status    | ✅ (Sprint 4)   | `modules/payment/`                                      |
| Chart library              | ⬜ install baru | —                                                       |

**Wajib ada chart library.** Rekomendasi: `recharts` (ringan, React-native, cukup 1 chart komponen). Approval: **sudah disetujui untuk Sprint 5** (PRD mention).

```bash
pnpm --filter web add recharts
# Atau: cd apps/web && pnpm add recharts
```

---

## 3. Aturan wajib (ringkas)

- TypeScript strict, **no `any`** di service (di chart data mapping boleh boundary).
- **Setiap query** filter `tenant_id` + `outlet_id`.
- Controller = HTTP only; logic di **Service**.
- Response format standar `{ success, data, error?, timestamp }`.
- Jangan expose stack/SQL ke client.
- UI text **Bahasa Indonesia**.
- Kode/variable **English**.
- **Jangan hitung laba-rugi** jika `harga_beli` tidak diisi — tampilkan "-" di UI / exclude dari kalkulasi.
- **Format Rupiah** di UI: `Rp 25.000` (titik pemisah ribuan). Sudah ada `formatCurrency` di `shared-utils`.

---

## 4. Arsitektur target

```
Frontend (Web)
 │ useReportSales, useReportTopProducts, useProfitLoss
 │ /dashboard → 4 stat cards (summary)
 │ /reports → filter form + table + export button
 ▼
ReportController (/v1/reports/*)   ← MODULE BARU
 │ ReportService
 │  ├── getSales(period, date_from, date_to)
 │  ├── getProfitLoss(tenantId, outletId, date_from, date_to)
 │  ├── getTopProducts(tenantId, outletId, date_from, date_to, limit)
 │  ├── getCashierSummary(tenantId, outletId, date_from, date_to)
 │  └── exportCsv / exportExcel (optional helper)
 │  └── DashboardService (atau bungkus di app.module summary)
 ▼
Prisma queries
 ├── transaction.aggregate (sum grand_total, count)
 ├── transaction.groupBy (by kasir_id)
 ├── transactionItem.groupBy (by product_id, sum qty)
 └── raw query profit-loss: JOIN products + transaction_items
```

### Keputusan desain (jangan diubah tanpa diskusi)

| ID  | Keputusan                                                                       | Alasan                                                                                                            |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| D1  | **Module `reports` terpisah**                                                   | Tidak campur transaction module. Controller `/v1/reports/*`                                                       |
| D2  | **Summary di dashboard pakai endpoint existing `GET /v1/transactions/summary`** | _Jangan duplikasi._ Tambah field jika perlu.                                                                      |
| D3  | **Profit-loss hitung di service (bukan DB agg)**                                | `harga_beli` di produk, qty di transaction_items → laba = (harga_jual - harga_beli) * qty                         |
| D4  | **Export PDF pakai library `jspdf` + `jspdf-autotable`**                        | Ringan, no server-side rendering. Bisa juga alternatif: server-side generate PDF via `pdfkit` (Node). Pilih satu. |
| D5  | **Export Excel/CSV via server-endpoint**                                        | Generate CSV string → return `Content-Type: text/csv`. Excel via `xlsx` (sudah terinstall Sprint 2).              |
| D6  | **Chart library: `recharts`**                                                   | React-native, bundle kecil, cocok untuk dashboard.                                                                |

---

## 5. Backend work breakdown

### Phase A — Report Module (2–3 hari)

**Struktur file (WAJIB ikuti folder SYSTEM_PROMPT):**

```
apps/api/src/modules/report/
  report.module.ts
  report.controller.ts
  report.service.ts
  report.dto.ts
```

Daftarkan di `app.module.ts`.

**A1. DTO**

```typescript
export class ReportQueryDto {
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly', 'custom'])
  period?: 'daily' | 'weekly' | 'monthly' | 'custom';

  @IsOptional()
  @IsUUID()
  kasir_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class ExportQueryDto extends ReportQueryDto {
  @IsIn(['csv', 'xlsx', 'pdf'])
  format!: 'csv' | 'xlsx' | 'pdf';
}
```

**A2. Endpoints**

| Method | Path                       | Auth | Role                  | Deskripsi                                               |
| ------ | -------------------------- | ---- | --------------------- | ------------------------------------------------------- |
| GET    | `/v1/reports/sales`        | JWT  | OWNER, MANAGER        | Laporan penjualan agregat per hari/minggu/bulan         |
| GET    | `/v1/reports/profit-loss`  | JWT  | OWNER, MANAGER        | Laba rugi kotor periode                                 |
| GET    | `/v1/reports/products/top` | JWT  | OWNER, MANAGER        | 10 produk terlaris                                      |
| GET    | `/v1/reports/cashier`      | JWT  | OWNER, MANAGER        | Rekap per kasir per periode                             |
| GET    | `/v1/reports/stock`        | JWT  | OWNER, MANAGER        | Laporan stok (exists di inventory service, bisa re-use) |
| GET    | `/v1/reports/export`       | JWT  | OWNER, MANAGER        | Download report (format param)                          |
| GET    | `/v1/dashboard`            | JWT  | OWNER, MANAGER, KASIR | 4 summary cards (today) — optional wrapper              |

**A3. ReportService — Method Detail**

```typescript
// 1. Sales Report — reuse transaction.getSummary logic, tapi grouping by period
async getSales(tenantId, outletId, query: ReportQueryDto) {
  // Jika period = daily: group by DATE(created_at)
  // Jika period = monthly: group by MONTH(created_at)
  // Return array: { period_key, total_penjualan, total_transaksi, total_diskon, total_pajak }
  // Implementasi: raw SQL group by date_trunc, atau fetch all + group in-memory (≤ 1000 transaksi normal)
}

// 2. Profit-Loss
async getProfitLoss(tenantId, outletId, date_from, date_to) {
  // 1. Fetch all transaction_items WITH product.harga_beli in join
  // 2. Hitung: total_laba = sum((harga_jual - harga_beli) * qty)
  // Untuk produk tanpa harga_beli: skip / exclude dari kalkulasi
  // Return: { total_penjualan, total_modal, total_laba_kotor, item_count }
}

// 3. Top Products
async getTopProducts(tenantId, outletId, date_from, date_to, limit = 10) {
  // transaction_items groupBy product_id
  // sum qty, sum (harga_jual * qty) -> total
  // Sort by total qty desc
  // Include product nama, category
}

// 4. Cashier Report
async getCashierSummary(tenantId, outletId, date_from, date_to) {
  // transaction groupBy kasir_id
  // Count transaction, sum grand_total
  // Include kasir.nama
}

// 5. Export
async exportReport(query: ExportQueryDto, tenantId, outletId) {
  // 1. Collect data via getSales / getProfitLoss (tergantung jenis report)
  // 2. Konversi ke format CSV / Excel / PDF
  // 3. Return buffer / stream
}
```

**A4. Profit-Loss Query Pattern (anti-SQL injection via Prisma):**

```typescript
// Dapatkan transaction_items dengan harga_beli dari produk
const items = await this.prisma.transactionItem.findMany({
  where: {
    transaction: { tenant_id: tenantId, outlet_id: outletId, status: TransactionStatus.COMPLETED, ... },
  },
  include: {
    product: { select: { harga_beli: true, nama: true } },
  },
});

// Hitung di-memory (aman karena data moderate)
let totalPenjualan = 0;
let totalModal = 0;
for (const item of items) {
  const hargaBeli = item.product?.harga_beli ? Number(item.product.harga_beli) : null;
  totalPenjualan += Number(item.subtotal);
  if (hargaBeli !== null) {
    totalModal += hargaBeli * item.qty;
  }
}
return { total_penjualan: totalPenjualan, total_modal: totalModal, total_laba: totalPenjualan - totalModal };
```

**A5. Export Implementation**

| Format   | Approach                                                                                              | Package                                   |
| -------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **CSV**  | Generate string `header1,header2\nvalue1,value2\n` — return plain text `Content-Type: text/csv`       | No extra package                          |
| **XLSX** | `xlsx.utils.json_to_sheet()` → workbook → buffer                                                      | `xlsx` (already installed Sprint 2)       |
| **PDF**  | `jspdf` + `jspdf-autotable` di server (Node) — atau generate di frontend via `jspdf` + `window.print` | `jspdf`, `jspdf-autotable` (install baru) |

Rekomendasi: **CSV + XLSX via server, PDF via frontend** (react component + window.print). Tapi untuk konsistensi, PDF server-side dengan `jspdf` juga OK.

---

### Phase B — Dashboard API wrapper (0.5 hari)

Opsional: buat `GET /v1/dashboard` sebagai wrapper yang return 4 summary stats dalam 1 request:

```typescript
GET /v1/dashboard → {
  today_sales: number,
  today_transactions: number,
  low_stock_count: number,
  outstanding_credits: number, // 0 dulu (Sprint 6)
}
```

Atau **re-use langsung** dari frontend dengan beberapa query parallel:

- `GET /v1/transactions/summary` (hari ini)
- `GET /v1/stock/low` (count)
- Dan seterusnya

**Keputusan:** Gunakan multi-query parallel di frontend agar lebih fleksibel. **Tidak perlu module DashboardService.** Gunakan `Promise.all` di React Query.

---

### Phase C — Shared types & utils (0.5 hari)

**`packages/shared-types/src/report.ts`:**

```typescript
export interface SalesReport {
  period: string; // date string atau 'daily'/'weekly' label
  total_penjualan: number;
  total_transaksi: number;
  total_diskon: number;
  total_pajak: number;
}

export interface ProfitLossReport {
  total_penjualan: number;
  total_modal: number;
  total_laba_kotor: number;
  items_dihitung: number; // count items with modal known
  items_tanpa_modal: number; // count items skipped
}

export interface TopProduct {
  product_id: string;
  nama: string;
  category_name?: string;
  qty_terjual: number;
  total_penjualan: number;
}

export interface CashierReportItem {
  kasir_id: string;
  kasir_nama: string;
  total_transaksi: number;
  total_penjualan: number;
}
```

Export di `shared-types/index.ts`:

```typescript
export * from './report';
```

---

## 6. Frontend work breakdown

### Phase D — Dashboard (1 hari)

**File:** `apps/web/src/app/(dashboard)/page.tsx`

Yang diubah:

- Ganti angka `Rp 0` dan `0` dengan data real dari API
- Fetch `GET /v1/transactions/summary` dengan `date_from=today`
- Fetch `GET /v1/stock/low` untuk count stok menipis
- Fetch count outstanding kasbon (stub `0` — Sprint 6)
- Refresh otomatis tiap 30 detik (staleTime: 30s, refetchInterval: 30s)

**Hooks baru (re-use existing):**

- `useTransactionSummary(dateFrom, dateTo)` — sudah ada
- `useLowStock()` — sudah ada

**Tidak perlu loading state kompleks — cukup single `useQueries` parallel:**

```typescript
const results = useQueries({
  queries: [
    {
      queryKey: ['transaction-summary', 'today'],
      queryFn: () => getTransactionSummary(todayISO, todayISO),
    },
    { queryKey: ['low-stock-count'], queryFn: () => getLowStockProducts() },
  ],
});
```

---

### Phase E — Halaman Reports (3–4 hari)

**File:**

```
apps/web/src/app/(dashboard)/reports/
  page.tsx     ← main page (filter form + tabel + export)
  _components/
    sales-chart.tsx       ← Chart line / bar
    profit-loss-card.tsx
    top-products-table.tsx
    cashier-table.tsx
    report-filters.tsx    ← date_from, date_to, period select, report type select

apps/web/src/components/charts/
  sales-chart.tsx         ← (pindah ke sini jika reusable)
  product-chart.tsx

apps/web/src/lib/api/reports.ts   ← API client functions
apps/web/src/hooks/use-reports.ts ← TanStack Query hooks
```

**E1. API Client**

```typescript
// lib/api/reports.ts
export const getSalesReport = (params: ReportQueryParams) => apiClient(...)
export const getProfitLoss = (params) => apiClient(...)
export const getTopProducts = (params) => apiClient(...)
export const getCashierReport = (params) => apiClient(...)
export const exportReport = (params: { format: 'csv'|'xlsx'|'pdf', ... }) => {
  // Untuk CSV/XLSX: download blob
  // Untuk PDF: generate di frontend via jspdf + window.open atau download server-side buffer
}
```

**E2. Hooks**

```typescript
// hooks/use-reports.ts
export const useSalesReport = (params) => useQuery({ queryKey: ['report', 'sales', params], ... })
export const useProfitLoss = (params) => useQuery({ ... })
export const useTopProducts = (params) => useQuery({ ... })
export const useCashierReport = (params) => useQuery({ ... })
export const useExportReport = () => useMutation({ mutationFn: ... })
```

**E3. UI Flow**

```
[Pilih Tipe Report] [Date Range] [Kasir] [Apply]
     │
     ▼
 ┌─────────────────┐
 │  Tabel + Chart   │
 │  [Download CSV]  │
 │  [Download XLSX]  │
 │  [Download PDF]   │
 └─────────────────┘
```

**E4. Chart dengan recharts**

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function SalesChart({ data }: { data: SalesReport[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="total_penjualan" fill="#10b981" name="Penjualan" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

**E5. Export download**

Untuk CSV/XLSX dari server:

```typescript
// lib/api/reports.ts
export const downloadReport = async (params) => {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report-${params.format}`;
  a.click();
};
```

---

## 7. Instructions for offline / summary variant (Sprint 3 compat)

- **Sales report** menggunakan data dari server (tidak offline). Jika offline, tampilkan "Data laporan tidak tersedia saat offline" dengan fallback ke cache terakhir (opsional).
- **Dashboard** hari ini: tampilkan data terakhir sebelum offline dari TanStack Query cache (stale-while-revalidate).

---

## 8. Security requirements

Turunan audit Sprint 0–4 + report-specific:

| #   | Requirement                                                                     |
| --- | ------------------------------------------------------------------------------- |
| S1  | Semua endpoint report **filter `tenant_id` + `outlet_id`**                      |
| S2  | Role access OWNER + MANAGER only (PRD §3)                                       |
| S3  | Export file: set `Content-Disposition: attachment; filename="..."`              |
| S4  | Jangan expose raw profit/loss jika nominal tidak valid                          |
| S5  | CSV/XLSX: sanitasi cell injection (prevent formula injection dengan prefix `'`) |
| S6  | Jangan simpan file export di server (generate → stream → discard)               |
| S7  | Dashboard boleh KASIR lihat (hanya summary, no detail report)                   |
| S8  | Pagination default 20, max 100                                                  |

---

## 9. Package approval

| Package           | Version | Purpose               | Status                                            |
| ----------------- | ------- | --------------------- | ------------------------------------------------- |
| `recharts`        | ^2.x    | Chart untuk dashboard | ✅ **Approved** (PRD mention)                     |
| `jspdf`           | ^2.x    | Generate PDF export   | ⏸️ **Butuh approval** — atau pakai frontend print |
| `jspdf-autotable` | ^3.x    | Table in PDF          | ⏸️ **Butuh approval** — optional                  |

Alternatif untuk PDF: **generate table HTML di frontend lalu `window.print()`**. Lebih sederhana dan tanpa install extra. Untuk XLSX: pakai `xlsx` library yang sudah terinstall.

---

## 10. Testing plan

### Manual flow

1. Dashboard angka tidak `Rp 0` — cocok dengan data transaksi hari ini
2. Report sales: pilih date range → muncul baris data
3. Report profit-loss: ada data produk dengan modal → laba terhitung
4. Report top products: limit 10, sort benar
5. Export CSV: download → buka di Excel → data sesuai
6. Export XLSX: download → buka di Excel → format rapi
7. Multi-role: KASIR tidak bisa akses `/v1/reports/*` (403)
8. Security: Cek `tenant_id` filter dengan akses token tenant lain (data kosong )

### Automated

- Unit test ReportService.getSales (Prisma mock) — opsional Sprint 8
- Unit test profit-loss calculation edge cases (tanpa harga_beli)

---

## 11. Definition of Done

- [ ] `ReportModule` + `ReportController` + `ReportService` terdaftar, build pass
- [ ] `pnpm typecheck` monorepo pass
- [ ] `GET /v1/reports/sales` return data valid
- [ ] `GET /v1/reports/profit-loss` hitung laba kotor (skip produk tanpa modal)
- [ ] `GET /v1/reports/products/top` return 10 terlaris
- [ ] `GET /v1/reports/cashier` rekap per kasir
- [ ] Export CSV download berhasil
- [ ] Export XLSX download berhasil
- [ ] Export PDF via frontend (package approve) atau `window.print()`
- [ ] Dashboard halaman utama angka real (bukan nol)
- [ ] `recharts` chart muncul di halaman report
- [ ] UI Bahasa Indonesia semua
- [ ] Role access: KASIR cannot access `/v1/reports/*` (403)
- [ ] `.env.example` tidak ada perubahan khusus Midtrans
- [ ] Tidak ada secret di git
- [ ] Security self-check §8
- [ ] Request Sprint 5 audit doc (`docs/audit/SPRINT5-AUDIT.md`)

---

## 12. Task board (centang saat selesai)

### Phase A — Backend Report

- [ ] A1 Buat `report.module.ts`, `report.controller.ts`, `report.service.ts`
- [ ] A2 DTO: report query + export query
- [ ] A3 `getSales()` implementation
- [ ] A4 `getProfitLoss()` implementation
- [ ] A5 `getTopProducts()` implementation
- [ ] A6 `getCashierSummary()` implementation
- [ ] A7 Export CSV string endpoint
- [ ] A8 Export XLSX via `xlsx` library
- [ ] A9 Register module di `app.module.ts`

### Phase B — Dashboard

- [ ] B1 Gunakan `useTransactionSummary` untuk card penjualan hari ini
- [ ] B2 Gunakan `useLowStock` untuk jumlah stok menipis
- [ ] B3 Susun data ke 4 card
- [ ] B4 auto-refresh 30 detik

### Phase C — Shared Types

- [ ] C1 Buat `packages/shared-types/src/report.ts`
- [ ] C2 Export di `index.ts`
- [ ] C3 Rebuild shared-types

### Phase D — Frontend API & Hooks

- [ ] D1 `lib/api/reports.ts`
- [ ] D2 `hooks/use-reports.ts`
- [ ] D3 `lib/api/reports.ts` downloadReport helper

### Phase E — Halaman

- [ ] E1 Build halaman `app/(dashboard)/reports/page.tsx`
- [ ] E2 Component `report-filters.tsx`
- [ ] E3 Component `sales-chart.tsx` (recharts)
- [ ] E4 Tabel report sales + profit-loss
- [ ] E5 Tabel top products
- [ ] E6 Tabel cashier
- [ ] E7 Tombol export CSV/XLSX/PDF
- [ ] E8 Loading state + error state
- [ ] E9 Offline state handling

### Phase F — Hardening

- [ ] F1 Manual test checklist §11
- [ ] F2 Security self-check §8
- [ ] F3 Typecheck nol error
- [ ] F4 Build pass
- [ ] F5 Request Sprint 5 audit

---

## 13. Urutan implementasi (hari ke-hari)

| Hari | Fokus                                                         |
| ---- | ------------------------------------------------------------- |
| 1    | Phase A: ReportService + getSales + getProfitLoss             |
| 2    | Phase A: getTopProducts + getCashierSummary + CSV/XLSX export |
| 3    | Phase C + Phase D: shared types + FE hooks + API client       |
| 4    | Phase E: halaman reports filter + tabel                       |
| 5    | Phase E: chart recharts + export buttons                      |
| 6    | Phase B: dashboard real data                                  |
| 7    | F: manual test + regression + typecheck + security            |
| 8    | Buffer + audit request                                        |

---

## 14. Anti-patterns (JANGAN)

1. ❌ Mengirim report data tanpa filter `tenant_id`
2. ❌ Export PDF dengan data sensitif di log
3. ❌ Membuat query bertumpuk di controller
4. ❌ Menyimpan file export di disk server
5. ❌ Menghitung laba tanpa mengecek `harga_beli` null → NaN
6. ❌ `any` di report service type
7. ❌ Memasukkan KASIR role di endpoint report selain dashboard
8. ❌ Chart tanpa loading/error state
9. ❌ Menggunakan library berat (chart.js 50KB+) tanpa perlu
10. ❌ Lupa export `shared-types` → rebuild → import path error

---

## 15. Referensi cepat

| Dokumen                      | Path                                                      |
| ---------------------------- | --------------------------------------------------------- |
| System rules                 | `docs/SYSTEM_PROMPT.md`                                   |
| PRD report & export          | `docs/PRD.md` §3 (P0 laporan), §7 (API endpoints)         |
| API contract (existing)      | `docs/API_CONTRACT.md`                                    |
| Audit history                | `docs/audit/SPRINT*.md`                                   |
| Sprint 4 plan (template)     | `docs/plans/sprint-4/IMPLEMENTATION_PLAN.md`              |
| Shared utils (formatRupiah)  | `packages/shared-utils/src/format.ts`                     |
| Existing transaction summary | `apps/api/src/modules/transaction/transaction.service.ts` |
| Existing dashboard page      | `apps/web/src/app/(dashboard)/page.tsx`                   |

---

## 16. Pesan untuk agent implementer

> Kamu mengerjakan **Sprint 5 — laporan + dashboard + export**.  
> Prioritas: **ReportService backend → FE hooks + tabel → chart → dashboard angka real → export**.  
> Jika ada ambiguitas format: **CSV + XLSX dari server, PDF via frontend `window.print()`**.  
> Jika ada ambiguitas data profit: **hitung hanya produk dengan `harga_beli`; sisanya skip + catat count**.  
> Selesai coding → jalankan typecheck/build → isi checklist §12 → minta audit security.

---

_Plan version: 1.0 — 22 Juli 2026_  
_Owner: MrikiPOS — UMKM Kota Blitar_
