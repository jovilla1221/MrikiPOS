# Sprint 6 — Implementation Plan

> **Shift Management, Kasbon (Piutang), Customer Database**  
> **Audience:** Agent / developer yang mengerjakan Sprint 6  
> **Status:** ⬜ Planned  
> **Durasi target:** ~2 minggu  
> **Dokumen acuan wajib:** `docs/SYSTEM_PROMPT.md`, `docs/PRD.md` (§3 P0/P1, §7 API), `docs/ADR.md`, `docs/audit/SPRINT*.md`, plan Sprint 4–5 di `docs/plans/`

---

## 0. Cara pakai dokumen ini

1. Baca **Section 1–4** dulu (goal, scope, prasyarat, aturan, keputusan desain).
2. Kerjakan **Phase A → F** berurutan: Customer → Credit → Shift → wire POS/transaction → FE → harden.
3. Setiap PR: checklist **Section 9**.
4. Selesai: update task board **Section 10** + minta audit `docs/audit/SPRINT6-AUDIT.md`.
5. **Jangan** install package baru tanpa approval (SYSTEM_PROMPT §2.2). Sprint 6 **tidak butuh package baru**.

---

## 1. Goal Sprint 6

### In scope (Wajib)

| #   | Deliverable                                | Detail                                                                                                   |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 1   | **Customer CRUD**                          | Database pelanggan per tenant/outlet (nama, HP, alamat, total_belanja, poin)                             |
| 2   | **Kasbon / CustomerCredit**                | Catat hutang, bayar parsial/lunas, status UNPAID/PARTIAL/PAID/OVERDUE, jatuh tempo                       |
| 3   | **Shift open/close**                       | Modal awal, total penjualan/transaksi dari shift, kas aktual, selisih kas                                |
| 4   | **Wire transaksi ke shift**                | Saat create transaction COMPLETED (cash) / PAID (QRIS webhook), attach `shift_id` + update agregat shift |
| 5   | **Wire POS ke customer (opsional ringan)** | Pilih pelanggan di cart / payment (opsional field `customer_id` sudah ada di create transaction)         |
| 6   | **Kasbon di dashboard**                    | Ganti placeholder `Rp 0` kasbon dengan sum `sisa` status UNPAID/PARTIAL/OVERDUE                          |
| 7   | **WA reminder kasbon (minimal)**           | Method `sendCreditReminder` di WhatsAppService; trigger manual API dulu (cron full = Sprint 8+ / BullMQ) |
| 8   | **UI**                                     | Halaman customers, credits (kasbon), shifts + integrasi ringkas di POS                                   |

### Out of scope (JANGAN)

- Multi-outlet transfer stok (P2)
- Loyalty tier / voucher (P2)
- Cron otomatis harian WA reminder (boleh stub; production cron Sprint 8)
- Approval multi-level (Sprint 7)
- Full RBAC matrix hardening (Sprint 7)
- Refund Midtrans / void kasbon complex accounting

---

## 2. Prasyarat

| Area                                         | Status             | Lokasi                       |
| -------------------------------------------- | ------------------ | ---------------------------- |
| Schema `Customer`, `CustomerCredit`, `Shift` | ✅ sudah di Prisma | `schema.prisma`              |
| Enums `CreditStatus`, `ShiftStatus`          | ✅                 | schema                       |
| Transaction `customer_id`, `shift_id`        | ✅ optional FK     | schema                       |
| Transaction create + QRIS PAID stock         | ✅                 | Sprint 1 + 4                 |
| Dashboard cards                              | ✅ partial         | Sprint 5 — kasbon masih stub |
| WhatsAppService                              | ✅                 | OTP, payment, low stock      |

**Tidak perlu migration schema** kecuali field hilang. Verifikasi dulu dengan `schema.prisma` sebelum `db push`.

---

## 3. Aturan wajib (ringkas)

