CREATE TABLE "registration_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"public_code" varchar(30) NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_number" varchar(30) NOT NULL,
	"registration_number" varchar(30),
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_type" varchar(30) NOT NULL,
	"public_code" varchar(30) NOT NULL,
	"source_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"trigger" varchar(20) NOT NULL,
	"scheduled_day" date,
	"status" varchar(20) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"requested" integer DEFAULT 0 NOT NULL,
	"received" integer DEFAULT 0 NOT NULL,
	"changed" integer DEFAULT 0 NOT NULL,
	"notifications" integer DEFAULT 0 NOT NULL,
	"baseline" integer DEFAULT 0 NOT NULL,
	"request" jsonb NOT NULL,
	"error" text,
	"detail" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "change_detail" jsonb;--> statement-breakpoint
ALTER TABLE "registration_applications" ADD CONSTRAINT "registration_applications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_snapshots" ADD CONSTRAINT "source_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_snapshots" ADD CONSTRAINT "source_snapshots_source_id_source_records_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_sync_runs" ADD CONSTRAINT "source_sync_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "applications_org_code_uq" ON "registration_applications" USING btree ("organization_id","public_code");--> statement-breakpoint
CREATE UNIQUE INDEX "source_application_uq" ON "source_records" USING btree ("application_number");--> statement-breakpoint
CREATE UNIQUE INDEX "source_registration_uq" ON "source_records" USING btree ("registration_number");--> statement-breakpoint
CREATE UNIQUE INDEX "snapshots_entity_uq" ON "source_snapshots" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "sync_runs_org_date_idx" ON "source_sync_runs" USING btree ("organization_id","started_at");