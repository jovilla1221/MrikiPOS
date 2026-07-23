# MrikiPOS — Architecture Decision Records (ADR)

> Kumpulan keputusan arsitektur yang sudah diambil beserta alasan di baliknya.
> Setiap keputusan bersifat **final** kecuali ada ADR baru yang menggantikan.

---

## ADR-001: Monorepo dengan Turborepo + pnpm

**Status:** ✅ Accepted  
**Tanggal:** 21 Juli 2026

### Konteks

MrikiPOS terdiri dari 2 aplikasi (frontend + backend) yang berbagi types dan utilities. Perlu strategi untuk mengelola kode bersama.

### Opsi yang Dipertimbangkan

| Opsi                 | Pro                                                  | Kontra                                            |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------- |
| **Turborepo + pnpm** | Fast, smart caching, parallel tasks, pnpm hemat disk | Learning curve, monorepo complexity               |
| Nx                   | Fitur lengkap, plugin ecosystem                      | Overkill untuk 2 apps, config lebih kompleks      |
| Lerna                | Mature, banyak tutorial                              | Deprecated lalu di-acquire Nx, lambat             |
| Separate repos       | Simple, independen                                   | Shared code sulit, versioning manual, CI terpisah |

### Keputusan

Gunakan **Turborepo + pnpm** karena:

1. **pnpm** hemat disk via symlink (penting untuk CI/CD speed)
2. **Turborepo** smart caching — hanya rebuild yang berubah
3. Cukup simple untuk 2 apps + 4 packages
4. Native support di Vercel ecosystem (Next.js)

### Konsekuensi

- Semua developer harus install pnpm (`npm install -g pnpm`)
- Shared packages harus di-build sebelum apps yang depend padanya
- CI/CD pipeline harus aware turbo cache

---

## ADR-002: Next.js 15 App Router (bukan Pages Router)

**Status:** ✅ Accepted  
**Tanggal:** 21 Juli 2026

### Konteks

Next.js memiliki 2 routing system: Pages Router (legacy) dan App Router (modern). Perlu memilih satu.

### Keputusan

Gunakan **App Router** karena:

1. **Server Components by default** — reduce JS bundle, kirim lebih sedikit JS ke client (penting untuk HP low-end UMKM)
2. **Nested Layouts** — dashboard layout + auth layout terpisah tanpa duplikasi
3. **Route Groups** — `(auth)`, `(dashboard)` untuk organisasi yang bersih
4. **Streaming & Suspense** — loading states yang lebih baik
5. **Future-proof** — Pages Router akan deprecated di Next.js versi mendatang

### Konsekuensi

- Beberapa library belum fully compatible dengan Server Components
- Perlu hati-hati membedakan Server vs Client Component (`'use client'`)
- Data fetching pattern berbeda dari Pages Router (tidak ada `getServerSideProps`)

---

## ADR-003: TailwindCSS v4 + shadcn/ui (bukan UI library lain)

**Status:** ✅ Accepted  
**Tanggal:** 21 Juli 2026

### Konteks

Perlu design system yang cepat develop, ringan, dan customizable untuk target user UMKM.

### Opsi yang Dipertimbangkan

| Opsi                           | Pro                                                                    | Kontra                                              |
| ------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------- |
| **TailwindCSS v4 + shadcn/ui** | Fully customizable, copy-paste (no dependency), tree-shakeable, ringan | Perlu setup design tokens manual                    |
| Ant Design                     | Komponen lengkap, admin-ready                                          | Bundle besar (~1MB), sulit custom, Mandarin-centric |
| Material UI                    | Google design, mature                                                  | Bundle besar, opinionated, heavy runtime            |
| Chakra UI                      | DX bagus, accessible                                                   | Bundle medium, abstraksi berlapis                   |
| Mantine                        | Modern, hooks-first                                                    | Kurang populer, community kecil                     |

### Keputusan

Gunakan **TailwindCSS v4 + shadcn/ui** karena:

