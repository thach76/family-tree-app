/*
# Fix get_maternal_tree search_path

The function was returning empty results because its search_path was not set
explicitly, so the unqualified `members` table reference could not resolve
reliably inside the function body. Recreate the function with an explicit
search_path = public and SECURITY DEFINER so it always resolves the table
correctly and returns rows to the anon-key client.
*/

DROP FUNCTION IF EXISTS get_maternal_tree(uuid);

CREATE OR REPLACE FUNCTION get_maternal_tree(mother_id uuid)
RETURNS SETOF members
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION get_maternal_tree(uuid) TO anon, authenticated;