- TypeScript strict, **no `any`** di service (kecuali boundary JSON).
- **Setiap query** filter `tenant_id` (+ `outlet_id` bila relevan).
- Controller = HTTP only; logic di **Service**.
- Response `{ success, data, error?, timestamp }`.
- UI **Bahasa Indonesia** (pakai kata **Kasbon**, bukan “Customer Credit”).
- Kode **English**.
- Money: `Decimal` di DB; number di API response via `Number(...)`.
- Jangan expose stack/SQL.

---

## 4. Arsitektur & keputusan desain

```
POS / Web
  │ open shift → transaksi (shift_id) → close shift
  │ customer select → create txn with customer_id
  │ create kasbon / pay kasbon
  ▼
modules/customer  → CRUD customers
modules/credit    → CustomerCredit lifecycle
modules/shift     → open / close / current / history
  │
  ▼
TransactionService / PaymentService (webhook)
  │ on COMPLETED/PAID: attach open shift, increment shift totals
  │ optional: if payment method implies credit — out of scope unless explicit "kasbon payment method"
```

### Keputusan desain (D1–D8) — jangan diubah tanpa diskusi

| ID      | Keputusan                                                                                                                                                                                                                                             | Alasan                                   |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **D1**  | **3 module terpisah:** `customer`, `credit`, `shift`                                                                                                                                                                                                  | Sesuai SYSTEM_PROMPT folder map Sprint 6 |
| **D2**  | Satu user **maks 1 shift OPEN** per outlet                                                                                                                                                                                                            | Cegah double shift                       |
| **D3**  | Transaksi COMPLETED (cash) **wajib** punya shift OPEN milik kasir (atau outlet policy — lihat D3b)                                                                                                                                                    | Akuntabilitas kasir                      |
| **D3b** | **Policy MVP:** jika tidak ada shift OPEN, **tetap boleh transaksi** tapi `shift_id=null` + log warn. Owner setting nanti. Default: **warn only, jangan block POS** agar warung tidak macet. Optional strict mode env `REQUIRE_SHIFT=true`.           |
| **D4**  | Update `total_penjualan` / `total_transaksi` shift **hanya** saat transaksi jadi COMPLETED (cash create / QRIS webhook PAID)                                                                                                                          | Selaras stok QRIS                        |
| **D5**  | Void transaksi COMPLETED: **decrement** agregat shift jika `shift_id` set                                                                                                                                                                             | Konsistensi                              |
| **D6**  | Kasbon **bukan** payment method Midtrans; kasbon = piutang terpisah. POS boleh: jual tunai + catat kasbon manual, atau “bayar sebagian tunai + sisa kasbon” di Sprint 6 **fase 2** jika sempat. **MVP:** CRUD kasbon standalone + link `customer_id`. |
| **D7**  | `OVERDUE` dihitung saat read / pay: jika `jatuh_tempo < today` dan status UNPAID/PARTIAL → treat/display OVERDUE (boleh update lazy di service)                                                                                                       | Tanpa cron dulu                          |
| **D8**  | Dashboard kasbon = `SUM(sisa)` where status in (UNPAID, PARTIAL, OVERDUE) per tenant+outlet                                                                                                                                                           | Ganti stub Sprint 5                      |

---

## 5. Backend work breakdown

### Phase A — Customer module (1–1.5 hari)

```
apps/api/src/modules/customer/
  customer.module.ts
  customer.controller.ts
  customer.service.ts
  customer.dto.ts
```

#### A1. Endpoints

| Method | Path                        | Roles                 | Deskripsi                                                                                        |
| ------ | --------------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| GET    | `/v1/customers`             | OWNER, MANAGER, KASIR | List paginated + search nama/phone                                                               |
| POST   | `/v1/customers`             | OWNER, MANAGER, KASIR | Create                                                                                           |
| GET    | `/v1/customers/:id`         | OWNER, MANAGER, KASIR | Detail + optional credits summary                                                                |
| PUT    | `/v1/customers/:id`         | OWNER, MANAGER, KASIR | Update                                                                                           |
| DELETE | `/v1/customers/:id`         | OWNER, MANAGER        | Soft? Schema tidak ada `is_active` — **hard delete hanya jika 0 transaksi & 0 credit**; else 409 |
| GET    | `/v1/customers/:id/history` | OWNER, MANAGER, KASIR | List transaksi customer (paginated)                                                              |

