/*
# Genealogy (Family Tree) Schema — single-tenant, no auth

1. Overview
   This migration creates the data model for a multi-branch family tree
   (Cây Gia Phả) application. It supports multiple clans (dòng họ), each
   containing members organized by generation. Members can link to a mother
   who belongs to a different clan (the maternal / "Họ Ngoại" branch), which
   enables expanding the maternal tree on demand.

2. New Tables
   - `clans`
     - `id` (uuid, primary key)
     - `name` (text, not null) — display name of the clan, e.g. "Họ Nguyễn"
     - `description` (text) — short history / note about the clan
     - `kind` (text, not null, default 'noi') — 'noi' (paternal) or 'ngoai' (maternal)
     - `created_at` (timestamptz)
   - `members`
     - `id` (uuid, primary key)
     - `clan_id` (uuid, references clans, on delete cascade)
     - `name` (text, not null) — full name of the member
     - `gender` (text, not null) — 'male' or 'female'
     - `generation` (int, not null, default 1) — generation number (1 = earliest known ancestor)
     - `father_id` (uuid, references members, nullable) — father within the same clan; drives the paternal tree
     - `mother_id` (uuid, references members, nullable) — mother, typically a member of a different (maternal) clan; enables "Xem nhánh Họ Ngoại"
     - `spouse_name` (text, nullable) — name of spouse married into this clan (display only)
     - `birth_date_lunar` (text, nullable) — birth date in lunar calendar (free text)
     - `death_date_lunar` (text, nullable) — death date in lunar calendar (free text)
     - `is_alive` (boolean, not null, default true) — true = living, false = deceased
     - `bio` (text, nullable) — short biography
     - `created_at` (timestamptz)

3. New Functions
   - `get_maternal_tree(mother_id uuid)` — given a member id that is a mother
     (a member belonging to a maternal clan), returns that member plus all of
     her paternal ancestors (walking up `father_id` within her own clan) so the
     client can render the maternal branch. Returns a set of `members` rows.

4. Security
   - RLS enabled on both `clans` and `members`.
   - This is a single-tenant app with no sign-in screen, so anon + authenticated
     are granted full CRUD. The data is intentionally public/shared.

5. Notes
   - `father_id` is the primary structural link for building a clan's tree.
   - `mother_id` is the cross-clan link used by the maternal-tree RPC.
   - A self-referential foreign key (`father_id`) is used; inserts should be
     ordered root-first so the parent exists before the child.
*/

CREATE TABLE IF NOT EXISTS clans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'noi' CHECK (kind IN ('noi', 'ngoai')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clans" ON clans;
CREATE POLICY "anon_select_clans" ON clans FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clans" ON clans;
CREATE POLICY "anon_insert_clans" ON clans FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clans" ON clans;
CREATE POLICY "anon_update_clans" ON clans FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clans" ON clans;
CREATE POLICY "anon_delete_clans" ON clans FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  generation int NOT NULL DEFAULT 1,
  father_id uuid REFERENCES members(id) ON DELETE SET NULL,
  mother_id uuid REFERENCES members(id) ON DELETE SET NULL,
  spouse_name text,
  birth_date_lunar text,
  death_date_lunar text,
  is_alive boolean NOT NULL DEFAULT true,
  bio text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_clan_id ON members(clan_id);
CREATE INDEX IF NOT EXISTS idx_members_father_id ON members(father_id);
CREATE INDEX IF NOT EXISTS idx_members_mother_id ON members(mother_id);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_members" ON members;
CREATE POLICY "anon_select_members" ON members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_members" ON members;
CREATE POLICY "anon_insert_members" ON members FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_members" ON members;
CREATE POLICY "anon_update_members" ON members FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_members" ON members;
CREATE POLICY "anon_delete_members" ON members FOR DELETE
  TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION get_maternal_tree(mother_id uuid)
RETURNS SETOF members
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE ancestor_chain AS (
    SELECT * FROM members WHERE id = mother_id
    UNION ALL
    SELECT m.*
    FROM members m
    JOIN ancestor_chain a ON m.id = a.father_id
  )
  SELECT * FROM ancestor_chain;
$$;
