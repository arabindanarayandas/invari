ALTER TABLE "request_logs" ADD COLUMN "request_headers" jsonb;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "query_params" jsonb;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "response_status" integer;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "response_headers" jsonb;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "response_body" jsonb;