# MrikiPOS — System Prompt untuk Agent & Developer

> **Dokumen ini adalah ACUAN WAJIB** bagi setiap AI agent, junior developer, atau kontributor yang mengerjakan codebase MrikiPOS.
> Baca dan patuhi SEMUA aturan sebelum menulis kode apapun.
> Jika ragu, tanyakan ke Tech Lead. Jangan asumsi sendiri.

---

## 1. Identitas Proyek

| Item         | Nilai                                                             |
| ------------ | ----------------------------------------------------------------- |
| Nama Produk  | **MrikiPOS**                                                      |
| Deskripsi    | Kasir digital berbasis web (PWA) untuk UMKM Kota Blitar           |
| Arsitektur   | Monorepo (Turborepo + pnpm)                                       |
| Frontend     | Next.js 15 App Router + TypeScript + TailwindCSS v4 + shadcn/ui   |
| Backend      | NestJS 11 + TypeScript + Prisma 6 + PostgreSQL 16                 |
| Offline      | Dexie.js (IndexedDB) + Workbox (Service Worker)                   |
| Realtime     | Socket.io 4                                                       |
| Cache/Queue  | Redis 7 + BullMQ                                                  |
| Auth         | JWT (Access 15m + Refresh 7d) + OTP WhatsApp                      |
| Multi-Tenant | Shared database, shared schema, kolom `tenant_id` di setiap tabel |
| Bahasa UI    | **Bahasa Indonesia** untuk semua teks yang user-facing            |
| Bahasa Kode  | **Bahasa Inggris** untuk variabel, function, class, comment       |

---

## 2. Aturan Umum (WAJIB)

### 2.1 Yang HARUS dilakukan

- ✅ Selalu gunakan **TypeScript strict mode** — tidak boleh `any` kecuali benar-benar tidak bisa dihindari
- ✅ Selalu tulis kode dalam **bahasa Inggris** (variabel, fungsi, class, komentar)
- ✅ Selalu sertakan **tenant_id** di setiap query database (kecuali tabel `tenants` sendiri)
- ✅ Selalu validasi input di **backend** menggunakan `class-validator` DTO
- ✅ Selalu validasi input di **frontend** menggunakan `Zod` schema
- ✅ Selalu gunakan **Prisma ORM** untuk akses database — tidak boleh raw SQL kecuali untuk migration
- ✅ Selalu handle error dengan **try-catch** dan return response format standar
- ✅ Selalu tulis **JSDoc** untuk setiap fungsi publik
- ✅ Selalu ikuti **folder structure** yang sudah ditentukan (lihat Section 7)
- ✅ Selalu cek apakah user punya **hak akses** (RBAC) sebelum eksekusi aksi

### 2.2 Yang DILARANG

- ❌ **JANGAN** hardcode secret, API key, password, atau credential di kode — gunakan environment variable
- ❌ **JANGAN** gunakan `console.log` untuk debugging di production — gunakan logger (NestJS Logger / Pino)
- ❌ **JANGAN** skip tenant isolation — setiap query HARUS filter by `tenant_id`
- ❌ **JANGAN** buat file di luar folder structure yang ditentukan
- ❌ **JANGAN** install package baru tanpa approval — tanyakan dulu
- ❌ **JANGAN** ubah schema Prisma tanpa membuat migration
- ❌ **JANGAN** gunakan `innerHTML`, `dangerouslySetInnerHTML`, `document.write` tanpa sanitasi DOMPurify
- ❌ **JANGAN** simpan token/secret di `localStorage` atau `sessionStorage`
- ❌ **JANGAN** expose error detail (stack trace, SQL error) ke response API
- ❌ **JANGAN** buat endpoint tanpa auth guard (kecuali `/health`, `/auth/*`)
- ❌ **JANGAN** gunakan `any` type di TypeScript — selalu definisikan tipe yang proper
- ❌ **JANGAN** tulis business logic di controller — controller hanya orchestrate, logic di service
- ❌ **JANGAN** query database di dalam loop — gunakan batch query
- ❌ **JANGAN** buat tabel database baru tanpa kolom `tenant_id` (kecuali tabel `tenants`)

---

## 3. Tech Stack — Versi TERKUNCI

> **PENTING:** Jangan upgrade atau downgrade versi tanpa approval Tech Lead.

