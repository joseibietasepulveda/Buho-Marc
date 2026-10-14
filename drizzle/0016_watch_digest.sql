CREATE TABLE watch_digest_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 idempotency_key text NOT NULL, trigger text NOT NULL CHECK (trigger IN ('manual','scheduled')),
 requested_by uuid REFERENCES users(id), status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','retry','sending','sent','failed','uncertain','prepared')),
 candidate_ids jsonb NOT NULL DEFAULT '[]', cursor integer NOT NULL DEFAULT 0, evaluated integer NOT NULL DEFAULT 0,
 available integer NOT NULL DEFAULT 0, filtered_low_score integer NOT NULL DEFAULT 0, failures integer NOT NULL DEFAULT 0, limited boolean NOT NULL DEFAULT false,
 payload jsonb, email jsonb, evaluation_input jsonb, lease_token uuid, lease_until timestamptz, available_at timestamptz NOT NULL DEFAULT now(),
 send_attempts integer NOT NULL DEFAULT 0, first_send_at timestamptz, resend_id text, delivery_uncertain boolean NOT NULL DEFAULT false,
 error text, sent_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,idempotency_key), UNIQUE(organization_id,id)
);
CREATE UNIQUE INDEX watch_digest_one_active_org ON watch_digest_runs(organization_id) WHERE status IN ('queued','running','retry','sending');
CREATE INDEX watch_digest_pending_idx ON watch_digest_runs(status,available_at,created_at);
--> statement-breakpoint
CREATE TABLE watch_glm_decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE, run_id uuid NOT NULL,
 model text NOT NULL, prompt_version integer NOT NULL, decision jsonb NOT NULL, cross_snapshot jsonb NOT NULL,
 notified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,match_id), FOREIGN KEY(organization_id,run_id) REFERENCES watch_digest_runs(organization_id,id) ON DELETE CASCADE
);
CREATE INDEX watch_glm_unsent_idx ON watch_glm_decisions(organization_id,run_id) WHERE notified_at IS NULL;
--> statement-breakpoint
CREATE TABLE watch_glm_calls (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 run_id uuid NOT NULL, request_hash text NOT NULL, reserved_usd numeric(14,8) NOT NULL CHECK(reserved_usd >= 0),
 cost_usd numeric(14,8) CHECK(cost_usd >= 0), result jsonb, started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 UNIQUE(run_id,request_hash), FOREIGN KEY(organization_id,run_id) REFERENCES watch_digest_runs(organization_id,id) ON DELETE CASCADE
);
CREATE INDEX watch_glm_calls_month_idx ON watch_glm_calls(started_at);
--> statement-breakpoint
CREATE TABLE watch_digest_images (
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, key text NOT NULL,
 content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(organization_id,key)
);
