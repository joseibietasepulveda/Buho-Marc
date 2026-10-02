ALTER TABLE "notifications" ADD COLUMN "dismissed_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "notifications_active_idx" ON "notifications" ("organization_id", "created_at") WHERE "dismissed_at" IS NULL;
