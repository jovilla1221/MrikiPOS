# Sprint 7 — Implementation Plan

> **RBAC, Multi-User, Approval Workflow, dan Audit Trail**  
> **Audience:** Agent/developer yang mengerjakan Sprint 7  
> **Status:** ⬜ Planned  
> **Durasi target:** ±2 minggu  
> **Acuan wajib:** `docs/SYSTEM_PROMPT.md`, `docs/PRD.md`, `docs/ADR.md`, `docs/audit/SPRINT*.md`, dan plan Sprint 4–6 di `docs/plans/`

---

## 0. Cara menggunakan dokumen

1. Baca Section **1–5** sebelum menulis kode.
2. Kerjakan fase berurutan: **RBAC baseline → User → Approval → Audit → Integrasi → Frontend → Hardening**.
3. Jangan mengubah schema Prisma kecuali field yang diperlukan benar-benar belum tersedia.
4. Jangan memasang package baru tanpa persetujuan. Sprint 7 tidak memerlukan package baru.
5. Setelah implementasi, jalankan typecheck/build dan minta audit ke `docs/audit/SPRINT7-AUDIT.md`.

---

## 1. Tujuan Sprint 7

### In scope

| No. | Deliverable               | Detail                                                                                 |
| --- | ------------------------- | -------------------------------------------------------------------------------------- |
| 1   | **RBAC enforcement**      | Audit seluruh endpoint dan tegakkan matriks OWNER/MANAGER/KASIR/STAFF                  |
| 2   | **Multi-user management** | OWNER membuat, mengubah, menonaktifkan user dan mereset PIN                            |
| 3   | **Approval workflow**     | Request, approve, reject untuk VOID, REFUND, STOCK_TRANSFER, SHIFT_CLOSE, PRICE_CHANGE |
| 4   | **Integrasi approval**    | Aksi sensitif dieksekusi hanya setelah approval sesuai policy                          |
| 5   | **Audit trail**           | Catat create/update/delete/approve/reject dan aksi sensitif                            |
| 6   | **User UI**               | Halaman daftar user, tambah/edit, status aktif, reset PIN                              |
| 7   | **Approval UI**           | Inbox approval, detail request, approve/reject                                         |
| 8   | **Audit UI minimal**      | List audit log read-only untuk OWNER/MANAGER                                           |
| 9   | **Settings access**       | Halaman settings OWNER-only, sesuai struktur SYSTEM_PROMPT                             |

### Out of scope

- SSO/OAuth
- Permission builder dinamis per tenant
- Hierarki approval berdasarkan nominal yang sangat kompleks
- Push notification realtime/WebSocket
- Immutable external audit storage/SIEM
- Multi-outlet global admin lintas tenant
- Refund gateway Midtrans penuh jika belum tersedia; approval dapat menghasilkan status siap diproses

---

## 2. Baseline yang sudah tersedia

| Area                                            | Status            | Lokasi                               |
| ----------------------------------------------- | ----------------- | ------------------------------------ |
| `UserRole` OWNER/MANAGER/KASIR/STAFF            | ✅                | Prisma + shared types                |
| `RolesGuard`, `@Roles()`                        | ✅                | `common/guards`, `common/decorators` |
| JWT memuat role/tenant/outlet                   | ✅                | auth strategy                        |
| `ApprovalLog`, `ApprovalType`, `ApprovalStatus` | ✅                | schema Prisma                        |
| `AuditLog`                                      | ✅                | schema Prisma                        |
| User table + PIN hash                           | ✅                | schema/AuthService                   |
| Controller role annotations                     | ✅ sebagian besar | seluruh modules                      |
| User/Approval modules                           | ❌                | Sprint 7                             |
| Audit interceptor/service                       | ❌                | Sprint 7                             |

### Temuan baseline penting

`RolesGuard` sekarang **default allow** jika handler tidak memiliki `@Roles()`:

```typescript
if (!requiredRoles) return true;
```

Ini pernah sengaja dipertahankan. Sprint 7 harus memilih policy final:

