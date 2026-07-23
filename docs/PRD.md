# MrikiPOS — Product & Technical PRD

> Kasir digital berbasis web (PWA) untuk UMKM Kota Blitar.
> Offline-first, mobile-first, multi-tenant SaaS.

| Item          | Detail                                       |
| ------------- | -------------------------------------------- |
| Nama Produk   | **MrikiPOS**                                 |
| Platform      | Web-based (PWA / Offline-First)              |
| Target Pasar  | UMKM Kota Blitar (3 Kecamatan, 21 Kelurahan) |
| Model Bisnis  | Freemium SaaS + Kolaborasi Pemkot            |
| Versi Dokumen | v1.0                                         |
| Tanggal       | 21 Juli 2026                                 |

---

## 1. Latar Belakang & Konteks Pasar

Kota Blitar memiliki **12.500 pelaku usaha mikro** (makanan, minuman, kerajinan, jasa) dengan ~88.000 tenaga kerja terserap. Ekonomi tumbuh 5,31% (2025), IPM 81,88. Pemkot aktif mendorong digitalisasi UMKM melalui Dinkop UKM (pelatihan digital marketing, program Go Digital, WiFi RW, Smart City).

**Masalah utama UMKM Blitar:**

- Pencatatan transaksi masih manual (buku tulis)
- Tidak tahu produk terlaris / untung-rugi
- Stok tidak terkontrol
- Kasbon pelanggan tidak tercatat
- Internet belum merata (ada blank spot)
- Budget terbatas, literasi digital rendah

**Solusi MrikiPOS:** POS digital gratis untuk fitur dasar, offline-first, login via WhatsApp, UI simpel, harga terjangkau, pendampingan lokal.

---

## 2. Target User (Persona)

| Persona          | Usaha                           | Kebutuhan Utama                                   |
| ---------------- | ------------------------------- | ------------------------------------------------- |
| Bu Siti (45)     | Warung nasi pecel, 2 karyawan   | Catat jual harian, tahu untung, tanpa internet    |
| Mas Andi (28)    | Kedai kopi, 3 karyawan          | Kasir cepat, QRIS, kontrol stok, shift karyawan   |
| Pak Bambang (52) | Pengrajin bubut kayu, 5 pekerja | Catat pesanan, stok bahan, laporan untuk KUR bank |
| Mbak Rina (35)   | Toko kelontong & sembako        | Scan barcode, stok ratusan item, catat kasbon     |

---

## 3. Fitur Utama

### P0 — Must Have (MVP)

| Modul                  | Fitur                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **POS / Kasir**        | Cart, bayar tunai & QRIS, kalkulasi kembalian, hold transaction, diskon, refund (PIN owner), cetak struk thermal Bluetooth, **mode offline (PWA)** |
| **Produk & Inventory** | CRUD produk, kategori, varian, barcode, stok real-time, alert stok minimum (WA), import Excel, stock opname                                        |
| **Laporan**            | Dashboard harian, penjualan (harian/mingguan/bulanan), produk terlaris, laba/rugi sederhana, export PDF/Excel, **format laporan bank/KUR**         |
| **Pembayaran**         | Tunai, QRIS (Midtrans/Tripay), transfer manual, e-wallet, multi-tender                                                                             |
| **Shift & Kasir**      | Buka/tutup shift, modal awal, selisih kas, laporan per kasir, 2 role (Owner & Kasir)                                                               |
| **Auth**               | Login nomor HP + OTP WhatsApp, PIN, JWT                                                                                                            |

### P1 — Should Have

| Modul                  | Fitur                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------- |
| **Kasbon / Piutang**   | Catat hutang pelanggan, jatuh tempo, reminder WA otomatis, total piutang di dashboard |
| **Pelanggan**          | Database pelanggan (nama, HP, alamat), riwayat belanja, poin sederhana                |
| **Multi-User & RBAC**  | Owner, Manager, Kasir, Staff Gudang. Hak akses per role                               |
| **Approval**           | Approval refund, transfer stok, tutup kasir. Multi-level berdasarkan nominal          |
| **Inventory Lanjutan** | Supplier, purchase order, bahan baku → produk jadi (BOM sederhana)                    |

