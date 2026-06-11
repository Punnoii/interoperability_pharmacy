CREATE SCHEMA IF NOT EXISTS fda_ndc_json;

DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_ingredient_name_match_candidate;
DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_unmatched_ingredient;
DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_ingredient_unii_match;
DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_product_unii_candidate;
DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_product;

CREATE VIEW fda_ndc_json.ndc_fda_product AS
SELECT
  id AS raw_record_id,
  source_last_updated,
  record ->> 'product_id' AS product_id,
  record ->> 'product_ndc' AS product_ndc,
  record ->> 'brand_name' AS brand_name,
  record ->> 'generic_name' AS generic_name,
  (record ->> 'finished')::boolean AS finished,
  record ->> 'dosage_form' AS dosage_form,
  record ->> 'product_type' AS product_type,
  record ->> 'marketing_category' AS marketing_category,
  record ->> 'application_number' AS application_number,
  record ->> 'labeler_name' AS labeler_name,
  record ->> 'spl_id' AS spl_id,
  record
FROM fda_ndc_json_raw.fda_ndc_json;

DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_product_ingredient;

CREATE VIEW fda_ndc_json.ndc_fda_product_ingredient AS
SELECT
  r.id AS raw_record_id,
  r.source_last_updated,
  r.record ->> 'product_id' AS product_id,
  r.record ->> 'product_ndc' AS product_ndc,
  ingredient.ordinality AS ingredient_order,
  ingredient.value ->> 'name' AS ingredient_name,
  ingredient.value ->> 'strength' AS strength,
  ingredient.value AS ingredient_record
FROM fda_ndc_json_raw.fda_ndc_json r
CROSS JOIN LATERAL jsonb_array_elements(r.record -> 'active_ingredients')
  WITH ORDINALITY AS ingredient(value, ordinality);

DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_product_package;

CREATE VIEW fda_ndc_json.ndc_fda_product_package AS
SELECT
  r.id AS raw_record_id,
  r.source_last_updated,
  r.record ->> 'product_id' AS product_id,
  r.record ->> 'product_ndc' AS product_ndc,
  package.ordinality AS package_order,
  package.value ->> 'package_ndc' AS package_ndc,
  package.value ->> 'description' AS package_description,
  package.value ->> 'marketing_start_date' AS package_marketing_start_date,
  package.value ->> 'marketing_end_date' AS package_marketing_end_date,
  (package.value ->> 'sample')::boolean AS sample,
  package.value AS package_record
FROM fda_ndc_json_raw.fda_ndc_json r
CROSS JOIN LATERAL jsonb_array_elements(r.record -> 'packaging')
  WITH ORDINALITY AS package(value, ordinality);


DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_product_route;

CREATE VIEW fda_ndc_json.ndc_fda_product_route AS
SELECT
  r.id AS raw_record_id,
  r.source_last_updated,
  r.record ->> 'product_id' AS product_id,
  r.record ->> 'product_ndc' AS product_ndc,
  route.ordinality AS route_order,
  route.value #>> '{}' AS route_name
FROM fda_ndc_json_raw.fda_ndc_json r
CROSS JOIN LATERAL jsonb_array_elements(r.record -> 'route')
  WITH ORDINALITY AS route(value, ordinality);

DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_product_identifier;

CREATE VIEW fda_ndc_json.ndc_fda_product_identifier AS
SELECT
  r.id AS raw_record_id,
  r.source_last_updated,
  r.record ->> 'product_id' AS product_id,
  r.record ->> 'product_ndc' AS product_ndc,
  identifier.identifier_type,
  identifier.identifier_order,
  identifier.identifier_value
