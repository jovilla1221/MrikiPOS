# Handover Pengembang & Status Kemajuan Proyek MrikiPOS

Dokumen ini berisi status kemajuan proyek **MrikiPOS**, kondisi lingkungan staging yang sedang
berjalan, batasan yang masih terbuka, serta arahan untuk pengembang berikutnya.

**Terakhir diperbarui:** 26 Juli 2026

---

## 📌 Status Terakhir Proyek

- **Sprint terakhir ditutup:** **Sprint 8** — lulus quality gate & security audit (23 Juli 2026).
- **Setelah itu:** dikerjakan perbaikan bug produksi, penutupan blocker deployment, empat fitur P0
  yang belum ada, dan redesign UI. Seluruhnya sudah berjalan di staging.
- **Sprint 9 belum dimulai.** Rencananya sudah tersedia di
  [`docs/plans/sprint-9/`](docs/plans/sprint-9/README.md).
- **Kondisi repository:** stabil, seluruh quality gate hijau, tidak ada perubahan yang belum
  di-commit.
- **Git commit terakhir:** `09dbd7e`.

---

## 🌐 Lingkungan Staging (sudah berjalan)

Staging **tidak perlu di-deploy ulang**. Kondisinya saat ini:

| Item                | Nilai                                                                     |
| ------------------- | ------------------------------------------------------------------------- |
| URL                 | `https://baswara.web.id`                                                  |
| Server              | VPS `13.212.233.90` (Amazon Linux 2023), user `ec2-user`                  |
| Aplikasi            | `mrikipos-api` (port 4000) & `mrikipos-web` (port 3000), keduanya systemd |
| Reverse proxy       | nginx, HTTPS Let's Encrypt, auto-renew aktif                              |
| Database            | PostgreSQL 16 lokal, Redis 6 lokal (keduanya bind ke 127.0.0.1)           |
| Backup              | `pg_dump` harian 02.00 WIB, retensi 7 hari, di `/var/backups/mrikipos`    |
| Port publik terbuka | 22, 80, 443 saja                                                          |

Akun seed untuk pengujian internal:

- Owner: `081234567890` / PIN `123456`
- Kasir: `089876543210` / PIN `123456`

> Data di staging masih **seed dummy**. Dataset UAT yang realistis dibuat pada Sprint 9 (task S9-02).

---

## 🛠️ Fitur & Modul yang Sudah Selesai

### 1. Otentikasi & Otorisasi (`apps/api/src/modules/auth`)

- [x] Login & registrasi berbasis **nomor HP + PIN 6 digit** (PIN di-hash dengan bcrypt).
- [x] Verifikasi **OTP via WhatsApp** (Fonnte) dengan expiry, attempt limit, dan verifikasi
      atomik sekali pakai.
- [x] Login & pendaftaran via **Google Identity Services** (verifikasi ID token di backend).
- [x] Penautan akun (account linking) antara akun HP/PIN lama dan akun Google.
- [x] Pendaftaran via Google **melewati OTP WhatsApp** — akun langsung aktif.
- [x] JWT access + refresh token, rotasi, dan revokasi.
- [x] RBAC dengan 4 role: **OWNER, MANAGER, KASIR, STAFF** (guard + decorator).
- [x] Proteksi brute-force: lockout 15 menit setelah 5 percobaan gagal.

### 2. Transaksi & POS (`apps/api/src/modules/transaction`, `apps/web/src/app/(dashboard)/pos`)

- [x] Keranjang transaksi dengan perhitungan total, diskon, dan kembalian real-time.
- [x] Pembayaran tunai.
- [x] **QRIS via Midtrans** — payment intent dan webhook dengan validasi HMAC signature.
- [x] Pembatalan transaksi (void) dengan otorisasi PIN.
- [x] **Hold transaction** — tahan pesanan, layani pembeli lain, lanjutkan kemudian.
- [x] **Mode offline** — transaksi disimpan di IndexedDB (Dexie.js) lalu disinkronkan otomatis.
- [x] **Cetak struk thermal 58mm** lewat dialog printer sistem (lihat batasan di bawah).

