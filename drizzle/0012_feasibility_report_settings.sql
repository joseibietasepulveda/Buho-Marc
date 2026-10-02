ALTER TABLE "organizations" ADD COLUMN "report_profile" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "report_profile_version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE "feasibility_conclusions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "context_hash" varchar(64) NOT NULL,
  "input" jsonb NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "output" jsonb,
  "model" varchar(180),
  "provider_id" varchar(180),
  "usage" jsonb,
  "cost" numeric(18,8),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  CONSTRAINT "feasibility_conclusions_org_context_uq" UNIQUE("organization_id","context_hash")
);
--> statement-breakpoint
CREATE INDEX "feasibility_conclusions_org_date_idx" ON "feasibility_conclusions" ("organization_id","created_at");
