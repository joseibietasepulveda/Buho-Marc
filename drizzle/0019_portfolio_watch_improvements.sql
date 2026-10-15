-- Local roles live on the organization portfolio relation, never on shared INAPI records.
UPDATE brands SET monitoring_config = monitoring_config || jsonb_build_object('monitoringEnabled',true,'portfolioRole',COALESCE(monitoring_config->>'portfolioRole','own')), status='Activa', updated_at=now() WHERE archived_at IS NULL;
--> statement-breakpoint
CREATE TABLE portfolio_discovery_runs (
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 day date NOT NULL, representative_rut text NOT NULL, offset_cursor integer NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','complete','failed','limited')),
 attempts integer NOT NULL DEFAULT 0, discovered integer NOT NULL DEFAULT 0,
 lease_token uuid, lease_until timestamptz, retry_at timestamptz NOT NULL DEFAULT now(), error text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,day)
);
--> statement-breakpoint
ALTER TABLE watch_digest_runs ADD COLUMN delivery_mode text NOT NULL DEFAULT 'email' CHECK(delivery_mode IN ('email','review'));
ALTER TABLE watch_glm_decisions ADD COLUMN evidence_fingerprint text;
--> statement-breakpoint
CREATE FUNCTION watch_mark_material(mark jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_object('applicationId',mark->'applicationId','name',mark->'name','type',mark->'type',
 'image',mark->'image','classes',mark->'classes','coverage',mark->'coverage','holders',mark->'holders',
 'status',mark->'status','statusCode',mark->'statusCode','publishedAt',mark->'publishedAt',
 'registeredAt',mark->'registeredAt','officialDecision',mark->'officialDecision');
$$;
CREATE FUNCTION watch_evidence_fingerprint(evidence jsonb) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT md5(jsonb_build_array(watch_mark_material(evidence->'query'),watch_mark_material(evidence->'hit'))::text);
$$;
UPDATE watch_glm_decisions SET evidence_fingerprint=watch_evidence_fingerprint(jsonb_build_object('query',cross_snapshot->'reference','hit',cross_snapshot->'candidate'));
--> statement-breakpoint
CREATE TRIGGER refresh_watch_ai_decision AFTER INSERT OR UPDATE OR DELETE ON watch_glm_decisions FOR EACH ROW EXECUTE FUNCTION bump_snapshot_revision('watch,portfolio');
CREATE TRIGGER refresh_watch_ai_run AFTER INSERT OR UPDATE OR DELETE ON watch_digest_runs FOR EACH ROW EXECUTE FUNCTION bump_snapshot_revision('watch');
