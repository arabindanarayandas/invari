-- Rename projects table to agents
ALTER TABLE "projects" RENAME TO "agents";

-- Rename project_id columns to agent_id in related tables
ALTER TABLE "api_schemas" RENAME COLUMN "project_id" TO "agent_id";
ALTER TABLE "request_logs" RENAME COLUMN "project_id" TO "agent_id";

-- Rename foreign key constraints
ALTER TABLE "api_schemas" DROP CONSTRAINT IF EXISTS "api_schemas_project_id_projects_id_fk";
ALTER TABLE "api_schemas" ADD CONSTRAINT "api_schemas_agent_id_agents_id_fk"
  FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "request_logs" DROP CONSTRAINT IF EXISTS "request_logs_project_id_projects_id_fk";
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_agent_id_agents_id_fk"
  FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;

-- Rename the index
DROP INDEX IF EXISTS "idx_logs_project_timestamp";
CREATE INDEX "idx_logs_agent_timestamp" ON "request_logs" USING btree ("agent_id","timestamp" DESC NULLS LAST);

-- Rename constraints
ALTER TABLE "agents" RENAME CONSTRAINT "projects_flux_api_key_unique" TO "agents_flux_api_key_unique";
ALTER TABLE "agents" DROP CONSTRAINT IF EXISTS "projects_user_id_users_id_fk";
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
