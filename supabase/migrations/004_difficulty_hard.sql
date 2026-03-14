-- Allow difficulty 6 (hard: 6 suspects + double interrogation)
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_difficulty_check;
ALTER TABLE cases ADD CONSTRAINT cases_difficulty_check CHECK (difficulty >= 3 AND difficulty <= 6);

-- Second testimony for hard mode (repeated interrogation / lies)
ALTER TABLE case_suspects ADD COLUMN IF NOT EXISTS testimony_text_2 TEXT;
