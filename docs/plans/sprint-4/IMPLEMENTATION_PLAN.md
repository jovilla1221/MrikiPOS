# Sprint 4 — Implementation Plan

> **QRIS Payment (Midtrans) + WhatsApp Notifications**  
> **Audience:** Agent / developer yang mengerjakan Sprint 4  
> **Status:** ⬜ Planned  
> **Durasi target:** ~2 minggu  
> **Dokumen acuan wajib:** `docs/SYSTEM_PROMPT.md`, `docs/PRD.md`, `docs/ADR.md` (ADR-012 Fonnte, ADR-013 Midtrans), audit di `docs/audit/`

---

## 0. Cara pakai dokumen ini

1. Baca **Section 1–3** dulu (scope, prasyarat, aturan).
2. Kerjakan task **berurutan** (Phase A → E). Jangan loncat ke frontend QRIS sebelum backend webhook aman.
3. Setiap PR/task: patuhi checklist di **Section 9**.
4. Setelah selesai: update status di Section 10 + minta security audit (pola `docs/audit/SPRINTn-AUDIT.md`).
5. **Jangan** install package baru tanpa dicatat di plan ini / approval user (lihat SYSTEM_PROMPT §2.2).

---

## 1. Goal Sprint 4

### In scope (MUST)

| #   | Deliverable              | Detail                                                                                  |
| --- | ------------------------ | --------------------------------------------------------------------------------------- |
| 1   | **QRIS via Midtrans**    | Buat charge QRIS, tampilkan QR di POS, status PENDING → PAID via webhook                |
| 2   | **Payment module (API)** | CRUD/status pembayaran terikat `transaction` + `tenant_id`                              |
| 3   | **Webhook Midtrans**     | Endpoint publik terverifikasi signature, idempotent, update `payments` + `transactions` |
| 4   | **WhatsApp notifikasi**  | Extend `WhatsAppService` (bukan hanya OTP): konfirmasi bayar, alert stok menipis        |
| 5   | **POS UI QRIS**          | Flow bayar QRIS di `payment-dialog` + polling/status sampai lunas atau timeout          |
| 6   | **Env & mock mode**      | Sandbox Midtrans + `WA_MOCK_MODE` konsisten dengan Sprint 0                             |

### Out of scope (JANGAN kerjakan di Sprint 4)

- E-wallet full / multi-tender lanjutan di luar CASH + QRIS
- Transfer bank manual dengan bukti upload
- BullMQ / Redis queue production-grade (boleh stub + TODO; full queue di sprint infra)
- Socket.io real-time (boleh polling dulu; WS di sprint terpisah jika belum ada)
- Refund Midtrans full settlement
- PWA offline **QRIS offline** (QRIS **wajib online** — dokumentasikan di UI)
- Sprint 5 reports, Sprint 6 shift/kasbon

---

## 2. Prasyarat (harus sudah ada)

Verifikasi sebelum coding:

| Area                               | Status expected | Lokasi                                      |
| ---------------------------------- | --------------- | ------------------------------------------- |
| Auth JWT + roles                   | ✅              | `modules/auth`                              |
| Transaction create (harga dari DB) | ✅              | `modules/transaction`                       |
| Offline sync `local_id`            | ✅ (Sprint 3)   | `POST /v1/transactions/sync`                |
| Payment model Prisma               | ✅ schema       | `Payment`, `PaymentMethod`, `PaymentStatus` |
| WhatsApp OTP + mock                | ✅              | `integrations/whatsapp`                     |
| POS cash flow                      | ✅              | `components/pos/payment-dialog.tsx`         |

**Residual security (boleh diikuti, jangan blok Sprint 4 kecuali disentuh file terkait):**

- Sprint 2: path `foto_url`, low-stock race
- Sprint 3 residual: unique `(tenant_id, local_id)`, clear `pending_sync` policy

Jika menyentuh payment create, **wajib** tetap resolve amount dari server (jangan trust `jumlah` client untuk QRIS grand total).

---

## 3. Aturan wajib (copy dari SYSTEM_PROMPT — ringkas)

