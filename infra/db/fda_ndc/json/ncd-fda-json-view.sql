CREATE SCHEMA IF NOT EXISTS fda_ndc_json;

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
FROM fda_ndc_json_raw.openfda_ndc_json;

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
FROM fda_ndc_json_raw.openfda_ndc_json r
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
FROM fda_ndc_json_raw.openfda_ndc_json r
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
FROM fda_ndc_json_raw.openfda_ndc_json r
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
FROM fda_ndc_json_raw.openfda_ndc_json r
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
FROM fda_ndc_json_raw.openfda_ndc_json r
CROSS JOIN LATERAL jsonb_array_elements(r.record -> 'openfda' -> 'unii')
  WITH ORDINALITY AS unii(value, ordinality);