#### A2. DTO

```typescript
CreateCustomerDto {
  @IsString() @Length(2, 100) nama
  @IsOptional() @Matches(/^08[0-9]{8,12}$/) phone?
  @IsOptional() @Length(0, 255) alamat?
}
UpdateCustomerDto { partial same }
CustomerQueryDto extends PaginationDto { search? }
```

#### A3. Service rules

- Selalu `tenant_id` + `outlet_id` dari JWT.
- Phone unique **per tenant** (index `tenant_id, phone`) — cek conflict sebelum create/update.
- `total_belanja` / `poin`: update saat transaksi COMPLETED (Phase D), bukan manual edit dari client (tolak field ini di DTO update).

---

### Phase B — Credit (Kasbon) module (1.5–2 hari)

```
apps/api/src/modules/credit/
  credit.module.ts
  credit.controller.ts
  credit.service.ts
  credit.dto.ts
```

#### B1. Endpoints

| Method | Path                     | Roles                 | Deskripsi                               |
| ------ | ------------------------ | --------------------- | --------------------------------------- |
| GET    | `/v1/credits`            | OWNER, MANAGER, KASIR | List + filter status, customer_id, date |
| POST   | `/v1/credits`            | OWNER, MANAGER, KASIR | Buat kasbon                             |
| GET    | `/v1/credits/:id`        | OWNER, MANAGER, KASIR | Detail                                  |
| PUT    | `/v1/credits/:id/pay`    | OWNER, MANAGER, KASIR | Bayar (partial/full)                    |
| GET    | `/v1/credits/overdue`    | OWNER, MANAGER        | List jatuh tempo lewat                  |
| GET    | `/v1/credits/summary`    | OWNER, MANAGER, KASIR | Total sisa piutang (dashboard)          |
| POST   | `/v1/credits/:id/remind` | OWNER, MANAGER        | Kirim WA reminder (manual)              |

#### B2. DTO

```typescript
CreateCreditDto {
  @IsUUID() customer_id
  @IsNumber() @Min(1) jumlah
  @IsOptional() @IsString() @Length(0, 255) keterangan?
  @IsOptional() @IsDateString() jatuh_tempo?
}

PayCreditDto {
  @IsNumber() @Min(1) jumlah_bayar
  @IsOptional() @IsString() catatan?
}
```

#### B3. Business logic

**Create:**

1. Customer exists + same tenant/outlet.
2. `sisa = jumlah`, `status = UNPAID`.
3. Return credit.

**Pay:**

1. Load credit scoped tenant.
2. Reject if PAID.
3. `jumlah_bayar` tidak boleh > `sisa`.
4. `sisa_baru = sisa - jumlah_bayar`.
5. Status:
   - `sisa_baru === 0` → PAID, `paid_at = now`
   - `sisa_baru > 0` → PARTIAL
6. Lazy OVERDUE: sebelum return list, jika `jatuh_tempo < startOfToday` && status in (UNPAID, PARTIAL) → set/display OVERDUE.

**Summary dashboard:**

```typescript
aggregate sum(sisa) where status in (UNPAID, PARTIAL, OVERDUE)
```

**Remind:**

- Customer must have phone.
- `whatsAppService.sendCreditReminder(phone, { nama, sisa, jatuh_tempo })`.

#### B4. WhatsApp extension

```typescript
// whatsapp.service.ts
async sendCreditReminder(phone, payload: {
  customerNama: string;
  sisa: number;
  jatuhTempo?: string | null;
}): Promise<boolean>
```