| Layer              | Package         | Versi  | Catatan                                     |
| ------------------ | --------------- | ------ | ------------------------------------------- |
| Runtime            | Node.js         | 20 LTS | Pin di `.nvmrc`                             |
| Package Manager    | pnpm            | 9.x    | WAJIB pnpm, bukan npm/yarn                  |
| Monorepo           | Turborepo       | latest | Turbo pipeline di `turbo.json`              |
| Frontend Framework | Next.js         | 15.x   | App Router ONLY, bukan Pages Router         |
| React              | React           | 19.x   | Sesuai Next.js 15                           |
| CSS                | TailwindCSS     | 4.x    | v4 syntax (`@import "tailwindcss"`)         |
| UI Components      | shadcn/ui       | latest | Copy-paste component, bukan install package |
| State (Client)     | Zustand         | 5.x    | Untuk client state saja                     |
| State (Server)     | TanStack Query  | 5.x    | Untuk data fetching & caching               |
| Offline DB         | Dexie.js        | 4.x    | Wrapper IndexedDB                           |
| Validation (FE)    | Zod             | 3.x    | Schema validation                           |
| Backend Framework  | NestJS          | 11.x   | Modular architecture                        |
| ORM                | Prisma          | 6.x    | Schema-first, migration-based               |
| Database           | PostgreSQL      | 16.x   | Dengan RLS                                  |
| Cache              | Redis           | 7.x    | Via ioredis                                 |
| Queue              | BullMQ          | 5.x    | Background jobs                             |
| WebSocket          | Socket.io       | 4.x    | Realtime events                             |
| Validation (BE)    | class-validator | latest | DTO validation                              |
| Auth               | @nestjs/jwt     | latest | JWT token management                        |
| Hashing            | bcrypt          | latest | PIN hashing, cost factor 12                 |
| HTTP Security      | helmet          | latest | Security headers                            |

---

## 4. Arsitektur & Pattern

### 4.1 Monorepo Structure

```
mrikipos/
├── apps/
│   ├── web/          ← Next.js 15 PWA (frontend)
│   └── api/          ← NestJS 11 (backend)
├── packages/
│   ├── shared-types/ ← TypeScript types/interfaces shared FE↔BE
│   ├── shared-utils/ ← Utility functions shared FE↔BE
│   ├── eslint-config/← Shared ESLint rules
│   └── tsconfig/     ← Shared TypeScript configs
├── infra/
│   └── docker/       ← Docker Compose, Nginx
├── docs/             ← Dokumentasi (PRD, system prompt, API docs)
└── .github/workflows/← CI/CD
```

### 4.2 Backend Pattern (NestJS)

```
Module → Controller → Service → Prisma (Database)
                   ↘ DTO (validation)
                   ↘ Guard (auth/RBAC)
```

**Aturan:**

- Setiap fitur = 1 **Module** (auth, product, transaction, dll)
- **Controller**: hanya handle HTTP request/response, validasi DTO, panggil service
- **Service**: semua business logic ada di sini
- **DTO**: validasi input dengan `class-validator` decorators
- **Guard**: autentikasi (JWT) dan otorisasi (RBAC)
- **Interceptor**: logging, transformasi response
- **Filter**: error handling global

**Contoh structure module:**

```
src/modules/product/
├── product.module.ts
├── product.controller.ts
├── product.service.ts
├── product.dto.ts          ← CreateProductDto, UpdateProductDto, dll
├── product.controller.spec.ts  ← Unit test
└── product.service.spec.ts     ← Unit test
```

### 4.3 Frontend Pattern (Next.js)

```
Page (App Router) → Component → Hook → Store/API
                                    ↘ Zustand (client state)
                                    ↘ TanStack Query (server state)
```

**Aturan:**

- Gunakan **App Router** (`src/app/`) — BUKAN Pages Router
- Route groups: `(auth)` untuk login/register, `(dashboard)` untuk app
- **Server Components** by default, tambahkan `'use client'` hanya jika perlu interaktivitas
- **Client Components** untuk: form, event handler, useState/useEffect, browser API
- Data fetching: gunakan **TanStack Query** hooks, BUKAN `fetch` langsung di component
- State management: **Zustand** untuk UI state (sidebar open, theme, cart), **TanStack Query** untuk server data
- Styling: **TailwindCSS v4** utility classes, BUKAN inline style atau CSS modules

### 4.4 Multi-Tenant Isolation

```
Request → Middleware (extract tenant_id dari JWT)
       → Guard (verify user belongs to tenant)
       → Service (semua query WHERE tenant_id = ?)
       → Prisma (parameterized, tenant scoped)
```

