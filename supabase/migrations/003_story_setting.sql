-- Add setting (theme) so each case uses one coherent location: intro + place + weapon + body match.
ALTER TABLE story_intros ADD COLUMN IF NOT EXISTS setting TEXT;
ALTER TABLE story_places ADD COLUMN IF NOT EXISTS setting TEXT;
ALTER TABLE story_weapons ADD COLUMN IF NOT EXISTS setting TEXT;
ALTER TABLE story_body_locations ADD COLUMN IF NOT EXISTS setting TEXT;
