-- Add spouse_status column to distinguish current vs ex-spouse (divorced).
-- 'current' = married now (solid pink edge), 'ex' = divorced (dashed gray edge with label).
ALTER TABLE members ADD COLUMN IF NOT EXISTS spouse_status text NOT NULL DEFAULT 'current'
  CHECK (spouse_status IN ('current', 'ex'));

CREATE INDEX IF NOT EXISTS idx_members_spouse_status ON members(spouse_status);
