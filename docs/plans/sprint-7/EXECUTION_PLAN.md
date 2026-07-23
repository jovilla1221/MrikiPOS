# Sprint 7 - Execution Plan

Status: planned  
Durasi target: 10 hari kerja  
Source of truth: `IMPLEMENTATION_PLAN.md`; dokumen ini memecahnya menjadi task yang aman untuk junior developer atau AI biaya rendah.

## 1. Tujuan dan batas

Sprint 7 mengimplementasikan RBAC eksplisit, lifecycle user, approval yang aman, audit trail, dan UI administrasi. Scope wajib mengikuti `IMPLEMENTATION_PLAN.md` Phase A sampai H.

Tidak termasuk SSO/OAuth, permission builder dinamis, realtime approval, SIEM, maupun implementasi penuh domain yang belum ada seperti stock transfer dan refund gateway. Jangan menambah package baru. Jangan mengubah Prisma schema tanpa migration dan persetujuan pemilik proyek.

Aturan yang tidak dapat dinegosiasikan:

- Semua query selalu menyertakan `tenant_id`; `outlet_id` bila entitas memilikinya.
- Controller hanya menangani HTTP; aturan bisnis, transaksi Prisma, dan audit berada di service.
- PIN, hash, OTP, token, secret, dan header otorisasi tidak boleh masuk response, log, atau `AuditLog`.
- Penyembunyian menu frontend bukan batas keamanan. Backend harus menegakkan RBAC.
- Perubahan status/role/PIN user mencabut sesi target tanpa memblokir login berikutnya.

## 2. Dependency dan keputusan sebelum coding

| ID | Keputusan/gate | Owner | Kondisi lanjut |
|---|---|---|---|
| G0 | Baseline Sprint 6 | Implementer | `pnpm test:routes`, `pnpm test:entrypoints`, dan `pnpm typecheck` lulus. |
| G1 | Session revocation | Implementer | Gunakan blacklist per `jti`, bukan per user. Code saat ini sudah memakai `revoked_jti`; tambah regression test sebelum User module memakai mekanisme revoke. |
| G2 | Metadata approval | Tech lead | Setujui migration `ApprovalLog.metadata Json?` sebelum `PRICE_CHANGE` atau close-shift tertunda diaktifkan. Nilai harga dan kas aktual tidak boleh dipaksa masuk ke `catatan`. |
| G3 | Approval per outlet | Tech lead | Putuskan apakah `ApprovalLog` tetap tenant-wide atau migration menambah `outlet_id`. Rekomendasi: tambah `outlet_id` bersama migration metadata agar inbox Manager dapat difilter stabil per outlet. |
| G4 | Aksi domain belum ada | Product owner | Pilihan default aman: hanya `VOID`, `PRICE_CHANGE` setelah G2, dan `SHIFT_CLOSE` setelah G2 yang dapat dibuat. `REFUND` dan `STOCK_TRANSFER` harus ditolak sebagai belum didukung sampai executor atomik tersedia. |

G2 dan G3 adalah keputusan schema. Jika belum disetujui, selesaikan Phase A, B, dan E terlebih dahulu; jangan membuat approval PENDING yang tidak mempunyai data atau executor yang valid.

## 3. Urutan implementasi

```text
G0 -> A RBAC -> B User lifecycle -> E Audit foundation
                                  -> C Approval core -> D Sensitive actions
                                                          -> F Shared data -> G UI -> H Hardening
```

Phase E dibuat sebelum integrasi approval agar setiap aksi sudah memiliki satu jalur audit yang teruji. Phase C dan D hanya dimulai setelah keputusan G2-G4 dicatat.

## 4. Phase A - RBAC baseline (Hari 1)

### S7-A1 - Inventaris kontrak endpoint

Target: seluruh `apps/api/src/modules/*/*controller.ts`.

1. Buat tabel endpoint, guard, role, public status, tenant scope service, dan status test.
2. Bandingkan setiap endpoint dengan matriks RBAC Sprint 7 Section 3.
3. Tandai auth, health, dan webhook tervalidasi sebagai satu-satunya endpoint `@Public()`.
4. Tambahkan role eksplisit pada setiap method bisnis yang belum memilikinya; jangan mengubah `RolesGuard` menjadi default-deny.

Acceptance criteria:

- Tidak ada endpoint bisnis authenticated yang hanya mengandalkan default-allow `RolesGuard`.
- Report/export hanya OWNER dan MANAGER; settings dan user management hanya OWNER.
- Endpoint webhook tidak dapat menjadi public tanpa signature validation.