**WAJIB di setiap service method:**

```typescript
// ✅ BENAR — selalu filter tenant_id
async findAll(tenantId: string) {
  return this.prisma.product.findMany({
    where: { tenant_id: tenantId },
  });
}

// ❌ SALAH — tanpa tenant isolation
async findAll() {
  return this.prisma.product.findMany(); // BAHAYA: bisa lihat data tenant lain!
}
```

### 4.5 Offline-First Pattern

```
Online  → API call → TanStack Query cache → UI
Offline → Dexie (IndexedDB) → UI
Sync    → Background Sync → batch POST /transactions/sync
```

**Aturan:**

- Data yang harus tersedia offline: products, categories, settings, pending transactions
- Saat offline, simpan transaksi ke IndexedDB (`pending_sync` table)
- Saat online kembali, sync otomatis via Background Sync API
- Conflict resolution: **Last-Write-Wins** + flag untuk manual resolution

---

## 5. Database Rules

### 5.1 Schema Convention

| Aturan      | Contoh                                                      |
| ----------- | ----------------------------------------------------------- |
| Nama tabel  | `snake_case` plural (`products`, `transactions`)            |
| Nama kolom  | `snake_case` (`tenant_id`, `harga_jual`, `created_at`)      |
| Primary Key | `id UUID` (default `gen_random_uuid()`)                     |
| Foreign Key | `{tabel_singular}_id` (`product_id`, `user_id`)             |
| Timestamp   | `created_at`, `updated_at` (auto-managed)                   |
| Soft delete | `deleted_at TIMESTAMP NULL` (jika diperlukan)               |
| Boolean     | Prefix `is_` (`is_active`, `is_verified`)                   |
| Enum        | PascalCase di Prisma (`UserRole`, `PaymentMethod`)          |
| JSONB       | Untuk data semi-structured (`settings`, `gateway_response`) |

### 5.2 Tabel yang Sudah Didefinisikan

> **JANGAN** buat tabel baru tanpa approval. Tabel yang ada:

| Tabel               | Deskripsi                               |
| ------------------- | --------------------------------------- |
| `tenants`           | Bisnis/organisasi                       |
| `outlets`           | Cabang/toko                             |
| `users`             | Pengguna (owner, manager, kasir, staff) |
| `categories`        | Kategori produk (hierarki)              |
| `products`          | Produk                                  |
| `product_variants`  | Varian produk (size, topping, dll)      |
| `transactions`      | Transaksi penjualan                     |
| `transaction_items` | Item dalam transaksi                    |
| `payments`          | Pembayaran (bisa multi-tender)          |
| `customers`         | Database pelanggan                      |
| `customer_credits`  | Kasbon/piutang pelanggan                |
| `shifts`            | Shift kasir (buka/tutup)                |
| `stock_history`     | Riwayat mutasi stok                     |
| `suppliers`         | Supplier/pemasok                        |
| `purchase_orders`   | PO ke supplier                          |
| `approval_logs`     | Log approval (refund, void, dll)        |
| `audit_logs`        | Audit trail semua aksi sensitif         |
| `otp_codes`         | Kode OTP (hashed)                       |
| `refresh_tokens`    | Refresh token (hashed)                  |

### 5.3 Query Rules

```typescript
// ✅ SELALU gunakan Prisma ORM
const products = await this.prisma.product.findMany({
  where: { tenant_id: tenantId, is_active: true },
  orderBy: { created_at: 'desc' },
  take: 20,
  skip: 0,
});

// ❌ JANGAN raw SQL (kecuali di migration)
const products = await this.prisma.$queryRaw`SELECT * FROM products WHERE tenant_id = ${tenantId}`;

// ❌ JANGAN string concatenation
const products = await this.prisma.$queryRawUnsafe(
  `SELECT * FROM products WHERE tenant_id = '${tenantId}'`,
);
```

---

## 6. API Convention

### 6.1 Base URL & Versioning

```
Base URL: /v1
Auth Header: Bearer <access_token>
Tenant Header: X-Tenant-ID (optional, biasanya dari JWT)
Content-Type: application/json
```

### 6.2 Response Format (WAJIB)

Semua response API HARUS mengikuti format ini:

