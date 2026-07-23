# MrikiPOS — Development Workflow Guide

> Panduan lengkap setup development environment, branching strategy, PR review, dan deployment.

---

## 1. Prerequisites

### 1.1 Software yang Harus Diinstall

| Software                  | Versi  | Cara Install                                                      |
| ------------------------- | ------ | ----------------------------------------------------------------- |
| **Node.js**               | 20 LTS | `nvm install 20` atau download dari nodejs.org                    |
| **pnpm**                  | 9.x    | `npm install -g pnpm@9`                                           |
| **Docker**                | 24+    | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) |
| **Docker Compose**        | v2+    | Sudah included di Docker Desktop                                  |
| **Git**                   | 2.40+  | `apt install git` atau download                                   |
| **VS Code** (recommended) | Latest | [code.visualstudio.com](https://code.visualstudio.com)            |

### 1.2 VS Code Extensions (Recommended)

```
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)
- Prisma (Prisma.prisma)
- Thunder Client (rangav.vscode-thunder-client) — untuk test API
- GitLens (eamodio.gitlens)
- Error Lens (usernamehw.errorlens)
```

### 1.3 VS Code Settings (Recommended)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

---

## 2. Initial Setup

### 2.1 Clone & Install

```bash
# Clone repository
git clone https://github.com/mrikipos/mrikipos.git
cd mrikipos

# Pin Node.js version (jika pakai nvm)
nvm use

# Install semua dependencies
pnpm install
```

### 2.2 Environment Variables

```bash
# Copy template environment
cp .env.example .env

# Edit .env dengan value lokal Anda
# Minimal yang perlu diisi:
# - DATABASE_URL (default sudah ada untuk Docker)
# - REDIS_URL (default sudah ada untuk Docker)
# - JWT_ACCESS_SECRET (generate: openssl rand -hex 32)
# - JWT_REFRESH_SECRET (generate: openssl rand -hex 32)
```

### 2.3 Start Infrastructure (Docker)

```bash
# Start PostgreSQL + Redis
docker compose -f infra/docker/docker-compose.yml up -d postgres redis

# Verify berjalan
docker compose -f infra/docker/docker-compose.yml ps

# Expected output:
# NAME                STATUS
# mrikipos-postgres   Up (healthy)
# mrikipos-redis      Up (healthy)
```

### 2.4 Setup Database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema ke database (development only)
pnpm db:push

# Atau jalankan migration (recommended)
pnpm db:migrate

# (Optional) Buka Prisma Studio untuk inspect database
pnpm db:studio
# → Open http://localhost:5555
```

### 2.5 Start Development Servers

```bash
# Start semua apps (frontend + backend) sekaligus
pnpm dev

# Atau start terpisah:
pnpm --filter api dev      # Backend → http://localhost:4000
pnpm --filter web dev      # Frontend → http://localhost:3000
```

### 2.6 Verify Setup

```bash
# Health check API
curl http://localhost:4000/health
# Expected: {"status":"ok","timestamp":"..."}

# Health check ready (DB + Redis)
curl http://localhost:4000/health/ready
# Expected: {"status":"ready","checks":{"database":"connected","redis":"connected"}}

# Frontend
# Open http://localhost:3000 di browser
# Expected: Login page
```

---

## 3. Daily Development Workflow

### 3.1 Memulai Hari Kerja

```bash
# 1. Pull latest dari develop
git checkout develop
git pull origin develop

# 2. Start infra (jika belum)
docker compose -f infra/docker/docker-compose.yml up -d postgres redis

# 3. Install deps (jika ada yang baru)
pnpm install

# 4. Generate Prisma (jika schema berubah)
pnpm db:generate

# 5. Migrate database (jika ada migration baru)
pnpm db:migrate

# 6. Start development
pnpm dev
```

### 3.2 Membuat Feature Baru

```bash
# 1. Buat branch dari develop
git checkout develop
git checkout -b feat/product-crud

# 2. Develop fitur...

# 3. Commit (conventional commits!)
git add .
git commit -m "feat(api): add product CRUD endpoints"
git commit -m "feat(web): add product list page"
git commit -m "test(api): add product service unit tests"

# 4. Push branch
git push origin feat/product-crud

# 5. Buat Pull Request ke develop
# → Review → Merge
```

### 3.3 Database Schema Changes

```bash
# 1. Edit apps/api/src/database/prisma/schema.prisma
# 2. Generate migration
cd apps/api
npx prisma migrate dev --name add_discount_column

# 3. Review migration SQL yang di-generate
cat src/database/prisma/migrations/20260721_add_discount_column/migration.sql

# 4. Generate client
npx prisma generate

# 5. Commit migration file bersama schema
git add src/database/prisma/
git commit -m "chore(api): add discount column to products"
```

> ⚠️ **JANGAN** gunakan `prisma db push` untuk production. Selalu gunakan `prisma migrate`.

---

## 4. Branching Strategy

### 4.1 Branch Types

```
main              ← Production (protected, hanya merge dari staging)
staging           ← Staging / UAT (merge dari develop)
develop           ← Integration branch (merge dari feature branches)

Feature branches:
  feat/pos-cart              ← Fitur baru
  fix/offline-sync-conflict  ← Bug fix
  hotfix/payment-webhook     ← Hotfix production
  refactor/auth-module       ← Refactoring
  docs/api-documentation     ← Dokumentasi
  chore/upgrade-prisma       ← Dependency update
```

### 4.2 Branch Flow

```
feat/xxx ──────┐
feat/yyy ──────┤
fix/zzz  ──────┼──→ develop ──→ staging ──→ main (production)
               │        ↑                      ↑
               │     PR + Review          Manual approve
               │     Auto tests           E2E tests pass
               └─────────────────────────────┘
                       Hotfix (langsung ke main)
```

### 4.3 Branch Protection Rules

| Branch    | Rules                                          |
| --------- | ---------------------------------------------- |
| `main`    | Require PR, 1 approval, CI pass, no force push |
| `staging` | Require PR, CI pass                            |
| `develop` | Require PR, CI pass                            |

---

## 5. Commit Convention

### 5.1 Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### 5.2 Types

| Type       | Emoji | Deskripsi     | Contoh                                      |
| ---------- | ----- | ------------- | ------------------------------------------- |
| `feat`     | ✨    | Fitur baru    | `feat(api): add product CRUD endpoints`     |
| `fix`      | 🐛    | Bug fix       | `fix(web): fix cart total calculation`      |
| `refactor` | ♻️    | Refactoring   | `refactor(api): extract tenant middleware`  |
| `docs`     | 📝    | Dokumentasi   | `docs(api): add swagger for auth endpoints` |
| `style`    | 💄    | Formatting    | `style(web): fix indentation in login page` |
| `test`     | ✅    | Testing       | `test(api): add auth service unit tests`    |
| `chore`    | 🔧    | Build/CI/deps | `chore(infra): update docker-compose`       |
| `perf`     | ⚡    | Performance   | `perf(api): add redis caching for products` |

### 5.3 Scopes

| Scope    | Deskripsi          |
| -------- | ------------------ |
| `api`    | Backend NestJS     |
| `web`    | Frontend Next.js   |
| `shared` | Shared packages    |
| `infra`  | Docker, nginx, k8s |
| `ci`     | GitHub Actions     |
| `docs`   | Dokumentasi        |

### 5.4 Examples

```bash
# Good ✅
feat(api): add product CRUD endpoints
fix(web): fix cart total calculation when discount applied
refactor(api): extract tenant middleware to shared module
chore(infra): update PostgreSQL to 16.4

# Bad ❌
update product          # No type, no scope
feat: stuff             # Too vague
FEAT(API): ADD PRODUCT  # Don't shout
feat(api): add product CRUD endpoints for the merchant dashboard to manage their products.  # Too long
```

---

## 6. Pull Request Guide

### 6.1 PR Template

```markdown
## Deskripsi

[Jelaskan apa yang berubah dan kenapa]

## Tipe Perubahan

- [ ] ✨ Fitur baru
- [ ] 🐛 Bug fix
- [ ] ♻️ Refactoring
- [ ] 📝 Dokumentasi
- [ ] 🔧 Chore

## Screenshot / Video (jika UI berubah)

[Attach screenshot atau video]

## Checklist

- [ ] Kode sudah di-lint (`pnpm lint`)
- [ ] Build berhasil (`pnpm build`)
- [ ] TypeScript check pass (`pnpm typecheck`)
- [ ] Unit test pass (jika ada)
- [ ] Tenant isolation dipatuhi
- [ ] Auth guard ditambahkan
- [ ] Response format sesuai standar
- [ ] Mobile responsive (360px width)

## Linked Issues

Closes #XX
```

### 6.2 PR Size Guidelines

| Size      | Lines Changed  | Review Time | Status          |
| --------- | -------------- | ----------- | --------------- |
| 🟢 Small  | < 200 lines    | < 30 min    | Ideal           |
| 🟡 Medium | 200-500 lines  | 30-60 min   | OK              |
| 🟠 Large  | 500-1000 lines | 1-2 hours   | Pecah jika bisa |
| 🔴 XL     | > 1000 lines   | > 2 hours   | HARUS dipecah   |

### 6.3 Review Checklist (untuk Reviewer)

- [ ] Kode mudah dibaca dan dipahami
- [ ] Tidak ada security vulnerability
- [ ] Tenant isolation dipatuhi
- [ ] Error handling proper
- [ ] Tidak ada hardcoded secret
- [ ] Naming convention sesuai
- [ ] Tidak ada unused code/import
- [ ] Performance OK (tidak ada N+1 query, loop query, dll)

---

## 7. Testing Guide

### 7.1 Menjalankan Tests

```bash
# Semua tests
pnpm test

# Backend saja
pnpm --filter api test

# Frontend saja
pnpm --filter web test

# Dengan coverage
pnpm --filter api test:cov

# Watch mode (development)
pnpm --filter api test:watch

# Specific test file
pnpm --filter api test -- --testPathPattern=product.service
```

### 7.2 Test Structure

```
apps/api/
├── src/modules/product/
│   ├── product.service.ts
│   ├── product.service.spec.ts     ← Unit test (service logic)
│   ├── product.controller.ts
│   └── product.controller.spec.ts  ← Unit test (controller routing)
├── test/
│   ├── product.e2e-spec.ts         ← Integration test (full API)
│   └── setup.ts                    ← Test setup (DB, Redis mock)

apps/web/
├── src/components/pos/
│   ├── cart.tsx
│   └── cart.test.tsx               ← Component test
├── src/hooks/
│   ├── use-products.ts
│   └── use-products.test.ts        ← Hook test
```

### 7.3 Test Naming Convention

```typescript
describe('ProductService', () => {
  describe('findAll', () => {
    it('should return paginated products for tenant', async () => { ... });
    it('should filter by category when category_id provided', async () => { ... });
    it('should not return products from other tenants', async () => { ... });
    it('should throw NotFoundException when product not found', async () => { ... });
  });
});
```

---

## 8. Debugging Guide

### 8.1 Backend Debugging

```bash
# Start API dengan debug mode
pnpm --filter api dev:debug

# Attach VS Code debugger:
# 1. Buka VS Code
# 2. Run > Start Debugging (F5)
# 3. Pilih "Attach to NestJS" launch config
```

**VS Code launch.json:**

```json
{
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to NestJS",
      "port": 9229,
      "restart": true,
      "sourceMaps": true
    }
  ]
}
```

### 8.2 Database Debugging

```bash
# Inspect database via Prisma Studio
pnpm db:studio