- **Keputusan Sprint 7:** pertahankan perilaku guard agar endpoint authenticated biasa tetap dapat digunakan, tetapi **semua controller bisnis wajib memiliki `@Roles()`**. Tambahkan automated audit/test yang gagal bila endpoint non-public tidak memiliki role metadata.
- Jangan langsung mengubah default menjadi deny tanpa memeriksa semua controller karena dapat memutus endpoint health/auth/tenant.

---

## 3. Matriks RBAC wajib

Sesuai SYSTEM_PROMPT §8.4:

| Fitur                  | OWNER |        MANAGER         |      KASIR       |      STAFF       |
| ---------------------- | :---: | :--------------------: | :--------------: | :--------------: |
| POS/transaksi          |  ✅   |           ✅           |        ✅        |        ❌        |
| Void/refund            |  ✅   | ✅ dengan approval/PIN |        ❌        |        ❌        |
| Laporan                |  ✅   |           ✅           |        ❌        |        ❌        |
| Kelola produk          |  ✅   |           ✅           |        ❌        |    stok saja     |
| Kelola stok            |  ✅   |           ✅           |        ❌        |        ✅        |
| Kelola user            |  ✅   |           ❌           |        ❌        |        ❌        |
| Tenant/settings        |  ✅   |           ❌           |        ❌        |        ❌        |
| Approval request/inbox |  ✅   |           ✅           | request terbatas | request terbatas |
| Approve/reject         |  ✅   | ✅ sesuai type/policy  |        ❌        |        ❌        |
| Export data            |  ✅   |           ✅           |        ❌        |        ❌        |
| Audit log              |  ✅   |      ✅ read-only      |        ❌        |        ❌        |

### Policy approval MVP

| Approval Type    | Requester           | Approver                | Catatan                                                   |
| ---------------- | ------------------- | ----------------------- | --------------------------------------------------------- |
| `VOID`           | KASIR/MANAGER       | OWNER atau MANAGER lain | Requester tidak boleh approve sendiri                     |
| `REFUND`         | KASIR/MANAGER       | OWNER/MANAGER lain      | Eksekusi refund terpisah jika gateway belum ada           |
| `PRICE_CHANGE`   | STAFF/KASIR/MANAGER | OWNER/MANAGER           | Staff dapat request, tidak edit langsung                  |
| `STOCK_TRANSFER` | STAFF/MANAGER       | OWNER/MANAGER lain      | Transfer penuh boleh deferred; approval record tetap siap |
| `SHIFT_CLOSE`    | KASIR               | OWNER/MANAGER           | Hanya diperlukan bila selisih kas melewati threshold      |

**Aturan umum:** requester tidak boleh menjadi approver untuk request yang sama.

---

## 4. Keputusan desain

| ID  | Keputusan                                                                          | Alasan                                                  |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| D1  | Modul terpisah: `user`, `approval`, `audit`                                        | Sesuai struktur SYSTEM_PROMPT                           |
| D2  | Semua query scope `tenant_id`; user/approval juga `outlet_id` bila relevan         | Isolasi multi-tenant                                    |
| D3  | User delete menggunakan `is_active=false`, bukan hard delete                       | Menjaga histori transaksi/audit                         |
| D4  | PIN hanya dapat dibuat/reset, tidak pernah dikembalikan dari API                   | Security                                                |
| D5  | Approval dan eksekusi aksi sensitif dilakukan dalam satu transaksi DB saat approve | Hindari approved tetapi action gagal                    |
| D6  | Approval bersifat idempotent; APPROVED/REJECTED tidak dapat diproses ulang         | Race safety                                             |
| D7  | Requester tidak dapat approve request sendiri                                      | Separation of duties                                    |
| D8  | Audit log ditulis oleh service khusus; interceptor hanya untuk metadata request    | Lebih eksplisit dan testable                            |
| D9  | Audit log tidak boleh diedit/dihapus lewat API                                     | Integritas                                              |
| D10 | Role user aktif dimuat ulang dari DB oleh JwtStrategy                              | Perubahan role langsung berlaku pada request berikutnya |