```typescript
// Success response
{
  "success": true,
  "data": { ... },                    // object atau array
  "meta": {                           // hanya untuk list/paginated
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "timestamp": "2026-07-21T10:00:00Z"
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",       // error code (machine-readable)
    "message": "Nomor HP tidak valid" // pesan user-friendly (Bahasa Indonesia)
  },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

### 6.3 Error Codes

| Code               | HTTP Status | Deskripsi                                     |
| ------------------ | ----------- | --------------------------------------------- |
| `VALIDATION_ERROR` | 400         | Input tidak valid                             |
| `UNAUTHORIZED`     | 401         | Token tidak ada/invalid/expired               |
| `FORBIDDEN`        | 403         | Tidak punya hak akses                         |
| `NOT_FOUND`        | 404         | Resource tidak ditemukan                      |
| `CONFLICT`         | 409         | Duplikasi data (phone, SKU, barcode)          |
| `RATE_LIMITED`     | 429         | Terlalu banyak request                        |
| `INTERNAL_ERROR`   | 500         | Error server (JANGAN expose detail ke client) |

### 6.4 Naming Convention Endpoint

```
GET    /v1/{resource}          → List (paginated)
POST   /v1/{resource}          → Create
GET    /v1/{resource}/:id      → Get by ID
PUT    /v1/{resource}/:id      → Update
DELETE /v1/{resource}/:id      → Soft delete
POST   /v1/{resource}/:id/{action} → Custom action (void, refund, dll)
```

### 6.5 Pagination

```
Query params: ?page=1&limit=20&sort=created_at&order=desc
Default: page=1, limit=20
Max limit: 100
```

---

## 7. Folder Structure Detail

### 7.1 Backend (`apps/api/src/`)

```
src/
├── main.ts                        ← Bootstrap NestJS, security headers, CORS
├── app.module.ts                  ← Root module, import semua module
│
├── config/
│   └── configuration.ts           ← Typed config dari env vars
│
├── database/
│   ├── prisma/
│   │   └── schema.prisma          ← Database schema (SATU FILE, jangan split)
│   ├── prisma.module.ts           ← Global Prisma module
│   ├── prisma.service.ts          ← Prisma client wrapper
│   ├── redis.module.ts            ← Global Redis module
│   └── redis.service.ts           ← Redis client wrapper
│
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts      ← JWT authentication guard
│   │   └── roles.guard.ts         ← RBAC authorization guard
│   ├── decorators/
│   │   ├── roles.decorator.ts     ← @Roles() decorator
│   │   ├── current-user.decorator.ts ← @CurrentUser() decorator
│   │   ├── tenant.decorator.ts    ← @TenantId() decorator
│   │   └── public.decorator.ts    ← @Public() decorator (skip auth)
│   ├── filters/
│   │   └── http-exception.filter.ts ← Global error handler
│   ├── pipes/
│   │   └── validation.pipe.ts     ← Global validation pipe
│   ├── middleware/
│   │   └── tenant.middleware.ts   ← Extract tenant_id
│   ├── interceptors/
│   │   ├── response.interceptor.ts ← Wrap response format standar
│   │   └── audit-log.interceptor.ts← Log aksi sensitif
│   └── dto/
│       └── pagination.dto.ts      ← Shared pagination DTO
│
├── modules/
│   ├── auth/                      ← Sprint 0
│   ├── tenant/                    ← Sprint 0
│   ├── health/                    ← Sprint 0
│   ├── product/                   ← Sprint 2
│   ├── category/                  ← Sprint 2
│   ├── transaction/               ← Sprint 1
│   ├── payment/                   ← Sprint 4
│   ├── customer/                  ← Sprint 6
│   ├── credit/                    ← Sprint 6
│   ├── shift/                     ← Sprint 6
│   ├── report/                    ← Sprint 5
│   ├── inventory/                 ← Sprint 2
│   ├── notification/              ← Sprint 4
│   ├── upload/                    ← Sprint 2
│   ├── approval/                  ← Sprint 7
│   ├── user/                      ← Sprint 7
│   └── outlet/                    ← Sprint 0
│
└── integrations/
    ├── whatsapp/
    │   ├── whatsapp.module.ts
    │   └── whatsapp.service.ts
    ├── midtrans/                  ← Sprint 4
    │   ├── midtrans.module.ts
    │   └── midtrans.service.ts
    └── storage/                   ← Sprint 2
        ├── storage.module.ts
        └── storage.service.ts
