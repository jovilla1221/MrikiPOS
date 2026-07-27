# Workflow Registry

This registry is the authoritative reference guide for the entire MrikiPOS system. It maps every component, every workflow, and every user-facing interaction.

## View 1: Workflows (The Master List)

| Workflow | Spec file | Status | Trigger | Primary actor | Last reviewed |
|---|---|---|---|---|---|
| User Login (HP/PIN) | WORKFLOW-user-login.md | Missing | POST /auth/login | Auth service | - |
| User Login (Google) | WORKFLOW-google-login.md | Missing | POST /auth/google | Auth service | - |
| OTP Verification (Fonnte) | WORKFLOW-otp-verification.md | Missing | POST /auth/verify | Auth service | - |
| Order Checkout | WORKFLOW-order-checkout.md | Missing | POST /transaction | Transaction service | - |
| Offline Transaction Sync | WORKFLOW-offline-sync.md | Missing | POST /transaction/sync | Transaction service | - |
| Void Request & Approval | WORKFLOW-void-transaction.md | Missing | POST /transaction/:id/void-request | Transaction service | - |
| QRIS Payment Intent | WORKFLOW-qris-payment.md | Missing | POST /payment/qris | Payment service | - |
| Midtrans Webhook | WORKFLOW-midtrans-webhook.md | Missing | POST /payment/webhook | Payment service | - |
| Product Import | WORKFLOW-product-import.md | Missing | POST /upload/products/import | Upload service | - |
| Stock Opname (Adjustment) | WORKFLOW-stock-adjustment.md | Missing | POST /inventory/products/:id/stock | Inventory service | - |
| Open/Close Shift | WORKFLOW-shift-management.md | Missing | POST /shift/open, /shift/close | Shift service | - |

## View 2: By Component

| Component | File(s) | Workflows it participates in |
|---|---|---|
| Auth API | `apps/api/src/modules/auth/auth.controller.ts` | User Login, OTP Verification, Google Login |
| Transaction API | `apps/api/src/modules/transaction/transaction.controller.ts` | Order Checkout, Offline Sync, Void Request |
| Payment API | `apps/api/src/modules/payment/payment.controller.ts` | QRIS Payment, Midtrans Webhook |
| Inventory API | `apps/api/src/modules/inventory/inventory.controller.ts` | Stock Opname |
| Shift API | `apps/api/src/modules/shift/shift.controller.ts` | Open/Close Shift |
| Upload API | `apps/api/src/modules/upload/upload.controller.ts` | Product Import |

## View 3: By User Journey

### Customer Journeys
| What the customer experiences | Underlying workflow(s) | Entry point |
|---|---|---|
| Pays using QRIS | QRIS Payment Intent -> Midtrans Webhook | `apps/web/src/app/(dashboard)/pos` |

### Operator Journeys
| What the operator does | Underlying workflow(s) | Entry point |
|---|---|---|
| Logs into the POS | User Login (HP/PIN) -> OTP Verification | `/login` |
| Syncs offline transactions | Offline Transaction Sync | POS Dashboard |
| Requests a void | Void Request & Approval | Transaction History |
| Opens a shift | Open Shift | Shift Modal |
| Imports products from Excel | Product Import | Product List |
| Performs stock opname | Stock Opname | Inventory Dashboard |

### System-to-System Journeys
| What happens automatically | Underlying workflow(s) | Trigger |
|---|---|---|
| Payment status updates | Midtrans Webhook | Midtrans server push |

## View 4: State Map

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| PENDING (Payment) | QRIS Payment Intent | -> PAID, FAILED, EXPIRED | Midtrans Webhook |
| OPEN (Shift) | Open Shift | -> CLOSED | Close Shift |
| PENDING (Transaction) | Order Checkout | -> COMPLETED, VOIDED | Payment completion, Void Request |
