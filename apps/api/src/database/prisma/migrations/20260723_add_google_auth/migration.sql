-- Add optional Google identity fields without changing existing phone/PIN accounts.
-- PostgreSQL unique indexes allow multiple NULL values, so legacy users remain valid.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email" VARCHAR(254),
  ADD COLUMN IF NOT EXISTS "google_sub" VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key"
  ON "users"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "users_google_sub_key"
  ON "users"("google_sub");