Pesan ID contoh:

```
[MrikiPOS] Pengingat Kasbon
Pelanggan: {nama}
Sisa: Rp ...
Jatuh tempo: ...
Mohon segera dilunasi. Terima kasih.
```

Hormati mock mode seperti method lain.

---

### Phase C — Shift module (1.5–2 hari)

```
apps/api/src/modules/shift/
  shift.module.ts
  shift.controller.ts
  shift.service.ts
  shift.dto.ts
```

#### C1. Endpoints

| Method | Path                 | Roles                 | Deskripsi                          |
| ------ | -------------------- | --------------------- | ---------------------------------- |
| POST   | `/v1/shifts/open`    | OWNER, MANAGER, KASIR | Buka shift                         |
| POST   | `/v1/shifts/close`   | OWNER, MANAGER, KASIR | Tutup shift (current user / by id) |
| GET    | `/v1/shifts/current` | OWNER, MANAGER, KASIR | Shift OPEN user+outlet             |
| GET    | `/v1/shifts`         | OWNER, MANAGER        | History paginated                  |
| GET    | `/v1/shifts/:id`     | OWNER, MANAGER, KASIR | Detail + ringkasan                 |

#### C2. DTO

```typescript
OpenShiftDto {
  @IsNumber() @Min(0) modal_awal
  @IsOptional() @IsString() catatan?
}

CloseShiftDto {
  @IsOptional() @IsUUID() shift_id?  // default: current open
  @IsNumber() @Min(0) kas_aktual
  @IsOptional() @IsString() catatan?
}
```

#### C3. Business logic

**Open:**

1. Cek tidak ada shift `OPEN` untuk `user_id + outlet_id` (D2).
2. Create: `modal_awal`, totals 0, status OPEN.

**Close:**

1. Load shift OPEN milik user (atau OWNER/MANAGER boleh close shift kasir di outlet yang sama — **MVP: user hanya close shift sendiri**; OWNER close any di outlet).
2. `selisih_kas = kas_aktual - (modal_awal + total_penjualan)`  
   _(Asumsi: total_penjualan = cash sales yang masuk laci. QRIS tidak masuk kas fisik — lihat D4b.)_

**D4b — Kas fisik vs non-tunai (penting):**

- `total_penjualan` shift = sum `grand_total` transaksi COMPLETED dengan `shift_id` ini **yang metode CASH** (atau MULTI cash portion — MVP: hanya hitung CASH full).
- QRIS completed tetap bisa di-count di `total_transaksi` opsional field terpisah, atau:
  - **MVP sederhana:** `total_penjualan` = semua COMPLETED di shift (termasuk QRIS); `selisih_kas` = `kas_aktual - (modal_awal + total_cash_only)`.
- **Rekomendasi implementasi MVP:**
  - `total_penjualan` = sum all COMPLETED grand_total on shift (laporan)
  - `total_cash` dihitung saat close dari payments CASH (boleh field transient di response, tidak wajib kolom baru)
  - `selisih_kas = kas_aktual - (modal_awal + total_cash)`
  - Jika tidak mau query ulang: update shift hanya saat CASH completed; QRIS hanya +1 `total_transaksi` tanpa +penjualan ke “kas”. **Pilih satu dan dokumentasikan di code comment.**

**Rekomendasi final (ikuti ini):**

- On COMPLETED cash: `total_penjualan += grand_total`, `total_transaksi += 1`
- On QRIS PAID: `total_transaksi += 1` only (jangan tambah total_penjualan kas) **ATAU** tambah keduanya tapi close form label “Perkiraan kas = modal + penjualan tunai saja” dengan query cash payments.
- **Paling aman untuk UMKM:**
  - `total_penjualan` = semua sales (laporan shift)
  - Saat close: hitung `total_cash` dari DB payments CASH pada transaksi shift
  - `selisih_kas = kas_aktual - (modal_awal + total_cash)`

