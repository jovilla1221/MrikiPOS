-- Sprint 7 approval scope fields. Keep this migration additive so it can be
-- applied to databases provisioned before the approval module was introduced.
ALTER TABLE "approval_logs"
  ADD COLUMN IF NOT EXISTS "outlet_id" UUID;

ALTER TABLE "approval_logs"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'approval_logs_outlet_id_fkey'
  ) THEN
    ALTER TABLE "approval_logs"
      ADD CONSTRAINT "approval_logs_outlet_id_fkey"
      FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "approval_logs_tenant_id_outlet_id_status_idx"
  ON "approval_logs"("tenant_id", "outlet_id", "status");
