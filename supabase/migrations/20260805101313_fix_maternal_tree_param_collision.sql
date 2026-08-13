/*
# Fix get_maternal_tree parameter/column name collision

The function parameter `mother_id` collided with the `members.mother_id` column
name inside the function body. In SQL functions, unqualified names resolve to
columns before parameters, so `WHERE id = mother_id` matched the column (which
is NULL for most rows) instead of the function argument. Use positional
parameter `$1` to disambiguate.
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
    SELECT * FROM members WHERE id = $1
    UNION ALL
    SELECT m.*
    FROM members m
    JOIN ancestor_chain a ON m.id = a.father_id
  )
  SELECT * FROM ancestor_chain;
$$;

GRANT EXECUTE ON FUNCTION get_maternal_tree(uuid) TO anon, authenticated;