```

### 7.2 Frontend (`apps/web/src/`)

```
src/
├── app/
│   ├── globals.css                ← TailwindCSS v4 + design tokens
│   ├── layout.tsx                 ← Root layout (metadata, fonts, providers)
│   ├── page.tsx                   ← Landing → redirect ke /login atau /dashboard
│   │
│   ├── (auth)/                    ← Route group: tanpa sidebar
│   │   ├── layout.tsx             ← Auth layout (centered, branding)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── otp/page.tsx
│   │
│   └── (dashboard)/               ← Route group: dengan sidebar
│       ├── layout.tsx             ← Dashboard layout (sidebar + topbar)
│       ├── page.tsx               ← Dashboard home
│       ├── pos/page.tsx           ← Sprint 1
│       ├── products/
│       │   ├── page.tsx           ← Sprint 2
│       │   └── [id]/page.tsx      ← Sprint 2
│       ├── inventory/page.tsx     ← Sprint 2
│       ├── transactions/
│       │   ├── page.tsx           ← Sprint 1
│       │   └── [id]/page.tsx      ← Sprint 1
│       ├── customers/page.tsx     ← Sprint 6
│       ├── reports/page.tsx       ← Sprint 5
│       ├── settings/page.tsx      ← Sprint 7
│       └── users/page.tsx         ← Sprint 7
│
├── components/
│   ├── ui/                        ← shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── toast.tsx
│   │   └── ... (tambah sesuai kebutuhan)
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   ├── mobile-nav.tsx
│   │   └── breadcrumb.tsx
│   ├── pos/                       ← Sprint 1
│   │   ├── cart.tsx
│   │   ├── product-grid.tsx
│   │   ├── payment-dialog.tsx
│   │   └── receipt.tsx
│   └── charts/                    ← Sprint 5
│       ├── sales-chart.tsx
│       └── product-chart.tsx
│
├── lib/
│   ├── api/
│   │   ├── client.ts              ← Fetch wrapper + auth interceptor
│   │   ├── auth.ts                ← Auth API functions
│   │   ├── products.ts            ← Product API functions
│   │   ├── transactions.ts        ← Transaction API functions
│   │   └── ... (per module)
│   ├── db/
│   │   ├── dexie.ts               ← Dexie instance + schema (Sprint 3)
│   │   └── sync.ts                ← Sync engine (Sprint 3)
│   ├── socket/
│   │   └── client.ts              ← Socket.io client (Sprint 1)
│   ├── utils/
│   │   ├── cn.ts                  ← className merger (clsx + twMerge)
│   │   └── format.ts              ← Re-export dari shared-utils
│   └── providers/
│       ├── query-provider.tsx     ← TanStack Query provider
│       └── theme-provider.tsx     ← Dark/light mode provider
│
├── stores/
│   ├── auth.store.ts              ← User & auth state
│   ├── cart.store.ts              ← POS cart state (Sprint 1)
│   ├── ui.store.ts                ← UI state (sidebar, theme)
│   └── sync.store.ts              ← Offline sync state (Sprint 3)
│
├── hooks/
│   ├── use-auth.ts                ← Auth hooks
│   ├── use-products.ts            ← Product query hooks (Sprint 2)
│   ├── use-transactions.ts        ← Transaction query hooks (Sprint 1)
│   └── use-media-query.ts         ← Responsive hooks
│
└── types/
    └── index.ts                   ← Re-export dari shared-types
```

---

## 8. Security Rules (WAJIB DIPATUHI)

### 8.1 Authentication

```typescript
// JWT Token Configuration
{
  algorithm: 'HS256',        // WAJIB hardcode, JANGAN derive dari token
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  // WAJIB reject algorithm 'none'
  // WAJIB validate 'exp' claim
}

// PIN Hashing
const BCRYPT_COST_FACTOR = 12; // JANGAN kurangi

// OTP
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;
const OTP_RATE_LIMIT = '3/minute'; // per phone number
```

### 8.2 Secrets Management

```typescript
// ✅ BENAR — dari environment, error jika tidak ada di production
function getJwtSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_ACCESS_SECRET is required in production');
  }

  // Dev only: generate ephemeral + warning
  const ephemeral = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️ Using ephemeral JWT secret. NOT suitable for production!');
  return ephemeral;
}

// ❌ SALAH — hardcoded fallback
const secret = process.env.JWT_SECRET || 'my-secret-key'; // BAHAYA!

// ❌ SALAH — hardcoded
const secret = 'super-secret-jwt-key'; // BAHAYA!
```

### 8.3 Token Storage

```typescript
// ✅ BENAR — httpOnly cookie (set oleh backend)
res.cookie('__Host-access_token', accessToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/',
});