### P2 — Nice to Have

| Modul                | Fitur                                       |
| -------------------- | ------------------------------------------- |
| **Katalog Online**   | Halaman produk online (link share ke WA/IG) |
| **WhatsApp Order**   | Terima pesanan via WA                       |
| **Multi-Outlet**     | Kelola hingga 3 cabang, mutasi stok         |
| **Loyalty**          | Membership tier, voucher, promo             |
| **Pajak**            | Hitung PPh UMKM 0,5%                        |
| **Resep / Produksi** | BOM, konversi bahan baku, HPP otomatis      |

---

## 4. Tech Stack

| Layer         | Teknologi                                                         |
| ------------- | ----------------------------------------------------------------- |
| Frontend      | Next.js 15 (App Router) + TypeScript + TailwindCSS v4 + shadcn/ui |
| State         | Zustand (client) + TanStack Query v5 (server)                     |
| Offline       | Dexie.js (IndexedDB) + Workbox (Service Worker) + next-pwa        |
| Backend       | NestJS 11 + TypeScript                                            |
| ORM           | Prisma 6                                                          |
| Database      | PostgreSQL 16                                                     |
| Cache / Queue | Redis 7 + BullMQ                                                  |
| WebSocket     | Socket.io 4                                                       |
| Auth          | JWT (Access 15m + Refresh 7d) + OTP WhatsApp                      |
| Validation    | class-validator + Zod                                             |
| Storage       | Cloudflare R2 / AWS S3 + Sharp                                    |
| Payment       | Midtrans / Tripay                                                 |
| WhatsApp      | Fonnte / Wablas                                                   |
| Reverse Proxy | Nginx                                                             |
| CDN / WAF     | Cloudflare                                                        |
| Container     | Docker + Docker Compose                                           |
| CI/CD         | GitHub Actions                                                    |
| Monitoring    | Sentry + Prometheus + Grafana + Loki + UptimeRobot                |
| Monorepo      | Turborepo + pnpm                                                  |

---

## 5. Arsitektur Sistem

### 5.1 High-Level

```
User (HP / Tablet / PC)
       │ HTTPS
  Cloudflare (CDN + WAF + DNS)
       │
     Nginx (Reverse Proxy + SSL Termination)
       │
  ┌────┴─────────────────────┐
  │                          │
Next.js (SSR/PWA)       NestJS API (:4000)
(:3000)                      │
                        ┌────┴────┐
                        │         │
                   PostgreSQL   Redis
                   (:5432)     (:6379)
                        │
                   BullMQ Workers
                   (WA, Report, Sync, Payment)
                        │
              ┌─────────┼─────────┐
           Midtrans   Fonnte   Cloudflare R2
           (QRIS)    (WhatsApp)  (Storage)
```

### 5.2 Multi-Tenant

- Shared database, shared schema
- Setiap tabel punya kolom `tenant_id` (UUID)
- PostgreSQL Row-Level Security (RLS) sebagai safety net
- Tenant = 1 bisnis/owner → Outlet = cabang di bawah tenant

### 5.3 Offline-First (PWA)

```
Online  → API call langsung
Offline → Simpan ke IndexedDB (tabel pending_sync)
Back Online → Background Sync API → push batch ke server
Server → Validasi, proses, broadcast via WebSocket
Conflict → Last-write-wins + flag manual resolution
```

### 5.4 Real-Time (Socket.io)

- Namespaces: `/pos`, `/inventory`, `/kds`, `/dashboard`, `/notify`
- Rooms per outlet: `outlet:{id}:kasir`, `outlet:{id}:dapur`, `outlet:{id}:owner`
- Events: `transaction:completed`, `stock:updated`, `stock:low_alert`, `payment:confirmed`, `sync:required`

