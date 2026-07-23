# MrikiPOS Sprint 6 - Routing, Security Audit, and Junior Handoff

Tanggal audit: 2026-07-22  
Status dokumen: siap dieksekusi per tugas  
Metode: debugging, TDD, code review, security hardening, dan playbook PentesterFlow `webvuln`, `jwt`, serta `race`

## 1. Batasan Audit

- Scope kode: `apps/web`, `apps/api`, `packages/shared-types`, dan `packages/shared-utils`.
- Audit runtime tambahan dihentikan atas permintaan pemilik proyek agar handoff segera tersedia.
- Temuan yang belum memiliki PoC runtime ditandai `RISIKO STATIS`, bukan kerentanan terkonfirmasi.
- Jangan mengubah schema database, memasang dependency, atau membuat migration tanpa persetujuan pemilik proyek.
- Jangan menyimpan access token atau refresh token di `localStorage`.

## 2. Yang Sudah Diperbaiki

### FIX-ROUTE-001 - Route dashboard hilang

Status: selesai.

- Dashboard dipindah dari route group root ke `apps/web/src/app/(dashboard)/dashboard/page.tsx`.
- `/` tetap mengarahkan pengguna ke `/login`.
- `/dashboard` sekarang menjadi route build yang nyata dan tidak lagi bertabrakan dengan root page.
- Regression test ditambahkan pada `scripts/verify-built-routes.mjs`.
- Script root ditambahkan: `pnpm test:routes`.

Acceptance result:

- `pnpm --filter web build`: lulus.
- `pnpm test:routes`: lulus.
- Smoke test sebelumnya: `/` menghasilkan redirect ke `/login`; `/dashboard`, `/pos`, dan `/login` tersedia.

### FIX-PKG-001 - Entry point shared package tidak dapat dipakai saat runtime

Status: selesai.

- `packages/shared-types/package.json` dan `packages/shared-utils/package.json` sekarang menunjuk ke `dist/index.js` dan `dist/index.d.ts`.
- Kedua package dibangun sebagai CommonJS agar kompatibel dengan runtime NestJS saat ini.
- Regression test ditambahkan pada `scripts/verify-workspace-entrypoints.mjs`.
- Script root ditambahkan: `pnpm test:entrypoints`.

Acceptance result:

- Kedua package dapat di-`require()` dari Node.js.
- `pnpm typecheck`: lulus untuk seluruh workspace.
- API build terbaru dapat memetakan seluruh controller dan terhubung ke PostgreSQL serta Redis ketika dijalankan di luar sandbox.

## 3. Temuan dan Backlog Keamanan

### SEC-AUTH-001 - Logout memblokir login baru selama tujuh hari

Prioritas: P0  
Status: RISIKO STATIS, wajib dibuat regression test sebelum perbaikan  
File utama: `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/strategies/jwt.strategy.ts`

Evidence:

- Logout menulis `revoked_token:<userId>` dengan TTL tujuh hari.
- `JwtStrategy` menolak semua access token milik user selama key tersebut ada.
- Login sukses tidak menghapus key revocation tersebut.
- Dampak yang diperkirakan: setelah logout, token dari login baru tetap ditolak sampai TTL berakhir.

Tugas implementasi:

1. Tambahkan integration test: login, akses endpoint, logout, login ulang, lalu akses endpoint dengan token baru.
2. Ubah revocation dari level user menjadi level token/session, misalnya berdasarkan `jti` atau session ID.
3. Simpan denylist hanya sampai access token terkait kedaluwarsa.
4. Pertahankan rotasi dan pencabutan refresh token yang sudah ada.

Acceptance criteria:

- Token lama ditolak setelah logout.
- Token hasil login baru diterima.
- Logout satu perangkat tidak mencabut sesi perangkat lain kecuali produk memang mendefinisikan logout-all.
- Test gagal sebelum fix dan lulus setelah fix.

### SEC-JWT-001 - Secret development memiliki fallback/pola placeholder

Prioritas: P0 sebelum production  
Status: konfigurasi terkonfirmasi; eksploitasi deployment production belum diuji  
File utama: `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/strategies/jwt.strategy.ts`

Evidence:

- Source memiliki fallback secret development.
- Konfigurasi lokal terdeteksi sebagai placeholder-like.
- Verifier sudah membatasi algoritma ke `HS256`; percobaan `alg=none` ditolak dengan HTTP 401 pada smoke test sebelumnya.

Tugas implementasi:

1. Hapus seluruh fallback JWT secret dari source.
2. Buat validasi startup yang gagal jika secret tidak ada, terlalu pendek, sama antara access/refresh, atau mengandung pola `change_me`, `secret`, maupun `placeholder`.
3. Wajibkan secret acak minimal 32 byte dari secret manager pada staging dan production.
4. Rotasi seluruh secret sebelum deployment dan cabut seluruh refresh token lama.
5. Jangan mencetak secret atau token ke log dan laporan test.

Acceptance criteria:

- API gagal start bila salah satu secret kosong atau placeholder.
- Access secret dan refresh secret wajib berbeda.
- Unit test mencakup empty, short, placeholder, equal secrets, dan konfigurasi valid.
- `alg=none` tetap menghasilkan 401.

### SEC-OTP-001 - OTP memakai generator non-kriptografis

Prioritas: P1  
Status: TERKONFIRMASI DARI SOURCE  
File utama: `apps/api/src/modules/auth/auth.service.ts:193`

Evidence: OTP enam digit dibuat dengan `Math.random()`, yang tidak dirancang untuk token keamanan.

Tugas implementasi:

1. Ganti dengan `randomInt(100000, 1000000)` dari `node:crypto`.
2. Pertahankan penyimpanan hash OTP, expiry, attempt limit, dan rate limit.
3. Tambahkan unit test yang me-mock generator aman tanpa menguji distribusi randomness.

Acceptance criteria:

- Tidak ada `Math.random()` pada flow OTP atau reset PIN.
- OTP selalu enam digit.
- OTP mentah tidak tersimpan di database dan tidak muncul di log production.

### SEC-OTP-002 - Verifikasi OTP berpotensi dipakai bersamaan

Prioritas: P0  
Status: RISIKO STATIS, PoC race belum dijalankan  
File utama: `apps/api/src/modules/auth/auth.service.ts`

Evidence: record OTP dibaca, diverifikasi, lalu ditandai `verified` dengan operasi terpisah. Dua request paralel berpotensi membaca state belum terverifikasi yang sama.

Tugas implementasi:

1. Buat integration test yang mengirim 10 verifikasi paralel untuk satu OTP.
2. Jadikan konsumsi OTP atomik menggunakan conditional update atau transaction dengan isolation yang sesuai.
3. Hanya request yang berhasil mengubah state dari belum terpakai menjadi terpakai yang boleh menerbitkan token.
4. Terapkan pola yang sama pada forgot-PIN.

Acceptance criteria:

- Tepat satu request paralel berhasil.
- Sembilan request lain mendapat 400/409 tanpa token.
- Tidak ada lebih dari satu refresh-token session yang dibuat dari OTP yang sama.

### SEC-OTP-003 - Nilai `type` OTP tidak divalidasi saat runtime

Prioritas: P1  
Status: TERKONFIRMASI DARI SOURCE  
File utama: `apps/api/src/modules/auth/auth.dto.ts`

Tugas implementasi:

1. Ganti validasi `@IsString()` pada `type` dengan enum dan `@IsEnum()` atau `@IsIn()`.
2. Gunakan satu enum bersama untuk DTO dan service.
3. Tambahkan test bahwa nilai asing menghasilkan HTTP 400.

Acceptance criteria: hanya `register`, `login`, dan `forgot_pin` yang diterima sesuai flow yang benar-benar didukung.

### SEC-TX-001 - Scope produk transaksi belum membatasi outlet

Prioritas: P0 untuk multi-outlet  
Status: RISIKO STATIS  
File utama: `apps/api/src/modules/transaction/transaction.service.ts:53`, `apps/api/src/modules/transaction/transaction.service.ts:354`

Evidence: lookup produk menggunakan ID lalu memeriksa tenant, tetapi outlet transaksi belum menjadi bagian konsisten dari filter produk.

Tugas implementasi:

1. Tambahkan integration fixture dua outlet dalam tenant yang sama.
2. Buktikan produk outlet A tidak dapat dijual atau diubah stoknya oleh sesi outlet B.
3. Gunakan query dengan `id`, `tenant_id`, dan `outlet_id` pada batas repository/service.
4. Terapkan filter yang sama pada create, offline sync, void, inventory, dan lookup sekunder.

Acceptance criteria:

- Cross-outlet ID menghasilkan 404, bukan membocorkan keberadaan resource.
- Stok dan transaksi outlet lain tidak berubah.
- Positive test outlet yang sama tetap lulus.

### SEC-TX-002 - Race stok dan nomor transaksi

Prioritas: P0  
Status: RISIKO STATIS, belum menjadi finding terkonfirmasi  
File utama: `apps/api/src/modules/transaction/transaction.service.ts`

Evidence: read-check-write berada dalam transaction, tetapi transaction database saja tidak otomatis mencegah dua request pada isolation default membaca stok yang sama. Pembuatan nomor dari record terakhir juga berpotensi collision.

Tugas implementasi:

1. Buat test paralel saat stok tersisa satu dan dua request membeli satu item.
2. Gunakan atomic conditional decrement atau row lock; satu request harus gagal bersih.
3. Gunakan sequence/UUID/idempotency key untuk identitas transaksi, bukan `last + 1` tanpa proteksi.
4. Test ulang endpoint transaksi biasa dan offline sync.

Acceptance criteria:

- Stok tidak pernah negatif.
- Tepat satu transaksi berhasil ketika stok satu.
- Tidak ada duplicate transaction number.
- Retry dengan idempotency key yang sama tidak membuat transaksi kedua.

### SEC-TX-003 - Diskon item perlu invariant server-side

Prioritas: P1  
Status: RISIKO STATIS  
File utama: `apps/api/src/modules/transaction/transaction.dto.ts:37`, `apps/api/src/modules/transaction/transaction.service.ts:69`

Tugas implementasi:

1. Validasi diskon sebagai angka finite dan non-negatif.
2. Tolak diskon yang melebihi subtotal item kecuali aturan bisnis eksplisit mengizinkannya.
3. Hitung harga dasar dari database, bukan payload client.
4. Tambahkan test negative discount, `NaN`, nilai sangat besar, dan total akhir negatif.

Acceptance criteria: subtotal dan grand total tidak pernah negatif serta payload invalid menghasilkan HTTP 400.

### SEC-REPORT-001 - Filter tenant/outlet pada lookup laporan belum konsisten

Prioritas: P1  
Status: RISIKO STATIS  
File utama: `apps/api/src/modules/report/report.service.ts`

Tugas implementasi:

1. Tambahkan fixture dua tenant dan dua outlet.
2. Tambahkan `tenant_id` dan `outlet_id` pada semua query utama dan lookup sekunder produk/user.
3. Batasi rentang tanggal dan gunakan pagination/aggregation database.
4. Untuk CSV, escape quote, comma, CR/LF, dan formula prefix `=`, `+`, `-`, `@`.

Acceptance criteria:

- Laporan tidak memuat nama produk/user dari tenant atau outlet lain.
- Rentang tanggal terlalu besar ditolak dengan 400.
- CSV lulus fixture comma, quote, newline, dan formula injection.

### SEC-CREDIT-001 - Pembayaran kredit dan reminder perlu isolation outlet/race test

Prioritas: P1  
Status: RISIKO STATIS  
File utama: `apps/api/src/modules/credit/credit.service.ts`

Tugas implementasi:

1. Tambahkan test dua pembayaran paralel terhadap sisa kredit yang sama.
2. Gunakan atomic conditional update atau row lock agar total pembayaran tidak melebihi sisa.
3. Tambahkan filter outlet pada lookup customer untuk reminder.
4. Pastikan reminder tidak mengungkap nomor atau saldo tenant/outlet lain.

Acceptance criteria: saldo tidak negatif, overpayment ditolak, dan cross-outlet reminder menghasilkan 404.

### WEB-AUTH-001 - Protected page belum memiliki route guard nyata