---

### Phase D — Wire Transaction + Payment + Dashboard (1–1.5 hari)

#### D1. Transaction create (cash COMPLETED)

File: `transaction.service.ts`

Setelah create COMPLETED (non-QRIS):

1. Find shift OPEN: `user_id=kasir`, `outlet_id`, `status=OPEN`.
2. If found: set `transaction.shift_id`, update shift aggregates (sesuai D4b).
3. If `customer_id`: verify customer tenant/outlet; optional `customer.total_belanja += grand_total` (poin rules: **MVP** `poin += floor(grand_total/1000)` atau skip poin — **skip poin dulu** kecuali trivial).

#### D2. QRIS webhook PAID

File: `payment.service.ts` handleWebhook

Setelah set transaction COMPLETED:

1. Resolve open shift for `transaction.kasir_id` (bukan webhook user).
2. Attach shift_id if null + update aggregates.

#### D3. Void

Jika void COMPLETED with shift_id: reverse aggregate (decrement totals carefully, never negative).

#### D4. Dashboard API / FE

- `GET /v1/credits/summary` → FE dashboard card.
- Atau extend existing dashboard queries di page.

---

### Phase E — Shared types (0.5 hari)

`packages/shared-types/src/customer.ts`, `credit.ts`, `shift.ts` (atau gabung):

```typescript
// Customer, CustomerCredit, Shift interfaces
// CreditStatus, ShiftStatus enums (mirror Prisma / already partial in shared)
```

Export dari `index.ts`. Rebuild package.

---

## 6. Frontend work breakdown

### Phase F — UI (2–3 hari)

#### F1. API + hooks

```
apps/web/src/lib/api/customers.ts
apps/web/src/lib/api/credits.ts
apps/web/src/lib/api/shifts.ts
apps/web/src/hooks/use-customers.ts
apps/web/src/hooks/use-credits.ts
apps/web/src/hooks/use-shifts.ts
```

#### F2. Pages (App Router)

```
apps/web/src/app/(dashboard)/customers/page.tsx
apps/web/src/app/(dashboard)/customers/[id]/page.tsx   // optional detail
apps/web/src/app/(dashboard)/credits/page.tsx            // kasbon list + pay dialog
apps/web/src/app/(dashboard)/shifts/page.tsx             // current + history + open/close
```

Copy UI:

- “Pelanggan”, “Kasbon”, “Buka Shift”, “Tutup Shift”, “Modal Awal”, “Kas Aktual”, “Selisih Kas”

#### F3. Navigation

Tambah link di sidebar/dashboard layout (jika ada nav list): Pelanggan, Kasbon, Shift.

#### F4. POS integration (minimal)

- **Shift banner:** jika tidak ada shift OPEN, tampilkan warning kuning “Anda belum buka shift” + link buka shift (jangan block kecuali `REQUIRE_SHIFT`).
- **Customer picker (nice-to-have):** search customer di payment dialog; kirim `customer_id` di create transaction.

#### F5. Dashboard

Ganti card kasbon:

```typescript
useQuery credits summary → formatRupiah(total_sisa)
```

---

## 7. File checklist

### Create

| File                                                            |
| --------------------------------------------------------------- |
| `apps/api/src/modules/customer/*`                               |
| `apps/api/src/modules/credit/*`                                 |
| `apps/api/src/modules/shift/*`                                  |
| `packages/shared-types/src/customer.ts` (dan/atau credit/shift) |
| `apps/web/src/lib/api/customers.ts`                             |
| `apps/web/src/lib/api/credits.ts`                               |
| `apps/web/src/lib/api/shifts.ts`                                |
| `apps/web/src/hooks/use-customers.ts`                           |
| `apps/web/src/hooks/use-credits.ts`                             |
| `apps/web/src/hooks/use-shifts.ts`                              |
| `apps/web/src/app/(dashboard)/customers/**`                     |
| `apps/web/src/app/(dashboard)/credits/**`                       |
| `apps/web/src/app/(dashboard)/shifts/**`                        |