---

## 6. Database Schema

### 6.1 Tabel Utama

```sql
tenants (
  id UUID PK, nama, phone, email, plan, status,
  settings JSONB, created_at, updated_at
)

outlets (
  id UUID PK, tenant_id FK→tenants, nama, alamat,
  kelurahan, kecamatan, latitude, longitude,
  is_active BOOL, created_at
)

users (
  id UUID PK, tenant_id FK, outlet_id FK,
  nama, phone, pin_hash, role ENUM(owner|manager|kasir|staff),
  is_active BOOL, last_login, created_at
)

categories (
  id UUID PK, tenant_id FK, outlet_id FK,
  nama, parent_id FK→categories, sort_order INT
)

products (
  id UUID PK, tenant_id FK, outlet_id FK, category_id FK,
  nama, sku, barcode, harga_jual DECIMAL, harga_beli DECIMAL,
  stok INT, stok_minimum INT, satuan, foto_url,
  is_active BOOL, created_at, updated_at
)

product_variants (
  id UUID PK, product_id FK, nama, sku,
  harga_jual DECIMAL, stok INT
)

transactions (
  id UUID PK, tenant_id FK, outlet_id FK, shift_id FK,
  kasir_id FK→users, customer_id FK→customers,
  subtotal DECIMAL, diskon DECIMAL, pajak DECIMAL,
  grand_total DECIMAL, metode_bayar, status,
  catatan, created_at, synced_at
)

transaction_items (
  id UUID PK, transaction_id FK, product_id FK, variant_id FK,
  nama_produk, qty INT, harga DECIMAL,
  diskon_item DECIMAL, subtotal DECIMAL, catatan
)

payments (
  id UUID PK, transaction_id FK, metode,
  jumlah DECIMAL, status, referensi,
  gateway_response JSONB, created_at
)

customers (
  id UUID PK, tenant_id FK, outlet_id FK,
  nama, phone, alamat, total_belanja DECIMAL,
  poin INT, created_at
)

customer_credits (
  id UUID PK, tenant_id FK, outlet_id FK, customer_id FK,
  jumlah DECIMAL, keterangan, jatuh_tempo DATE,
  status ENUM(unpaid|paid|overdue), paid_at
)

shifts (
  id UUID PK, tenant_id FK, outlet_id FK, user_id FK,
  modal_awal DECIMAL, total_penjualan DECIMAL,
  total_transaksi INT, selisih_kas DECIMAL,
  status ENUM(open|closed), opened_at, closed_at
)

stock_history (
  id UUID PK, tenant_id FK, outlet_id FK, product_id FK,
  tipe ENUM(in|out|adjustment), qty INT,
  stok_sebelum INT, stok_sesudah INT,
  keterangan, reference_id, created_at
)

suppliers (
  id UUID PK, tenant_id FK, nama, phone, alamat
)

purchase_orders (
  id UUID PK, tenant_id FK, outlet_id FK, supplier_id FK,
  total DECIMAL, status, created_at
)

approval_logs (
  id UUID PK, tenant_id FK, type, reference_id,
  requested_by FK→users, approved_by FK→users,
  status, catatan, created_at
)

audit_logs (
  id UUID PK, tenant_id FK, user_id FK,
  action, entity_type, entity_id,
  old_values JSONB, new_values JSONB,
  ip_address, created_at
)
```

### 6.2 Index Penting

```sql
CREATE INDEX idx_products_tenant_outlet ON products(tenant_id, outlet_id);
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_transactions_tenant_date ON transactions(tenant_id, created_at DESC);
CREATE INDEX idx_transactions_outlet_shift ON transactions(outlet_id, shift_id);
CREATE INDEX idx_transaction_items_txn ON transaction_items(transaction_id);
CREATE INDEX idx_stock_history_product ON stock_history(product_id, created_at DESC);
CREATE INDEX idx_credits_status ON customer_credits(tenant_id, status);
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id, created_at DESC);
```

