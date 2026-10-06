-- Rewrite the inverted "Stale" saved view (last_n_days matched recent contacts)
-- and add the daily-use views that new seeds get.
UPDATE saved_views
SET
  filter = '{"op":"and","conditions":[{"field":"status","op":"is_one_of","value":["contacted","engaged","proposal_sent","negotiating"]},{"field":"lastContactedAt","op":"older_than_n_days","value":14}]}'::jsonb,
  sort = '[{"field":"lastContactedAt","dir":"asc"}]'::jsonb,
  updated_at = now()
WHERE scope = 'companies'
  AND name = 'Stale (no contact 14+ days)';
--> statement-breakpoint
UPDATE saved_views AS stale
SET name = 'Needs follow-up (14+ days)',
    updated_at = now()
WHERE stale.scope = 'companies'
  AND stale.name = 'Stale (no contact 14+ days)'
  AND NOT EXISTS (
    SELECT 1
    FROM saved_views AS other
    WHERE other.event_id = stale.event_id
      AND other.scope = stale.scope
      AND other.name = 'Needs follow-up (14+ days)'
      AND other.id <> stale.id
  );
--> statement-breakpoint
INSERT INTO saved_views (
  event_id, owner_id, scope, name, is_shared, is_default, display_order, filter, sort, columns
)
SELECT
  e.id,
  NULL,
  'companies',
  'Unassigned',
  true,
  false,
  50,
  '{"op":"and","conditions":[{"field":"ownerId","op":"is_empty"}]}'::jsonb,
  '[{"field":"companyName","dir":"asc"}]'::jsonb,
  '[]'::jsonb
FROM events e
WHERE NOT EXISTS (
  SELECT 1 FROM saved_views sv
  WHERE sv.event_id = e.id AND sv.scope = 'companies' AND sv.name = 'Unassigned'
);
--> statement-breakpoint
INSERT INTO saved_views (
  event_id, owner_id, scope, name, is_shared, is_default, display_order, filter, sort, columns
)
SELECT
  e.id,
  NULL,
  'companies',
  'Bounced',
  true,
  false,
  60,
  '{"op":"and","conditions":[{"field":"tags","op":"equals","value":"BOUNCED"}]}'::jsonb,
  '[{"field":"companyName","dir":"asc"}]'::jsonb,
  '[]'::jsonb
FROM events e
WHERE NOT EXISTS (
  SELECT 1 FROM saved_views sv
  WHERE sv.event_id = e.id AND sv.scope = 'companies' AND sv.name = 'Bounced'
);
--> statement-breakpoint
INSERT INTO saved_views (
  event_id, owner_id, scope, name, is_shared, is_default, display_order, filter, sort, columns
)
SELECT
  e.id,
  NULL,
  'companies',
  'By category',
  true,
  false,
  70,
  '{"op":"and","conditions":[]}'::jsonb,
  '[{"field":"category","dir":"asc"},{"field":"companyName","dir":"asc"}]'::jsonb,
  '["companyName","category","subcategory","status","ownerId","priority","lastContactedAt"]'::jsonb
FROM events e
WHERE NOT EXISTS (
  SELECT 1 FROM saved_views sv
  WHERE sv.event_id = e.id AND sv.scope = 'companies' AND sv.name = 'By category'
);
