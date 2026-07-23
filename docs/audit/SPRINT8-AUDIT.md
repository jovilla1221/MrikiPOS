# Sprint 8 Quality Audit Report

**Tanggal audit dan penutupan:** 2026-07-23

**Status Sprint:** DITUTUP — LULUS DENGAN WAIVER UAT TERDOKUMENTASI

**Baseline penutupan:** commit fitur Google Auth `6416046` ditambah commit penutupan Sprint 8

---

## 1. Ringkasan Quality Gate Final

Seluruh command berikut dijalankan kembali pada VPS dari source dan dependency produksi:

| Gate                      | Hasil akhir                               |
| ------------------------- | ----------------------------------------- |
| Format                    | ✅ `pnpm format:check`                    |
| Lint                      | ✅ 0 error; 137 warning backlog           |
| Typecheck API             | ✅ 0 error                                |
| Typecheck Web             | ✅ 0 error                                |
| Unit test                 | ✅ 22 suite, 148 test                     |
| E2E test                  | ✅ 4 suite, 17 test                       |
| API build                 | ✅ Nest production build                  |
| Web build                 | ✅ Next.js 15.5.21 production build       |
| Route guard               | ✅ route terproteksi mengarah ke `/login` |
| Workspace entrypoint      | ✅ seluruh entrypoint valid               |
| Dependency audit produksi | ✅ 0 vulnerability                        |

### Cakupan E2E

1. `health.e2e-spec.ts` — liveness, readiness, dan kondisi dependency degraded.
2. `auth.e2e-spec.ts` — registrasi, login, token rotation, revocation, dan RBAC.
3. `business-flow.e2e-spec.ts` — transaksi cash, offline sync, QRIS webhook, dan self-void.
4. `report-throttle.e2e-spec.ts` — request export ke-11 dalam satu menit menghasilkan HTTP 429.

---

## 2. Performance Budget

Build final menggunakan Next.js 15.5.21:

| Route           |  Baseline Sprint 8 | Hasil akhir |   Budget | Status |
| --------------- | -----------------: | ----------: | -------: | ------ |
| `/login`        |  ~90 kB (estimasi) |      151 kB | ≤ 200 kB | ✅     |
| `/pos`          | ~180 kB (estimasi) |      170 kB | ≤ 200 kB | ✅     |
| `/dashboard`    | ~210 kB (estimasi) |      160 kB | ≤ 200 kB | ✅     |
| `/reports`      |             257 kB |      158 kB | ≤ 200 kB | ✅     |
| `/transactions` | ~150 kB (estimasi) |      164 kB | ≤ 200 kB | ✅     |

Shared initial JS final adalah 103 kB. Route `/reports` turun sekitar 38,5% dari baseline
257 kB menjadi 158 kB.

Export report memiliki limit aktual 10 request/menit dan E2E membuktikan request ke-11
menghasilkan HTTP 429.

---

## 3. Security Closure

Audit dependency awal saat penutupan menemukan 48 vulnerability:

- 3 critical
- 22 high
- 19 moderate
- 4 low

Remediasi yang diterapkan:

- Next.js `15.1.5` → `15.5.21` Maintenance LTS.
- bcrypt `5.1.1` → `6.0.0`.
- SheetJS npm lama `0.18.5` → tarball resmi SheetJS `0.20.3`.
- Override transitive `sharp` ke `^0.35.0`.
- Override transitive `postcss` ke `^8.5.12`.

Hasil final `pnpm audit --prod --audit-level high`: **No known vulnerabilities found**.

Kontrol keamanan lain yang diverifikasi:

1. Helmet dan security headers API aktif.
2. CORS dikontrol melalui `ALLOWED_ORIGINS`.
3. JWT secret divalidasi saat startup dan tidak disimpan di source.
4. Webhook Midtrans menolak signature tidak valid.
5. Payment mock dinonaktifkan pada production.
6. OTP memiliki expiry, attempt limit, dan atomic one-time verification.
7. Google ID token diverifikasi di backend sebelum akun ditautkan atau dibuat.
8. Export report dibatasi 10 request/menit.

Tidak ada temuan Critical/High terbuka pada penutupan Sprint 8.

---

## 4. Validasi Operasional

- `mrikipos-api.service`: active.
- `mrikipos-web.service`: active.
- Public readiness `https://baswara.web.id/api/health/ready`: database dan Redis connected.
- Prisma: 3 migration, schema up to date.
- Login dan pendaftaran Google dirender melalui Google Identity Services.
- Backup sebelum security upgrade:
  `/home/filla_saputro/backups/mrikipos/sprint8-close-20260723T1740Z`.

---

## 5. Waiver dan Backlog Non-Blocking

| Item                                                                      | Risiko | Keputusan                                                                                |
| ------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| LCP/INP/CLS route terautentikasi belum diukur dengan profil perangkat UAT | Medium | Ukur pada staging dengan akun dan dataset UAT; tidak ada klaim angka palsu pada Sprint 8 |
| API report/export p95 untuk dataset 1.000+ transaksi belum diukur         | Medium | Benchmark pada staging setelah dataset UAT tersedia                                      |
| 137 lint warning lama                                                     | Low    | Tidak ada lint error; kurangi bertahap tanpa memperluas scope penutupan                  |
| Dua penggunaan `<img>` dan warning `themeColor` Next.js                   | Low    | Backlog UI/metadata; build dan runtime tidak gagal                                       |

Waiver di atas tidak mengandung temuan Critical/High dan tidak menghalangi handoff ke staging.

---

## 6. Definition of Done

- [x] Format dan lint lulus tanpa error.
- [x] Typecheck API/web lulus.
- [x] Unit dan E2E test lulus.
- [x] API dan web production build lulus.
- [x] Route guard dan workspace entrypoint lulus.
- [x] Bundle route kritis memenuhi budget.
- [x] Export throttle dibuktikan melalui E2E HTTP 429.
- [x] Dependency audit produksi bersih.
- [x] Tidak ada Critical/High security finding terbuka.
- [x] Risiko tersisa memiliki waiver dan owner sprint berikutnya.
- [x] Laporan audit dan performance diperbarui.

---

## 7. Keputusan Penutupan

Sprint 8 dinyatakan **selesai dan ditutup** pada 2026-07-23. Tidak ada pekerjaan Sprint 9
yang dimulai melalui penutupan ini. Handoff ke Sprint 9 menunggu konfirmasi eksplisit owner.