- TypeScript strict, **no `any`** kecuali boundary external API (Midtrans payload) → map ke typed DTO.
- **Setiap query** filter `tenant_id` (+ `outlet_id` bila relevan).
- Controller = HTTP only; business logic di **Service**.
- Response format standar `{ success, data, error?, timestamp }`.
- Secret hanya dari env: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, `FONNTE_TOKEN`, `WA_MOCK_MODE`.
- Jangan expose stack/SQL ke client (webhook error → log server + generic response).
- UI text **Bahasa Indonesia**.
- Kode/variable **English**.
- Endpoint baru: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)` kecuali webhook (lihat Section 5.3).

---

## 4. Arsitektur target

```
POS (Web)
  │ POST /v1/transactions          (status PENDING jika QRIS)
  │ POST /v1/payments/qris         (buat charge Midtrans, return qr_url / qr_string)
  │ GET  /v1/payments/:id/status   (polling)
  ▼
NestJS PaymentModule + MidtransService
  │ create charge (Core API / Snap — pilih SATU, rekomendasikan Core API QRIS)
  │ simpan Payment { status: PENDING, referensi, gateway_response }
  ▼
Midtrans Sandbox
  │ customer scan QR / simulator
  │ HTTP POST webhook → /v1/payments/webhook  (@Public, signature verify)
  ▼
PaymentService.handleWebhook
  │ verify signature
  │ idempotent update Payment → PAID
  │ update Transaction → COMPLETED (jika semua payment PAID)
  │ decrement stok (jika stok belum dipotong di create — lihat keputusan §5.1)
  │ WhatsAppService.sendPaymentConfirm(owner/kasir phone)
  │ optional: low stock check → sendLowStockAlert
```

### Keputusan desain yang HARUS diikuti (jangan diubah tanpa ADR baru)

| ID  | Keputusan                                                                | Alasan                                      |
| --- | ------------------------------------------------------------------------ | ------------------------------------------- |
| D1  | **Midtrans Core API** untuk QRIS (bukan Snap popup dulu)                 | Kontrol penuh, cocok POS tablet, mudah mock |
| D2  | Transaksi QRIS dibuat **PENDING** dulu; stok **baru dipotong saat PAID** | Hindari stok hilang jika QR expired / batal |
| D3  | Cash tetap flow lama: create → COMPLETED + potong stok langsung          | Backward compatible Sprint 1                |
| D4  | Webhook **@Public** tapi **wajib** verify signature Midtrans             | Tidak bisa JWT                              |
| D5  | Polling FE 2–3 detik, max ~2 menit; timeout → status EXPIRED/FAILED      | Socket.io belum wajib                       |
| D6  | QRIS **tidak** masuk offline queue                                       | Perlu gateway online                        |
| D7  | Abstraksi `PaymentGateway` interface di `integrations/midtrans`          | ADR-013 fallback Tripay nanti               |

---

## 5. Backend work breakdown

### Phase A — Schema & config (0.5 hari)

**A1. Prisma (hanya jika kolom kurang)**

Cek `Payment` model. Minimal field yang dibutuhkan:

- `transaction_id`, `metode`, `jumlah`, `status`, `referensi`, `gateway_response` (Json)
- Optional tambah (migration jika belum ada):
  - `expires_at DateTime?`
  - `paid_at DateTime?`
  - `external_id String?` (order_id Midtrans) + index unique per tenant jika perlu

**Jangan** buat tabel baru tanpa approval. Prefer extend `payments`.

**A2. Env**

Update `.env.example` (bukan commit secret asli):

```bash
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
# Optional base URL override for tests
# MIDTRANS_API_URL=https://api.sandbox.midtrans.com

FONNTE_TOKEN=
WA_MOCK_MODE=true
```

**A3. Config typed (opsional tapi recommended)**

`apps/api/src/config/midtrans.config.ts` atau baca via `ConfigService` di `MidtransService`.

---

### Phase B — Midtrans integration (1–2 hari)

**Struktur file (WAJIB ikuti folder SYSTEM_PROMPT):**

```
apps/api/src/integrations/midtrans/
  midtrans.module.ts
  midtrans.service.ts
  midtrans.types.ts          # request/response types
  midtrans.signature.ts     # pure functions verify webhook