---

## 5. Backend work breakdown

### Phase A — RBAC baseline dan contract audit

#### A1. Audit semua controller

Buat checklist seluruh endpoint dan pastikan:

- Controller protected memiliki `@UseGuards(JwtAuthGuard, RolesGuard)` atau guard global + role guard sesuai pattern.
- Setiap method bisnis memiliki `@Roles(...)`.
- Hanya auth, health, dan webhook tervalidasi yang `@Public()`.
- Report/export OWNER/MANAGER.
- Settings OWNER saja.
- Customer/credit/shift sesuai Sprint 6 policy.

#### A2. Test metadata RBAC

Buat test yang menginspeksi metadata controller agar endpoint sensitif tidak lupa `@Roles()`.

Minimal test:

```typescript
expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeDefined();
```

Tidak perlu membuat custom ESLint plugin pada Sprint 7.

#### A3. Shared permission helper

Opsional, buat `common/rbac/rbac-policy.ts` untuk policy nontrivial:

```typescript
export function canApprove(type: ApprovalType, role: UserRole): boolean;
export function canManageUser(actorRole: UserRole, targetRole: UserRole): boolean;
```

---

### Phase B — User module

Struktur:

```text
apps/api/src/modules/user/
├── user.module.ts
├── user.controller.ts
├── user.service.ts
└── user.dto.ts
```

#### B1. Endpoints

| Method | Path                   | Role  | Fungsi                                 |
| ------ | ---------------------- | ----- | -------------------------------------- |
| GET    | `/v1/users`            | OWNER | List user tenant/outlet, paginated     |
| POST   | `/v1/users`            | OWNER | Tambah user                            |
| GET    | `/v1/users/:id`        | OWNER | Detail aman tanpa `pin_hash`           |
| PUT    | `/v1/users/:id`        | OWNER | Edit nama, phone, role, outlet, status |
| DELETE | `/v1/users/:id`        | OWNER | Soft deactivate                        |
| PUT    | `/v1/users/:id/pin`    | OWNER | Reset PIN                              |
| PUT    | `/v1/users/:id/status` | OWNER | Activate/deactivate                    |

#### B2. DTO

```typescript
CreateUserDto {
  nama: string;        // 2–100
  phone: string;       // Indonesian phone regex
  pin: string;         // exactly 6 digits
  role: UserRole;      // OWNER creation restricted; see policy
  outlet_id: UUID;
}

UpdateUserDto {
  nama?; phone?; role?; outlet_id?; is_active?;
}

ResetUserPinDto {
  new_pin: 6 digits;
}
```

#### B3. Business rules

1. Hanya OWNER tenant yang sama.
2. Outlet target wajib milik tenant actor.
3. Phone unique per tenant.
4. Hash PIN bcrypt cost 12.
5. API response select field aman; **jangan pernah return `pin_hash`**.
6. OWNER tidak boleh menonaktifkan diri sendiri jika dia OWNER aktif terakhir.
7. OWNER tidak boleh downgrade diri sendiri jika tidak ada OWNER aktif lain.
8. Deactivate user → revoke seluruh refresh token + Redis blacklist.
9. Role change → revoke session user agar token lama tidak mempertahankan capability lama.
10. Log `USER_CREATED`, `USER_UPDATED`, `USER_DEACTIVATED`, `USER_PIN_RESET`.

#### B4. Plan limit (optional)

Gunakan `TenantPlan` untuk limit user bila mudah:

- FREE: 1 user
- UMKM: 3 user
- BISNIS: 10 user
- KOMUNITAS: konfigurasi/custom

Jika belum siap, tandai TODO dan jangan hardcode limit berbeda dari PRD tanpa test.

---

### Phase C — Approval module

Struktur:

```text
apps/api/src/modules/approval/
├── approval.module.ts
├── approval.controller.ts
├── approval.service.ts
├── approval.dto.ts
└── approval.policy.ts
```