---

## 7. API Endpoints

Base URL: `https://api.mrikipos.com/v1`
Auth: `Bearer <access_token>` | Header: `X-Tenant-ID`
Rate Limit: 100 req/min (free), 500 req/min (paid)

### Auth

```
POST /auth/register
POST /auth/login
POST /auth/otp/send
POST /auth/otp/verify
POST /auth/refresh
POST /auth/logout
POST /auth/forgot-pin
```

### Tenant & Outlet

```
GET/PUT     /tenant
GET/POST    /outlets
GET/PUT/DEL /outlets/:id
```

### Users

```
GET/POST    /users
GET/PUT/DEL /users/:id
PUT         /users/:id/pin
```

### Products & Inventory

```
GET/POST    /products
GET/PUT/DEL /products/:id
POST        /products/import
GET         /products/export
GET         /products/search?q=
POST        /products/:id/stock
GET         /stock/history
GET         /stock/low
```

### Transactions (POS)

```
POST        /transactions
GET         /transactions
GET         /transactions/:id
POST        /transactions/:id/void
POST        /transactions/:id/refund
GET         /transactions/summary
POST        /transactions/sync          ← batch sync offline
```

### Payments

```
POST        /payments
GET         /payments/:id
POST        /payments/:id/confirm
GET         /payments/qris/:txn_id
POST        /payments/webhook
```

### Customers & Kasbon

```
GET/POST    /customers
GET/PUT     /customers/:id
GET         /customers/:id/history
GET/POST    /credits
PUT         /credits/:id/pay
GET         /credits/overdue
```

### Reports

```
GET /reports/sales
GET /reports/profit-loss
GET /reports/products/top
GET /reports/cashier
GET /reports/stock
GET /reports/tax
GET /reports/export?format=pdf|excel
GET /reports/bank-format
```

### Shifts

```
POST /shifts/open
POST /shifts/close
GET  /shifts/current
GET  /shifts/history
```

### Notifications & Upload

```
GET  /notifications
PUT  /notifications/:id/read
POST /upload/image
POST /upload/excel
```

### Response Format

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

### WebSocket Events

```
Client → Server:
  transaction:create, stock:check, order:status_update

Server → Client:
  transaction:completed, stock:updated, stock:low_alert,
  payment:confirmed, sync:required, notification:new
```

---

## 8. Project Structure (Monorepo)