Prioritas: P2  
Status: hardening/UX, bukan kebocoran data terkonfirmasi  
File utama: `apps/web/src/app/(dashboard)/layout.tsx`, auth store web

Tugas implementasi:

1. Definisikan model session web terlebih dahulu.
2. Prioritaskan refresh token dalam cookie `HttpOnly`, `Secure`, `SameSite`; jangan gunakan `localStorage`.
3. Redirect unauthenticated user sebelum UI dashboard sensitif dirender.
4. API tetap menjadi enforcement utama untuk autentikasi dan otorisasi.

Acceptance criteria: direct navigation ke `/dashboard` tanpa session mengarah ke `/login`, token tidak tersedia melalui JavaScript, dan API tanpa token tetap 401.

## 4. Tooling dan Quality Gate

### QA-001 - Aktifkan ESLint non-interaktif

Status: terblokir konfigurasi pnpm store.

Masalah yang ditemukan:

- API memakai ESLint 9 tetapi belum memiliki flat config.
- Web menjalankan `next lint` yang meminta input interaktif.
- Instalasi tooling tertahan karena `node_modules` terhubung ke pnpm store user lama yang tidak dapat ditulis.

Tugas:

1. Perbaiki ownership atau samakan `store-dir` pnpm dengan keputusan pemilik mesin.
2. Tambahkan `eslint.config.mjs` yang kompatibel dengan ESLint 9 dan Next.js 15.
3. Pastikan `pnpm lint` berjalan tanpa prompt.

Acceptance criteria: `pnpm lint` exit code 0 di local dan CI tanpa input manual.

### QA-002 - Tambahkan test API

Status: belum ada test yang ditemukan Jest.

Urutan minimum:

1. Auth logout/login regression.
2. OTP single-use concurrency.
3. Tenant dan outlet isolation.
4. Stock concurrency dan idempotency offline sync.
5. Payment webhook signature serta replay.
6. Credit overpayment concurrency.

Acceptance criteria: `pnpm --filter api test -- --runInBand` menemukan dan menjalankan test, bukan `No tests found`.

## 5. Urutan Eksekusi untuk Junior Dev atau AI Murah

Kerjakan satu ID per branch/commit. Jangan menggabungkan refactor kosmetik.

1. `SEC-AUTH-001`
2. `SEC-JWT-001`
3. `SEC-OTP-002`
4. `SEC-TX-001`
5. `SEC-TX-002`
6. `SEC-OTP-001`
7. `SEC-OTP-003`
8. `SEC-TX-003`
9. `SEC-REPORT-001`
10. `SEC-CREDIT-001`
11. `WEB-AUTH-001`
12. `QA-001`
13. `QA-002`

Template instruksi per tugas:

```text
Kerjakan hanya <TASK-ID> dari docs/audit/SPRINT6-ROUTING-SECURITY-HANDOFF.md.
1. Baca file utama dan test terkait.
2. Tulis regression test yang gagal terlebih dahulu.
3. Buat perubahan minimum sampai test lulus.
4. Jangan ubah schema/dependency/public API tanpa izin.
5. Jalankan quality gate di bagian 6.
6. Laporkan file yang berubah, test sebelum/sesudah, dan risiko tersisa.
```

## 6. Quality Gate Wajib

Jalankan setelah setiap tugas:

```bash
pnpm test:routes
pnpm test:entrypoints
pnpm typecheck
pnpm --filter api build
pnpm --filter web build
pnpm --filter api test -- --runInBand
pnpm lint
```

Jika perintah gagal karena masalah lingkungan, jangan menandainya lulus. Catat command, exit code, dan error utama.

## 7. Definition of Done

Sebuah tugas hanya selesai jika:

- Ada regression test yang membuktikan bug/risiko yang dikerjakan.
- Test baru gagal sebelum fix dan lulus setelah fix.
- Semua filter resource memuat `tenant_id` dan, bila relevan, `outlet_id`.
- Tidak ada secret, OTP, PIN, access token, atau refresh token pada log/test fixture/report.
- Build web dan API lulus.
- Typecheck lulus.
- Tidak ada perubahan di luar scope tugas.
- Risiko yang belum diuji tetap disebut risiko, bukan diklaim sebagai vulnerability terkonfirmasi.