1. **Bundle size minimal** — target < 200KB gzip, penting untuk HP low-end
2. **Full customization** — bisa sesuaikan warna, bahasa, spacing untuk pasar Indonesia
3. **No runtime dependency** — shadcn/ui di-copy ke project, bukan install package
4. **TailwindCSS v4** — CSS-first config, lebih cepat, native cascade layers

### Konsekuensi

- Perlu definisikan design tokens (warna, typography) sendiri
- Komponen harus di-generate via `npx shadcn@latest add` atau copy manual
- Harus konsisten maintain komponen yang sudah di-copy

---

## ADR-004: NestJS 11 (bukan Express/Fastify murni)

**Status:** ✅ Accepted  
**Tanggal:** 21 Juli 2026

### Konteks

Backend perlu framework yang mendukung modular architecture, dependency injection, dan scalable untuk multi-tenant SaaS.

### Keputusan

Gunakan **NestJS 11** karena:

1. **Modular architecture** — setiap fitur (auth, product, transaction) adalah module terpisah
2. **Dependency Injection** — testable, loose coupling
3. **Built-in support** — Guards, Interceptors, Pipes, Middleware, Exception Filters
4. **TypeScript native** — strict typing out of the box
5. **Decorator-based** — `@Controller`, `@Injectable`, `@UseGuards` — clean dan readable
6. **Ecosystem** — `@nestjs/jwt`, `@nestjs/throttler`, `@nestjs/websockets` — semua official

### Konsekuensi

- Learning curve untuk developer yang terbiasa Express
- Boilerplate lebih banyak dibanding Express murni
- Harus follow NestJS pattern (Module/Controller/Service)

---

## ADR-005: Prisma 6 (bukan TypeORM / Drizzle / raw SQL)

**Status:** ✅ Accepted  
**Tanggal:** 21 Juli 2026

### Konteks

Perlu ORM yang aman (anti SQL injection), typed, dan mudah dipakai dengan PostgreSQL.

### Opsi yang Dipertimbangkan

| Opsi         | Pro                                                               | Kontra                                                       |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| **Prisma 6** | Schema-first, auto-generated types, migration tool, visual studio | Performa sedikit di bawah raw SQL, schema.prisma satu file   |
| TypeORM      | Decorator-based, familiar untuk NestJS                            | Type safety kurang, migration sering bug, maintenance lambat |
| Drizzle      | SQL-like syntax, lightweight, fast                                | Lebih baru, migration tooling kurang mature                  |
| Knex + raw   | Full control                                                      | Manual type, rentan SQL injection jika tidak hati-hati       |

### Keputusan

Gunakan **Prisma 6** karena:

1. **Schema-first** — schema.prisma jadi single source of truth
2. **Auto-generated TypeScript types** — `PrismaClient` typed sesuai schema
3. **Parameterized queries by default** — anti SQL injection
4. **Migration system** — `prisma migrate dev/deploy`
5. **Prisma Studio** — GUI untuk inspect database

### Konsekuensi

- Schema harus dalam 1 file (`schema.prisma`)
- Perlu `prisma generate` setiap kali schema berubah
- Beberapa query kompleks mungkin perlu `$queryRaw` (harus parameterized)
- Connection pooling perlu PgBouncer di production (Phase 2)

---

## ADR-006: Shared Database, Shared Schema Multi-Tenancy

**Status:** ✅ Accepted  
**Tanggal:** 21 Juli 2026

### Konteks

MrikiPOS adalah SaaS multi-tenant. Perlu strategi isolasi data antar tenant.

### Opsi yang Dipertimbangkan

| Opsi                          | Pro                                           | Kontra                                                                |
| ----------------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| Database per tenant           | Isolasi kuat, mudah backup/restore per tenant | Mahal (1 DB per tenant), koneksi pool terbatas, migration ke semua DB |
| Schema per tenant             | Isolasi baik, 1 database                      | Migration ke semua schema, batas schema PostgreSQL                    |
| **Shared schema + tenant_id** | Biaya rendah, 1 schema, 1 migration           | Wajib filter tenant_id di setiap query, risiko data leak              |

### Keputusan