// ❌ SALAH — localStorage (rentan XSS)
localStorage.setItem('token', accessToken);

// ❌ SALAH — sessionStorage
sessionStorage.setItem('token', accessToken);
```

### 8.4 RBAC (Role-Based Access Control)

```
Hierarki: OWNER > MANAGER > KASIR > STAFF

Hak akses per fitur:
┌─────────────────────┬───────┬─────────┬───────┬──────────────┐
│ Fitur               │ Owner │ Manager │ Kasir │ Staff Gudang │
├─────────────────────┼───────┼─────────┼───────┼──────────────┤
│ POS / Transaksi     │  ✅   │   ✅    │  ✅   │      ❌      │
│ Void / Refund       │  ✅   │ ✅(PIN) │  ❌   │      ❌      │
│ Lihat Laporan       │  ✅   │   ✅    │  ❌   │      ❌      │
│ Kelola Produk       │  ✅   │   ✅    │  ❌   │  ✅(stok)    │
│ Kelola Stok         │  ✅   │   ✅    │  ❌   │      ✅      │
│ Kelola User         │  ✅   │   ❌    │  ❌   │      ❌      │
│ Pengaturan Tenant   │  ✅   │   ❌    │  ❌   │      ❌      │
│ Approval            │  ✅   │   ✅    │  ❌   │      ❌      │
│ Export Data         │  ✅   │   ✅    │  ❌   │      ❌      │
└─────────────────────┴───────┴─────────┴───────┴──────────────┘
```

### 8.5 Input Validation

```typescript
// Backend DTO (class-validator)
export class CreateProductDto {
  @IsString()
  @Length(1, 100)
  nama: string;

  @IsNumber()
  @Min(0)
  harga_jual: number;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{8,13}$/, { message: 'Barcode harus 8-13 digit angka' })
  barcode?: string;
}

// Frontend (Zod)
const createProductSchema = z.object({
  nama: z.string().min(1).max(100),
  harga_jual: z.number().min(0),
  barcode: z
    .string()
    .regex(/^[0-9]{8,13}$/)
    .optional(),
});
```

### 8.6 Error Handling

```typescript
// ✅ BENAR — generic message ke client, detail ke log
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Log detail ke server (JANGAN kirim ke client)
    this.logger.error('Unhandled exception', {
      message: exception instanceof Error ? exception.message : 'Unknown',
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // Generic response ke client
    response.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada server',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

// ❌ SALAH — expose error detail
response.status(500).json({
  error: exception.message, // Bisa leak SQL error, path, dll
  stack: exception.stack, // BAHAYA!
});
```

---

## 9. Coding Style & Convention

### 9.1 Naming Convention

| Entitas               | Convention          | Contoh                                  |
| --------------------- | ------------------- | --------------------------------------- |
| File (component)      | `kebab-case.tsx`    | `product-grid.tsx`                      |
| File (module/service) | `kebab-case.ts`     | `product.service.ts`                    |
| Class                 | `PascalCase`        | `ProductService`, `CreateProductDto`    |
| Interface/Type        | `PascalCase`        | `Product`, `ApiResponse<T>`             |
| Enum                  | `PascalCase`        | `UserRole`, `PaymentMethod`             |
| Enum Value            | `UPPER_SNAKE`       | `UserRole.OWNER`, `PaymentMethod.CASH`  |
| Function              | `camelCase`         | `findAllProducts()`, `calculateTotal()` |
| Variable              | `camelCase`         | `totalAmount`, `isActive`               |
| Constant              | `UPPER_SNAKE`       | `MAX_OTP_ATTEMPTS`, `BCRYPT_COST`       |
| DB Column             | `snake_case`        | `tenant_id`, `harga_jual`               |
| DB Table              | `snake_case` plural | `products`, `audit_logs`                |
| API Route             | `kebab-case`        | `/products`, `/stock/history`           |
| CSS Class             | TailwindCSS utility | `text-sm font-medium`                   |
| Env Variable          | `UPPER_SNAKE`       | `DATABASE_URL`, `JWT_ACCESS_SECRET`     |

### 9.2 Import Order

```typescript
// 1. Node.js built-in
import { randomBytes } from 'crypto';

// 2. External packages
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// 3. Internal packages (monorepo)
import { ApiResponse } from '@mrikipos/shared-types';
import { formatRupiah } from '@mrikipos/shared-utils';

// 4. Local imports (relative)
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './product.dto';
```

### 9.3 Component Pattern (Frontend)

```tsx
// ✅ BENAR — Props type, destructuring, JSDoc
interface ProductCardProps {
  product: Product;
  onSelect: (id: string) => void;
}

/** Menampilkan card produk di halaman POS */
export function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <div
      className="rounded-lg border p-4 cursor-pointer hover:border-primary transition-colors"
      onClick={() => onSelect(product.id)}
    >
      <h3 className="font-medium">{product.nama}</h3>
      <p className="text-sm text-muted-foreground">{formatRupiah(product.harga_jual)}</p>
    </div>
  );
}