```

**B1. `MidtransService` methods**

| Method                                 | Behavior                                                           |
| -------------------------------------- | ------------------------------------------------------------------ |
| `createQrisCharge(input)`              | POST charge order_id unique, amount integer IDR, payment_type qris |
| `getTransactionStatus(orderId)`        | GET status (fallback polling server-side)                          |
| `verifyWebhookSignature(headers/body)` | Validasi signature Midtrans — **reject jika invalid**              |
| `isMockMode()`                         | Jika key kosong + non-production → mock QR + fake order_id         |

**Mock mode (development tanpa key):**

- Generate `order_id = MRIKI-{txnId}-{timestamp}`
- Return `qr_string` dummy + `status: pending`
- Endpoint dev-only **opsional**: `POST /v1/payments/:id/mock-pay` **hanya jika** `NODE_ENV !== 'production'` untuk simulasi webhook

**B2. Security Midtrans**

- Server key **hanya** di backend
- Client key boleh ke FE jika pakai Snap (Sprint 4 Core API: client key opsional)
- Webhook: verify signature sebelum proses
- Jangan log full server key / authorization header
- Amount: integer Rupiah (Midtrans tidak pakai desimal)

**B3. Package**

- Prefer `fetch` native (sudah dipakai Fonnte) **atau** official midtrans client jika sudah disetujui.
- Jika butuh package: catat di PR description + minta approval dulu (`midtrans-client` opsional).

---

### Phase C — Payment module (2–3 hari)

```
apps/api/src/modules/payment/
  payment.module.ts
  payment.controller.ts
  payment.service.ts
  payment.dto.ts