#### C1. Endpoints

| Method | Path                        | Role                                  | Fungsi              |
| ------ | --------------------------- | ------------------------------------- | ------------------- |
| POST   | `/v1/approvals`             | OWNER/MANAGER/KASIR/STAFF sesuai type | Buat request        |
| GET    | `/v1/approvals`             | OWNER/MANAGER                         | List inbox/history  |
| GET    | `/v1/approvals/mine`        | semua role authenticated              | Request milik user  |
| GET    | `/v1/approvals/:id`         | actor terkait/approver                | Detail              |
| POST   | `/v1/approvals/:id/approve` | OWNER/MANAGER sesuai policy           | Approve dan execute |
| POST   | `/v1/approvals/:id/reject`  | OWNER/MANAGER                         | Reject              |

#### C2. DTO

```typescript
CreateApprovalDto {
  @IsEnum(ApprovalType) type;
  @IsUUID() reference_id;
  @IsOptional() @Length(0,255) catatan?;
}

ApprovalDecisionDto {
  @IsOptional() @Length(0,255) catatan?;
  @IsOptional() pin?: six digits; // jika policy memerlukan re-auth
}
```

#### C3. Validasi request per type

Sebelum create request:

- `VOID`/`REFUND`: transaction exists, same tenant/outlet, status valid.
- `PRICE_CHANGE`: product exists, same tenant/outlet. Karena schema ApprovalLog hanya `reference_id`, nilai harga baru belum tersimpan. Pilihan MVP:
  - Tambah `metadata Json?` ke `ApprovalLog` dengan migration yang disetujui, **direkomendasikan**.
  - Jika tidak mengubah schema, simpan detail di `catatan` tidak dianjurkan karena tidak typed.
- `SHIFT_CLOSE`: shift exists, same tenant/outlet, status OPEN.
- `STOCK_TRANSFER`: implement hanya bila referensi entity tersedia; jika belum ada table transfer, endpoint reject dengan pesan “belum didukung”, jangan fake execute.

#### C4. Schema recommendation

Tambahkan field berikut jika disetujui:

```prisma
model ApprovalLog {
  // existing...
  metadata Json? // payload aksi: new_price, reason, refund items, etc.
}
```

Migration: `add_approval_metadata`.

#### C5. Approve flow

Dalam `$transaction`:

1. Re-read approval `PENDING` scoped tenant.
2. Reject self-approval.
3. Validate approver role with policy.
4. Execute action based on type.
5. Update approval `APPROVED`, `approved_by`, catatan.
6. Write AuditLog.

Gunakan conditional update / `updateMany where { id, status: PENDING }` untuk mencegah double approval.

#### C6. Reject flow

- Hanya request PENDING.
- Self-reject boleh atau tidak? **Keputusan:** requester boleh membatalkan request sendiri melalui endpoint terpisah opsional; approve/reject hanya OWNER/MANAGER.
- Set REJECTED, approved_by = decision maker, audit log.

---

### Phase D — Integrasi approval ke aksi sensitif

#### D1. Void

Current endpoint void hanya OWNER/MANAGER + PIN. Sprint 7 policy:

- OWNER dapat void langsung dengan PIN **atau** approval (pilih satu policy konsisten).
- MANAGER meminta approval bila transaksi dibuat oleh user lain atau nominal di atas threshold.
- KASIR tidak direct void; buat approval `VOID`.

**MVP rekomendasi:**

- `POST /transactions/:id/void-request` → approval.
- Direct `/void` tetap OWNER-only.
- Approval `VOID` yang disetujui memanggil internal `TransactionService.executeVoidApproved(...)` tanpa meminta PIN requester.

#### D2. Price change

- Product update harga langsung hanya OWNER/MANAGER sesuai existing.
- STAFF/KASIR dapat request `PRICE_CHANGE` dengan metadata `{ harga_jual_baru }`.
- Approval execute update product dan audit old/new values.