FROM fda_ndc_json_raw.fda_ndc_json r
CROSS JOIN LATERAL (
  SELECT 'RxCUI' AS identifier_type, value #>> '{}' AS identifier_value, ordinality AS identifier_order
  FROM jsonb_array_elements(r.record -> 'openfda' -> 'rxcui') WITH ORDINALITY AS x(value, ordinality)

  UNION ALL

  SELECT 'SPL_SET_ID' AS identifier_type, value #>> '{}' AS identifier_value, ordinality AS identifier_order
  FROM jsonb_array_elements(r.record -> 'openfda' -> 'spl_set_id') WITH ORDINALITY AS x(value, ordinality)

  UNION ALL

  SELECT 'UPC' AS identifier_type, value #>> '{}' AS identifier_value, ordinality AS identifier_order
  FROM jsonb_array_elements(r.record -> 'openfda' -> 'upc') WITH ORDINALITY AS x(value, ordinality)
) identifier;

DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_product_unii_candidate;

CREATE VIEW fda_ndc_json.ndc_fda_product_unii_candidate AS
SELECT
  r.id AS raw_record_id,
  r.source_last_updated,
  r.record ->> 'product_id' AS product_id,
  r.record ->> 'product_ndc' AS product_ndc,
  unii.ordinality AS unii_order,
  unii.value #>> '{}' AS unii
FROM fda_ndc_json_raw.fda_ndc_json r
CROSS JOIN LATERAL jsonb_array_elements(r.record -> 'openfda' -> 'unii')
  WITH ORDINALITY AS unii(value, ordinality);

DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_ingredient_unii_match;

-- OpenFDA exposes UNIIs at product level; do not align them to ingredients by array order.
CREATE VIEW fda_ndc_json.ndc_fda_ingredient_unii_match AS
SELECT DISTINCT
  i.raw_record_id,
  i.source_last_updated,
  i.product_id,
  i.product_ndc,
  i.ingredient_order,
  i.ingredient_name,
  upper(regexp_replace(trim(i.ingredient_name), '\s+', ' ', 'g')) AS ingredient_name_key,
  m.unii,
  'OPENFDA_UNII_EXACT_NAME' AS match_method,
  1.00::numeric AS confidence,
  'verified' AS match_status
FROM fda_ndc_json.ndc_fda_product_ingredient i
  JOIN fda_ndc_json.ndc_fda_product p
    ON p.product_id = i.product_id
  JOIN gsrs.unique_substance_name_lookup m
    ON m.name_key = upper(regexp_replace(trim(i.ingredient_name), '\s+', ' ', 'g'))
  JOIN fda_ndc_json.ndc_fda_product_unii_candidate u
    ON u.product_id = i.product_id
    AND u.unii = m.unii
  JOIN gsrs.substance s
    ON s.unii = m.unii
WHERE p.finished = true
  AND s.status = 'approved'
  AND i.ingredient_name IS NOT NULL
  AND m.unii IS NOT NULL;

DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_unmatched_ingredient;

CREATE VIEW fda_ndc_json.ndc_fda_unmatched_ingredient AS
SELECT DISTINCT
  i.product_id,
  i.ingredient_order,
  i.ingredient_name,
  upper(regexp_replace(trim(i.ingredient_name), '\s+', ' ', 'g')) AS ingredient_name_key
FROM fda_ndc_json.ndc_fda_product_ingredient i
JOIN fda_ndc_json.ndc_fda_product p
  ON p.product_id = i.product_id
LEFT JOIN fda_ndc_json.ndc_fda_ingredient_unii_match m
  ON m.product_id = i.product_id
 AND m.ingredient_order = i.ingredient_order
WHERE p.finished = true
  AND i.ingredient_name IS NOT NULL
  AND m.unii IS NULL;

DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_ingredient_name_match_candidate;

CREATE VIEW fda_ndc_json.ndc_fda_ingredient_name_match_candidate AS
SELECT
  u.product_id,
  u.ingredient_order,
  u.ingredient_name,
  u.ingredient_name_key,
  m.unii AS matched_unii,
  'EXACT_NAME' AS match_method,
  0.85::numeric AS confidence,
  'candidate' AS match_status

FROM fda_ndc_json.ndc_fda_unmatched_ingredient u
JOIN gsrs.unique_substance_name_lookup m
  ON m.name_key = u.ingredient_name_key;
