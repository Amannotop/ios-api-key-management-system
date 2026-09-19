-- Create Package table
CREATE TABLE IF NOT EXISTS "packages" (
    "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL UNIQUE,
    "display_name" TEXT,
    "icon_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "packages_bundle_id_idx" ON "packages"("bundle_id");

-- Create KeyImport table
CREATE TABLE IF NOT EXISTS "key_imports" (
    "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "file_name" TEXT NOT NULL,
    "keys_imported" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errors" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create ApiProtection table
CREATE TABLE IF NOT EXISTS "api_protection" (
    "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "fingerprint" TEXT NOT NULL UNIQUE,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "last_request_at" TIMESTAMP NOT NULL,
    "first_seen_at" TIMESTAMP NOT NULL DEFAULT now(),
    "blocked_reason" TEXT
);

CREATE INDEX IF NOT EXISTS "api_protection_fingerprint_idx" ON "api_protection"("fingerprint");

-- Add bundle_ids column to license_keys if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'license_keys' AND column_name = 'bundle_ids'
    ) THEN
        ALTER TABLE "license_keys" ADD COLUMN "bundle_ids" TEXT[] DEFAULT '{}';
    END IF;
END $$;