### 3. Produk & Inventory (`apps/api/src/modules/product`, `modules/inventory`)

- [x] CRUD produk, kategori, varian, barcode.
- [x] Import produk dari Excel/CSV.
- [x] Riwayat mutasi stok dan peringatan stok menipis.
- [x] **Stock opname** — pencocokan stok fisik vs sistem, selisih tercatat sebagai ADJUSTMENT.

### 4. Modul Bisnis Lain

- [x] **Shift kasir** (`modules/shift`) — buka/tutup shift, modal awal, selisih kas.
- [x] **Kasbon/piutang** (`modules/credit`) — pencatatan, cicilan, reminder.
- [x] **Pelanggan** (`modules/customer`) — database dan riwayat belanja.
- [x] **Approval** (`modules/approval`) — persetujuan aksi sensitif.
- [x] **Audit trail** (`modules/audit`) — pencatatan aktivitas.

### 5. Laporan & Export (`apps/api/src/modules/report`)

- [x] Laporan penjualan, laba rugi, produk terlaris, rekap kasir.
- [x] Export **Excel/CSV** (SheetJS) dan **PDF** lewat dialog cetak browser.
- [x] Throttle export maksimal 10 request/menit per user (HTTP 429 bila melebihi).

### 6. Infrastruktur & Keamanan

- [x] `helmet`, `@nestjs/throttler`, CORS via `ALLOWED_ORIGINS`.
- [x] Payment mock dinonaktifkan otomatis pada environment produksi.
- [x] Dependency produksi: 0 vulnerability (`pnpm audit --prod`).
- [x] Performance budget: shared initial JS 103 kB, seluruh route utama di bawah 200 kB.
- [x] **Baseline migration** — database baru bisa dibangun dari nol dengan `prisma migrate deploy`.

---

## 📊 Ringkasan Hasil Pengujian

| Kategori                 | Status                | Detail                                                                                               |
| ------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------- |
| **Unit Test**            | ✅ 22 suite, 148 test | Auth, POS, payment, report, approval, audit, shared utils                                            |
| **E2E Test**             | ✅ 4 suite, 17 test   | `health.e2e-spec.ts`, `auth.e2e-spec.ts`, `business-flow.e2e-spec.ts`, `report-throttle.e2e-spec.ts` |
| **Type Check**           | ✅ 0 error            | `pnpm typecheck` (API & web)                                                                         |
| **Lint**                 | ✅ 0 error            | 137 warning legacy, non-blocking                                                                     |
| **Formatting**           | ✅ Bersih             | `pnpm format:check`                                                                                  |
| **Build produksi**       | ✅ Lulus              | API (Nest) & web (Next.js 15.5.21)                                                                   |
| **Route guard**          | ✅ Verified           | Route terproteksi mengarah ke `/login`                                                               |
| **Provisioning DB baru** | ✅ Verified           | `migrate deploy` pada database kosong → 20 tabel, tanpa drift                                        |

---

## ⚠️ Batasan yang Masih Terbuka

Baca bagian ini sebelum menjanjikan apa pun ke pengguna.

1. **Midtrans dan Fonnte masih mock mode.** QRIS tidak menghubungi gateway asli; OTP WhatsApp hanya
   ditulis ke log server, tidak terkirim ke HP. Diaktifkan pada Sprint 9 (S9-01).
2. **Cetak struk bukan Web Bluetooth.** Implementasinya memakai dialog cetak browser dengan ukuran
   kertas 58mm — berfungsi dengan printer thermal yang terpasang sebagai printer sistem (driver
   Windows/CUPS, RawBT di Android). **Belum pernah diuji dengan printer fisik.**
3. **Dua waiver Sprint 8 masih terbuka:** LCP/INP/CLS pada perangkat kasir riil, dan p95 export
   untuk dataset 1.000+ transaksi. Keduanya ditutup pada Sprint 9 (S9-03, S9-04).