### Modify

| File                         | Perubahan                                        |
| ---------------------------- | ------------------------------------------------ |
| `app.module.ts`              | Import CustomerModule, CreditModule, ShiftModule |
| `transaction.service.ts`     | shift attach + customer total_belanja            |
| `payment.service.ts`         | shift on QRIS PAID                               |
| `whatsapp.service.ts`        | sendCreditReminder                               |
| `app/(dashboard)/page.tsx`   | kasbon real number                               |
| `app/(dashboard)/layout.tsx` | nav links                                        |
| POS payment-dialog / page    | optional customer + shift banner                 |

---

## 8. Security requirements

| #   | Requirement                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Semua query filter `tenant_id` (+ `outlet_id`)                                                                                                       |
| S2  | Customer phone uniqueness per tenant — no cross-tenant leak                                                                                          |
| S3  | Pay credit: amount > 0, ≤ sisa; concurrent pay → use `$transaction` + re-read sisa                                                                   |
| S4  | Shift close: only own shift (KASIR) or same-outlet (OWNER/MANAGER)                                                                                   |
| S5  | Tidak expose PIN di response apapun                                                                                                                  |
| S6  | WA reminder: hanya customer milik tenant; rate-limit remind (max 3/jam/credit) via Redis optional                                                    |
| S7  | Roles: KASIR boleh customer/credit/shift operasional; report kredit overdue OWNER/MANAGER                                                            |
| S8  | Decimal money — avoid float drift; compare with care                                                                                                 |
| S9  | Race open shift: unique partial index ideal `(user_id, outlet_id) WHERE status=OPEN` — jika migration disetujui; else app-level check + catch unique |

**Optional migration (approval):**

```prisma
// Tidak selalu support partial unique di Prisma portable —
// App-level check + transaction serializable cukup untuk MVP
```

---

## 9. Definition of Done

- [ ] Customer CRUD + search works
- [ ] Kasbon create + pay partial/full + summary
- [ ] Overdue display / list
- [ ] Shift open/close/current/history
- [ ] Cash sale attaches shift when open
- [ ] QRIS PAID updates shift (policy D4b)
- [ ] Void reverses shift aggregates when applicable
- [ ] Dashboard kasbon ≠ always 0
- [ ] WA remind mock log works
- [ ] FE pages usable mobile-first
- [ ] `pnpm typecheck` + build pass
- [ ] No new unapproved packages
- [ ] Security self-check §8
- [ ] Request `docs/audit/SPRINT6-AUDIT.md`

---

## 10. Task board

### Phase A — Customer

- [ ] A1 Module + controller + service + dto
- [ ] A2 List/search/create/update/delete rules
- [ ] A3 History endpoint
- [ ] A4 Register AppModule

### Phase B — Credit

- [ ] B1 Module + endpoints
- [ ] B2 Create/pay/summary/overdue
- [ ] B3 Concurrent pay safe (`$transaction`)
- [ ] B4 WA sendCreditReminder + remind endpoint

### Phase C — Shift

- [ ] C1 Module + open/close/current/history
- [ ] C2 Single OPEN shift rule
- [ ] C3 Close selisih_kas + total_cash logic (D4b)

### Phase D — Wire

- [ ] D1 Transaction create → shift + customer totals
- [ ] D2 Payment webhook → shift
- [ ] D3 Void reverse
- [ ] D4 Dashboard summary credit

### Phase E — Shared types

- [ ] E1 Types + export + build package

### Phase F — Frontend

- [ ] F1 API clients + hooks
- [ ] F2 Customers page
- [ ] F3 Credits/kasbon page + pay dialog
- [ ] F4 Shifts page
- [ ] F5 Nav + dashboard card
- [ ] F6 POS shift banner (+ optional customer pick)

