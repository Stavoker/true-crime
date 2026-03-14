-- Story particle tables for procedural case generation.
-- Evidence always helps (points to killer); place/weapon/body_location can hint (link_job) or be "water" (no link).

-- Intros (atmosphere, one per case)
CREATE TABLE IF NOT EXISTS story_intros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Place of the crime (місце). link_job = hint when killer has this job; NULL = neutral/water.
CREATE TABLE IF NOT EXISTS story_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  link_job TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Murder weapon (предмет вбивства). link_job = hint; NULL = water.
CREATE TABLE IF NOT EXISTS story_weapons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  link_job TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Where the body was found (де знайшли тіло). link_job = hint; NULL = water.
CREATE TABLE IF NOT EXISTS story_body_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  link_job TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Evidence at crime scene (сліди на місці злочину). Always helps: we only pick rows that match the killer.
-- hint_type: foot_size | hair_color | gender | bad_habit | job
-- hint_value: e.g. '44', 'Brown', 'male', 'Smoking', 'Chef'
CREATE TABLE IF NOT EXISTS story_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  hint_type TEXT NOT NULL CHECK (hint_type IN ('foot_size', 'hair_color', 'gender', 'bad_habit', 'job')),
  hint_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE story_intros ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_body_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read story_intros" ON story_intros;
DROP POLICY IF EXISTS "Allow public read story_places" ON story_places;
DROP POLICY IF EXISTS "Allow public read story_weapons" ON story_weapons;
DROP POLICY IF EXISTS "Allow public read story_body_locations" ON story_body_locations;
DROP POLICY IF EXISTS "Allow public read story_evidence" ON story_evidence;
CREATE POLICY "Allow public read story_intros" ON story_intros FOR SELECT USING (true);
CREATE POLICY "Allow public read story_places" ON story_places FOR SELECT USING (true);
CREATE POLICY "Allow public read story_weapons" ON story_weapons FOR SELECT USING (true);
CREATE POLICY "Allow public read story_body_locations" ON story_body_locations FOR SELECT USING (true);
CREATE POLICY "Allow public read story_evidence" ON story_evidence FOR SELECT USING (true);
