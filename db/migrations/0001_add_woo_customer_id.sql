ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "woo_customer_id" integer;
CREATE INDEX IF NOT EXISTS "users_woo_customer_id_idx" ON "users" ("woo_customer_id");
