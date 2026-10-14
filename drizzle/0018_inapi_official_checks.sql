CREATE TABLE inapi_official_checks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 source_id uuid REFERENCES source_records(id) ON DELETE CASCADE,
 application_number varchar(30) NOT NULL,
 check_day date NOT NULL,
 status varchar(20) NOT NULL,
 started_at timestamp with time zone,
 completed_at timestamp with time zone,
 error text,
 created_at timestamp with time zone NOT NULL DEFAULT now(),
 CONSTRAINT inapi_official_check_status CHECK (status IN ('running','changed','unchanged','failed','limited'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX inapi_official_check_day_uq ON inapi_official_checks(application_number,check_day);
--> statement-breakpoint
CREATE INDEX inapi_official_check_budget_idx ON inapi_official_checks(started_at);
--> statement-breakpoint
CREATE FUNCTION bump_inapi_check_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO snapshot_revisions(organization_id,scope,revision)
 SELECT DISTINCT organization_id,'registrations',1 FROM source_snapshots
 WHERE source_id=COALESCE(NEW.source_id,OLD.source_id)
 ON CONFLICT(organization_id,scope) DO UPDATE SET revision=snapshot_revisions.revision+1;
 RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER refresh_inapi_check_snapshot AFTER INSERT OR UPDATE OR DELETE ON inapi_official_checks FOR EACH ROW EXECUTE FUNCTION bump_inapi_check_revision();
