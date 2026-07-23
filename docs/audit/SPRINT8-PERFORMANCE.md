# Sprint 8 — Performance Baseline & Final

**Dibuat:** 2026-07-23

**Ditutup:** 2026-07-23

**Tujuan:** Membandingkan baseline Sprint 8 dengan hasil quality gate final.

---

## 1. Performance Budget

| Metrik                                      | Budget         |
| ------------------------------------------- | -------------- |
| Initial JS per route kritis                 | ≤ 200 kB       |
| LCP                                         | ≤ 2,5 detik    |
| INP                                         | ≤ 200 ms       |
| CLS                                         | ≤ 0,1          |
| API report/export dataset ≤ 1.000 transaksi | p95 ≤ 2.000 ms |
| API report/export 31 hari penuh             | p95 ≤ 5.000 ms |

---

## 2. Test dan Build

| Metrik              |     Baseline |     Hasil akhir |
| ------------------- | -----------: | --------------: |
| Unit test suite     |           18 |              22 |
| Unit test           |          133 |             148 |
| E2E suite           |      0 aktif |               4 |
| E2E test            |      0 aktif |              17 |
| Flaky test teramati |            0 |               0 |
| Typecheck API       |        Lulus |           Lulus |
| Typecheck Web       | Belum diukur |           Lulus |
| Production build    |      Parsial | API + Web lulus |

---

## 3. Frontend Bundle

Baseline awal sebagian berupa estimasi dari implementation plan. Hasil akhir berasal dari output
`next build` pada Next.js 15.5.21 di VPS produksi.

| Route           | Baseline | Final First Load JS | Budget | Status |
| --------------- | -------: | ------------------: | -----: | ------ |
| `/login`        |   ~90 kB |              151 kB | 200 kB | ✅     |
| `/pos`          |  ~180 kB |              170 kB | 200 kB | ✅     |
| `/dashboard`    |  ~210 kB |              160 kB | 200 kB | ✅     |
| `/reports`      |   257 kB |              158 kB | 200 kB | ✅     |
| `/transactions` |  ~150 kB |              164 kB | 200 kB | ✅     |

Shared initial JS final: **103 kB**.

Perubahan terbesar adalah `/reports`: 257 kB → 158 kB, turun sekitar **38,5%**.

---

## 4. Report dan Export

| Kontrol             | Baseline               | Hasil akhir                             |
| ------------------- | ---------------------- | --------------------------------------- |
| Throttle export     | Tidak ada limit khusus | 10 request/menit                        |
| Bukti enforcement   | Tidak ada              | E2E request ke-11 menghasilkan HTTP 429 |
| Tenant/outlet scope | Unit test parsial      | Security test lulus                     |
| Bundle UI report    | 257 kB                 | 158 kB                                  |

Benchmark p95 API dengan dataset 1.000+ transaksi belum dijalankan karena belum ada dataset staging
yang aman dan representatif. Angka estimasi lama dihapus agar tidak diperlakukan sebagai hasil ukur.
Benchmark tersebut menjadi waiver UAT, bukan klaim lulus palsu.

---

## 5. Security dan Dependency Performance

Security upgrade final:

- Next.js 15.5.21 Maintenance LTS.
- bcrypt 6.0.0.
- SheetJS 0.20.3.
- sharp ≥ 0.35.0.
- postcss ≥ 8.5.12.

`pnpm audit --prod --audit-level high` menghasilkan **No known vulnerabilities found**.
Build final tetap memenuhi seluruh bundle budget setelah upgrade.

---

## 6. CI Quality Gate

| Step                    | Status     |
| ----------------------- | ---------- |
| Frozen lockfile install | ✅         |
| Format check            | ✅         |
| Lint                    | ✅ 0 error |
| Shared package build    | ✅         |
| Prisma generate         | ✅         |
| API/web typecheck       | ✅         |
| Unit test               | ✅         |
| API/web build           | ✅         |
| Route guard             | ✅         |
| Workspace entrypoint    | ✅         |

E2E tetap dijalankan sebagai gate penutupan terpisah karena membutuhkan lifecycle environment test.

---

## 7. Browser Metrics Waiver

LCP, INP, dan CLS untuk route terautentikasi belum diukur menggunakan profil perangkat UAT.
Pengukuran tanpa akun UAT, dataset, dan skenario perangkat yang tetap tidak dapat dibandingkan secara
andal. Pengukuran ini harus dilakukan pada staging sebelum keputusan production launch.

Status waiver: **diterima untuk handoff staging**, severity Medium, bukan temuan Critical/High.