### S7-A2 - Test metadata RBAC

Target: test baru di dekat controller atau `apps/api/src/common/rbac/`.

1. Buat registry handler bisnis yang harus memiliki metadata `ROLES_KEY`.
2. Tulis test yang gagal jika guard/role metadata hilang.
3. Tambahkan case untuk endpoint public yang memang diizinkan.

Acceptance criteria:

- Test membedakan endpoint public yang valid dari endpoint bisnis.
- Menghapus `@Roles()` dari endpoint sensitif membuat test gagal.

### S7-A3 - Policy helper

Target: `apps/api/src/common/rbac/rbac-policy.ts`.

Implementasikan fungsi pure dan teruji: `canApprove`, `canManageUser`, `canRequestApproval`, serta helper last-owner. Jangan menyebarkan conditional role berbeda-beda ke banyak controller.

Acceptance criteria: seluruh kombinasi role/type pada matriks RBAC memiliki unit test positif dan negatif.

## 5. Phase B - User lifecycle (Hari 2-3)

### S7-B1 - Module dan kontrak API user

Buat `modules/user/{module,controller,service,dto}.ts` dan daftarkan module pada `app.module.ts`.

Endpoint:

| Endpoint | Role | Catatan |
|---|---|---|
| `GET /v1/users` | OWNER | pagination dan filter outlet/status bila disetujui |
| `POST /v1/users` | OWNER | create user tenant yang sama |
| `GET /v1/users/:id` | OWNER | select aman tanpa hash |
| `PUT /v1/users/:id` | OWNER | nama, phone, role, outlet, status |
| `DELETE /v1/users/:id` | OWNER | soft deactivate saja |
| `PUT /v1/users/:id/pin` | OWNER | reset PIN enam digit |
| `PUT /v1/users/:id/status` | OWNER | activate/deactivate eksplisit |

DTO wajib melakukan validation class-validator: UUID outlet, phone Indonesia, PIN tepat enam digit, enum role, panjang nama, dan pagination. Response memakai tipe aman yang tidak mempunyai `pin_hash`.

### S7-B2 - Aturan perubahan user

Service harus memverifikasi actor owner, tenant target, dan outlet milik tenant. Terapkan aturan ini dalam transaction Prisma:

1. Phone unik per tenant.
2. PIN dibcrypt cost 12.
3. Owner tidak dapat menonaktifkan atau menurunkan dirinya sendiri bila ia owner aktif terakhir.
4. `DELETE` hanya mengubah `is_active=false`.
5. Reset PIN, deactivate, dan perubahan role mencabut seluruh refresh token target serta session access yang berlaku.
6. Tulis audit event melalui `AuditService`, bukan logger biasa.

Catatan session: gunakan helper AuthService yang menandai semua session refresh revoked dan access-token per-session bila tersedia. Jangan kembali ke key Redis level-user tujuh hari.

### S7-B3 - Test lifecycle user

Minimal case:

- OWNER dapat membuat KASIR; KASIR mendapat 403.
- ID user tenant lain menghasilkan 404.
- Response tidak pernah memiliki `pin_hash`.
- Last active OWNER tidak dapat dinonaktifkan atau downgrade.
- Deactivate/role-change/reset-PIN membatalkan refresh token target.
- Login baru target yang masih aktif tidak diblokir oleh revocation lama.

## 6. Phase E - Audit foundation (Hari 3-4)

Dilakukan sebelum approval integration.

### S7-E1 - AuditService dan redaction

Buat `modules/audit/{module,controller,service,dto}.ts` dan helper redaction yang pure/testable.

`AuditService.log(input, tx?)` menerima Prisma transaction client opsional. Jika dipanggil dari aksi sensitif, action domain, state approval, dan audit harus memakai `tx` yang sama. Redact key case-insensitive: `pin`, `pin_hash`, `otp`, `token`, `secret`, `authorization`, dan nested object/array.

### S7-E2 - Read-only audit API

Tambahkan `GET /v1/audit-logs` dan `GET /v1/audit-logs/:id`, OWNER/MANAGER only. Query selalu tenant-scoped; endpoint tidak memiliki POST/PUT/DELETE publik. Filter: date range dengan maksimum yang ditentukan, actor, action, entity, pagination.

Keputusan outlet: hingga G3 disetujui, AuditLog secara eksplisit tenant-wide karena schema tidak memiliki `outlet_id`. Jangan mengklaim filter audit per outlet bila tidak disimpan secara stabil.

