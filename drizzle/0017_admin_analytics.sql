ALTER TABLE registration_tasks ADD COLUMN created_by uuid REFERENCES users(id), ADD COLUMN completed_by uuid REFERENCES users(id), ADD COLUMN completed_at timestamptz;
ALTER TABLE case_tasks ADD COLUMN created_by uuid REFERENCES users(id), ADD COLUMN completed_by uuid REFERENCES users(id);
--> statement-breakpoint
CREATE TABLE analytics_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 user_id uuid REFERENCES users(id) ON DELETE SET NULL, module text NOT NULL, event_name text NOT NULL, session_id uuid,
 occurred_at timestamptz NOT NULL DEFAULT now(), properties jsonb NOT NULL DEFAULT '{}',
 CHECK(length(module) <= 60 AND length(event_name) <= 120 AND pg_column_size(properties) <= 2048)
);
CREATE INDEX analytics_events_org_date_idx ON analytics_events(organization_id,occurred_at);
CREATE INDEX analytics_events_user_date_idx ON analytics_events(user_id,occurred_at);
CREATE INDEX analytics_events_digest_idx ON analytics_events(organization_id,(properties->>'digest_run_id'),occurred_at) WHERE event_name='digest_viewed' AND properties->>'source'='server';
--> statement-breakpoint
CREATE TABLE analytics_api_calls (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
 user_id uuid REFERENCES users(id) ON DELETE SET NULL, provider text NOT NULL, operation text NOT NULL, model text, source_ref text,
 started_at timestamptz NOT NULL DEFAULT now(), duration_ms integer CHECK(duration_ms >= 0), status_code integer,
 outcome text NOT NULL CHECK(outcome IN ('success','error','unknown')), cost_usd numeric(18,8) CHECK(cost_usd >= 0),
 input_tokens integer CHECK(input_tokens >= 0), output_tokens integer CHECK(output_tokens >= 0), properties jsonb NOT NULL DEFAULT '{}',
 CHECK(length(provider) <= 60 AND length(operation) <= 120 AND length(model) <= 180 AND length(source_ref) <= 220 AND pg_column_size(properties) <= 2048)
);
CREATE INDEX analytics_api_calls_org_date_idx ON analytics_api_calls(organization_id,started_at);
CREATE INDEX analytics_api_calls_provider_date_idx ON analytics_api_calls(provider,started_at);
CREATE INDEX analytics_api_calls_source_idx ON analytics_api_calls(source_ref) WHERE source_ref IS NOT NULL;
--> statement-breakpoint
CREATE TABLE analytics_email_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_key text NOT NULL UNIQUE, organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 run_id uuid NOT NULL, user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 event_type text NOT NULL CHECK(event_type IN ('delivered','bounced','failed','opened','clicked','complained')),
 occurred_at timestamptz NOT NULL DEFAULT now(), properties jsonb NOT NULL DEFAULT '{}',
 FOREIGN KEY(organization_id,run_id) REFERENCES watch_digest_runs(organization_id,id) ON DELETE CASCADE,
 CHECK(pg_column_size(properties) <= 2048)
);
CREATE INDEX analytics_email_events_run_idx ON analytics_email_events(organization_id,run_id,occurred_at);
--> statement-breakpoint
CREATE TABLE analytics_cost_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
 provider text NOT NULL, operation text, kind text NOT NULL CHECK(kind IN ('per_call','fixed_monthly','budget_monthly')),
 amount_usd numeric(18,8) NOT NULL CHECK(amount_usd >= 0), label text NOT NULL, effective_from date NOT NULL, effective_to date,
 created_by uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(effective_to IS NULL OR effective_to >= effective_from), CHECK(length(label) <= 180 AND length(provider) <= 60 AND length(operation) <= 120)
);
CREATE INDEX analytics_cost_rules_scope_idx ON analytics_cost_rules(organization_id,effective_from,effective_to);
--> statement-breakpoint
CREATE TABLE analytics_brand_assignments (
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
 user_id uuid REFERENCES users(id) ON DELETE SET NULL, assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
 assigned_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(organization_id,brand_id)
);
CREATE INDEX analytics_brand_assignments_user_idx ON analytics_brand_assignments(organization_id,user_id);
--> statement-breakpoint
CREATE TABLE analytics_snapshots (
 scope_key text PRIMARY KEY, filters jsonb NOT NULL, status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','ready','failed')),
 report jsonb, generated_at timestamptz, requested_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, error text,
 CHECK(length(scope_key) = 64)
);
CREATE INDEX analytics_snapshots_queue_idx ON analytics_snapshots(status,requested_at);
--> statement-breakpoint
CREATE INDEX analytics_audit_actor_date_idx ON audit_events(organization_id,actor_user_id,occurred_at);
CREATE INDEX analytics_review_date_idx ON match_reviews(organization_id,created_at);
CREATE INDEX analytics_auth_org_user_date_idx ON auth_sessions(organization_id,user_id,created_at);