Gunakan **Shared Database, Shared Schema** dengan kolom `tenant_id` karena:

1. **Biaya rendah** — Phase 1 cuma 1 VPS, 1 database
2. **Migration simple** — 1 schema, 1 migration
3. **Scale horizontal** — bisa partition by tenant_id nanti
4. **Safety net** — PostgreSQL Row-Level Security (RLS) sebagai lapisan tambahan

### Konsekuensi

- **SETIAP** query di service HARUS include `WHERE tenant_id = ?`
- Middleware HARUS extract tenant_id dari JWT dan inject ke request
- RLS policy di PostgreSQL sebagai backup (jangan rely 100% pada application-level)
- Performance: index komposit pada `(tenant_id, ...)` di setiap tabel

---

## ADR-007: JWT (Access + Refresh) dengan OTP WhatsApp

**Status:** ✅ Accepted  
**Tanggal:** 21 Juli 2026

### Konteks

Target user UMKM Blitar lebih familiar dengan WhatsApp daripada email. Perlu auth flow yang simple dan tidak perlu ingat password kompleks.

### Keputusan

**Auth Flow:**

```
Register: Nama + Phone + PIN (6 digit) + Nama Usaha
    → Send OTP via WhatsApp
    → Verify OTP
    → Create tenant + user
    → Issue JWT tokens

Login: Phone + PIN
    → Verify PIN (bcrypt)
    → Issue JWT tokens (Access 15m + Refresh 7d)

Token Refresh:
    → Kirim refresh token
    → Validate + rotate (old token revoked)
    → Issue new pair
```

**Alasan:**

1. **PIN 6 digit** — lebih mudah diingat UMKM daripada password kompleks
2. **OTP WhatsApp** — hampir semua UMKM punya WA, lebih accessible daripada email
3. **JWT stateless** — scale horizontal tanpa shared session store
4. **Short-lived access token** (15m) — minimize impact jika token leaked
5. **Refresh token rotation** — setiap refresh invalidate token lama

### Konsekuensi

- Perlu integrasi WhatsApp API (Fonnte) untuk kirim OTP
- PIN 6 digit kurang aman dari password — mitigasi dengan rate limiting + account lockout
- Refresh token di Redis untuk support revocation
- TODO(security): Pertimbangkan upgrade ke password + OTP di Phase 2

---

## ADR-008: Offline-First dengan Dexie.js + Background Sync

**Status:** ✅ Accepted  
**Tanggal:** 21 Juli 2026

### Konteks

Banyak UMKM Blitar yang lokasi-nya di blank spot internet. POS harus tetap bisa dipakai tanpa koneksi.

### Keputusan

**Strategi:**

```
Online:
  → API call langsung via TanStack Query
  → Cache response di IndexedDB (Dexie)

Offline:
  → Baca data dari IndexedDB (products, categories)
  → Simpan transaksi baru ke IndexedDB (pending_sync table)
  → UI tetap responsif

Kembali Online:
  → Background Sync API trigger
  → Batch POST /transactions/sync
  → Server validasi & proses
  → Broadcast update via WebSocket
  → Clear pending_sync

Conflict:
  → Last-Write-Wins (timestamp-based)
  → Flag conflict untuk manual resolution oleh owner
```

**Alasan:**

1. **Dexie.js** — wrapper IndexedDB paling mature dan ergonomic
2. **Background Sync API** — browser handle retry otomatis
3. **Last-Write-Wins** — simple, predictable, cocok untuk POS (jarang edit data yang sama)

### Konsekuensi

- Data yang di-cache offline: products, categories, customers, settings
- Transaksi offline punya `synced_at = null` sampai berhasil sync
- Stok bisa inconsistent saat offline — perlu reconciliation saat sync
- PWA harus proper (manifest.json, service worker, HTTPS)

---

## ADR-009: Socket.io untuk Real-Time (bukan native WebSocket / SSE)

**Status:** ✅ Accepted  
**Tanggal:** 21 Juli 2026

### Konteks

