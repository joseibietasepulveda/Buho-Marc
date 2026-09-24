ALTER TABLE organizations ADD COLUMN automatic_monitoring boolean NOT NULL DEFAULT true;
--> statement-breakpoint
UPDATE organizations SET automatic_monitoring = false WHERE slug = 'estudio-ibieta-ip';
--> statement-breakpoint
-- Preserve manual requests and completed results. A running review may finish.
UPDATE monitoring_jobs SET status = 'cancelled', completed_at = now(), lease_token = NULL
WHERE organization_id IN (SELECT id FROM organizations WHERE NOT automatic_monitoring)
  AND status IN ('queued', 'retry') AND idempotency_key NOT LIKE 'manual:%';
--> statement-breakpoint
CREATE TABLE snapshot_revisions (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope varchar(30) NOT NULL,
  revision bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, scope)
);
--> statement-breakpoint
CREATE FUNCTION bump_snapshot_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  before_row jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  after_row jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE '{}'::jsonb END;
  affected uuid[];
  org_id uuid;
  scope_name text;
BEGIN
  IF TG_OP = 'UPDATE' AND before_row - 'updated_at' = after_row - 'updated_at' THEN RETURN NULL; END IF;
  IF TG_TABLE_NAME = 'organizations' THEN
    affected := ARRAY[(COALESCE(after_row->>'id', before_row->>'id'))::uuid];
  ELSIF TG_TABLE_NAME = 'source_records' THEN
    SELECT array_agg(DISTINCT organization_id ORDER BY organization_id) INTO affected FROM source_snapshots
    WHERE source_id = (COALESCE(after_row->>'id', before_row->>'id'))::uuid;
    -- The source administration screen in the original demo space includes
    -- untracked records too. Only its source view needs that wider invalidation.
    INSERT INTO snapshot_revisions (organization_id, scope, revision)
      SELECT id, 'source', 1 FROM organizations WHERE slug = 'estudio-ibieta-ip'
      AND NOT id = ANY(COALESCE(affected, ARRAY[]::uuid[]))
    ON CONFLICT (organization_id, scope) DO UPDATE SET revision = snapshot_revisions.revision + 1;
  ELSIF TG_TABLE_NAME = 'users' THEN
    SELECT array_agg(organization_id ORDER BY organization_id) INTO affected FROM organization_members
    WHERE user_id = (COALESCE(after_row->>'id', before_row->>'id'))::uuid;
  ELSIF TG_TABLE_NAME = 'brand_classes' THEN
    SELECT ARRAY[organization_id] INTO affected FROM brands
    WHERE id = (COALESCE(after_row->>'brand_id', before_row->>'brand_id'))::uuid;
  ELSE
    SELECT array_agg(DISTINCT id ORDER BY id) INTO affected FROM unnest(ARRAY[
      (before_row->>'organization_id')::uuid, (after_row->>'organization_id')::uuid
    ]) id WHERE id IS NOT NULL;
  END IF;
  FOREACH org_id IN ARRAY COALESCE(affected, ARRAY[]::uuid[]) LOOP
    IF EXISTS (SELECT 1 FROM organizations WHERE id = org_id) THEN
      FOREACH scope_name IN ARRAY string_to_array(TG_ARGV[0], ',') LOOP
        INSERT INTO snapshot_revisions (organization_id, scope, revision) VALUES (org_id, scope_name, 1)
        ON CONFLICT (organization_id, scope) DO UPDATE SET revision = snapshot_revisions.revision + 1;
      END LOOP;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
DO $$
DECLARE spec text[];
BEGIN
  FOREACH spec SLICE 1 IN ARRAY ARRAY[
    ['organizations', 'portfolio,registrations,source,watch'],
    ['brands', 'portfolio,source,watch'],
    ['brand_classes', 'portfolio,watch'],
    ['matches', 'portfolio,watch'],
    ['monitoring_jobs', 'portfolio,watch'],
    ['source_records', 'portfolio,registrations,source,watch'],
    ['source_snapshots', 'portfolio,registrations,source,watch'],
    ['source_sync_runs', 'source'],
    ['registration_applications', 'portfolio,registrations,source'],
    ['registration_tasks', 'registrations'],
    ['cases', 'portfolio,source'],
    ['case_tasks', 'portfolio'],
    ['notifications', 'portfolio'],
    ['email_drafts', 'portfolio'],
    ['audit_events', 'portfolio'],
    ['client_contacts', 'portfolio'],
    ['users', 'portfolio'],
    ['organization_members', 'portfolio']
  ] LOOP
    EXECUTE format('CREATE TRIGGER refresh_snapshot AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION bump_snapshot_revision(%L)', spec[1], spec[2]);
  END LOOP;
END;
$$;
