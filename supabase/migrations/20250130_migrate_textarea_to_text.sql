-- Migration to update textarea field types to text in existing collections
-- This migration updates all 'textarea' field types to 'text' in the collections schema

UPDATE collections 
SET schema = (
  SELECT jsonb_set(
    schema,
    '{fields}',
    (
      SELECT jsonb_agg(
        CASE 
          WHEN field->>'type' = 'textarea' THEN
            jsonb_set(field, '{type}', '"text"')
          ELSE 
            field
        END
      )
      FROM jsonb_array_elements(schema->'fields') AS field
    )
  )
  FROM collections c2 
  WHERE c2.id = collections.id
)
WHERE schema->'fields' @> '[{"type": "textarea"}]'; 