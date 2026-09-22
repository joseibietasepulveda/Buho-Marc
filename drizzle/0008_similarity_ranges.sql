ALTER TABLE organizations ALTER COLUMN watch_settings SET DEFAULT '{"high":0.65,"medium":0.45}'::jsonb;
--> statement-breakpoint
UPDATE organizations o SET watch_settings = '{"high":0.65,"medium":0.45}'::jsonb
WHERE watch_settings = '{"high":0.6,"medium":0.3}'::jsonb
AND NOT EXISTS (SELECT 1 FROM audit_events a WHERE a.organization_id = o.id AND a.action = 'watch.settings_changed');
