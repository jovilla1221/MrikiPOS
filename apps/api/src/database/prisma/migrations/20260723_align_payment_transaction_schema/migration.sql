-- Align production with nullable payment lifecycle fields and the indexes
-- already declared in schema.prisma. All changes are additive.
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "payments_referensi_idx"
  ON "payments"("referensi");

CREATE INDEX IF NOT EXISTS "transactions_tenant_id_outlet_id_created_at_idx"
  ON "transactions"("tenant_id", "outlet_id", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "transactions_tenant_id_local_id_key"
  ON "transactions"("tenant_id", "local_id");