POS perlu real-time update: stok berubah, transaksi baru, payment confirmed — agar semua kasir dan owner sinkron.

### Keputusan

Gunakan **Socket.io 4** karena:

1. **Auto-reconnect** — penting untuk koneksi tidak stabil
2. **Fallback transport** — WebSocket → long polling jika WS blocked
3. **Room & Namespace** — isolasi event per outlet/role
4. **NestJS integration** — `@nestjs/websockets` + `@nestjs/platform-socket.io`
5. **Binary support** — kirim receipt PDF via socket jika perlu

**Namespace & Room Design:**

```
Namespace: /pos, /inventory, /dashboard, /notify

Rooms:
  outlet:{outletId}:kasir    → semua kasir di outlet
  outlet:{outletId}:owner    → owner + manager
  outlet:{outletId}:all      → semua user di outlet

Events:
  transaction:completed → notify kasir + update dashboard
  stock:updated        → notify inventory + kasir
  stock:low_alert      → notify owner
  payment:confirmed    → notify kasir yang buat transaksi
  sync:required        → trigger sync ke offline devices
```

### Konsekuensi

- Bundle size bertambah (~40KB gzip)
- Perlu Redis adapter untuk horizontal scaling (Phase 2)
- WebSocket connections perlu monitoring (concurrent connection limit)

---

## ADR-010: Redis 7 untuk Cache, Session, dan Queue

**Status:** ✅ Accepted  
**Tanggal:** 21 Juli 2026

### Konteks

Perlu in-memory store untuk: JWT refresh token revocation, OTP temporary storage, API response caching, dan background job queue.

### Keputusan

Gunakan **Redis 7** untuk multiple concerns:

| Concern                 | Redis Feature       | TTL     |
| ----------------------- | ------------------- | ------- |
| Refresh token blacklist | SET                 | 7 hari  |
| OTP codes (backup)      | SET                 | 5 menit |
| Rate limiting counter   | INCR + EXPIRE       | 1 menit |
| Product list cache      | SET (JSON)          | 5 menit |
| Dashboard stats cache   | SET (JSON)          | 1 menit |
| BullMQ job queue        | Lists + Sorted Sets | varies  |
| Socket.io adapter       | Pub/Sub             | -       |

**Alasan:**

1. **Single tool** untuk cache, session, queue — reduce infrastructure complexity
2. **BullMQ** — Redis-based queue, battle-tested, retry, delayed jobs, cron
3. **ioredis** — robust Redis client untuk Node.js

### Konsekuensi

- Redis harus persistent (RDB + AOF) agar queue jobs tidak hilang
- Memory monitoring penting — set `maxmemory` policy
- Phase 2: Redis Cluster untuk HA

---

## ADR-011: Docker Compose untuk Development, Docker untuk Production

**Status:** ✅ Accepted  
**Tanggal:** 21 Juli 2026

### Konteks

Perlu cara standar untuk setup development environment dan deploy ke production.

### Keputusan

- **Development:** Docker Compose untuk spin up PostgreSQL + Redis (services saja)
  - Frontend dan backend jalan native (hot reload lebih cepat)
  - `docker-compose.yml` hanya PostgreSQL + Redis
- **Staging/Production:** Full Docker Compose (semua services containerized)
  - `docker-compose.prod.yml` untuk semua (nginx, api, web, postgres, redis)
  - Multi-stage Dockerfile (build → production)
  - Non-root user di container

### Konsekuensi

- Developer harus install Docker Desktop / Docker Engine
- PostgreSQL data di-persist via Docker volume
- Production: Dockerfile harus optimized (layer caching, minimal image)

---

## ADR-012: Fonnte sebagai WhatsApp API Provider

**Status:** ✅ Accepted  
**Tanggal:** 21 Juli 2026

### Konteks

Perlu kirim OTP dan notifikasi via WhatsApp. Ada beberapa provider API WhatsApp di Indonesia.

### Opsi yang Dipertimbangkan