#### D3. Shift close

- Normal close sendiri tetap berjalan.
- Bila `abs(selisih_kas)` melebihi configurable threshold (default Rp50.000), shift close membuat approval `SHIFT_CLOSE` dan shift tetap OPEN/PENDING CLOSE.
- Schema tidak memiliki close-pending status. MVP: endpoint close return `approval_required` dan tidak update shift; setelah approve, execute close.

#### D4. Refund

Jika refund service belum ada:

- Approval request dan keputusan dapat dibuat.
- Jangan set transaksi REFUNDED tanpa mengembalikan stok/payment dengan benar.
- Tandai execution handler `NotImplementedException` atau implement refund atomik jika scope disetujui.

---

### Phase E — Audit module

Struktur:

```text
apps/api/src/modules/audit/
├── audit.module.ts
├── audit.controller.ts
├── audit.service.ts
└── audit.dto.ts

apps/api/src/common/interceptors/
└── audit-context.interceptor.ts   # optional request metadata only
```

#### E1. AuditService

```typescript
interface CreateAuditLogInput {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}
```

Method:

- `log(input, tx?)`: dapat memakai Prisma transaction client agar action + audit atomik.
- Sanitasi values: hapus `pin`, `pin_hash`, token, secret, OTP.
- Error audit untuk aksi sensitif sebaiknya menyebabkan transaction rollback (fail closed) bila menggunakan tx.

#### E2. Audit endpoints

| Method | Path                 | Role           |
| ------ | -------------------- | -------------- |
| GET    | `/v1/audit-logs`     | OWNER, MANAGER |
| GET    | `/v1/audit-logs/:id` | OWNER, MANAGER |

Filter: date range, user_id, action, entity_type, pagination.

Tidak ada POST/PUT/DELETE publik.

#### E3. Minimum events

- USER_CREATED/UPDATED/DEACTIVATED/PIN_RESET
- APPROVAL_REQUESTED/APPROVED/REJECTED
- TRANSACTION_VOIDED/REFUNDED
- PRODUCT_PRICE_CHANGED
- STOCK_ADJUSTED
- SHIFT_CLOSED/SHIFT_CLOSE_APPROVED
- TENANT_SETTINGS_UPDATED

---

## 6. Shared types

Tambah/extend:

```text
packages/shared-types/src/
├── approval.ts
├── audit.ts
└── user.ts (existing, extend DTO response types)
```

Types minimal:

```typescript
ApprovalRequest;
ApprovalDecision;
ApprovalListItem;
AuditLogItem;
UserListItem;
```

Export dari `index.ts`, lalu build shared package.

---

## 7. Frontend work breakdown

### Phase F — API clients dan hooks

```text
apps/web/src/lib/api/users.ts
apps/web/src/lib/api/approvals.ts
apps/web/src/lib/api/audit.ts
apps/web/src/hooks/use-users.ts
apps/web/src/hooks/use-approvals.ts
apps/web/src/hooks/use-audit.ts
```

Gunakan TanStack Query untuk server state; Zustand hanya auth/UI.

### Phase G — Pages

```text
apps/web/src/app/(dashboard)/users/page.tsx
apps/web/src/app/(dashboard)/approvals/page.tsx
apps/web/src/app/(dashboard)/audit-logs/page.tsx
apps/web/src/app/(dashboard)/settings/page.tsx
```

#### G1. Users page (OWNER only)

- List user: nama, phone masked, role, outlet, status, last_login.
- Add user dialog/form.
- Edit role/outlet/status.
- Reset PIN confirmation.
- Jangan tampilkan PIN existing.

#### G2. Approvals page

Tabs:

- “Menunggu Persetujuan”
- “Riwayat”
- “Permintaan Saya”

Detail: type, requester, entity reference, metadata yang aman, catatan, waktu.

Approve/reject modal dengan alasan dan optional PIN re-auth.

#### G3. Audit page

- Read-only table.
- Filter tanggal, actor, action, entity.
- JSON diff old/new ditampilkan aman (React text, bukan innerHTML).

