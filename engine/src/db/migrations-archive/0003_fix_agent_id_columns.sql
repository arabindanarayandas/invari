-- Fix the agent_id column naming conflict in request_logs
-- 1. First rename the varchar agent_id to agent_identifier
ALTER TABLE "request_logs" RENAME COLUMN "agent_id" TO "agent_identifier";

-- 2. Then rename project_id to agent_id (UUID FK)
ALTER TABLE "request_logs" RENAME COLUMN "project_id" TO "agent_id";

-- 3. Update the foreign key constraint
ALTER TABLE "request_logs" DROP CONSTRAINT IF EXISTS "request_logs_project_id_projects_id_fk";
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_agent_id_agents_id_fk"
  FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;

-- 4. Update the index (drop old one if exists and create new one)
DROP INDEX IF EXISTS "idx_logs_agent_timestamp";
CREATE INDEX "idx_logs_agent_timestamp" ON "request_logs" USING btree ("agent_id","timestamp" DESC NULLS LAST);
