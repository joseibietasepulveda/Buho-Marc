CREATE TABLE "inapi_request_clock" (
  "id" integer PRIMARY KEY NOT NULL,
  "last_finished_at" timestamp with time zone,
  "blocked_until" timestamp with time zone,
  CONSTRAINT "inapi_clock_singleton" CHECK ("id" = 1)
);
--> statement-breakpoint
INSERT INTO "inapi_request_clock" ("id") VALUES (1);
--> statement-breakpoint
CREATE TABLE "inapi_recovery_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL REFERENCES "source_records"("id") ON DELETE CASCADE,
  "application_number" varchar(30) NOT NULL,
  "need_key" varchar(64) NOT NULL,
  "needs" jsonb NOT NULL,
  "status" varchar(20) DEFAULT 'queued' NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "inapi_recovery_need_uq" ON "inapi_recovery_jobs" ("application_number", "need_key");
--> statement-breakpoint
CREATE INDEX "inapi_recovery_queue_idx" ON "inapi_recovery_jobs" ("status", "created_at");