### S7-E3 - Test audit

- KASIR mendapat 403.
- Tenant lain mendapat 404.
- Redaction menghapus nilai sensitif pada object nested.
- Kegagalan write audit untuk aksi sensitif membatalkan transaction.
- Tidak ada endpoint mutasi audit.

## 7. Phase C - Approval core (Hari 4-5)

Mulai hanya setelah G2-G4.

### S7-C1 - Migration dan typed metadata

Jika disetujui, buat satu migration bernama `add_approval_metadata` yang menambah `metadata Json?` dan, bila G3 disetujui, `outlet_id` plus index yang sesuai. Jalankan `prisma generate`; jangan gunakan `db push` sebagai pengganti migration.

Definisikan DTO per type atau discriminated validation service:

- VOID/REFUND: reference transaksi yang tenant/outlet-nya sama.
- PRICE_CHANGE: `{ harga_jual_baru }` finite, positif, dan berasal dari request validated.
- SHIFT_CLOSE: `{ kas_aktual, catatan? }` valid dan shift masih OPEN.
- STOCK_TRANSFER/REFUND tanpa executor: reject creation dengan kode bisnis yang jelas sampai G4 berubah.

### S7-C2 - Approval module dan policy

Buat `modules/approval/{module,controller,service,dto,policy}.ts` dengan endpoint create, list inbox/history, mine, detail, approve, dan reject. Semua DTO wajib typed; jangan cast arbitrary JSON.

Visibility:

- Requester melihat request sendiri.
- OWNER melihat approval sesuai tenant.
- MANAGER hanya melihat/bertindak sesuai G3 dan policy type.
- KASIR/STAFF tidak dapat approve/reject.

### S7-C3 - State machine dan race safety

State valid: `PENDING -> APPROVED` atau `PENDING -> REJECTED`. Terminal state tidak dapat berubah. Dalam satu Prisma transaction:

1. Baca ulang approval PENDING dengan tenant scope.
2. Pastikan requester bukan approver.
3. Validasi role approver melalui policy helper.
4. Claim state dengan conditional `updateMany` pada `id + PENDING`.
5. Jalankan executor action yang sama transaction.
6. Tulis `APPROVAL_APPROVED`/`APPROVAL_REJECTED` dengan `AuditService.log(..., tx)`.

Jika claim gagal, kembalikan 409 tanpa menjalankan executor kedua kali.

### S7-C4 - Test approval

- Role requester/type sesuai matrix; kombinasi lain 403.
- Reference lintas tenant/outlet 404.
- Requester tidak bisa approve sendiri.
- Dua approver paralel hanya menghasilkan satu approval dan satu action.
- PENDING yang reject/approve kedua kali menghasilkan 409.
- Metadata invalid menghasilkan 400 dan tidak membuat record.

## 8. Phase D - Integrasi aksi sensitif (Hari 5-6)

### S7-D1 - Void approval (wajib)

Tambah `POST /v1/transactions/:id/void-request` untuk requester yang berhak. Direct `POST /void` menjadi OWNER-only dengan PIN. Approval yang approved memanggil method internal `executeVoidApproved` dan tidak melakukan request HTTP internal.

Executor harus re-read transaksi pada tenant/outlet yang tepat, hanya void status valid, mengembalikan stok satu kali, memperbarui shift satu kali, dan menulis audit dalam transaction yang sama.

### S7-D2 - Price change approval (wajib setelah G2)

STAFF/KASIR/MANAGER membuat request harga baru. OWNER/MANAGER berbeda dapat approve sesuai policy. Executor membaca product scoped tenant/outlet, menyimpan old/new price pada audit, dan mengubah harga satu kali.

Direct product update mempertahankan role existing tetapi harus menulis audit `PRODUCT_PRICE_CHANGED`. Bila aturan bisnis akhirnya mewajibkan approval untuk semua perubahan harga, ubah policy dan UI bersama-sama; jangan membuat dua perilaku diam-diam.

### S7-D3 - Shift close threshold (wajib setelah G2)

Gunakan threshold configurable default Rp50.000. Saat selisih melebihi threshold, endpoint close tidak mengubah `Shift`; ia mengembalikan `approval_required` dan membuat approval dengan kas aktual pada metadata. Setelah approve, executor close melakukan re-read shift OPEN dan menghitung ulang selisih dari data database.

### S7-D4 - Refund dan stock transfer (gate)

