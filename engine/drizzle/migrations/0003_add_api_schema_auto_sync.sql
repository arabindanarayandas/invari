-- Migration: add api schema auto sync
-- Created: 2026-03-11
-- Description: Add tables for automated OpenAPI schema synchronization from URLs

-- ============================================
-- UP Migration
-- ============================================

-- Create api_schema_subscriptions table
CREATE TABLE IF NOT EXISTS "api_schema_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL UNIQUE,
  "source_url" text NOT NULL,
  "sync_interval" varchar(20) NOT NULL CHECK (sync_interval IN ('15min', '30min', '1hour', '6hours', '12hours', '24hours')),
  "next_run_at" timestamp with time zone NOT NULL,
  "last_attempt_at" timestamp with time zone,
  "last_success_at" timestamp with time zone,
  "last_version_hash" varchar(64),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "api_schema_subscriptions_agent_id_agents_id_fk"
    FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE cascade ON UPDATE no action
);

-- Create index for efficient sync job queries
CREATE INDEX IF NOT EXISTS "idx_api_schema_subscriptions_next_run"
  ON "api_schema_subscriptions" ("next_run_at")
  WHERE "is_active" = true;

-- Add subscription_id and version_hash to api_schemas table
ALTER TABLE "api_schemas"
  ADD COLUMN IF NOT EXISTS "subscription_id" uuid,
  ADD COLUMN IF NOT EXISTS "version_hash" varchar(64);

-- Add foreign key constraint for subscription_id
ALTER TABLE "api_schemas"
  ADD CONSTRAINT "api_schemas_subscription_id_api_schema_subscriptions_id_fk"
    FOREIGN KEY ("subscription_id") REFERENCES "api_schema_subscriptions"("id") ON DELETE set null ON UPDATE no action;

-- Create api_schema_sync_logs table
CREATE TABLE IF NOT EXISTS "api_schema_sync_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subscription_id" uuid NOT NULL,
  "status" varchar(20) NOT NULL CHECK (status IN ('success', 'failure', 'no_change')),
  "error_message" text,
  "latency_ms" integer NOT NULL,
  "fetch_duration_ms" integer,
  "validation_duration_ms" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "api_schema_sync_logs_subscription_id_api_schema_subscriptions_id_fk"
    FOREIGN KEY ("subscription_id") REFERENCES "api_schema_subscriptions"("id") ON DELETE cascade ON UPDATE no action
);

-- Create index for efficient log queries
CREATE INDEX IF NOT EXISTS "idx_api_schema_sync_logs_subscription_created"
  ON "api_schema_sync_logs" ("subscription_id", "created_at" DESC);

-- ============================================
-- DOWN Migration (for rollback)
-- ============================================
-- To rollback this migration, create a new migration with:
-- DROP INDEX IF EXISTS "idx_api_schema_sync_logs_subscription_created";
-- DROP TABLE IF EXISTS "api_schema_sync_logs" CASCADE;
-- ALTER TABLE "api_schemas" DROP CONSTRAINT IF EXISTS "api_schemas_subscription_id_api_schema_subscriptions_id_fk";
-- ALTER TABLE "api_schemas" DROP COLUMN IF EXISTS "subscription_id";
-- ALTER TABLE "api_schemas" DROP COLUMN IF EXISTS "version_hash";
-- DROP INDEX IF EXISTS "idx_api_schema_subscriptions_next_run";
-- DROP TABLE IF EXISTS "api_schema_subscriptions" CASCADE;