#### G4. Route-level UX authorization

- Sidebar link hanya muncul sesuai role.
- Ini **bukan** security boundary; backend tetap wajib guard.
- Unauthorized route redirect/403 page.

---

## 8. File checklist

### Create

- `apps/api/src/modules/user/*`
- `apps/api/src/modules/approval/*`
- `apps/api/src/modules/audit/*`
- `apps/api/src/common/rbac/rbac-policy.ts` (recommended)
- `apps/web/src/lib/api/users.ts`
- `apps/web/src/lib/api/approvals.ts`
- `apps/web/src/lib/api/audit.ts`
- `apps/web/src/hooks/use-users.ts`
- `apps/web/src/hooks/use-approvals.ts`
- `apps/web/src/hooks/use-audit.ts`
- Pages users/approvals/audit-logs/settings
- Shared types approval/audit

### Modify

- `apps/api/src/app.module.ts`
- Sensitive controllers for final roles
- `transaction.service/controller` for void approval
- `product.service/controller` for price-change approval
- `shift.service/controller` for close approval
- `tenant.service/controller` for settings audit
- `whatsapp.service.ts` optional approval notification
- Dashboard layout/sidebar role-aware links
- Prisma schema only if adding `ApprovalLog.metadata`

---

## 9. Security requirements

| No. | Requirement                                                                     |
| --- | ------------------------------------------------------------------------------- |
| S1  | Semua query user/approval/audit scoped `tenant_id`; outlet bila perlu           |
| S2  | Requester tidak boleh approve request sendiri                                   |
| S3  | Approval decision idempotent dan race-safe                                      |
| S4  | Aksi + approval status + audit log atomik dalam satu DB transaction             |
| S5  | PIN/token/hash/secret tidak pernah masuk response atau AuditLog JSON            |
| S6  | Role/status change revoke semua session target                                  |
| S7  | Last active OWNER protection                                                    |
| S8  | Audit log read-only; tidak ada delete endpoint                                  |
| S9  | Frontend role hiding bukan security boundary                                    |
| S10 | Semua controller method bisnis memiliki explicit `@Roles()`                     |
| S11 | Metadata approval tervalidasi per type; jangan cast arbitrary JSON tanpa schema |
| S12 | Rate-limit reset PIN, approve/reject, dan user create                           |

---

## 10. Testing plan

### Unit/integration minimum

1. OWNER create KASIR → success; KASIR create user → 403.
2. Cross-tenant user ID → 404.
3. PIN response tidak mengandung `pin_hash`.
4. Deactivate user → refresh token revoked.
5. Last OWNER tidak dapat dinonaktifkan/downgrade.
6. KASIR request VOID → approval PENDING.
7. Requester mencoba approve sendiri → 403.
8. Dua approver concurrent approve → hanya satu execute.
9. Approval VOID sukses → transaksi void sekali + stok kembali sekali + audit log.
10. Audit endpoint KASIR → 403.
11. Audit values tidak berisi `pin`, `token`, `secret`.
12. Semua endpoint sensitif memiliki roles metadata.

### Manual UI

- Login OWNER: link users/approval/audit terlihat.
- Login KASIR: link admin tidak terlihat.
- Create/edit/deactivate user.
- Request approval → approve oleh akun berbeda.
- Audit log menampilkan actor dan perubahan.

---

## 11. Definition of Done

- [ ] User module lengkap dan tenant-safe
- [ ] Approval request/approve/reject idempotent
- [ ] AuditService dan read-only endpoint tersedia
- [ ] Last OWNER protection
- [ ] Session revoked setelah role/status/PIN berubah
- [ ] Void approval integrated minimal
- [ ] Price-change approval integrated minimal
- [ ] Shift-close threshold approval atau documented defer
- [ ] UI users/approvals/audit/settings tersedia
- [ ] Sidebar role-aware
- [ ] Semua method bisnis explicit `@Roles()`
- [ ] Typecheck dan build monorepo pass
- [ ] Tidak ada package baru
- [ ] Security tests utama pass
- [ ] Audit Sprint 7 diminta

