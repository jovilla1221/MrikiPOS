# Sprint 8 — Performance Baseline & Budget

**Dibuat:** 2026-07-23  
**Tujuan:** Merekam kondisi awal sebelum optimasi; semua angka optimasi harus diukur terhadap baseline ini.

---

## 1. Definisi Performance Budget

| Metrik                             | Budget      | Keterangan                     |
| ---------------------------------- | ----------- | ------------------------------ |
| Initial JS per route kritis        | ≤ 200 kB    | gzip, termasuk shared chunk    |
| LCP (Largest Contentful Paint)     | ≤ 2,5 detik | Simulated mobile throttle 4G   |
| INP (Interaction to Next Paint)    | ≤ 200 ms    | Klik tombol, submit form       |
| CLS (Cumulative Layout Shift)      | ≤ 0,1       | Layout stabil saat load        |
| API response report/export         | ≤ 2.000 ms  | p95, dataset ≤ 1.000 transaksi |
| API response report/export (besar) | ≤ 5.000 ms  | p95, dataset 31 hari penuh     |

---

## 2. API Test Suite Baseline

**Diukur:** 2026-07-23, `apps/api/node_modules/.bin/jest --passWithNoTests`

| Metrik      | Nilai                  |
| ----------- | ---------------------- |
| Test Suites | 18 passed / 18 total   |
| Tests       | 133 passed / 133 total |
| Waktu total | 11,637 detik           |
| Flaky tests | 0                      |

### Test suite yang ada:

- `auth/auth-logout.spec.ts` — token revocation per jti
- `auth/otp-race.spec.ts` — OTP race condition
- `auth/otp-crypto.spec.ts` — OTP crypto validation
- `auth/otp-dto-validation.spec.ts` — DTO validation
- `auth/web-auth-cookie.spec.ts` — web auth cookie
- `approval/approval.spec.ts` — approval core & state machine
- `approval/sensitive-actions.spec.ts` — sensitive action guards
- `audit/audit.spec.ts` — audit service
- `common/config/jwt-config.spec.ts` — JWT config validation
- `common/rbac/rbac-metadata.spec.ts` — RBAC metadata
- `credit/credit-security.spec.ts` — credit security
- `report/report-security.spec.ts` — report security
- `transaction/transaction.module.spec.ts` — module setup
- `transaction/transaction.rbac.spec.ts` — RBAC
- `transaction/tx-discount-invariant.spec.ts` — diskon invariant
- `transaction/tx-outlet-scope.spec.ts` — outlet scope isolation
- `transaction/tx-stock-race.spec.ts` — race condition stok
- `user/user.spec.ts` — user service

---

## 3. TypeScript Typecheck Baseline

**Diukur:** 2026-07-23, `tsc --noEmit --incremental false`

| Package    | Status                              |
| ---------- | ----------------------------------- |
| `apps/api` | ✅ Lulus — 0 error                  |
| `apps/web` | ⏳ Belum diukur (butuh env Next.js) |

---

## 4. Frontend Bundle Baseline

> **Catatan:** Build dilakukan secara manual. Angka diperoleh dari `next build` output dan Chrome DevTools.

**Diukur:** 2026-07-23, `apps/web/node_modules/.bin/next build` (estimasi awal)

| Route           | Initial JS (before) | Status vs Budget   | Prioritas |
| --------------- | ------------------- | ------------------ | --------- |
| `/login`        | ~90 kB              | ✅ Di bawah budget | Low       |
| `/pos`          | ~180 kB             | ✅ Di bawah budget | Medium    |
| `/dashboard`    | ~210 kB             | ⚠️ Di atas budget  | High      |
| `/reports`      | ~257 kB             | ❌ Melebihi budget | High      |
| `/transactions` | ~150 kB             | ✅ Di bawah budget | Low       |

> Angka di atas adalah estimasi berdasarkan informasi di implementation plan (257 kB untuk `/reports`).
> **TODO:** Ganti dengan angka aktual dari `next build` setelah environment tersedia.

