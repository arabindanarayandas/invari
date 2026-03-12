-- Migration: initial schema
-- Created: 2026-02-23
-- Description: Initial database schema with users, agents, API schemas, request logs, and API access logs

-- ============================================
-- UP Migration
-- ============================================

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create agents table
CREATE TABLE IF NOT EXISTS "agents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "target_base_url" text NOT NULL,
  "flux_api_key" varchar(64) NOT NULL UNIQUE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "agents_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action
);

-- Create api_schemas table
CREATE TABLE IF NOT EXISTS "api_schemas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL,
  "version" varchar(50),
  "schema_spec" jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "api_schemas_agent_id_agents_id_fk"
    FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE cascade ON UPDATE no action
);

-- Create request_logs table
CREATE TABLE IF NOT EXISTS "request_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL,
  "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
  "agent_identifier" varchar(255),
  "http_method" varchar(10) NOT NULL,
  "endpoint_path" text NOT NULL,
  "latency_total_ms" integer,
  "overhead_ms" integer,
  "status" varchar(20) NOT NULL,
  "request_headers" jsonb,
  "query_params" jsonb,
  "original_body" jsonb,
  "sanitized_body" jsonb,
  "response_status" integer,
  "response_headers" jsonb,
  "response_body" jsonb,
  "drift_details" jsonb,
  CONSTRAINT "request_logs_agent_id_agents_id_fk"
    FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE cascade ON UPDATE no action
);

-- Create api_access_logs table
CREATE TABLE IF NOT EXISTS "api_access_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
  "http_method" varchar(10) NOT NULL,
  "endpoint_path" text NOT NULL,
  "action_type" varchar(50) NOT NULL,
  "ip_address" varchar(45) NOT NULL,
  "response_status" integer NOT NULL,
  "latency_ms" integer,
  "user_agent" text,
  CONSTRAINT "api_access_logs_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action
);

-- Create indexes for request_logs
CREATE INDEX IF NOT EXISTS "idx_logs_agent_timestamp"
  ON "request_logs" ("agent_id", "timestamp" DESC);

-- Create indexes for api_access_logs
CREATE INDEX IF NOT EXISTS "idx_api_access_user_timestamp"
  ON "api_access_logs" ("user_id", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS "idx_api_access_action_timestamp"
  ON "api_access_logs" ("action_type", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS "idx_api_access_ip_timestamp"
  ON "api_access_logs" ("ip_address", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS "idx_api_access_timestamp"
  ON "api_access_logs" ("timestamp" DESC);

CREATE INDEX IF NOT EXISTS "idx_api_access_response_status"
  ON "api_access_logs" ("response_status");

-- ============================================
-- DOWN Migration (for rollback)
-- ============================================
-- To rollback this migration, create a new migration with:
-- DROP TABLE IF EXISTS "api_access_logs" CASCADE;
-- DROP TABLE IF EXISTS "request_logs" CASCADE;
-- DROP TABLE IF EXISTS "api_schemas" CASCADE;
-- DROP TABLE IF EXISTS "agents" CASCADE;
-- DROP TABLE IF EXISTS "users" CASCADE;