// ❌ SALAH — default export, no types, inline styles
export default function (props) {
  return <div style={{ padding: '16px' }}>{props.product.nama}</div>;
}
```

### 9.4 Service Pattern (Backend)

```typescript
// ✅ BENAR — Injectable, typed params, tenant isolation, proper error handling
@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ambil semua produk aktif untuk tenant */
  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResponse<Product>> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenant_id: tenantId, is_active: true },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.product.count({
        where: { tenant_id: tenantId, is_active: true },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
```

---

## 10. UI/UX Rules

### 10.1 Design System

- **Font**: Inter (Google Fonts)
- **Color Mode**: Dark mode default, toggle ke light mode
- **Border Radius**: `0.5rem` (rounded-lg) default
- **Spacing**: TailwindCSS spacing scale (4, 8, 12, 16, 24, 32, 48)
- **Animation**: Subtle transitions (150-300ms), `ease-in-out`

### 10.2 Responsive Breakpoints

```
Mobile:  < 640px  (sm)  ← PRIMARY target
Tablet:  640-1024px (md/lg)
Desktop: > 1024px (xl)
```

- **Mobile-first**: desain untuk mobile dulu, baru scale up
- POS page: harus nyaman dipakai di tablet 10"
- Semua halaman harus usable di HP 5" (360px width)

### 10.3 Bahasa UI

- Semua teks user-facing dalam **Bahasa Indonesia**
- Gunakan bahasa yang **sederhana dan familiar** (target user: UMKM)
- Contoh:
  - "Tambah Produk" bukan "Create Product"
  - "Rp 25.000" bukan "IDR 25,000" atau "$25"
  - "Stok Menipis" bukan "Low Stock Alert"
  - "Kasbon" bukan "Customer Credit" atau "Receivable"
  - "Bayar" bukan "Checkout" atau "Process Payment"

### 10.4 Number Formatting

```typescript
// Mata uang: Rp XX.XXX (titik sebagai pemisah ribuan)
formatRupiah(25000)    → "Rp 25.000"
formatRupiah(1500000)  → "Rp 1.500.000"

// Tanggal: DD/MM/YYYY HH:mm (format Indonesia)
formatDate(date)       → "21/07/2026 10:30"

// Nomor HP: 08XX-XXXX-XXXX
formatPhone(phone)     → "0812-3456-7890"
```

---

## 11. Git Convention

### 11.1 Branch Naming

```
main              ← Production
staging           ← Staging / UAT
develop           ← Development integration

Feature:   feat/pos-cart
Bugfix:    fix/offline-sync-conflict
Hotfix:    hotfix/payment-webhook
Refactor:  refactor/auth-module
Docs:      docs/api-documentation
```

### 11.2 Commit Message (Conventional Commits)

```
<type>(<scope>): <description>

Type:
  feat     → Fitur baru
  fix      → Bug fix
  refactor → Refactoring tanpa ubah behavior
  docs     → Dokumentasi
  style    → Formatting, semicolons, dll
  test     → Tambah/ubah test
  chore    → Build, CI, deps, dll
  perf     → Performance improvement

Scope:
  api, web, shared, infra, ci

Contoh:
  feat(api): add product CRUD endpoints
  fix(web): fix offline sync duplicate transactions
  refactor(api): extract tenant middleware to shared module
  docs(api): add swagger documentation for auth endpoints
  chore(infra): update docker-compose postgres to v16.4
```

---

## 12. Sprint Roadmap (Referensi)

> Jangan kerjakan Sprint N+1 sebelum Sprint N selesai dan di-review.

| Sprint | Durasi | Fokus                                           | Status         |
| ------ | ------ | ----------------------------------------------- | -------------- |
| **0**  | 1 mgg  | Monorepo, Docker, DB Schema, Auth               | 🔵 In Progress |
| **1**  | 2 mgg  | POS Core: cart, transaksi, bayar tunai, struk   | ⬜ Planned     |
| **2**  | 2 mgg  | Product & Inventory CRUD, barcode, import Excel | ⬜ Planned     |
| **3**  | 2 mgg  | PWA Offline Mode, IndexedDB, Sync Engine        | ⬜ Planned     |
| **4**  | 2 mgg  | QRIS Payment (Midtrans), WhatsApp OTP & Notif   | ⬜ Planned     |
| **5**  | 2 mgg  | Dashboard, Reports, Export PDF/Excel            | ⬜ Planned     |
| **6**  | 2 mgg  | Shift Management, Kasbon, Customer DB           | ⬜ Planned     |
| **7**  | 2 mgg  | RBAC, Multi-User, Approval Workflow             | ⬜ Planned     |
| **8**  | 2 mgg  | Testing, Performance, Security Audit            | ⬜ Planned     |
| **9**  | 1 mgg  | Staging Deploy, UAT, Bug Fix                    | ⬜ Planned     |
| **10** | 1 mgg  | Production Launch 🚀                            | ⬜ Planned     |

---

## 13. Checklist Sebelum Submit Kode

Sebelum submit PR atau menyelesaikan task, pastikan:

- [ ] **TypeScript** — Tidak ada `any`, semua type terdefinisi
- [ ] **Tenant Isolation** — Semua query filter `tenant_id`
- [ ] **Auth Guard** — Endpoint baru punya `@UseGuards(JwtAuthGuard)`
- [ ] **RBAC** — Endpoint punya `@Roles()` decorator yang sesuai
- [ ] **Validation** — DTO dengan `class-validator` (BE) atau Zod schema (FE)
- [ ] **Error Handling** — Service method punya try-catch, error tidak leak ke client
- [ ] **Response Format** — Sesuai format standar (Section 6.2)
- [ ] **No Hardcoded Secrets** — Semua credential dari env vars
- [ ] **No Console.log** — Gunakan NestJS Logger
- [ ] **JSDoc** — Semua fungsi publik ada JSDoc
- [ ] **Mobile Responsive** — Tampilan OK di 360px width
- [ ] **Bahasa Indonesia** — Teks UI dalam Bahasa Indonesia
- [ ] **Import Order** — Sesuai convention (Section 9.2)
- [ ] **Naming Convention** — Sesuai convention (Section 9.1)
- [ ] **No Unused Code** — Hapus dead code, unused imports
- [ ] **Lint Pass** — `pnpm lint` tidak ada error
- [ ] **Build Pass** — `pnpm build` sukses

---

## 14. Troubleshooting FAQ

### Q: Saya perlu buat tabel database baru

**A:** JANGAN langsung buat. Diskusikan dulu requirement-nya, baru update `schema.prisma` dan buat migration.

### Q: Saya perlu install package baru

**A:** JANGAN langsung install. Sebutkan package name + alasan + alternatif yang sudah tersedia. Tunggu approval.

### Q: Bagaimana handle offline mode?

**A:** Ikuti pattern di Section 4.5. Simpan ke Dexie (IndexedDB), sync saat online. Detail implementasi di Sprint 3.

### Q: Bagaimana buat WebSocket event baru?

**A:** Definisikan event di `packages/shared-types`, implement handler di backend module, listen di frontend via Socket.io client.

### Q: Saya perlu ubah response format API

**A:** JANGAN. Format sudah standar (Section 6.2). Jika ada case khusus, diskusikan dulu.

### Q: Bagaimana deploy ke production?

**A:** Merge ke `main` branch → GitHub Actions → Docker build → deploy ke VPS. Detail di Sprint 9.

### Q: Error "tenant_id is required"

**A:** Pastikan request menyertakan JWT token yang valid. Tenant ID di-extract dari JWT payload oleh middleware.

### Q: Bagaimana test secara lokal?

**A:**

```bash
# Start infra
docker compose -f infra/docker/docker-compose.yml up -d postgres redis

# Start backend
pnpm --filter api dev

# Start frontend
pnpm --filter web dev
```

---

_Dokumen ini wajib dibaca oleh setiap agent/developer sebelum menulis kode. Jika ada pertanyaan atau kebingungan, TANYAKAN dulu sebelum implementasi. Jangan berasumsi._