### Phase G — Harden

- [ ] G1 Manual tests §11
- [ ] G2 Typecheck/build
- [ ] G3 Audit request

---

## 11. Testing plan (manual)

1. Create customer → list/search phone
2. Create kasbon 100k → pay 40k → status PARTIAL sisa 60k → pay 60k → PAID
3. Overdue: jatuh_tempo kemarin + UNPAID → muncul overdue
4. Open shift modal 200k → cash sale 50k → current shift totals update
5. Close shift kas_aktual 240k → selisih sesuai rumus D4b
6. Double open shift → 409/400
7. QRIS sale with open shift → after mock-pay, shift updated per policy
8. Dashboard kasbon shows sum sisa
9. Remind WA mock logs message
10. KASIR cannot access if you restricted overdue-only owner (verify roles)
11. Cross-tenant: token A cannot read customer B

---

## 12. Urutan hari

| Hari | Fokus                                     |
| ---- | ----------------------------------------- |
| 1    | Phase A Customer API                      |
| 2    | Phase B Credit API + WA remind            |
| 3    | Phase C Shift API                         |
| 4    | Phase D wire transaction/payment/void     |
| 5–6  | Phase F FE pages + dashboard + POS banner |
| 7    | E types + regression cash/QRIS/offline    |
| 8    | Buffer + audit                            |

---

## 13. Anti-patterns (JANGAN)

1. ❌ Query customer/credit/shift tanpa `tenant_id`
2. ❌ Izinkan `jumlah_bayar > sisa`
3. ❌ Multiple OPEN shifts per user/outlet
4. ❌ Block seluruh POS jika lupa buka shift (kecuali env strict)
5. ❌ Double-count shift totals on webhook retry (idempotent PAID already — jangan +aggregate 2x)
6. ❌ Trust client `total_belanja` / `poin`
7. ❌ Hard delete customer with history
8. ❌ Cron spam WA tanpa rate limit
9. ❌ Package baru tanpa approval
10. ❌ UI English labels (“Receivable”, “Open Shift” tanpa terjemahan)

---

## 14. Idempotency note (shift aggregates)

Saat QRIS webhook idempotent skip (`already PAID`), **jangan** update shift lagi.

Saat cash create, aggregate sekali di create path.

Pertimbangkan flag di memory only — source of truth = payment/transaction status.

Optional robust approach later: recompute shift totals from DB on close only (MVP incremental OK if careful).

---

## 15. Referensi cepat

| Dokumen                  | Path                                                  |
| ------------------------ | ----------------------------------------------------- |
| System rules             | `docs/SYSTEM_PROMPT.md`                               |
| PRD                      | `docs/PRD.md` §3 Shift/Kasbon/Pelanggan, §7 endpoints |
| Schema                   | `apps/api/src/database/prisma/schema.prisma`          |
| Sprint 5 plan (template) | `docs/plans/sprint-5/IMPLEMENTATION_PLAN.md`          |
| Transaction service      | `modules/transaction/transaction.service.ts`          |
| Payment webhook          | `modules/payment/payment.service.ts`                  |
| Dashboard                | `apps/web/src/app/(dashboard)/page.tsx`               |
| WhatsApp                 | `integrations/whatsapp/whatsapp.service.ts`           |

---

## 16. Pesan untuk agent implementer

> Kerjakan **Sprint 6 saja**: Customer + Kasbon + Shift.  
> Prioritas: **API benar & tenant-safe → wire totals → UI operasional → dashboard**.  
> Shift: ikuti **D4b** untuk kas vs QRIS.  
> POS: **jangan macet** hanya karena shift belum dibuka (D3b).  
> Kasbon: concurrent pay pakai **transaction + re-read sisa**.  
> Selesai → typecheck/build → checklist §9–10 → minta security audit.

---

_Plan version: 1.0 — 22 Juli 2026_  
_Owner: MrikiPOS — UMKM Kota Blitar_
