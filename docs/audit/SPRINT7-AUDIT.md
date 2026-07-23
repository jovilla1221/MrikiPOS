# Sprint 7 — Security Audit Request & Handoff Document

**Status:** Remediated & Ready for Re-audit  
**Date:** 22 Juli 2026  
**Audience:** Security Auditor / Lead Developer  

---

## 1. Executive Summary

Sprint 7 has successfully delivered:
1. **Explicit RBAC Enforcement**: Audit across all API controller methods ensuring explicit `@Roles(...)` metadata. Public access is restricted strictly to `@Public()` endpoints (Auth, Health, and signature-verified webhooks).
2. **Multi-User Lifecycle & Safeguards**: OWNER-only user management with soft-deactivation (`is_active = false`), last active OWNER protection, 6-digit PIN hashing with bcrypt (cost 12), and session revocation on user mutation/PIN reset.
3. **Audit Trail Foundation**: `AuditService.log()` with atomic transaction logging and recursive redaction of sensitive credentials (`pin`, `pin_hash`, `token`, `otp`, `secret`, `authorization`). Read-only API for OWNER/MANAGER.
4. **Approval Core Workflow & Race Safety**: Discriminated approval requests (`VOID`, `PRICE_CHANGE`, `SHIFT_CLOSE`) with validated JSON metadata. State machine transitions `PENDING -> APPROVED` or `PENDING -> REJECTED` enforced via conditional `updateMany` (race-safe & idempotent). Self-approval is strictly forbidden, and detail reads are requester/manager-outlet scoped.
5. **Sensitive Actions Integration**:
   - `VOID`: Void request endpoint & approved atomic execution (stock restoration + shift decrement + audit).
   - `PRICE_CHANGE`: Price request endpoint & approved atomic price update.
   - `SHIFT_CLOSE`: Threshold check (> Rp50.000 variance requires manager/owner approval) with outlet-scoped atomic claim.
6. **Frontend UX & Role-Aware Navigation**:
   - Role-aware navigation sidebar.
   - `/users` page (OWNER only).
   - `/approvals` page with inbox, history, my requests, and decision modals.
   - `/audit-logs` read-only page with JSON diff viewer.
   - `/settings` page (OWNER only).

---

## 2. Decision Record (G0–G4)

- **G0 (Sprint 6 Baseline)**: PASSED. All unit tests, route guards, entrypoints, and typechecks passed cleanly.
- **G1 (Session Revocation)**: Blacklist per `jti` plus a short-lived per-user `revoked_after` cutoff in Redis; refresh tokens are revoked on user mutation and PIN reset.
- **G2 (Metadata Approval)**: `metadata Json?` is applied by the additive migration `20260722_add_approval_scope` and validated at the DTO/service boundary.
- **G3 (Approval Per Outlet)**: `outlet_id String? @db.Uuid` and the tenant/outlet/status index are applied by the same migration for stable Manager inbox scoping.
- **G4 (Unsupported Domain Actions)**: `REFUND` (without full payment gateway) and `STOCK_TRANSFER` return explicit 400 `APPROVAL_ACTION_UNSUPPORTED` error code.

---

## 3. Automated Verification Results

| Verification Step | Command | Status |
| :--- | :--- | :--- |
| **API Unit Test Suite** | `pnpm --filter api test -- --runInBand` | **PASSED (133/133 tests in 18 suites)** |
| **RBAC Metadata Audit** | `rbac-metadata.spec.ts` | **PASSED (including User, Approval, and Audit controllers)** |
| **User Safeguards** | `user.spec.ts` | **PASSED (Last OWNER protection & PIN redaction)** |
| **Audit Foundation** | `audit.spec.ts` | **PASSED (Recursive redaction & isolation)** |
| **Approval Core** | `approval.spec.ts` | **PASSED (Self-approval block & 409 race safety)** |
| **Sensitive Actions** | `sensitive-actions.spec.ts` | **PASSED (Void, Price Change, Shift Close)** |
| **Route Protection** | `pnpm test:routes` | **PASSED** |
| **Workspace Entrypoints** | `pnpm test:entrypoints` | **PASSED** |
| **Linter** | `pnpm lint` | **PASSED (0 errors; existing warnings remain)** |
| **Typecheck** | `pnpm typecheck` + API `tsc --noEmit` | **PASSED** |
| **API Production Build** | `pnpm --filter api build` | **PASSED** |
| **Web Production Build** | `pnpm --filter web build` | **PASSED** |
| **Prisma Schema** | `prisma validate` | **PASSED** |

## 5. Remediation Notes

- Direct transaction void is now OWNER-only, PIN-protected, outlet-scoped, and claims `COMPLETED` before restoring stock or decrementing shift totals. Approved void and approved shift-close use the same conditional-claim pattern.
- Unsupported `REFUND` and `STOCK_TRANSFER` requests fail with `APPROVAL_ACTION_UNSUPPORTED`; no approval can reach a terminal state without an executor.
- Product updates and tenant settings now write redacted audit events in the same Prisma transaction. The settings page reads and persists the tenant API instead of showing a local-only success message.
- The repository had no prior Prisma migration history. The new migration is intentionally additive for an existing database; establish/verify the baseline schema before using `migrate deploy` on a brand-new database.
- Web lint reports only pre-existing image optimization/configuration warnings; no lint errors were introduced.

---

## 4. Scope for Security Auditor

Please review the implementation against:
1. `apps/api/src/common/rbac/rbac-policy.ts` and controller role annotations.
2. `apps/api/src/modules/user/user.service.ts` for tenant isolation and last owner safeguards.
3. `apps/api/src/modules/audit/audit.service.ts` for recursive redaction of sensitive credentials.
4. `apps/api/src/modules/approval/approval.service.ts` for atomic state transitions and race protection.
