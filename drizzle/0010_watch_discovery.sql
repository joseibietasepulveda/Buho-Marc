-- Keep the original surveillance start; never use the day the UI is opened.
UPDATE brands b SET monitoring_config = monitoring_config || jsonb_build_object('watchStartedAt', first.started_at)
FROM (SELECT brand_id, min(COALESCE(started_at, created_at)) AS started_at FROM monitoring_jobs WHERE status = 'success' GROUP BY brand_id) first
WHERE b.id = first.brand_id AND NOT (b.monitoring_config ? 'watchStartedAt');
--> statement-breakpoint
UPDATE matches m SET evidence = evidence || jsonb_build_object('discoveryKind',
  CASE
    WHEN evidence->'hit'->>'publishedAt' >= to_char((b.monitoring_config->>'watchStartedAt')::timestamptz AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') THEN 'publication'
    WHEN evidence->'hit'->>'filedAt' >= to_char((b.monitoring_config->>'watchStartedAt')::timestamptz AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') THEN 'filing'
    ELSE 'baseline'
  END)
FROM brands b WHERE b.id = m.brand_id AND m.source = 'DeQuiénEs' AND NOT (m.evidence ? 'discoveryKind');
--> statement-breakpoint
-- Existing explicit follow decisions remain opted in. A direct case conversion
-- without a follow decision does not opt in to similarity notifications.
UPDATE matches m SET evidence = evidence || jsonb_build_object('followedAt', COALESCE(
  (SELECT min(created_at)::text FROM match_reviews r WHERE r.match_id=m.id AND r.decision='En seguimiento'), m.updated_at::text))
WHERE m.source='DeQuiénEs' AND NOT (m.evidence ? 'followedAt') AND
 (m.review_status='En seguimiento' OR (m.review_status='Convertida en caso' AND EXISTS
   (SELECT 1 FROM match_reviews r WHERE r.match_id=m.id AND r.decision='En seguimiento')));
--> statement-breakpoint
ALTER TABLE organizations ALTER COLUMN watch_settings SET DEFAULT '{"high":0.7,"medium":0.55}'::jsonb;
--> statement-breakpoint
-- Replace the previous defaults; preserve deliberately saved portfolio settings.
UPDATE organizations o SET watch_settings = '{"high":0.7,"medium":0.55}'::jsonb
WHERE watch_settings IN ('{"high":0.65,"medium":0.45}'::jsonb, '{"high":0.6,"medium":0.3}'::jsonb)
AND NOT EXISTS (SELECT 1 FROM audit_events a WHERE a.organization_id=o.id AND a.action='watch.settings_changed');