4. **137 lint warning legacy.** Tidak menghalangi build; perbaiki bertahap saat menyentuh file terkait.
5. **Dark mode dinonaktifkan.** Desain saat ini light-only; kelas `dark:` masih ada di kode tetapi
   varian-nya diikat ke class `.dark` yang tidak pernah dipasang (lihat `globals.css`).
6. **Redesign UI baru mencakup halaman auth dan shell dashboard.** Isi halaman POS, produk, laporan,
   dan lainnya masih memakai gaya lama.
7. **Item PRD yang belum dibangun:** Socket.io realtime, BullMQ background jobs, Sentry monitoring,
   Cloudflare R2 storage, dan seluruh fitur P2 (katalog online, WhatsApp order, multi-outlet,
   loyalty, PPh UMKM, resep/BOM).

---

## 🎯 Langkah Berikutnya

Sprint 9 sudah direncanakan. **Mulai dari sana, jangan menyusun ulang.**

- 📋 [`docs/plans/sprint-9/README.md`](docs/plans/sprint-9/README.md) — batas sprint & prasyarat
- 📋 [`docs/plans/sprint-9/IMPLEMENTATION_PLAN.md`](docs/plans/sprint-9/IMPLEMENTATION_PLAN.md) —
  task S9-01 s.d. S9-07
- 📋 [`docs/plans/sprint-9/TODO.md`](docs/plans/sprint-9/TODO.md) — checklist harian

Fokus Sprint 9: aktivasi integrasi riil → dataset UAT → pengukuran perangkat nyata → eksekusi UAT
bersama UMKM → perbaikan bug → handoff Sprint 10 (production launch).

**Prasyarat dari owner sebelum Sprint 9 bisa jalan:** kredensial Midtrans sandbox, token Fonnte,
jadwal minimal 3 peserta UMKM, satu printer thermal, dan satu perangkat Android kelas menengah-bawah.

---

## 🛠️ Developer Cheatsheet

### Menjalankan environment lokal

```bash
pnpm install
pnpm db:generate
pnpm dev
```

Butuh Node >= 20 (lihat `.nvmrc`), pnpm 9.15.4, PostgreSQL, dan Redis.

### Perubahan database (Prisma)

Setelah mengubah `apps/api/src/database/prisma/schema.prisma`:

```bash
pnpm db:generate                        # regenerate client
pnpm --filter api exec prisma migrate dev --name <nama_perubahan>
```

> Database yang dibuat sebelum baseline migration ada perlu dijalankan sekali:
> `prisma migrate resolve --applied 20260720000000_baseline`

### Validasi sebelum commit

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter api exec jest --config ./test/jest-e2e.json
pnpm test:routes
pnpm test:entrypoints
pnpm build
```

### Operasi staging

```bash
sudo systemctl status mrikipos-api mrikipos-web
sudo journalctl -u mrikipos-api -n 50 --no-pager
sudo systemctl restart mrikipos-web        # setelah `pnpm --filter web build`
sudo systemctl start mrikipos-backup.service   # backup manual
```

> Variabel `NEXT_PUBLIC_*` di-bake saat build. Setelah mengubahnya di `apps/web/.env`, wajib
> `pnpm --filter web build` lalu restart service — restart saja tidak cukup.

---

## 📞 Referensi Penting

- **Dokumentasi:** `docs/PRD.md`, `docs/API_CONTRACT.md`, `docs/DATABASE_SCHEMA.md`,
  `docs/ADR.md`, `docs/DESIGN_SYSTEM.md`
- **Audit terakhir:** [SPRINT8-AUDIT.md](docs/audit/SPRINT8-AUDIT.md),
  [SPRINT8-PERFORMANCE.md](docs/audit/SPRINT8-PERFORMANCE.md)
- **Rencana aktif:** [Sprint 9](docs/plans/sprint-9/README.md)
