# MrikiPOS — Sprint 5 Security Audit Report

> **Audited with:** PentesterFlow playbooks (`webvuln`, `race`, `recon`)  
> **Scope:** ReportModule (sales, profit-loss, top products, cashier, export), Dashboard real data, Chart UI  
> **Date:** 22 Juli 2026  
> **Auditor:** ZCode Agent  
> **Plan acuan:** `docs/plans/sprint-5/IMPLEMENTATION_PLAN.md`

---

## 📊 Executive Summary

| Metrik                 | Nilai                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| **Module baru (API)**  | `modules/report` (controller, service, dto, module)                |
| **Frontend baru**      | `/reports` page + 5 components + hooks + API client + shared-types |
| **Security score**     | **8.2/10**                                                         |
| **Severity Breakdown** | 🔴 Critical: 0 \| 🟡 Medium: 4 \| 🟢 Low: 4 \| 💡 Info: 8          |

### Implementasi vs plan

| Deliverable plan                            | Status                              |
| ------------------------------------------- | ----------------------------------- |
| ReportService sales/profit-loss/top/cashier | ✅                                  |
| Export CSV + XLSX (server stream)           | ✅                                  |
| PDF via `window.print()` (no jspdf)         | ✅ sesuai D4 alternatif             |
| Dashboard angka real + refresh 30s          | ✅                                  |
| recharts SalesChart                         | ✅                                  |
| Roles OWNER/MANAGER only on `/v1/reports/*` | ✅                                  |
| Tenant + outlet filter                      | ✅ hampir semua path                |
| CSV formula injection sanitize              | ✅ (S5)                             |
| `kasir_id` filter di DTO                    | ⚠️ DTO ada, **service belum pakai** |

---

## 🟡 MEDIUM FINDINGS

### **RPT-001: CSV Cell Tidak Di-quote — CSV Injection / Parse Break**

| Field        | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| **Severity** | 🟡 **Medium**                                                  |
| **Category** | Injection / Data Integrity                                     |
| **File**     | `apps/api/src/modules/report/report.service.ts:18-25, 367-410` |
| **Plan ref** | S5 (formula injection)                                         |

**Problem:** `sanitizeCsvCell` hanya prefix `'` untuk `=+-@`, tapi **tidak meng-escape koma, quote, atau newline**. Nama produk/kasir yang berisi koma akan merusak kolom CSV; karakter `"` bisa memecah parsing Excel.

```typescript
function sanitizeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str; // ← tidak quote, tidak escape comma
}
// ...
return [header.join(','), ...rows.map((r) => r.join(','))];
```

**Attack / impact:**

1. Nama produk `Nasi, Pecel` → 2 kolom palsu di Excel.
2. Nama `=cmd|'/c calc'!A0` sudah dimitigasi prefix `'`.
3. Nama dengan newline bisa merusak file.

**Remediation:**

```typescript
function sanitizeCsvCell(value: string | number | null | undefined): string {
  let str = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  // Always quote if special chars
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
```

---

### **RPT-002: Product / User Lookup Tanpa Filter `tenant_id`**

| Field        | Value                                                     |
| ------------ | --------------------------------------------------------- |
| **Severity** | 🟡 **Medium**                                             |
| **Category** | Broken Access Control (defense-in-depth)                  |
| **File**     | `report.service.ts:241-248` (products), `292-295` (users) |

**Problem:** Setelah `groupBy` (sudah scoped tenant), detail digabung lewat:

```typescript
const products = await this.prisma.product.findMany({
  where: { id: { in: productIds } }, // ← no tenant_id
});
const users = await this.prisma.user.findMany({
  where: { id: { in: kasirIds } }, // ← no tenant_id
});
```

**Risiko:** Rendah karena ID berasal dari transaksi tenant yang sama. Jika ada bug/IDOR di tempat lain yang memasukkan UUID asing ke groupBy, nama produk/kasir tenant lain bisa bocor ke response.

**Remediation:**

```typescript
where: { id: { in: productIds }, tenant_id: tenantId }
where: { id: { in: kasirIds }, tenant_id: tenantId }
```

---

### **RPT-003: In-Memory Full Scan — DoS / Resource Exhaustion**

| Field        | Value                                                                |
| ------------ | -------------------------------------------------------------------- |
| **Severity** | 🟡 **Medium**                                                        |
| **Category** | Denial of Service                                                    |
| **File**     | `getSales` (findMany all txns), `getProfitLoss` (findMany all items) |

**Problem:** `getSales` dan `getProfitLoss` load **seluruh** transaksi/item periode ke heap Node, lalu agregasi di memory. Range tanggal 1–2 tahun + outlet ramai → memory spike / slow request.

**Remediation:**

1. Batasi max range (mis. 90 hari) di DTO/service — tolak jika lebih.
2. Atau pakai SQL `date_trunc` / `groupBy` di DB untuk sales.
3. Pagination / streaming untuk export besar.

---

### **RPT-004: Export Endpoint — Tidak Ada Rate Limit Khusus**

| Field        | Value                         |
| ------------ | ----------------------------- |
| **Severity** | 🟡 **Medium**                 |
| **Category** | Abuse / DoS                   |
| **File**     | `report.controller.ts` export |