```
mrikipos/
├── apps/
│   ├── web/                          # Next.js PWA
│   │   ├── src/
│   │   │   ├── app/                  # App Router
│   │   │   │   ├── (auth)/           # login, register, otp
│   │   │   │   └── (dashboard)/
│   │   │   │       ├── pos/
│   │   │   │       ├── products/
│   │   │   │       ├── inventory/
│   │   │   │       ├── transactions/
│   │   │   │       ├── customers/
│   │   │   │       ├── reports/
│   │   │   │       ├── settings/
│   │   │   │       └── users/
│   │   │   ├── components/           # ui/, pos/, charts/, layout/
│   │   │   ├── lib/                  # api/, db/ (Dexie), sync/, socket/, utils/
│   │   │   ├── stores/               # Zustand stores
│   │   │   ├── hooks/
│   │   │   └── types/
│   │   ├── public/                   # manifest.json, sw.js, icons/
│   │   ├── next.config.js
│   │   └── tailwind.config.ts
│   │
│   └── api/                          # NestJS
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── modules/              # auth, tenant, outlet, user, product,
│       │   │                         # inventory, transaction, payment,
│       │   │                         # customer, credit, shift, report,
│       │   │                         # notification, upload, approval
│       │   ├── common/               # decorators, filters, guards, pipes, middleware
│       │   ├── config/
│       │   ├── database/             # prisma/schema.prisma, migrations/
│       │   └── integrations/         # midtrans/, whatsapp/, storage/
│       ├── test/
│       └── Dockerfile
│
├── packages/                         # shared-types, shared-utils, eslint-config
├── infra/
│   ├── docker/                       # docker-compose.yml, docker-compose.prod.yml, nginx/
│   └── k8s/                          # (Phase 3) namespace, deployment, service, ingress, hpa
├── .github/workflows/                # ci.yml, cd-staging.yml, cd-production.yml
├── docs/                             # api/, architecture/, runbook/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 9. Security

- JWT Access 15min + Refresh 7d (rotate, simpan di Redis)
- PIN hash: bcrypt cost factor 12
- RBAC: Owner > Manager > Kasir > Staff Gudang
- Helmet.js + CORS whitelist + Rate limiting
- Prisma parameterized query (anti SQL injection)
- PostgreSQL Row-Level Security per tenant
- Audit log semua aksi sensitif (audit_logs table)
- HTTPS only (TLS 1.3 via Let's Encrypt / Cloudflare)
- Input validation: class-validator + Zod
- Secrets via environment variables, jangan hardcode
- Docker non-root user
- Compliance: UU PDP Indonesia

### RBAC Matrix

| Fitur           | Owner | Manager  | Kasir | Staff Gudang   |
| --------------- | ----- | -------- | ----- | -------------- |
| POS / Transaksi | ✅    | ✅       | ✅    | ❌             |
| Void / Refund   | ✅    | ✅ (PIN) | ❌    | ❌             |
| Lihat Laporan   | ✅    | ✅       | ❌    | ❌             |
| Kelola Produk   | ✅    | ✅       | ❌    | ✅ (stok saja) |
| Kelola Stok     | ✅    | ✅       | ❌    | ✅             |
| Kelola User     | ✅    | ❌       | ❌    | ❌             |
| Pengaturan      | ✅    | ❌       | ❌    | ❌             |
| Approval        | ✅    | ✅       | ❌    | ❌             |
| Export Data     | ✅    | ✅       | ❌    | ❌             |

---

## 10. Scaling Strategy

| Phase | Users   | Infra                                              | Cost/bln    |
| ----- | ------- | -------------------------------------------------- | ----------- |
| 1     | 0–1K    | 1 VPS (4vCPU/8GB), Docker Compose, Cloudflare free | ~Rp 500K    |
| 2     | 1K–10K  | 3 VPS (FE, BE, DB+Redis), Read Replica, PgBouncer  | ~Rp 2-4jt   |
| 3     | 10K–50K | K3s cluster, HPA, Redis Cluster, Elasticsearch     | ~Rp 8-20jt  |
| 4     | 50K+    | Multi-region, auto-scaling, CDN edge               | ~Rp 20-50jt |

### Caching Layers

| Layer              | Strategi                                                        |
| ------------------ | --------------------------------------------------------------- |
| CDN (Cloudflare)   | Static assets 1yr, API GET 5min (stale-while-revalidate)        |
| Redis              | Product list 5min, dashboard 1min, session 7d, OTP 5min         |
| Client (IndexedDB) | Product catalog, pending transactions, settings                 |
| PostgreSQL         | Materialized views (reports, refresh hourly), PgBouncer pooling |

### Performance Targets

| Metric                     | Target  |
| -------------------------- | ------- |
| First Contentful Paint     | < 1.5s  |
| Time to Interactive        | < 3s    |
| API p95 latency            | < 300ms |
| API p99 latency            | < 800ms |
| WebSocket latency          | < 100ms |
| JS bundle (gzip)           | < 200KB |
| Lighthouse score           | > 90    |
| Concurrent users (Phase 3) | 10K+    |

---

## 11. Background Jobs (BullMQ)

| Queue       | Jobs                                                                      | Concurrency |
| ----------- | ------------------------------------------------------------------------- | ----------- |
| whatsapp    | send-otp, low-stock-alert, daily-report, credit-reminder, payment-confirm | 5           |
| reports     | generate-pdf, generate-excel, bank-format                                 | 2           |
| maintenance | sync-offline-data, cleanup-logs, backup-db, refresh-views, stock-alerts   | 1           |
| payments    | check-status, process-webhook, reconcile                                  | 3           |

### Cron Schedule

```
0 0 * * *   → Daily backup database
0 6 * * *   → Kirim laporan harian ke owner via WA
0 */6 * * * → Check & kirim alert stok menipis
0 0 * * 1   → Laporan mingguan
0 2 * * *   → Cleanup session & log lama
0 3 * * *   → Refresh materialized views
```

---

## 12. CI/CD Pipeline

```
Push/PR:
  → pnpm install
  → ESLint + Prettier
  → tsc --noEmit
  → Unit tests (Jest/Vitest)
  → Integration tests (Supertest + Testcontainers)
  → Build (next build + nest build)
  → Security scan (npm audit)
  → Docker build & push

