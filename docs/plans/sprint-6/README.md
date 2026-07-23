# Sprint 6 — Plans

Folder ini berisi instruksi implementasi untuk agent/developer.

| File                                                   | Isi                                                                                                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** | Rencana lengkap Sprint 6: Customer DB, Kasbon (piutang), Shift open/close, wire ke transaksi/QRIS, dashboard kasbon, WA reminder manual |

## Mulai di sini

1. Baca `IMPLEMENTATION_PLAN.md` dari atas ke bawah.
2. Patuhi `docs/SYSTEM_PROMPT.md` dan keputusan **D1–D8** (terutama D3b shift optional, D4b kas vs QRIS).
3. Kerjakan Phase A → G berurutan: **Customer → Credit → Shift → Wire → Types → FE → Harden**.
4. Setelah selesai, minta audit ke `docs/audit/SPRINT6-AUDIT.md`.

## Scope singkat

| In                                       | Out                             |
| ---------------------------------------- | ------------------------------- |
| Customer CRUD + search                   | Loyalty / voucher               |
| Kasbon create/pay/overdue/summary        | Cron WA harian (stub OK)        |
| Shift open/close/current/history         | Approval multi-level (Sprint 7) |
| Attach shift ke transaksi COMPLETED/PAID | Multi-outlet stock transfer     |
| Dashboard total kasbon real              | Package baru                    |

## Schema sudah ada

Tidak perlu invent table baru — pakai model Prisma:

- `Customer`
- `CustomerCredit` + `CreditStatus`
- `Shift` + `ShiftStatus`
- FK di `Transaction`: `customer_id`, `shift_id`
