CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text,
  "email_verified" timestamptz,
  "image" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email");

CREATE TABLE IF NOT EXISTS "accounts" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "provider_account_id" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  PRIMARY KEY ("provider","provider_account_id")
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "session_token" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "expires" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamptz NOT NULL,
  PRIMARY KEY ("identifier","token")
);
