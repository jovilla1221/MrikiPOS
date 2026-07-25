# MrikiPOS — Kasir Digital Berbasis Web (PWA) untuk UMKM

MrikiPOS adalah aplikasi Point of Sales (POS) dan kasir digital berbasis Web / Progressive Web App (PWA) yang dirancang khusus untuk UMKM Kota Blitar. Aplikasi ini mendukung transaksi kasir secara online maupun offline sync, pembayaran tunai & QRIS (Midtrans), serta laporan penjualan terdedikasi.

---

## 🏗️ Arsitektur & Teknologi

MrikiPOS dibangun menggunakan struktur **Monorepo** dikelola oleh **Turborepo** dan **pnpm workspace**.

```text
mrikipos/
├── apps/
│   ├── api/             # Backend REST API (NestJS 11 + Prisma ORM + Redis)
│   └── web/             # Frontend PWA (Next.js 15.5 + React 19 + TailwindCSS v4)
├── packages/
│   ├── shared-types/    # DTO & Type definitions bersama
│   ├── shared-utils/    # Utility functions bersama
│   ├── eslint-config/   # Konfigurasi ESLint terpusat
│   └── tsconfig/        # Konfigurasi TypeScript terpusat
└── docs/                # Dokumentasi arsitektur, PRD, API contract, & audit sprint
```

### Tech Stack Utama

- **Backend (`apps/api`)**: NestJS 11, Prisma ORM, PostgreSQL, Redis (`ioredis`), JWT & Google Auth (`google-auth-library`), SheetJS (`xlsx`), Rate Throttler (`@nestjs/throttler`), Helmet security headers.
- **Frontend (`apps/web`)**: Next.js 15.5.21 (App Router), React 19, TailwindCSS v4, Zustand, TanStack Query v5, Dexie.js (IndexedDB untuk offline sync), Recharts, Lucide Icons, Sonner.
- **DevOps & Tools**: Turborepo, pnpm 9.15, Jest (Unit & E2E Testing), Prettier, ESLint.

---

## 🚀 Panduan Memulai (Quick Start)

### Prasyarat
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL & Redis terinstal dan berjalan

### Instalasi Dependency

```bash
pnpm install
```

### Konfigurasi Environment Variable
Salin file `.env.example` ke `.env` pada root project serta pada `apps/api/.env` dan `apps/web/.env` sesuai kebutuhan environment lokal Anda:

```bash
cp .env.example .env
```

### Setup Database & Seeding

```bash
# Generate Prisma Client
pnpm db:generate

# Jalankan Migrasi Database
pnpm db:migrate

# (Opsional) Prisma Studio
pnpm db:studio
```

### Menjalankan Development Server

```bash
pnpm dev
```
- Frontend Web: `http://localhost:3000`
- Backend API: `http://localhost:4000` (atau sesuai konfigurasi `PORT`)

---

## 🧪 Testing & Quality Gates

Seluruh komando pengujian dapat dijalankan dari root repository:

```bash
# Unit Testing
pnpm test

# Type Checking
pnpm typecheck

# Linting & Formatting Check
pnpm lint
pnpm format:check

# E2E Test & Entrypoint Verification
pnpm test:routes
pnpm test:entrypoints

# Production Build Test
pnpm build
```

---

## 📄 Dokumentasi Terkait

- 📌 [Dokumen Handover Developer & Progress Status](HANDOVER.md)
- 📐 [Product Requirements Document (PRD)](docs/PRD.md)
- 🔌 [API Contract Document](docs/API_CONTRACT.md)
- 🗄️ [Database Schema Document](docs/DATABASE_SCHEMA.md)
- 🎨 [Design System Guidelines](docs/DESIGN_SYSTEM.md)
- 🏛️ [Architectural Decision Records (ADR)](docs/ADR.md)
- 📊 [Laporan Audit Quality Gate Sprint 8](docs/audit/SPRINT8-AUDIT.md)