Jangan mengubah transaksi menjadi `REFUNDED` atau mengurangi/menambah stok hanya karena approval disetujui. Sampai executor atomik tersedia, type tersebut ditolak pada create dengan error bisnis `APPROVAL_ACTION_UNSUPPORTED`. Catat sebagai deferred Sprint berikutnya, bukan defect tersembunyi.

## 9. Phase F - Shared types dan frontend data (Hari 7)

Tambah `approval.ts` dan `audit.ts`, lalu extend `user.ts` di `packages/shared-types/src`. Export dari `index.ts`; build shared package sebelum web/API build.

Buat client dan hook mengikuti pattern existing `customers`/`credits`:

- `apps/web/src/lib/api/users.ts`, `approvals.ts`, `audit.ts`
- `apps/web/src/hooks/use-users.ts`, `use-approvals.ts`, `use-audit.ts`

Gunakan TanStack Query untuk data server dan invalidasi query setelah mutasi. Hilangkan `any` dari client baru; modelkan response envelope, pagination, dan payload secara eksplisit.

## 10. Phase G - UI dan authorization UX (Hari 7-8)

### S7-G1 - Navigation dan route UX

Ubah `apps/web/src/app/(dashboard)/layout.tsx` agar link Users/Approvals/Audit/Settings hanya tampil sesuai role. Tambahkan redirect atau halaman 403 untuk direct navigation yang tidak berhak. Backend tetap final enforcement.

### S7-G2 - Users page

`/users`, OWNER only: tabel nama, phone masked, role, outlet, status, last login; create/edit/deactivate/reset-PIN dialogs. PIN baru dimasukkan sekali dan tidak ditampilkan kembali.

### S7-G3 - Approvals page

`/approvals`: tab Menunggu Persetujuan, Riwayat, Permintaan Saya. Detail hanya merender metadata yang allow-listed sebagai text. Modal approval/reject mengharuskan alasan bila policy memerlukannya.

### S7-G4 - Audit dan settings pages

`/audit-logs`: tabel read-only dengan filter; old/new values dirender sebagai text, tanpa `dangerouslySetInnerHTML`. `/settings`: OWNER only dan action settings yang berhasil wajib menjadi audit event.

Manual acceptance:

- OWNER melihat semua link administrasi yang diizinkan.
- KASIR tidak melihat link administrasi dan backend tetap menghasilkan 403 bila URL dibuka langsung.
- Form menampilkan error API terstandar dalam Bahasa Indonesia.
- UI responsif untuk tablet kasir dan desktop.

## 11. Phase H - Hardening dan release gate (Hari 9-10)

### Required automated tests

1. Semua endpoint bisnis memiliki metadata role.
2. User create, cross-tenant isolation, safe response, last owner, dan session revoke.
3. Approval self-approval, invalid metadata, terminal-state idempotency, dan concurrent approve.
4. Void approval hanya mengembalikan stok/shift sekali.
5. Price change audit menyimpan old/new tanpa secret.
6. Shift threshold tidak close sebelum approval dan close sekali sesudah approval.
7. Audit endpoint authorization, tenant isolation, pagination, dan redaction nested data.

### Required commands

```bash
pnpm --filter @mrikipos/shared-types build
pnpm test:routes
pnpm test:entrypoints
pnpm typecheck
pnpm --filter api test -- --runInBand
pnpm --filter api build
pnpm --filter web build
pnpm lint
```

Lint saat ini memiliki blocker konfigurasi pnpm/ESLint yang sudah dicatat pada audit Sprint 6. Jangan menandai lint lulus bila command tidak dapat berjalan; catat error dan selesaikan QA blocker pada task terpisah.

## 12. Handoff protocol

Kerjakan hanya satu task ID dalam satu branch/commit. Urutan wajib:

1. Baca bagian task pada `IMPLEMENTATION_PLAN.md` dan dokumen ini.
2. Tulis atau perbaiki test yang gagal terlebih dahulu.
3. Implementasikan perubahan minimum.
4. Jalankan test task, typecheck, dan build yang relevan.
5. Laporkan file berubah, command beserta hasilnya, dan risiko yang masih terbuka.

Definition of done Sprint 7 hanya tercapai jika seluruh Phase A-H selesai, G2-G4 memiliki keputusan tertulis, tidak ada approval yang dapat dieksekusi dua kali, dan audit security Sprint 7 telah diminta di `docs/audit/SPRINT7-AUDIT.md`.

