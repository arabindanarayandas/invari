-- Migration: Add API Access Logs table for analytics
-- Created: 2026-02-11

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
	"user_agent" text
);

-- Add foreign key constraint
ALTER TABLE "api_access_logs" ADD CONSTRAINT "api_access_logs_user_id_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;

-- Create indexes for analytical queries
CREATE INDEX IF NOT EXISTS "idx_api_access_user_timestamp" ON "api_access_logs" ("user_id","timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_api_access_action_timestamp" ON "api_access_logs" ("action_type","timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_api_access_ip_timestamp" ON "api_access_logs" ("ip_address","timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_api_access_timestamp" ON "api_access_logs" ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_api_access_response_status" ON "api_access_logs" ("response_status");