```

Daftarkan di `app.module.ts`.

#### C1. Endpoints

| Method | Path                                         | Auth       | Role                  | Deskripsi                            |
| ------ | -------------------------------------------- | ---------- | --------------------- | ------------------------------------ |
| POST   | `/v1/payments/qris`                          | JWT        | OWNER, MANAGER, KASIR | Buat QRIS untuk transaction PENDING  |
| GET    | `/v1/payments/:id`                           | JWT        | OWNER, MANAGER, KASIR | Detail payment (tenant-scoped)       |
| GET    | `/v1/payments/by-transaction/:transactionId` | JWT        | OWNER, MANAGER, KASIR | List payments transaksi              |
| GET    | `/v1/payments/:id/status`                    | JWT        | OWNER, MANAGER, KASIR | Status ringkas untuk polling         |
| POST   | `/v1/payments/webhook`                       | **Public** | —                     | Midtrans notification                |
| POST   | `/v1/payments/:id/cancel`                    | JWT        | OWNER, MANAGER, KASIR | Batalkan pending (opsional Sprint 4) |

#### C2. DTO (class-validator)

```typescript
// CreateQrisDto
transaction_id: UUID; // transaksi yang sudah dibuat PENDING
// JANGAN terima amount dari client — ambil grand_total dari DB
```

#### C3. Flow `createQris` (service)

1. Load transaction: `where: { id, tenant_id, outlet_id }`
2. Reject jika status bukan `PENDING` (atau `COMPLETED` cash sudah final)
3. Reject jika sudah ada payment QRIS `PAID`
4. `jumlah = transaction.grand_total` (server)
5. Call Midtrans create charge
6. Insert `Payment` row: `metode=QRIS`, `status=PENDING`, `referensi=order_id`, `gateway_response=json`
7. Return `{ payment_id, qr_string | qr_url, expires_at, order_id }`

#### C4. Flow webhook (service) — CRITICAL

1. Parse body
2. **Verify signature** — jika gagal: 401/403, log warning
3. Cari payment by `referensi` / `order_id`
4. **Idempotent:** jika sudah `PAID`, return success (200) tanpa double stock
5. Map status Midtrans → `PaymentStatus`
6. Dalam `$transaction`:
   - Update payment
   - Jika settlement/capture: set transaction `COMPLETED`, potong stok + stock_history (sama pola Sprint 1)
   - Jika expire/deny: set payment FAILED/EXPIRED; transaction boleh tetap PENDING atau VOID policy (dokumentasikan: **PENDING + allow retry QRIS baru**)
7. Setelah commit: fire-and-forget WhatsApp confirm (try/catch, jangan gagalkan webhook)
8. Selalu return 200 ke Midtrans jika signature valid & processed (hindari retry storm) kecuali error internal → 500 agar Midtrans retry

#### C5. Ubah Transaction create untuk QRIS

**File:** `transaction.service.ts` / DTO

- Jika `payments` berisi `QRIS` dan jumlah = grand_total:
  - `status = PENDING` (bukan COMPLETED)
  - **Jangan** decrement stok di create
  - Buat row Payment PENDING **atau** biarkan FE call `/payments/qris` setelah create (pilih **satu** flow):

**Rekomendasi flow (lebih bersih):**

1. `POST /v1/transactions` dengan `metode` intent QRIS → transaction PENDING, **tanpa** payment row, **tanpa** stok out
2. `POST /v1/payments/qris` `{ transaction_id }` → charge + payment row
3. Webhook → COMPLETED + stok

Cash: tetap create COMPLETED + stok (seperti sekarang).

Validasi: QRIS amount must equal grand_total (TXN-004 residual dari Sprint 1 audit).

#### C6. Roles

- Create QRIS / poll: OWNER, MANAGER, KASIR
- Webhook: Public + signature
- Lihat payment history: sama seperti transaksi

---

### Phase D — WhatsApp notifications (1 hari)

**File:** `integrations/whatsapp/whatsapp.service.ts` (extend, jangan duplikat client)

Tambah method:

| Method                                 | Pesan (ID)                                          |
| -------------------------------------- | --------------------------------------------------- |
| `sendPaymentConfirmed(phone, payload)` | Transaksi lunas, nomor, total, metode               |
| `sendLowStockAlert(phone, products[])` | Daftar produk stok ≤ minimum (max 10 item di pesan) |

Aturan:

- Hormati `WA_MOCK_MODE` (parse string `'true'`/`'false'` seperti fix INFO-001)
- Production + mock → `logger.warn` (sudah ada)
- Jangan log OTP/payment secrets
- Dipanggil dari: webhook success; optional setelah stock decrement jika low stock

**Notification module (opsional Sprint 4):**

```
modules/notification/   # jika perlu endpoint list notif — boleh defer
```

Cukup service call dari payment/inventory dulu. UI notification center **boleh** Sprint 5+.

---

### Phase E — Frontend (2–3 hari)

#### E1. API client

```
apps/web/src/lib/api/payments.ts
apps/web/src/hooks/use-payments.ts
```

Functions: `createQrisPayment`, `getPaymentStatus`, types dari shared-types jika perlu export baru.

#### E2. POS Payment Dialog

**File:** `components/pos/payment-dialog.tsx` + `app/(dashboard)/pos/page.tsx`

Flow QRIS:

1. User pilih QRIS → jumlah locked = grand total
2. On confirm:
   - Online only; jika offline → toast error “QRIS memerlukan koneksi internet”
   - `createTransaction` (PENDING) **atau** existing cart submit path
   - `createQrisPayment`
   - Tampilkan QR (`qr_string` via library QR **atau** `qr_url` image Midtrans)
3. Poll `getPaymentStatus` tiap 2.5s
4. PAID → struk sukses + clear cart + invalidate products
5. Timeout / EXPIRED → tombol “Coba lagi” / “Batal”
6. Jangan queue offline untuk QRIS

**Package QR renderer:** jika perlu `qrcode.react` — **minta approval dulu**. Alternatif: pakai `qr_url` dari Midtrans tanpa lib.

#### E3. Shared types

Jika perlu, tambah di `packages/shared-types`:

```typescript
// payment.ts
export interface QrisChargeResponse {
  payment_id: string;
  order_id: string;
  qr_string?: string | null;
  qr_url?: string | null;
  expires_at?: string | null;
  status: PaymentStatus;
}
```

Export dari `index.ts`, rebuild package.

#### E4. Copy UI (Bahasa Indonesia)

- “Bayar dengan QRIS”
- “Menunggu pembayaran…”
- “Pembayaran berhasil”
- “QRIS kedaluwarsa, silakan buat QR baru”
- “QRIS tidak tersedia saat offline”

---

## 6. File checklist (create / touch)

### Create

| File                                                                       |
| -------------------------------------------------------------------------- |
| `apps/api/src/integrations/midtrans/midtrans.module.ts`                    |
| `apps/api/src/integrations/midtrans/midtrans.service.ts`                   |
| `apps/api/src/integrations/midtrans/midtrans.types.ts`                     |
| `apps/api/src/integrations/midtrans/midtrans.signature.ts`                 |
| `apps/api/src/modules/payment/payment.module.ts`                           |
| `apps/api/src/modules/payment/payment.controller.ts`                       |
| `apps/api/src/modules/payment/payment.service.ts`                          |
| `apps/api/src/modules/payment/payment.dto.ts`                              |
| `apps/web/src/lib/api/payments.ts`                                         |
| `apps/web/src/hooks/use-payments.ts`                                       |
| `apps/web/src/components/pos/qris-payment-panel.tsx` (recommended extract) |
| `packages/shared-types/src/payment.ts` (jika belum cukup)                  |
| `docs/plans/sprint-4/IMPLEMENTATION_PLAN.md` (this file)                   |

### Modify

| File                                                     | Perubahan                                   |
| -------------------------------------------------------- | ------------------------------------------- |
| `apps/api/src/app.module.ts`                             | Import PaymentModule, MidtransModule        |
| `apps/api/src/modules/transaction/*`                     | PENDING path untuk QRIS; jangan potong stok |
| `apps/api/src/integrations/whatsapp/whatsapp.service.ts` | Notif bayar + low stock                     |
| `.env.example`                                           | Midtrans keys                               |
| `apps/web/src/components/pos/payment-dialog.tsx`         | QRIS UI                                     |
| `apps/web/src/app/(dashboard)/pos/page.tsx`              | Wire flow                                   |
| `apps/web/src/hooks/use-transactions.ts`                 | Jangan offline-queue jika metode QRIS       |

### Migration

- Hanya jika schema payment ditambah field → `pnpm db:migrate` dengan nama jelas `add_payment_qris_fields`

---

## 7. Security requirements (agent checklist)

Turunan audit Sprint 0–3 + payment-specific:

| #   | Requirement                                                                       |
| --- | --------------------------------------------------------------------------------- |
| S1  | Webhook signature verification **wajib** sebelum mutasi DB                        |
| S2  | Idempotent webhook (double notification ≠ double stok)                            |
| S3  | Amount QRIS dari **server** `grand_total`, bukan body client                      |
| S4  | Tenant isolation di semua GET payment                                             |
| S5  | Jangan log `server_key`, raw card data (N/A QRIS), atau full PII berlebih         |
| S6  | Rate limit: webhook cukup global; create QRIS pertimbangkan throttle per outlet   |
| S7  | `@Public()` hanya webhook (+ mock-pay non-prod)                                   |
| S8  | QRIS disabled offline (FE + BE reject jika perlu)                                 |
| S9  | Error ke client generik; detail di Nest Logger                                    |
| S10 | Mock pay endpoint **forbidden** in production (`NODE_ENV === 'production'` → 404) |

Setelah implement: minta agent audit menulis `docs/audit/SPRINT4-AUDIT.md` (playbook webvuln + race pada webhook/stok).

---

## 8. Testing plan (minimal)

### Manual

1. Cash path masih jalan (regression Sprint 1)
2. QRIS sandbox: create → QR muncul → simulate payment Midtrans → status PAID → stok berkurang 1×
3. Double webhook → stok tidak double
4. Invalid signature → 401, payment unchanged
5. Offline + pilih QRIS → error UI, tidak masuk Dexie pending
6. WA mock: log “payment confirmed” di server console

### Automated (jika sempat)

- Unit: `midtrans.signature.ts` verify true/false
- Unit: `handleWebhook` idempotent (mock prisma)
- E2E full boleh Sprint 8

---

## 9. Definition of Done

- [ ] PaymentModule + MidtransService terdaftar, build `pnpm --filter api build` pass
- [ ] `pnpm typecheck` monorepo pass
- [ ] Flow cash tidak regresi
- [ ] Flow QRIS sandbox end-to-end (atau mock) documented di README singkat / comment
- [ ] Webhook signature + idempotency verified
- [ ] Stok hanya potong sekali saat PAID untuk QRIS
- [ ] WhatsApp payment confirm (mock OK)
- [ ] Low stock alert dipanggil setelah stock out (minimal stub)
- [ ] `.env.example` updated
- [ ] Tidak ada secret di git
- [ ] UI Bahasa Indonesia
- [ ] Plan status Section 10 di-update

---

## 10. Task board (centang saat selesai)

### Phase A — Config

- [ ] A1 Schema review / migration fields payment
- [ ] A2 `.env.example` Midtrans
- [ ] A3 ConfigService wiring

### Phase B — Midtrans

- [ ] B1 MidtransService createQris + getStatus + mock
- [ ] B2 Signature verify pure functions
- [ ] B3 MidtransModule export

### Phase C — Payment API

- [ ] C1 Controller + DTOs + Roles
- [ ] C2 createQris service
- [ ] C3 webhook handler idempotent
- [ ] C4 Transaction PENDING path (no stock until paid)
- [ ] C5 Register modules in AppModule
- [ ] C6 Status polling endpoint

### Phase D — WhatsApp

- [ ] D1 sendPaymentConfirmed
- [ ] D2 sendLowStockAlert
- [ ] D3 Hook from webhook / stock update

### Phase E — Web

- [ ] E1 payments API client + hooks
- [ ] E2 QRIS panel in POS
- [ ] E3 Polling + timeout UX
- [ ] E4 Block QRIS offline
- [ ] E5 shared-types payment exports

### Phase F — Hardening

- [ ] F1 Manual test checklist §8
- [ ] F2 Security self-check §7
- [ ] F3 Request Sprint 4 audit doc

---

## 11. Urutan implementasi yang disarankan (hari ke-hari)

| Hari | Fokus                                   |
| ---- | --------------------------------------- |
| 1    | A + B (Midtrans service + mock)         |
| 2    | C1–C3 webhook + createQris              |
| 3    | C4 transaction PENDING + stock rules    |
| 4    | D WhatsApp notif + low stock hook       |
| 5–6  | E POS UI QRIS + polling                 |
| 7    | Regression cash/offline + security pass |
| 8    | Buffer bugfix + audit                   |

---

## 12. Anti-patterns (JANGAN)

1. ❌ Percaya `jumlah` / `harga` dari client untuk QRIS
2. ❌ Potong stok di create QRIS + potong lagi di webhook
3. ❌ Webhook tanpa signature check
4. ❌ Simpan Midtrans server key di frontend
5. ❌ Offline queue untuk payment gateway
6. ❌ `any` di seluruh payment service tanpa type boundary
7. ❌ Query payment tanpa `tenant_id`
8. ❌ Breaking cash flow Sprint 1
9. ❌ Install package random untuk QR tanpa approval
10. ❌ Expose Midtrans raw error ke mobile UI

---

## 13. Referensi cepat

| Dokumen                 | Path                                                      |
| ----------------------- | --------------------------------------------------------- |
| System rules            | `docs/SYSTEM_PROMPT.md`                                   |
| PRD payment & WA        | `docs/PRD.md` §3, §7, §11                                 |
| ADR Midtrans            | `docs/ADR.md` ADR-013                                     |
| ADR Fonnte              | `docs/ADR.md` ADR-012                                     |
| API contract (jika ada) | `docs/API_CONTRACT.md`                                    |
| Audit history           | `docs/audit/SPRINT*.md`                                   |
| Existing WA             | `apps/api/src/integrations/whatsapp/`                     |
| Existing POS pay UI     | `apps/web/src/components/pos/payment-dialog.tsx`          |
| Transaction service     | `apps/api/src/modules/transaction/transaction.service.ts` |

---

## 14. Pesan untuk agent implementer

> Kamu mengerjakan **Sprint 4 saja**. Jangan refactor besar monorepo.  
> Prioritas: **webhook aman + stok benar + cash tidak rusak + QRIS usable di POS**.  
> Jika ragu Midtrans Snap vs Core API: **ikuti D1 (Core API QRIS)** di dokumen ini.  
> Jika ragu stok: **ikuti D2 (potong saat PAID)**.  
> Selesai coding → jalankan typecheck/build → isi checklist Section 9–10 → minta audit security.

---

_Plan version: 1.0 — 21 Juli 2026_  
_Owner product: MrikiPOS — UMKM Kota Blitar_