Merge to main:
  → Deploy staging
  → E2E tests (Playwright)
  → Notify WA

Manual approve → Production:
  → Prisma migrate deploy
  → Rolling restart (zero downtime)
  → Health check
  → Rollback if error rate > 5% in 5 min
```

---

## 13. Monitoring & Alerting

| Tool                 | Fungsi                                                                   |
| -------------------- | ------------------------------------------------------------------------ |
| Sentry               | Error tracking FE + BE, performance tracing                              |
| Prometheus + Grafana | Metrics: CPU, memory, request rate, latency, WS connections, queue depth |
| Loki + Promtail      | Log aggregation, query: `{app="mrikipos-api"}                            | = "error"` |
| UptimeRobot          | Health check: `/health`, `/health/ready`, `/health/live`                 |

### Alert Rules

```
CRITICAL: API error rate > 5% selama 5 min
CRITICAL: Disk usage > 90%
CRITICAL: Uptime < 99.5%
WARNING:  API p95 latency > 2s selama 5 min
WARNING:  CPU > 80% selama 10 min
WARNING:  Memory > 85% selama 10 min
WARNING:  DB connections > 80% pool
WARNING:  BullMQ queue > 1000 jobs
WARNING:  WebSocket disconnects > 100/min
```

---

## 14. Testing

| Tipe        | Target                           | Tool                                            |
| ----------- | -------------------------------- | ----------------------------------------------- |
| Unit        | > 80% services, > 70% components | Jest / Vitest + Testing Library                 |
| Integration | > 90% API endpoints              | Supertest + Testcontainers (PostgreSQL + Redis) |
| E2E         | 100% critical flows              | Playwright                                      |

### Critical E2E Flows

1. Register → OTP WA → Login → Setup Outlet → Add Product → Transaksi tunai
2. Offline transaction → Go online → Auto sync → Verify data di server
3. Transaksi → QRIS → Webhook Midtrans → Status update
4. Stok menipis → Alert WhatsApp → Verify notif terkirim
5. Buat kasbon → Reminder WA → Bayar → Verify saldo
6. Open shift → Transaksi → Close shift → Verify laporan
7. Multi-user: Owner create, Kasir transaksi, verify permission

---

## 15. Environment Variables

```bash
# App
NODE_ENV=production
APP_URL=https://mrikipos.com
API_URL=https://api.mrikipos.com
WS_URL=wss://api.mrikipos.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/mrikipos
DATABASE_REPLICA_URL=postgresql://user:pass@replica:5432/mrikipos

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# WhatsApp (Fonnte)
FONNTE_API_URL=https://api.fonnte.com/send
FONNTE_API_KEY=

# Payment (Midtrans)
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=true

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=mrikipos-uploads
R2_PUBLIC_URL=https://cdn.mrikipos.com

# Sentry
SENTRY_DSN=
SENTRY_ENVIRONMENT=production

# Rate Limit
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

---