---

## 12. Task board

### Phase A — RBAC baseline

- [ ] Audit roles seluruh endpoint
- [ ] Buat RBAC policy helper
- [ ] Tambah metadata tests

### Phase B — User

- [ ] Module/controller/service/DTO
- [ ] CRUD + soft deactivate
- [ ] Reset PIN + revoke sessions
- [ ] Last OWNER safeguards
- [ ] Audit events

### Phase C — Approval

- [ ] Module/controller/service/DTO/policy
- [ ] Create/list/mine/detail
- [ ] Approve/reject race-safe
- [ ] Optional metadata migration

### Phase D — Sensitive actions

- [ ] Void request/approval execute
- [ ] Price-change request/execute
- [ ] Shift-close threshold approval
- [ ] Refund strategy documented/implemented safely

### Phase E — Audit

- [ ] AuditService
- [ ] Redaction helper
- [ ] Audit query endpoints
- [ ] Events wired

### Phase F — Shared/frontend data

- [ ] Shared types
- [ ] API clients + hooks

### Phase G — UI

- [ ] Users page
- [ ] Approvals page
- [ ] Audit logs page
- [ ] Settings page
- [ ] Role-aware navigation

### Phase H — Harden

- [ ] Tests Section 10
- [ ] Typecheck/build
- [ ] Security self-check
- [ ] Request Sprint 7 audit

---

## 13. Urutan implementasi

| Hari | Fokus                                   |
| ---- | --------------------------------------- |
| 1    | RBAC audit + policy + metadata tests    |
| 2    | User module                             |
| 3    | User safeguards/session revoke/audit    |
| 4    | Approval core                           |
| 5    | Approval execution: void + price change |
| 6    | Audit module + integrations             |
| 7–8  | Frontend users/approvals/audit/settings |
| 9    | Race/security tests + regression        |
| 10   | Buffer + audit request                  |

---

## 14. Anti-patterns

1. ❌ Query user/approval/audit tanpa tenant scope
2. ❌ Return `pin_hash`, token hash, OTP, atau secret
3. ❌ Requester approve request sendiri
4. ❌ Update approval APPROVED sebelum action berhasil
5. ❌ Action sensitive dan audit log di transaksi terpisah
6. ❌ Hard delete user
7. ❌ Mengandalkan hidden frontend button sebagai authorization
8. ❌ Menaruh arbitrary request body langsung ke `metadata`
9. ❌ Approval endpoint tanpa race/idempotency guard
10. ❌ Mengubah RolesGuard menjadi default deny tanpa regression audit seluruh endpoint

---

## 15. Referensi

| Dokumen/file    | Path                                                |
| --------------- | --------------------------------------------------- |
| SOP utama       | `docs/SYSTEM_PROMPT.md`                             |
| Product scope   | `docs/PRD.md`                                       |
| Schema          | `apps/api/src/database/prisma/schema.prisma`        |
| Roles guard     | `apps/api/src/common/guards/roles.guard.ts`         |
| Roles decorator | `apps/api/src/common/decorators/roles.decorator.ts` |
| User model      | Prisma `User`                                       |
| Approval model  | Prisma `ApprovalLog`                                |
| Audit model     | Prisma `AuditLog`                                   |
| Prior audit     | `docs/audit/SPRINT*.md`                             |

---

## 16. Pesan untuk agent implementer

> Kerjakan **Sprint 7 saja**. Prioritas: RBAC eksplisit, user lifecycle aman, approval idempotent, dan audit atomik. Jangan memperluas ke permission builder dinamis. Jangan pernah mengembalikan atau mengaudit PIN/token. Setelah implementasi, jalankan typecheck/build dan minta audit security Sprint 7.

---

_Plan version: 1.0 — 22 Juli 2026_  
_Owner: MrikiPOS — UMKM Kota Blitar_
