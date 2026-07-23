# Sprint 7 — Plans

Folder ini berisi SOP implementasi Sprint 7.

| File                                                   | Isi                                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** | RBAC, user management, approval workflow, audit trail, integrasi aksi sensitif, dan UI |
| **[EXECUTION_PLAN.md](./EXECUTION_PLAN.md)**           | Urutan eksekusi rinci, dependency, quality gate, dan handoff task untuk Sprint 7       |

## Mulai di sini

1. Baca `IMPLEMENTATION_PLAN.md` sampai selesai.
2. Baca `EXECUTION_PLAN.md` untuk dependency dan urutan task yang dapat dieksekusi.
3. Patuhi `docs/SYSTEM_PROMPT.md` dan matriks RBAC Section 3.
4. Kerjakan Phase A → H berurutan.
5. Setelah selesai, minta audit security di `docs/audit/SPRINT7-AUDIT.md`.

## Scope singkat

- **In:** RBAC enforcement, multi-user lifecycle, approval request/approve/reject, audit log, void/price-change/shift-close integration, users/approvals/audit UI.
- **Out:** SSO/OAuth, dynamic permission builder, SIEM, approval kompleks berbasis nominal, WebSocket realtime.

## Model Prisma yang sudah tersedia

- `User` + `UserRole`
- `ApprovalLog` + `ApprovalType` + `ApprovalStatus`
- `AuditLog`

Schema tidak boleh diubah kecuali kebutuhan metadata approval disetujui dan dibuat migration.
