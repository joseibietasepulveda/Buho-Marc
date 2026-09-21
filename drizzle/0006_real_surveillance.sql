ALTER TABLE matches ALTER COLUMN published_at DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE matches ADD COLUMN evidence jsonb NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE monitoring_jobs ADD COLUMN request jsonb NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE monitoring_jobs ADD COLUMN result jsonb;
--> statement-breakpoint
ALTER TABLE monitoring_jobs ADD COLUMN attempt_count integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE monitoring_jobs ADD COLUMN available_at timestamptz NOT NULL DEFAULT now();
--> statement-breakpoint
ALTER TABLE monitoring_jobs ADD COLUMN lease_token uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX monitoring_one_active_brand ON monitoring_jobs (organization_id, brand_id) WHERE status IN ('queued', 'running', 'retry');
--> statement-breakpoint
CREATE INDEX monitoring_ready_idx ON monitoring_jobs (status, available_at);
--> statement-breakpoint
CREATE TABLE similarity_search_locks (organization_id uuid PRIMARY KEY CONSTRAINT similarity_search_locks_organization_id_organizations_id_fk REFERENCES organizations(id) ON DELETE CASCADE, token uuid NOT NULL, expires_at timestamptz NOT NULL);
