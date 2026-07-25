# Handover Pengembang & Status Kemajuan Proyek MrikiPOS

Dokumen ini berisi informasi status kemajuan pengerjaan proyek **MrikiPOS** hingga penutupan **Sprint 8**, detail arsitektur yang sudah diimplementasikan, serta rincian tugas untuk pengembang (developer) selanjutnya.

---

## 📌 Status Terakhir Proyek (Current Progress Status)

- **Sprint Terakhir:** **Sprint 8 — DITUTUP — LULUS QUALITY GATE & SECURITY AUDIT** (per 23 Juli 2026).
- **Kondisi Repository:** Stable, tidak ada breaking bug, seluruh suite test passing, build produksi lulus.
- **Git Baseline Commit:** `67e4270` (`chore(sprint-8): close quality gates and security audit`).

---

## 🛠️ Fitur & Modul yang Sudah Selesai (Completed Features)

### 1. Otentikasi & Otorisasi (`apps/api/src/modules/auth`)
- [x] Login & Registrasi Berbasis Email/Password dengan enkripsi bcrypt.
- [x] Login & Pendaftaran via **Google Auth / Google Identity Services** (ID token verification).
- [x] Penautan Akun (Account Linking) antara email lokal dan Google Account.
- [x] JWT Token Rotation, Access Token + Refresh Token Mechanism, dan Revokasi Token.
- [x] Role-Based Access Control (RBAC): Guard & Decorator untuk pemisahan hak akses (Admin, Kasir, Store Manager).
- [x] Password Policy & OTP Verification (dengan Expiry & Attempt Limits).

### 2. Modul Transaksi & POS (`apps/api/src/modules/pos` & `apps/web/src/app/(dashboard)/pos`)
- [x] Manajemen Keranjang Transaksi & Perhitungan Total/Diskon/Pajak secara real-time.
- [x] Metode Pembayaran Tunai (Cash) dengan perhitungan kembalian otomatis.
- [x] Integrasi Payment Gateway **QRIS via Midtrans** (Payment Intent, Webhook Notification verification dengan HMAC signature validation).
- [x] Mekanisme Pembatalan Transaksi Mandiri (Self-Void Transaksi).
- [x] Mode **Offline Sync**: Penyimpanan transaksi lokal menggunakan IndexedDB (via Dexie.js) saat koneksi terputus dan otomatis disinkronkan ke server saat online.

### 3. Modul Laporan & Export (`apps/api/src/modules/reports`)
- [x] Export Laporan Penjualan ke Format Excel (`.xlsx`) menggunakan library resmi SheetJS.
- [x] **Rate Throttling & Protection**: Pembatasan request export maksimal 10 request/menit per user (HTTP status 429 jika melebihi).

### 4. Infrastruktur, Keamanan, & Performa
- [x] **Security Headers & Protection**: Integration `@nestjs/throttler`, `helmet`, CORS restriction via `ALLOWED_ORIGINS`.
- [x] **Production Payment Mock Safety**: Payment mock mode dinonaktifkan secara eksplisit pada lingkungan produksi.
- [x] **Clean Dependency Audit**: 0 vulnerability pada dependency produksi (`pnpm audit --prod`).
- [x] **Performance Budget Compliance**: Shared initial JS Next.js sebesar 103 kB. Seluruh halaman utama (`/login`, `/pos`, `/dashboard`, `/reports`, `/transactions`) berada di bawah budget 200 kB.

---

## 📊 Ringkasan Hasil pengujian (Testing Summary)

| Kategori Pengujian | Jumlah / Status | Detail |
| ------------------ | --------------- | ------ |
| **Unit Test**      | ✅ 22 Suite, 148 Test | Meliputi modul Auth, POS, Payment, Report, & Shared Utils |
| **E2E Test**       | ✅ 4 Suite, 17 Test | `health.e2e-spec.ts`, `auth.e2e-spec.ts`, `business-flow.e2e-spec.ts`, `report-throttle.e2e-spec.ts` |
| **Type Check**     | ✅ 0 Error | Checked via `pnpm typecheck` (API & Web) |
| **Formatting**     | ✅ Clean | Checked via `pnpm format:check` |
| **Route Protection**| ✅ Verified | Route terproteksi mengarah secara otomatis ke `/login` |

---

## 🎯 Tugas & Roadmap Developer Selanjutnya (Sprint 9 & Seterusnya)

Pengembang berikutnya yang melanjutkan proyek ini disarankan untuk fokus pada item backlog berikut:

### 1. Handoff ke Staging & Pengujian UAT (User Acceptance Testing)
- Melakukan deployment build produksi ke server Staging.
- Menjalankan skenario pengujian bersama pengguna akhir (UMKM Blitar) menggunakan dataset UAT.

### 2. Pengukuran Real-Device Web Vitals
- Mengukur matriks **LCP (Largest Contentful Paint)**, **INP (Interaction to Next Paint)**, dan **CLS (Cumulative Layout Shift)** pada profil perangkat kasir UAT riil (misal: tablet/smartphone Android low-mid spec).

### 3. Benchmark API Laporan Dataset Skala Besar
- Melakukan stress-testing / benchmark P95 response time untuk endpoint export laporan pada dataset dengan 1.000+ transaksi.

### 4. Pembersihan Warning Linting (Non-Blocking)
- Terdapat ~137 lint warnings legacy yang tidak menghalangi build. Perbaiki secara bertahap saat menyentuh file terkait.

---

## 🛠️ Alur Kerja & Perintah Pengembang (Developer Cheatsheet)

### 1. Menjalankan Environment Lokal
```bash
pnpm install
pnpm dev
```

### 2. Perubahan Database (Prisma)
Jika Anda mengubah file `apps/api/src/database/prisma/schema.prisma`:
```bash
# 1. Regenerate Client
pnpm db:generate

# 2. Jalankan Migrasi Dev
pnpm db:migrate
```

### 3. Menjalankan Pengujian Sebelum Commit / Push
```bash
# Validasi menyeluruh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:routes
pnpm build
```

---

## 📞 Kontak & Referensi Penting

- **Dokumentasi Detail:** Lihat folder `docs/` (`PRD.md`, `API_CONTRACT.md`, `SYSTEM_PROMPT.md`, `docs/audit/SPRINT8-AUDIT.md`).
- **Log Audit Terakhir:** [SPRINT8-AUDIT.md](docs/audit/SPRINT8-AUDIT.md).
