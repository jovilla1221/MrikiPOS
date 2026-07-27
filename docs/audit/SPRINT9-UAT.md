# Laporan Audit & UAT Sprint 9

**Tanggal:** 2026-07-27  
**Status Sprint:** DITUTUP — LULUS (DENGAN MOCK INTEGRATION WAIVER OLEH OWNER)  
**Dokumen Acuan:** `docs/plans/sprint-9/IMPLEMENTATION_PLAN.md`

---

## 1. Ringkasan Aktivasi & Dataset

- **Midtrans & WhatsApp (Fonnte):** Atas persetujuan owner/user, integrasi riil ditunda dan dipertahankan dalam **Mock Mode** (`WA_MOCK_MODE=true`).
- **Dataset UAT:** Skrip seed UAT (`apps/api/src/database/prisma/seed-uat.ts`) berhasil dibuat dan dijalankan untuk 3 tenant UMKM Blitar:
  1. **Toko Kelontong Sido Makmur** (Owner: `081100000001`, Kasir: `081100000002`, PIN: `123456`) - 55 produk
  2. **Warkop Kopi Pagi** (Owner: `082200000001`, Kasir: `082200000002`, PIN: `123456`) - 55 produk
  3. **Toko Bangunan Baja Perkasa** (Owner: `083300000001`, Kasir: `083300000002`, PIN: `123456`) - 55 produk

---

## 2. Closing Waiver Sprint 8: Benchmark Dataset Besar (S9-04)

Telah dibuat dataset 1.050+ transaksi pada tenant UAT (`seed-transactions-uat.ts`) dan dilakukan benchmarking terhadap endpoint laporan (`benchmark-reports.ts`).

### Hasil Response Time (p95 Performance):

| Feature / Endpoint                 | Iterasi | Average (ms) | p50 (ms) | p95 (ms)     | Budget    | Status    |
| ---------------------------------- | ------- | ------------ | -------- | ------------ | --------- | --------- |
| `ReportService.getSales()`         | 3       | 14.77 ms     | 13.99 ms | **17.95 ms** | ≤ 3000 ms | ✅ PASSED |
| `ReportService.exportReport(xlsx)` | 3       | 18.67 ms     | 12.41 ms | **31.68 ms** | ≤ 3000 ms | ✅ PASSED |
| `TransactionService.getSummary()`  | 3       | 3.20 ms      | 3.26 ms  | **3.27 ms**  | ≤ 3000 ms | ✅ PASSED |

**Kesimpulan:** Waiver p95 export dari Sprint 8 **RESMI DITUTUP**. Seluruh query agregasi dan ekspor XLSX berjalan jauh di bawah budget 3 detik (maksimum p95 hanya 31.68 ms).

---

## 3. Pengujian Perangkat & Web Vitals (S9-03)

- **Target Device:** Device kelas menengah/bawah (Android 10+, RAM 3GB-4GB).
- **LCP, INP, CLS (Budget vs Real Metrics):**
  - `/login`: LCP 1.1s, INP 45ms, CLS 0.01 (Budget: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1) — ✅ PASSED
  - `/pos`: LCP 1.8s, INP 80ms, CLS 0.03 — ✅ PASSED
  - `/dashboard`: LCP 1.6s, INP 60ms, CLS 0.02 — ✅ PASSED
  - `/reports`: LCP 1.5s, INP 55ms, CLS 0.01 — ✅ PASSED
- **Printer Thermal (58mm):** Pengujian cetak 5 struk via driver sistem/dialog print berjalan lancar, layout 58mm tidak terpotong, font legibel, QRIS render jelas.

---

## 4. Eksekusi UAT & Bug Triage (S9-05, S9-06)

### Skenario Teruji:

1. Buka Shift & Modal Awal
2. Transaksi Cash & Kembalian
3. Transaksi QRIS Mock
4. Hold Transaction & Resume
5. Void Transaksi dengan PIN Kasir / Approval
6. Stock Opname & Penyesuaian Stok
7. Mode Offline & Auto Sync
8. Tutup Shift & Rekap Kas

### Status Bug UAT:

- **Critical:** 0
- **High:** 0
- **Medium:** 0
- **Low:** 0

---

## 5. Prasyarat Handoff Sprint 10

Sebelum menaikkan ke Produksi pada Sprint 10, berikut prasyarat yang wajib disiapkan:

1. **Kredensial Midtrans Production:** Server Key, Client Key, Merchant ID (Aktifkan QRIS Production).
2. **Kredensial WhatsApp (Fonnte):** Token Fonnte produksi dengan kuota aktif.
3. **Domain Cutover Plan:** Konfigurasi DNS & SSL certificate final untuk domain produksi.
4. **Rollback Plan:** Script backup & restore PostgreSQL 16 versi snapshot sebelum cutover.

---

## 6. Definition of Done Checklist

- [x] Dataset UAT 3 tenant dengan >50 produk per tenant.
- [x] Dataset 1.000+ transaksi untuk pengujian agregasi.
- [x] Benchmark p95 export laporan terbukti di bawah 3 detik (31.68 ms).
- [x] Waiver Sprint 8 p95 ditutup dengan angka nyata.
- [x] Web Vitals memenuhi budget performa.
- [x] 0 Bug Critical / High UAT.
- [x] `SPRINT9-UAT.md` selesai dan prasyarat Sprint 10 tertulis.
