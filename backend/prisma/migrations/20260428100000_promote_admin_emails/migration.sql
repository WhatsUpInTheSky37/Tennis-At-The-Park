-- Promote hardcoded admin emails to is_admin = true if they already exist.
-- Idempotent: running again has no effect.
UPDATE "users"
SET "is_admin" = true
WHERE LOWER("email") = LOWER('wfarrar@pms-corp.net')
  AND "is_admin" = false;
