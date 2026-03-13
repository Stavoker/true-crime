-- Suspects pool (used in cases)
CREATE TABLE IF NOT EXISTS suspects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  surname TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  age INT NOT NULL CHECK (age >= 18 AND age <= 80),
  job TEXT NOT NULL,
  hobby TEXT NOT NULL,
  bad_habit TEXT NOT NULL,
  foot_size INT NOT NULL CHECK (foot_size >= 36 AND foot_size <= 50),
  hair_color TEXT NOT NULL,
  biography TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cases (murder scenarios)
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intro_text TEXT NOT NULL,
  body_location TEXT NOT NULL,
  tool_description TEXT NOT NULL,
  evidence_description TEXT NOT NULL,
  difficulty INT NOT NULL CHECK (difficulty >= 3 AND difficulty <= 5),
  killer_id UUID NOT NULL REFERENCES suspects(id) ON DELETE CASCADE,
  motive TEXT NOT NULL,
  confession_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Which suspects appear in which case + their testimony (killer = hint, others = red herring)
CREATE TABLE IF NOT EXISTS case_suspects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  suspect_id UUID NOT NULL REFERENCES suspects(id) ON DELETE CASCADE,
  is_killer BOOLEAN NOT NULL DEFAULT false,
  testimony_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(case_id, suspect_id)
);

-- Enable RLS
ALTER TABLE suspects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_suspects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read suspects" ON suspects FOR SELECT USING (true);
CREATE POLICY "Allow public read cases" ON cases FOR SELECT USING (true);
CREATE POLICY "Allow public read case_suspects" ON case_suspects FOR SELECT USING (true);