## 16. Pricing

| Paket         | Harga                      | Fitur                                                                               |
| ------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| **Gratis**    | Rp 0                       | 1 outlet, 1 user, 50 produk, kasir dasar, offline, laporan harian                   |
| **UMKM**      | Rp 49K/bln (tahunan 39K)   | 1 outlet, 3 user, unlimited produk, QRIS, kasbon, laporan lengkap, WA alert         |
| **Bisnis**    | Rp 149K/bln (tahunan 119K) | 3 outlet, 10 user, multi-payment, inventory advanced, export bank, priority support |
| **Komunitas** | Custom                     | Bundle via Dinkop UKM, training on-site, dedicated support                          |

Revenue: subscription + transaction fee QRIS (0,7%) + setup/training fee + add-on premium.

---

## 17. Go-to-Market (Kota Blitar)

| Fase   | Waktu      | Aktivitas                                                                             |
| ------ | ---------- | ------------------------------------------------------------------------------------- |
| Pilot  | Bulan 1-3  | MoU Dinkop UKM, 20 UMKM binaan beta test, pendampingan 1-on-1, free 3 bulan           |
| Growth | Bulan 4-6  | Sosialisasi via Dinkop & ASUMI, demo di pasar, referral program, konten WA/IG/TikTok  |
| Scale  | Bulan 7-12 | Ekspansi 3 kecamatan, integrasi Smart City, kerja sama bank (KUR), agen per kelurahan |
| Expand | Tahun 2    | Kabupaten Blitar, white-label Dinkop, marketplace lokal                               |

Target: 10% penetrasi dari 12.500 UMKM Kota Blitar dalam 2 tahun.

---

## 18. Development Timeline

| Sprint | Durasi | Deliverable                                                   |
| ------ | ------ | ------------------------------------------------------------- |
| 0      | 1 mgg  | Monorepo setup, Docker, CI/CD, DB schema, auth (OTP WA + JWT) |
| 1      | 2 mgg  | POS core: cart, transaksi, bayar tunai, cetak struk           |
| 2      | 2 mgg  | Product & Inventory CRUD, barcode, import Excel               |
| 3      | 2 mgg  | PWA offline mode, IndexedDB, sync engine                      |
| 4      | 2 mgg  | QRIS payment (Midtrans), WhatsApp OTP & notifikasi            |
| 5      | 2 mgg  | Dashboard, reports, export PDF/Excel, format bank             |
| 6      | 2 mgg  | Shift management, kasbon, customer database                   |
| 7      | 2 mgg  | RBAC, multi-user, approval workflow                           |
| 8      | 2 mgg  | Testing, performance optimization, security audit             |
| 9      | 1 mgg  | Staging deploy, UAT, bug fix                                  |
| 10     | 1 mgg  | **Production launch** 🚀                                      |

**Total: ~19 minggu (±5 bulan)**

---

## 19. Risiko & Mitigasi

| Risiko                     | Mitigasi                                                         |
| -------------------------- | ---------------------------------------------------------------- |
| User gaptek                | UI super simpel, training langsung, video tutorial, login via WA |
| Internet tidak stabil      | Offline-first PWA, auto-sync, IndexedDB                          |
| HP Android low-end         | Bundle < 200KB, lazy load, virtual scroll, PWA ringan            |
| Tidak mau bayar            | Freemium gratis selamanya, upgrade saat butuh                    |
| Kompetitor (x-pos, Olsera) | Harga lebih murah, support lokal WA, pendampingan langsung       |
| Offline sync conflict      | Last-write-wins + conflict flag + manual resolution              |
| WhatsApp API down          | Fallback SMS, retry queue, multi-provider                        |
| Payment gateway down       | Fallback tunai + transfer manual, queue retry                    |
| Data loss                  | Daily backup, point-in-time recovery, enkripsi                   |

---

_Dokumen ini living document. Perubahan arsitektur via ADR + review Tech Lead._
