# Sprint 8 - Implementation Plan

**Audience:** junior developer atau AI implementer  
**Durasi:** 10 hari kerja  
**Fokus:** testing, performance optimization, security audit  
**Sumber:** `docs/PRD.md` Sprint 8, audit Sprint 0-7, dan baseline kode saat ini

## 1. Tujuan

Sprint 8 membuat MrikiPOS siap masuk staging. Pekerjaan hanya dianggap selesai bila flow kritis memiliki automated test, CI menolak regresi, optimasi memiliki ukuran sebelum/sesudah, dan tidak ada temuan security Critical/High yang belum dimitigasi.

Baseline saat plan dibuat:

- API mempunyai 18 test suite dan 133 test, tetapi belum ada API E2E test yang aktif.
- CI baru menjalankan setup, generate Prisma, dan typecheck; test/build aplikasi belum menjadi gate lengkap.
- Route `/reports` memiliki initial JS sekitar 257 kB dan report backend masih melakukan full scan untuk beberapa agregasi.
- CSP belum dipasang pada frontend; export report belum memiliki throttle khusus.

## 2. Aturan

- Ukur performa sebelum mengubah kode dan simpan angka sebelum/sesudah.
- Test database harus terpisah dari database development/production.
- Semua test multi-tenant wajib memiliki case lintas tenant/outlet.
- Jangan memasang package baru atau membuat migration tanpa persetujuan.
- Jangan mengubah fitur bisnis kecuali diperlukan untuk memperbaiki bug yang dibuktikan test.
- Setiap task harus selesai beserta test dan verifikasinya sebelum lanjut.

## 3. Decision Gate

| ID | Keputusan | Default yang disarankan |
|---|---|---|
| G1 | Database E2E | PostgreSQL dan Redis test terisolasi; tidak boleh reset database bersama |
| G2 | Throttle export | Gunakan `@nestjs/throttler` yang sudah ada, maksimum 10 request/menit pada endpoint export |
| G3 | CSP | Mulai Report-Only, catat origin API/QRIS/image, lalu enforce setelah smoke test |
| G4 | Browser E2E | Manual Chrome DevTools pada Sprint 8; Playwright hanya bila package disetujui |
| G5 | Index database | Hanya dibuat bila `EXPLAIN` membuktikan kebutuhan dan migration disetujui |

## 4. Task Implementasi

### S8-01 - Baseline dan performance budget

**Tujuan:** merekam kondisi awal supaya optimasi tidak berdasarkan tebakan.

**Acceptance criteria:**

- [ ] Catat waktu API report/export, ukuran bundle route utama, serta LCP/INP/CLS untuk login, POS, dashboard, dan reports.
- [ ] Tetapkan budget: initial JS route kritis maksimal 200 kB, LCP <= 2,5 detik, INP <= 200 ms, CLS <= 0,1.
- [ ] Hasil baseline disimpan di `docs/audit/SPRINT8-PERFORMANCE.md`.

**Verifikasi:** `pnpm build`, browser DevTools, dan sampel data yang dicatat.  
**Dependensi:** tidak ada.  
**Scope:** S.

### S8-02 - Lengkapi CI quality gate

**Tujuan:** CI gagal bila test, typecheck, build, route guard, atau entrypoint gagal.

**Acceptance criteria:**

- [ ] Tambahkan script `typecheck` API dan jalankan lint, typecheck, API test, API/web build, route test, dan entrypoint test di CI.
- [ ] Hapus silent pass `format:check || true` setelah baseline formatting bersih.
- [ ] CI menggunakan `pnpm install --frozen-lockfile` dan tidak mengakses secret production.

**Verifikasi:** jalankan seluruh command CI secara lokal dan pastikan exit code 0.  
**Dependensi:** S8-01.  
**Files:** `.github/workflows/ci.yml`, `apps/api/package.json`, root `package.json`.  
**Scope:** S.

### Checkpoint A

- [ ] Baseline performance tercatat.
- [ ] CI menjalankan quality gate lengkap.
- [ ] Review owner sebelum membuat E2E database.

### S8-03 - API E2E foundation dan isolasi tenant

**Tujuan:** mengaktifkan Supertest/Jest E2E menggunakan dependency yang sudah tersedia.

**Acceptance criteria:**

- [ ] Buat konfigurasi E2E dan lifecycle database test yang aman serta repeatable.
- [ ] Test auth, health, role access, dan akses resource lintas tenant/outlet.
- [ ] Test tidak bergantung pada urutan eksekusi dan membersihkan datanya sendiri.

**Verifikasi:** `pnpm --filter api test:e2e`.  
**Dependensi:** G1 dan S8-02.  
**Files:** `apps/api/test/`, konfigurasi Jest E2E, environment test.  
**Scope:** M.

### S8-04 - E2E flow bisnis kritis

**Tujuan:** menjaga flow yang berdampak pada uang, stok, dan approval.

**Acceptance criteria:**

- [ ] Test transaksi cash mengurangi stok satu kali dan offline sync dengan `local_id` tetap idempotent.
- [ ] Test webhook QRIS invalid/valid dan duplicate notification tidak menggandakan transaksi.
- [ ] Test approval/void paralel hanya mengeksekusi satu aksi dan satu audit event.