# Connect langsung ke PostgreSQL
docker exec -it mrikipos-postgres psql -U mrikipos -d mrikipos

# Useful SQL queries:
\dt                                    -- List semua tabel
\d products                            -- Describe tabel products
SELECT * FROM products LIMIT 10;       -- Sample data
SELECT count(*) FROM transactions;     -- Count transaksi
```

### 8.3 Redis Debugging

```bash
# Connect ke Redis CLI
docker exec -it mrikipos-redis redis-cli

# Useful commands:
KEYS *                    -- List semua keys
GET key_name              -- Get value
TTL key_name              -- Time to live
INFO memory               -- Memory usage
MONITOR                   -- Real-time command monitoring
```

### 8.4 Common Issues

| Masalah                          | Solusi                                                      |
| -------------------------------- | ----------------------------------------------------------- |
| `Port 3000/4000 already in use`  | `lsof -i :3000` → `kill -9 <PID>`                           |
| `Prisma client not found`        | `pnpm db:generate`                                          |
| `Database connection refused`    | `docker compose up -d postgres`                             |
| `Redis connection refused`       | `docker compose up -d redis`                                |
| `Module not found`               | `pnpm install` di root                                      |
| `Type error after schema change` | `pnpm db:generate` lalu restart TS server                   |
| `CORS error di browser`          | Check CORS config di `main.ts`, pastikan origin diwhitelist |
| `JWT expired`                    | Token access expired (15m), frontend harus auto-refresh     |

---

## 9. Deployment Guide

### 9.1 Environments

| Environment     | URL                    | Branch            | Deploy                            |
| --------------- | ---------------------- | ----------------- | --------------------------------- |
| **Development** | `localhost:3000/4000`  | `feat/*`, `fix/*` | Manual (`pnpm dev`)               |
| **Staging**     | `staging.mrikipos.com` | `staging`         | Auto (merge to staging)           |
| **Production**  | `mrikipos.com`         | `main`            | Manual approve setelah staging OK |

### 9.2 Deploy to Staging

```bash
# 1. Merge develop ke staging
git checkout staging
git merge develop
git push origin staging

# 2. GitHub Actions akan otomatis:
#    - Build Docker images
#    - Run tests
#    - Deploy ke staging server
#    - Run E2E tests
#    - Notify via WhatsApp

# 3. Verify staging
curl https://api-staging.mrikipos.com/health
```

### 9.3 Deploy to Production

```bash
# 1. Buat PR dari staging ke main
# 2. Review & approve
# 3. GitHub Actions akan:
#    - Run Prisma migrations
#    - Build & push Docker images
#    - Rolling restart (zero downtime)
#    - Health check
#    - Auto rollback jika error rate > 5% dalam 5 menit
```

### 9.4 Manual Deploy (VPS)

```bash
# SSH ke server
ssh deploy@mrikipos.com

# Pull latest
cd /opt/mrikipos
git pull origin main

# Build & restart
docker compose -f infra/docker/docker-compose.prod.yml build
docker compose -f infra/docker/docker-compose.prod.yml up -d

# Run migrations
docker compose exec api npx prisma migrate deploy

# Check health
curl http://localhost:4000/health/ready
```

### 9.5 Rollback

```bash
# Revert ke commit sebelumnya
git revert HEAD
git push origin main

# Atau reset ke tag tertentu
git reset --hard v1.2.3
docker compose up -d --build
```

---

## 10. Useful Commands Reference

### 10.1 Monorepo (Turbo)

```bash
pnpm dev              # Start semua apps
pnpm build            # Build semua apps + packages
pnpm lint             # Lint semua
pnpm typecheck        # TypeScript check
pnpm test             # Run semua tests
pnpm clean            # Clean build artifacts + node_modules
pnpm format           # Format semua file (Prettier)
```

### 10.2 Specific App

```bash
pnpm --filter api dev           # Start backend saja
pnpm --filter web dev           # Start frontend saja
pnpm --filter api build         # Build backend
pnpm --filter web build         # Build frontend
pnpm --filter api lint          # Lint backend
pnpm --filter api test          # Test backend
```

### 10.3 Database (Prisma)

```bash
pnpm db:generate         # Generate Prisma client
pnpm db:push             # Push schema (dev only, no migration)
pnpm db:migrate          # Run migrations
pnpm db:studio           # Open Prisma Studio GUI
pnpm db:seed             # Seed database (jika ada)

# Migration specific
cd apps/api
npx prisma migrate dev --name migration_name  # Create migration
npx prisma migrate deploy                     # Deploy migrations (prod)
npx prisma migrate reset                      # Reset database (HAPUS SEMUA DATA!)
```

### 10.4 Docker

```bash
# Start infra
docker compose -f infra/docker/docker-compose.yml up -d

# Stop infra
docker compose -f infra/docker/docker-compose.yml down

# Stop & hapus volume (RESET DATABASE!)
docker compose -f infra/docker/docker-compose.yml down -v

# Logs
docker compose -f infra/docker/docker-compose.yml logs -f postgres
docker compose -f infra/docker/docker-compose.yml logs -f redis

# Exec into container
docker exec -it mrikipos-postgres psql -U mrikipos -d mrikipos
docker exec -it mrikipos-redis redis-cli
```

---

## 11. Troubleshooting Flowchart

```
Problem?
├── Build error?
│   ├── TypeScript error → Fix type, run `pnpm typecheck`
│   ├── Module not found → `pnpm install`, check import path
│   └── Prisma error → `pnpm db:generate`
│
├── Runtime error?
│   ├── DB connection refused → `docker compose up -d postgres`
│   ├── Redis connection refused → `docker compose up -d redis`
│   ├── Port in use → `lsof -i :PORT`, kill process
│   └── CORS error → Check `main.ts` CORS config
│
├── API error?
│   ├── 401 Unauthorized → Check JWT token, mungkin expired
│   ├── 403 Forbidden → Check role user (RBAC)
│   ├── 404 Not Found → Check route path, cek tenant_id
│   ├── 422 Validation → Check DTO validation rules
│   └── 500 Internal → Check server logs (`pnpm --filter api dev`)
│
└── Frontend error?
    ├── Hydration mismatch → Check Server vs Client Component
    ├── 'window' not defined → Hanya pakai di Client Component ('use client')
    └── State not updating → Check Zustand store / TanStack Query cache
```

---

_Dokumen ini harus di-update jika ada perubahan workflow, tools, atau process._