**Problem:** Global throttle 100 req/min. Export XLSX/CSV yang mahal bisa dipanggil berulang oleh OWNER (compromised token) → CPU/memory pressure.

**Remediation:** `@Throttle({ default: { limit: 10, ttl: 60000 } })` pada `exportReport`, atau queue job (Sprint 8).

---

## 🟢 LOW FINDINGS

### **RPT-005: `kasir_id` di DTO Tidak Dipakai di Service**

| Field        | Value                                                     |
| ------------ | --------------------------------------------------------- |
| **Severity** | 🟢 **Low** (feature gap)                                  |
| **File**     | `report.dto.ts:28-29` vs `getSales` / `getCashierSummary` |

Filter `kasir_id` didefinisikan di DTO tapi **tidak di-apply** di `where`. Bukan bug security langsung; API misleading.

**Remediation:** Apply `kasir_id` ke filter transaction bila ada, atau hapus dari DTO sampai diimplementasi.

---

### **RPT-006: Date Boundary Timezone (UTC vs WIB)**

| Field        | Value                                                |
| ------------ | ---------------------------------------------------- |
| **Severity** | 🟢 **Low**                                           |
| **File**     | `buildDateFilter` — `setHours(0,0,0,0)` lokal server |

Sama pola Sprint 1 TXN-008. Server UTC vs bisnis Asia/Jakarta bisa off-by-one day di tepi tanggal.

**Remediation:** Explicit `Asia/Jakarta` (date-fns-tz / luxon) atau append `T00:00:00+07:00`.

---

### **RPT-007: Unused Import `StreamableFile` di Service**

| Field        | Value                 |
| ------------ | --------------------- |
| **Severity** | 🟢 **Low**            |
| **File**     | `report.service.ts:1` |

`StreamableFile` di-import di service tapi hanya dipakai di controller. Dead import — hygiene.

---

### **RPT-008: XLSX `require('xlsx')` Dinamis**

| Field        | Value                   |
| ------------ | ----------------------- |
| **Severity** | 🟢 **Low**              |
| **File**     | `report.service.ts:423` |

`require('xlsx')` di method — OK jika package ada di `api` dependencies. Pastikan `xlsx` di `apps/api/package.json` (bukan hanya transitive). Kalau missing di runtime → 500.

**Remediation:** `import * as XLSX from 'xlsx'` di top-level + pastikan dependency langsung.

---

## ✅ YANG SUDAH BAIK

| Area                               | Catatan                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| **S1 Tenant isolation**            | Semua aggregate filter `tenant_id` + `outlet_id` + `COMPLETED`                       |
| **S2 RBAC**                        | `@Roles(OWNER, MANAGER)` di semua report endpoints                                   |
| **S3 Content-Disposition**         | `attachment; filename="..."` + `nosniff`                                             |
| **S5 Formula injection (partial)** | Prefix `'` untuk `=+-@`                                                              |
| **S6 No disk write**               | Buffer → StreamableFile                                                              |
| **S7 Dashboard KASIR**             | Dashboard pakai summary/low-stock (bukan full report API) — OK                       |
| **Profit tanpa harga_beli**        | Skip + `items_tanpa_modal` counter + UI warning                                      |
| **XSS UI**                         | React text nodes; comment sadar XSS di table                                         |
| **Download blob**                  | `createObjectURL` + cleanup revoke — tidak innerHTML                                 |
| **Offline report**                 | Error UI + tidak queue offline sensitif                                              |
| **Plan D1–D6**                     | Module terpisah, re-use summary, profit di service, PDF print, xlsx export, recharts |

---

## 📋 REMEDIATION PRIORITY

| Priority | ID                                        | Effort |
| -------- | ----------------------------------------- | ------ |
| **P1**   | RPT-001 CSV quote/escape                  | 15 mnt |
| **P1**   | RPT-002 tenant filter product/user lookup | 5 mnt  |
| **P2**   | RPT-003 max date range                    | 30 mnt |
| **P2**   | RPT-004 throttle export                   | 10 mnt |
| **P3**   | RPT-005–008                               | rendah |

---

## ✅ VERIFICATION CHECKLIST

- [x] Report endpoints JWT + Roles OWNER/MANAGER
- [x] Filter tenant + outlet pada query utama
- [x] Export stream, tidak simpan file
- [x] Dashboard data real (bukan Rp 0)
- [x] recharts terpasang
- [x] Profit skip null `harga_beli`
- [ ] RPT-001 proper CSV quoting
- [ ] RPT-002 tenant on secondary lookups
- [ ] Max date range untuk prevent full table scan
- [ ] Typecheck monorepo (jalankan di CI)

---

## 📈 Cumulative Score

| Sprint | Score       | Catatan                           |
| ------ | ----------- | --------------------------------- |
| 0–4    | ~7.5–8.7    | Auth → QRIS                       |
| **5**  | **~8.2/10** | Reports solid; CSV + DoS residual |

**Kesimpulan:** Sprint 5 **aman untuk lanjut** setelah P1 (CSV + tenant secondary filter). Tidak ada critical. Implementasi selaras plan dan security checklist §8.

---

_Metodologi: PentesterFlow webvuln + race + recon._  
_Related: `docs/plans/sprint-5/IMPLEMENTATION_PLAN.md`, `docs/audit/SPRINT4-AUDIT.md`._