**Verifikasi:** E2E suite lulus dua kali berturut-turut tanpa flaky test.  
**Dependensi:** S8-03.  
**Scope:** M.

### Checkpoint B

- [ ] Flow auth, tenant isolation, transaksi, payment, offline sync, dan approval teruji.
- [ ] Seluruh unit test lama tetap lulus.

### S8-05 - Optimasi report dan export

**Tujuan:** menutup risiko memory spike dan abuse pada endpoint laporan.

**Acceptance criteria:**

- [ ] Batasi rentang report/export besar dan terapkan filter `kasir_id` secara konsisten.
- [ ] Profiling membuktikan query full scan utama sudah dibatasi atau dipindah ke agregasi database.
- [ ] Export mempunyai throttle khusus serta test 429 tanpa memengaruhi report biasa.

**Verifikasi:** benchmark sebelum/sesudah, unit test report, dan test tenant scope.  
**Dependensi:** S8-01 dan persetujuan G2/G5.  
**Scope:** M.

### S8-06 - Optimasi frontend terukur

**Tujuan:** memperbaiki route yang melewati performance budget pada perangkat Android kelas rendah.

**Acceptance criteria:**

- [ ] Profiling menentukan penyebab route berat sebelum refactor.
- [ ] Chart/fitur berat dimuat secara lazy bila terbukti menjadi bottleneck; gambar memakai ukuran dan loading yang benar.
- [ ] Build dan pengukuran ulang menunjukkan budget tercapai atau residual gap terdokumentasi.

**Verifikasi:** `pnpm --filter web build`, DevTools Performance, dan Lighthouse.  
**Dependensi:** S8-01.  
**Scope:** M.

### Checkpoint C

- [ ] Angka performa sesudah perubahan dicatat.
- [ ] Tidak ada optimasi tanpa bukti pengukuran.
- [ ] Test bisnis tetap hijau.

### S8-07 - Security hardening dan dependency audit

**Tujuan:** menutup attack surface sebelum staging.

**Acceptance criteria:**

- [ ] Terapkan CSP/security headers setelah login, POS, QRIS, upload, dan offline mode lolos smoke test.
- [ ] Jalankan native dependency audit; triage Critical/High berdasarkan reachability tanpa forced upgrade.
- [ ] Uji auth rate limit, RBAC, tenant isolation, upload validation, webhook signature, error leakage, dan secret exposure.

**Verifikasi:** response headers, security regression tests, `pnpm audit --prod`, dan secret scan.  
**Dependensi:** G3, S8-03, dan S8-04.  
**Scope:** M.

### S8-08 - Regression, audit, dan handoff

**Tujuan:** menghasilkan bukti bahwa Sprint 8 siap diserahkan ke Sprint 9.

**Acceptance criteria:**

- [ ] Seluruh quality gate, E2E, build, route test, dan performance budget dijalankan dari kondisi bersih.
- [ ] Temuan security diberi severity, bukti, owner, dan status remediation.
- [ ] Buat `docs/audit/SPRINT8-AUDIT.md` berisi hasil, risiko tersisa, dan rekomendasi staging.

**Verifikasi:** command pada Definition of Done seluruhnya exit code 0.  
**Dependensi:** S8-01 sampai S8-07.  
**Scope:** S.

## 5. Definition of Done

- [ ] `pnpm lint` lulus tanpa error.
- [ ] `pnpm typecheck` dan API `tsc --noEmit` lulus.
- [ ] Unit test dan E2E test lulus tanpa flaky test.
- [ ] API dan web production build lulus.
- [ ] Route guard dan workspace entrypoint test lulus.
- [ ] Performance before/after tersedia dan route kritis memenuhi budget atau memiliki waiver tertulis.
- [ ] Tidak ada Critical/High security finding yang belum dimitigasi.
- [ ] Dependency audit sudah ditriage, bukan sekadar dijalankan.
- [ ] `SPRINT8-PERFORMANCE.md` dan `SPRINT8-AUDIT.md` selesai.

## 6. Risiko

| Risiko | Mitigasi |
|---|---|
| E2E merusak data lokal | Gunakan database test terpisah dan fail bila URL bukan environment test |
| CSP mematahkan Next.js/QRIS | Report-Only dahulu, inventaris origin, lalu smoke test sebelum enforce |
| Optimasi mengubah hasil laporan | Snapshot hasil sebelum/sesudah dan regression test nilai agregat |
| Test menjadi flaky | Hilangkan dependency waktu nyata, random data tanpa seed, dan urutan test |
| Scope melebar ke Sprint 9 | Tidak membuat deployment/staging automation atau fitur bisnis baru |

## 7. Pesan untuk implementer

> Kerjakan hanya Sprint 8. Mulai dari bukti baseline, lalu test, optimasi terukur, dan security hardening. Jangan menambah fitur bisnis, package, atau migration tanpa persetujuan. Setiap perubahan harus disertai test dan hasil verifikasi.