| Provider                     | Harga           | Pro                                 | Kontra                                    |
| ---------------------------- | --------------- | ----------------------------------- | ----------------------------------------- |
| **Fonnte**                   | Rp 25K-100K/bln | Murah, API simple, server Indonesia | Non-official API                          |
| Wablas                       | Rp 50K-200K/bln | Stabil, support bagus               | Lebih mahal                               |
| WhatsApp Business API (Meta) | $$ per message  | Official, reliable, scalable        | Mahal, approval process lama, pricing USD |
| Twilio                       | $$ per message  | Global, reliable                    | Sangat mahal untuk UMKM                   |

### Keputusan

Gunakan **Fonnte** untuk MVP karena:

1. **Harga terjangkau** — sesuai budget UMKM
2. **API sederhana** — 1 endpoint POST untuk kirim pesan
3. **Server Indonesia** — latency rendah

**Mitigasi risiko:**

- Abstraksi via `WhatsAppService` interface — bisa swap provider tanpa ubah business logic
- Fallback queue: jika Fonnte down, retry via BullMQ
- TODO: Migrasi ke WhatsApp Business API official saat scale (Phase 3)

### Konsekuensi

- Non-official API → risiko blocked oleh WhatsApp
- Perlu monitoring uptime Fonnte
- Development mode: mock (log ke console, tidak kirim WA asli)

---

## ADR-013: Midtrans sebagai Payment Gateway (QRIS)

**Status:** ✅ Accepted  
**Tanggal:** 21 Juli 2026

### Konteks

Perlu payment gateway untuk menerima pembayaran QRIS di POS.

### Opsi yang Dipertimbangkan

| Gateway      | Fee       | Pro                                | Kontra                     |
| ------------ | --------- | ---------------------------------- | -------------------------- |
| **Midtrans** | 0.7% QRIS | Terdaftar BI, SDK lengkap, sandbox | Onboarding agak lama       |
| Tripay       | 0.7% QRIS | Aggregator, mudah daftar           | Pihak ketiga, less direct  |
| Xendit       | 0.7% QRIS | Modern API, DX bagus               | Minimum volume requirement |
| Doku         | Varies    | Pioneer Indonesia                  | UI/UX kurang modern        |

### Keputusan

Gunakan **Midtrans** sebagai primary karena:

1. **Terdaftar BI** — compliance & trust
2. **QRIS support** — standar nasional, semua bank/e-wallet bisa scan
3. **Sandbox environment** — testing tanpa uang asli
4. **Webhook** — real-time payment notification
5. **SDK** — server-side SDK untuk Node.js

**Fallback:** Tripay sebagai backup jika Midtrans down (Phase 2)

### Konsekuensi

- Fee 0.7% per transaksi QRIS (dibebankan ke merchant atau MrikiPOS margin)
- Perlu handle webhook securely (signature validation)
- Development: Midtrans sandbox mode
- Onboarding process: KTP, NPWP, rekening bank

---

## ADR-014: Bahasa Indonesia untuk UI, Bahasa Inggris untuk Kode

**Status:** ✅ Accepted  
**Tanggal:** 21 Juli 2026

### Konteks

Target user adalah UMKM Blitar (literasi digital rendah). Kode perlu maintainable oleh developer internasional.

### Keputusan

- **UI/UX (user-facing text):** Bahasa Indonesia
  - Label, button, pesan error, placeholder, notifikasi
  - Format angka: `Rp 25.000` (titik pemisah ribuan)
  - Format tanggal: `DD/MM/YYYY HH:mm`
- **Source Code:** Bahasa Inggris
  - Variable, function, class, comment, commit message
  - Exceptions: field database yang inherently Indonesian (e.g., `harga_jual`, `kasbon`)

### Konsekuensi

- Perlu i18n consideration jika expand ke luar Indonesia (Phase 4+)
- Developer harus tahu terminologi bisnis dalam Bahasa Indonesia (kasbon, struk, stok opname)
- Error messages: backend return code (English), frontend translate ke Bahasa Indonesia

---

_Setiap ADR baru harus mengikuti format di atas. Keputusan yang mengubah ADR sebelumnya harus reference ADR yang di-supersede._
