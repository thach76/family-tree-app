-- Add spouse_id column to support spousal relationships as actual member links.
-- spouse_name remains as a free-text fallback for spouses not in the tree.
ALTER TABLE members ADD COLUMN IF NOT EXISTS spouse_id uuid REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_spouse_id ON members(spouse_id);