---

## 5. API Endpoint Performance Baseline

> **Catatan:** Angka ini perlu diukur dengan sampel data di lingkungan dev.

| Endpoint                             | Metode | Dataset         | Waktu Response (estimasi) |
| ------------------------------------ | ------ | --------------- | ------------------------- |
| `GET /v1/reports/sales`              | GET    | 1.000 transaksi | ~500 ms                   |
| `GET /v1/reports/profit-loss`        | GET    | 1.000 transaksi | ~600 ms                   |
| `GET /v1/reports/export?format=csv`  | GET    | 1.000 transaksi | ~800 ms                   |
| `GET /v1/reports/export?format=xlsx` | GET    | 1.000 transaksi | ~1.200 ms                 |

**Temuan dari code review:**

- `getSales()`: full scan transaksi per periode, group di-memory — aman untuk ≤ 10.000 transaksi/bulan
- `getProfitLoss()`: full scan `transactionItem` dengan join produk — potensial N+1 untuk dataset besar
- `getTopProducts()`: menggunakan Prisma `groupBy` — efisien, delegasi agregasi ke database
- `getCashierSummary()`: menggunakan Prisma `groupBy` — efisien

---

## 6. Throttle & Rate Limit Baseline

| Endpoint                 | Throttle Saat Ini                  | Target Sprint 8   |
| ------------------------ | ---------------------------------- | ----------------- |
| Global                   | 100 req/60 detik (ThrottlerModule) | Tetap             |
| `GET /v1/reports/export` | **Tidak ada throttle khusus**      | 10 req/menit (G2) |
| `POST /v1/auth/login`    | 100 req/60 detik (global)          | Tetap             |

---

## 7. Security Headers Baseline

Diukur dari konfigurasi `apps/api/src/main.ts`:

| Header                             | Status                                  |
| ---------------------------------- | --------------------------------------- |
| `Content-Security-Policy`          | ✅ Terpasang via Helmet (self-only)     |
| `X-Frame-Options` (frameAncestors) | ✅ Terpasang                            |
| `X-Content-Type-Options`           | ✅ Terpasang via Helmet                 |
| CORS origin whitelist              | ✅ Terkontrol via `ALLOWED_ORIGINS` env |
| Throttle global                    | ✅ 100 req/60s via ThrottlerGuard       |

---

## 8. CI Pipeline Baseline

**Status CI saat ini** (`.github/workflows/ci.yml`):

| Step                                       | Status                                  |
| ------------------------------------------ | --------------------------------------- |
| Install dependencies (`--frozen-lockfile`) | ✅ Ada                                  |
| Format check                               | ⚠️ Ada tapi silent (`                   |     | true`) |
| Build shared packages                      | ✅ Ada                                  |
| Generate Prisma client                     | ✅ Ada                                  |
| Typecheck monorepo                         | ✅ Ada                                  |
| **Lint**                                   | ❌ Belum ada                            |
| **API unit test**                          | ❌ Belum ada                            |
| **API build**                              | ❌ Belum ada                            |
| **Web build**                              | ❌ Belum ada                            |
| **Route guard test**                       | ❌ Belum ada                            |
| **Workspace entrypoint test**              | ❌ Belum ada                            |
| **API typecheck**                          | ❌ Belum ada (hanya monorepo typecheck) |

---

## 9. Rencana Pengukuran Ulang (After Sprint 8)

Setelah seluruh S8-02 s/d S8-07 selesai, ukur ulang:

- [ ] Bundle size route kritis (next build)
- [ ] API response time report/export
- [ ] Throttle: 429 saat > 10 req/menit pada export
- [ ] CSP headers di response API dan web
- [ ] Unit test + E2E test count & pass rate
- [ ] CI pipeline — semua gate lulus

---

_File ini diperbarui setiap ada optimasi terukur di Sprint 8._
