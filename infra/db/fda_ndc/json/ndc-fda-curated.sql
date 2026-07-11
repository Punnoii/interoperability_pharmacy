CREATE SCHEMA IF NOT EXISTS fda_ndc_json;

DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_ingredient_name_match_candidate;
DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_unmatched_ingredient;
DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_ingredient_unii_match;
DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_product_unii_candidate;
DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_product_identifier;
DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_product_route;
DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_product_package;
DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_product_ingredient;
DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_product;

DROP TABLE IF EXISTS fda_ndc_json.active_ingredient_name_match_candidate CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.unmatched_active_ingredient CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.pharmaceutical_product_comprises_openfda_substance CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.pharmaceutical_product_comprises_gsrs_substance CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.active_ingredient_played_by_openfda_substance CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.active_ingredient_played_by_gsrs_substance CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.openfda_substance_has_name CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.openfda_substance_name CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.openfda_substance CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.product_composition_has_active_ingredient CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.active_ingredient CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.packaged_medicinal_product_has_identifier CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.package_identifier CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.medicinal_product_has_packaged_medicinal_product CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.packaged_medicinal_product CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.pharmaceutical_product_has_route CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.route_of_administration CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.pharmaceutical_product_has_dose_form CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.pharmaceutical_dose_form CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.product_composition_defines_pharmaceutical_product CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.pharmaceutical_product_defined_in_product_composition CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.product_composition_defines_medicinal_product CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.medicinal_product_defined_in_product_composition CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.product_composition CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.medicinal_product_comprises_pharmaceutical_product CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.pharmaceutical_product CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.medicinal_product_has_unii_candidate CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.product_unii_candidate CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.medicinal_product_identifier_has_type CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.medicinal_product_identifier_type CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.medicinal_product_has_identifier CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.medicinal_product_identifier CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.medicinal_product_has_name CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.medicinal_product_name CASCADE;
DROP TABLE IF EXISTS fda_ndc_json.medicinal_product CASCADE;

CREATE TABLE fda_ndc_json.medicinal_product (
  product_id TEXT PRIMARY KEY,
  raw_record_id BIGINT NOT NULL UNIQUE REFERENCES fda_ndc_json_raw.fda_ndc_json(id) ON DELETE CASCADE,
  source_last_updated TEXT,
  product_ndc TEXT,
  brand_name TEXT,
  generic_name TEXT,
  dosage_form TEXT,
  product_type TEXT,
  marketing_category TEXT,
  application_number TEXT,
  labeler_name TEXT,
  spl_id TEXT,
  record JSONB NOT NULL
);

INSERT INTO fda_ndc_json.medicinal_product (
  product_id,
  raw_record_id,
  source_last_updated,
  product_ndc,
  brand_name,
  generic_name,
  dosage_form,
  product_type,
  marketing_category,
  application_number,
  labeler_name,
  spl_id,
  record
)
SELECT DISTINCT ON (product_id)
  product_id,
  raw_record_id,
  source_last_updated,
  product_ndc,
  brand_name,
  generic_name,
  dosage_form,
  product_type,
  marketing_category,
  application_number,
  labeler_name,
  spl_id,
  record
FROM (
  SELECT
    NULLIF(trim(record ->> 'product_id'), '') AS product_id,
    id AS raw_record_id,
    source_last_updated,
    NULLIF(trim(record ->> 'product_ndc'), '') AS product_ndc,
    NULLIF(trim(record ->> 'brand_name'), '') AS brand_name,
    NULLIF(trim(record ->> 'generic_name'), '') AS generic_name,
    CASE lower(record ->> 'finished')
      WHEN 'true' THEN true
      WHEN 'false' THEN false
      ELSE NULL
    END AS finished,
    NULLIF(trim(record ->> 'dosage_form'), '') AS dosage_form,
    NULLIF(trim(record ->> 'product_type'), '') AS product_type,
    NULLIF(trim(record ->> 'marketing_category'), '') AS marketing_category,
    NULLIF(trim(record ->> 'application_number'), '') AS application_number,
    NULLIF(trim(record ->> 'labeler_name'), '') AS labeler_name,
    NULLIF(trim(record ->> 'spl_id'), '') AS spl_id,
    record
  FROM fda_ndc_json_raw.fda_ndc_json
) source
WHERE product_id IS NOT NULL
  AND finished = true
ORDER BY product_id, raw_record_id;

CREATE TABLE fda_ndc_json.medicinal_product_name (
  product_name_key TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  brand_name TEXT,
  generic_name TEXT
);

INSERT INTO fda_ndc_json.medicinal_product_name (
  product_name_key,
  product_name,
  brand_name,
  generic_name
)
SELECT
  product_id || '-name' AS product_name_key,
  COALESCE(brand_name, generic_name) AS product_name,
  brand_name,
  generic_name
FROM fda_ndc_json.medicinal_product
WHERE COALESCE(brand_name, generic_name) IS NOT NULL;

CREATE TABLE fda_ndc_json.medicinal_product_has_name (
  product_id TEXT NOT NULL REFERENCES fda_ndc_json.medicinal_product(product_id) ON DELETE CASCADE,
  product_name_key TEXT NOT NULL REFERENCES fda_ndc_json.medicinal_product_name(product_name_key) ON DELETE CASCADE,
  PRIMARY KEY (product_id, product_name_key)
);

INSERT INTO fda_ndc_json.medicinal_product_has_name (product_id, product_name_key)
SELECT
  product_id,
  product_id || '-name' AS product_name_key
FROM fda_ndc_json.medicinal_product
WHERE COALESCE(brand_name, generic_name) IS NOT NULL;

CREATE TABLE fda_ndc_json.medicinal_product_identifier (
  identifier_key TEXT PRIMARY KEY,
  identifier_type TEXT NOT NULL,
  identifier_type_key TEXT NOT NULL,
  identifier_value TEXT NOT NULL,
  identifier_order INTEGER NOT NULL
);

WITH product_ndc_identifier AS (
  SELECT
    product_id || '-identifier-product-ndc' AS identifier_key,
    'NDC_PRODUCT' AS identifier_type,
    'ndc-product' AS identifier_type_key,
    product_ndc AS identifier_value,
    0 AS identifier_order
  FROM fda_ndc_json.medicinal_product
  WHERE product_ndc IS NOT NULL
),
openfda_identifier AS (
  SELECT
    p.product_id,
    identifier.identifier_type,
    lower(regexp_replace(identifier.identifier_type, '[^A-Za-z0-9]+', '-', 'g')) AS identifier_type_key,
    NULLIF(trim(identifier.identifier_value), '') AS identifier_value,
    identifier.identifier_order::INTEGER AS identifier_order
  FROM fda_ndc_json.medicinal_product p
  CROSS JOIN LATERAL (
    SELECT 'RxCUI' AS identifier_type, value #>> '{}' AS identifier_value, ordinality AS identifier_order
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(p.record -> 'openfda' -> 'rxcui') = 'array'
          THEN p.record -> 'openfda' -> 'rxcui'
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS x(value, ordinality)

    UNION ALL

    SELECT 'SPL_SET_ID' AS identifier_type, value #>> '{}' AS identifier_value, ordinality AS identifier_order
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(p.record -> 'openfda' -> 'spl_set_id') = 'array'
          THEN p.record -> 'openfda' -> 'spl_set_id'
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS x(value, ordinality)

    UNION ALL

    SELECT 'UPC' AS identifier_type, value #>> '{}' AS identifier_value, ordinality AS identifier_order
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(p.record -> 'openfda' -> 'upc') = 'array'
          THEN p.record -> 'openfda' -> 'upc'
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS x(value, ordinality)
  ) identifier
),
all_identifiers AS (
  SELECT
    identifier_key,
    identifier_type,
    identifier_type_key,
    identifier_value,
    identifier_order
  FROM product_ndc_identifier

  UNION ALL

  SELECT
    product_id || '-identifier-' || identifier_type_key || '-' || identifier_order AS identifier_key,
    identifier_type,
    identifier_type_key,
    identifier_value,
    identifier_order
  FROM openfda_identifier
  WHERE identifier_value IS NOT NULL
)
INSERT INTO fda_ndc_json.medicinal_product_identifier (
  identifier_key,
  identifier_type,
  identifier_type_key,
  identifier_value,
  identifier_order
)
SELECT DISTINCT ON (identifier_key)
  identifier_key,
  identifier_type,
  identifier_type_key,
  identifier_value,
  identifier_order
FROM all_identifiers
ORDER BY identifier_key, identifier_order;

CREATE TABLE fda_ndc_json.medicinal_product_has_identifier (
  product_id TEXT NOT NULL REFERENCES fda_ndc_json.medicinal_product(product_id) ON DELETE CASCADE,
  identifier_key TEXT NOT NULL REFERENCES fda_ndc_json.medicinal_product_identifier(identifier_key) ON DELETE CASCADE,
  PRIMARY KEY (product_id, identifier_key)
);

INSERT INTO fda_ndc_json.medicinal_product_has_identifier (product_id, identifier_key)
SELECT
  split_part(identifier_key, '-identifier-', 1) AS product_id,
  identifier_key
FROM fda_ndc_json.medicinal_product_identifier;

CREATE TABLE fda_ndc_json.medicinal_product_identifier_type (
  identifier_type_key TEXT PRIMARY KEY,
  identifier_type TEXT NOT NULL
);

INSERT INTO fda_ndc_json.medicinal_product_identifier_type (identifier_type_key, identifier_type)
SELECT
  identifier_type_key,
  MIN(identifier_type) AS identifier_type
FROM fda_ndc_json.medicinal_product_identifier
GROUP BY identifier_type_key;

CREATE TABLE fda_ndc_json.medicinal_product_identifier_has_type (
  identifier_key TEXT NOT NULL REFERENCES fda_ndc_json.medicinal_product_identifier(identifier_key) ON DELETE CASCADE,
  identifier_type_key TEXT NOT NULL REFERENCES fda_ndc_json.medicinal_product_identifier_type(identifier_type_key) ON DELETE CASCADE,
  PRIMARY KEY (identifier_key, identifier_type_key)
);

INSERT INTO fda_ndc_json.medicinal_product_identifier_has_type (
  identifier_key,
  identifier_type_key
)
SELECT
  identifier_key,
  identifier_type_key
FROM fda_ndc_json.medicinal_product_identifier;

CREATE TABLE fda_ndc_json.product_unii_candidate (
  product_unii_key TEXT PRIMARY KEY,
  raw_record_id BIGINT NOT NULL REFERENCES fda_ndc_json_raw.fda_ndc_json(id) ON DELETE CASCADE,
  unii_order INTEGER NOT NULL,
  unii TEXT NOT NULL
);

WITH unii_source AS (
  SELECT
    p.product_id,
    p.raw_record_id,
    unii.ordinality::INTEGER AS unii_order,
    NULLIF(trim(unii.value #>> '{}'), '') AS unii
  FROM fda_ndc_json.medicinal_product p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(p.record -> 'openfda' -> 'unii') = 'array'
        THEN p.record -> 'openfda' -> 'unii'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS unii(value, ordinality)
)
INSERT INTO fda_ndc_json.product_unii_candidate (
  product_unii_key,
  raw_record_id,
  unii_order,
  unii
)
SELECT
  product_id || '-unii-' || unii_order AS product_unii_key,
  raw_record_id,
  unii_order,
  unii
FROM unii_source
WHERE unii IS NOT NULL;

CREATE TABLE fda_ndc_json.medicinal_product_has_unii_candidate (
  product_id TEXT NOT NULL REFERENCES fda_ndc_json.medicinal_product(product_id) ON DELETE CASCADE,
  product_unii_key TEXT NOT NULL REFERENCES fda_ndc_json.product_unii_candidate(product_unii_key) ON DELETE CASCADE,
  PRIMARY KEY (product_id, product_unii_key)
);

INSERT INTO fda_ndc_json.medicinal_product_has_unii_candidate (
  product_id,
  product_unii_key
)
SELECT
  split_part(product_unii_key, '-unii-', 1) AS product_id,
  product_unii_key
FROM fda_ndc_json.product_unii_candidate;

CREATE TABLE fda_ndc_json.pharmaceutical_product (
  pharmaceutical_product_key TEXT PRIMARY KEY,
  product_id TEXT NOT NULL UNIQUE REFERENCES fda_ndc_json.medicinal_product(product_id) ON DELETE CASCADE
);

INSERT INTO fda_ndc_json.pharmaceutical_product (pharmaceutical_product_key, product_id)
SELECT
  product_id AS pharmaceutical_product_key,
  product_id
FROM fda_ndc_json.medicinal_product;

CREATE TABLE fda_ndc_json.medicinal_product_comprises_pharmaceutical_product (
  product_id TEXT NOT NULL REFERENCES fda_ndc_json.medicinal_product(product_id) ON DELETE CASCADE,
  pharmaceutical_product_key TEXT NOT NULL REFERENCES fda_ndc_json.pharmaceutical_product(pharmaceutical_product_key) ON DELETE CASCADE,
  PRIMARY KEY (product_id, pharmaceutical_product_key)
);

INSERT INTO fda_ndc_json.medicinal_product_comprises_pharmaceutical_product (
  product_id,
  pharmaceutical_product_key
)
SELECT
  product_id,
  pharmaceutical_product_key
FROM fda_ndc_json.pharmaceutical_product;

CREATE TABLE fda_ndc_json.product_composition (
  product_composition_key TEXT PRIMARY KEY,
  ingredient_count INTEGER NOT NULL,
  strength_count INTEGER NOT NULL,
  composition_type TEXT NOT NULL
);

WITH ingredient_counts AS (
  SELECT
    p.product_id,
    COUNT(i.ingredient_key)::INTEGER AS ingredient_count,
    COUNT(i.ingredient_key) FILTER (
      WHERE i.strength IS NOT NULL
        AND trim(i.strength) <> ''
    )::INTEGER AS strength_count
  FROM fda_ndc_json.medicinal_product p
  LEFT JOIN LATERAL (
    SELECT
      p.product_id || '-ingredient-' || ingredient.ordinality AS ingredient_key,
      ingredient.value ->> 'strength' AS strength
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(p.record -> 'active_ingredients') = 'array'
          THEN p.record -> 'active_ingredients'
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS ingredient(value, ordinality)
    WHERE NULLIF(trim(ingredient.value ->> 'name'), '') IS NOT NULL
  ) i
    ON true
  GROUP BY p.product_id
)
INSERT INTO fda_ndc_json.product_composition (
  product_composition_key,
  ingredient_count,
  strength_count,
  composition_type
)
SELECT
  product_id || '-composition' AS product_composition_key,
  ingredient_count,
  strength_count,
  CASE
    WHEN ingredient_count > 0 AND strength_count = ingredient_count THEN 'quantitative'
    WHEN ingredient_count > 0 THEN 'qualitative'
    ELSE 'unspecified'
  END AS composition_type
FROM ingredient_counts;

CREATE TABLE fda_ndc_json.medicinal_product_defined_in_product_composition (
  product_id TEXT NOT NULL REFERENCES fda_ndc_json.medicinal_product(product_id) ON DELETE CASCADE,
  product_composition_key TEXT NOT NULL REFERENCES fda_ndc_json.product_composition(product_composition_key) ON DELETE CASCADE,
  PRIMARY KEY (product_id, product_composition_key)
);

INSERT INTO fda_ndc_json.medicinal_product_defined_in_product_composition (
  product_id,
  product_composition_key
)
SELECT
  product_id,
  product_id || '-composition' AS product_composition_key
FROM fda_ndc_json.medicinal_product;

CREATE TABLE fda_ndc_json.product_composition_defines_medicinal_product (
  product_composition_key TEXT NOT NULL REFERENCES fda_ndc_json.product_composition(product_composition_key) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES fda_ndc_json.medicinal_product(product_id) ON DELETE CASCADE,
  PRIMARY KEY (product_composition_key, product_id)
);

INSERT INTO fda_ndc_json.product_composition_defines_medicinal_product (
  product_composition_key,
  product_id
)
SELECT
  product_composition_key,
  product_id
FROM fda_ndc_json.medicinal_product_defined_in_product_composition;

CREATE TABLE fda_ndc_json.pharmaceutical_product_defined_in_product_composition (
  pharmaceutical_product_key TEXT NOT NULL REFERENCES fda_ndc_json.pharmaceutical_product(pharmaceutical_product_key) ON DELETE CASCADE,
  product_composition_key TEXT NOT NULL REFERENCES fda_ndc_json.product_composition(product_composition_key) ON DELETE CASCADE,
  PRIMARY KEY (pharmaceutical_product_key, product_composition_key)
);

INSERT INTO fda_ndc_json.pharmaceutical_product_defined_in_product_composition (
  pharmaceutical_product_key,
  product_composition_key
)
SELECT
  pharmaceutical_product_key,
  pharmaceutical_product_key || '-composition' AS product_composition_key
FROM fda_ndc_json.pharmaceutical_product;

CREATE TABLE fda_ndc_json.product_composition_defines_pharmaceutical_product (
  product_composition_key TEXT NOT NULL REFERENCES fda_ndc_json.product_composition(product_composition_key) ON DELETE CASCADE,
  pharmaceutical_product_key TEXT NOT NULL REFERENCES fda_ndc_json.pharmaceutical_product(pharmaceutical_product_key) ON DELETE CASCADE,
  PRIMARY KEY (product_composition_key, pharmaceutical_product_key)
);

INSERT INTO fda_ndc_json.product_composition_defines_pharmaceutical_product (
  product_composition_key,
  pharmaceutical_product_key
)
SELECT
  product_composition_key,
  pharmaceutical_product_key
FROM fda_ndc_json.pharmaceutical_product_defined_in_product_composition;

CREATE TABLE fda_ndc_json.pharmaceutical_dose_form (
  dose_form_key TEXT PRIMARY KEY,
  dose_form TEXT NOT NULL
);

INSERT INTO fda_ndc_json.pharmaceutical_dose_form (dose_form_key, dose_form)
SELECT
  trim(both '-' from regexp_replace(lower(dosage_form), '[^a-z0-9]+', '-', 'g')) AS dose_form_key,
  MIN(dosage_form) AS dose_form
FROM fda_ndc_json.medicinal_product
WHERE dosage_form IS NOT NULL
GROUP BY trim(both '-' from regexp_replace(lower(dosage_form), '[^a-z0-9]+', '-', 'g'));

CREATE TABLE fda_ndc_json.pharmaceutical_product_has_dose_form (
  pharmaceutical_product_key TEXT NOT NULL REFERENCES fda_ndc_json.pharmaceutical_product(pharmaceutical_product_key) ON DELETE CASCADE,
  dose_form_key TEXT NOT NULL REFERENCES fda_ndc_json.pharmaceutical_dose_form(dose_form_key) ON DELETE CASCADE,
  PRIMARY KEY (pharmaceutical_product_key, dose_form_key)
);

INSERT INTO fda_ndc_json.pharmaceutical_product_has_dose_form (
  pharmaceutical_product_key,
  dose_form_key
)
SELECT
  product_id AS pharmaceutical_product_key,
  trim(both '-' from regexp_replace(lower(dosage_form), '[^a-z0-9]+', '-', 'g')) AS dose_form_key
FROM fda_ndc_json.medicinal_product
WHERE dosage_form IS NOT NULL;

CREATE TABLE fda_ndc_json.route_of_administration (
  route_key TEXT PRIMARY KEY,
  route_name TEXT NOT NULL
);

WITH route_source AS (
  SELECT
    NULLIF(trim(route.value #>> '{}'), '') AS route_name
  FROM fda_ndc_json.medicinal_product p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(p.record -> 'route') = 'array'
        THEN p.record -> 'route'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS route(value, ordinality)
)
INSERT INTO fda_ndc_json.route_of_administration (route_key, route_name)
SELECT
  trim(both '-' from regexp_replace(lower(route_name), '[^a-z0-9]+', '-', 'g')) AS route_key,
  MIN(route_name) AS route_name
FROM route_source
WHERE route_name IS NOT NULL
GROUP BY trim(both '-' from regexp_replace(lower(route_name), '[^a-z0-9]+', '-', 'g'));

CREATE TABLE fda_ndc_json.pharmaceutical_product_has_route (
  pharmaceutical_product_key TEXT NOT NULL REFERENCES fda_ndc_json.pharmaceutical_product(pharmaceutical_product_key) ON DELETE CASCADE,
  route_key TEXT NOT NULL REFERENCES fda_ndc_json.route_of_administration(route_key) ON DELETE CASCADE,
  route_order INTEGER NOT NULL,
  PRIMARY KEY (pharmaceutical_product_key, route_key, route_order)
);

WITH route_source AS (
  SELECT
    p.product_id,
    route.ordinality::INTEGER AS route_order,
    NULLIF(trim(route.value #>> '{}'), '') AS route_name
  FROM fda_ndc_json.medicinal_product p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(p.record -> 'route') = 'array'
        THEN p.record -> 'route'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS route(value, ordinality)
)
INSERT INTO fda_ndc_json.pharmaceutical_product_has_route (
  pharmaceutical_product_key,
  route_key,
  route_order
)
SELECT
  product_id AS pharmaceutical_product_key,
  trim(both '-' from regexp_replace(lower(route_name), '[^a-z0-9]+', '-', 'g')) AS route_key,
  route_order
FROM route_source
WHERE route_name IS NOT NULL;

CREATE TABLE fda_ndc_json.packaged_medicinal_product (
  package_key TEXT PRIMARY KEY,
  raw_record_id BIGINT NOT NULL REFERENCES fda_ndc_json_raw.fda_ndc_json(id) ON DELETE CASCADE,
  package_order INTEGER NOT NULL,
  package_ndc TEXT,
  package_description TEXT,
  package_marketing_start_date TEXT,
  package_marketing_end_date TEXT,
  sample BOOLEAN,
  package_record JSONB NOT NULL
);

WITH package_source AS (
  SELECT
    p.product_id,
    p.raw_record_id,
    package.ordinality::INTEGER AS package_order,
    NULLIF(trim(package.value ->> 'package_ndc'), '') AS package_ndc,
    NULLIF(trim(package.value ->> 'description'), '') AS package_description,
    NULLIF(trim(package.value ->> 'marketing_start_date'), '') AS package_marketing_start_date,
    NULLIF(trim(package.value ->> 'marketing_end_date'), '') AS package_marketing_end_date,
    CASE lower(package.value ->> 'sample')
      WHEN 'true' THEN true
      WHEN 'false' THEN false
      ELSE NULL
    END AS sample,
    package.value AS package_record
  FROM fda_ndc_json.medicinal_product p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(p.record -> 'packaging') = 'array'
        THEN p.record -> 'packaging'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS package(value, ordinality)
)
INSERT INTO fda_ndc_json.packaged_medicinal_product (
  package_key,
  raw_record_id,
  package_order,
  package_ndc,
  package_description,
  package_marketing_start_date,
  package_marketing_end_date,
  sample,
  package_record
)
SELECT
  product_id || '-package-' || package_order AS package_key,
  raw_record_id,
  package_order,
  package_ndc,
  package_description,
  package_marketing_start_date,
  package_marketing_end_date,
  sample,
  package_record
FROM package_source;

CREATE TABLE fda_ndc_json.medicinal_product_has_packaged_medicinal_product (
  product_id TEXT NOT NULL REFERENCES fda_ndc_json.medicinal_product(product_id) ON DELETE CASCADE,
  package_key TEXT NOT NULL REFERENCES fda_ndc_json.packaged_medicinal_product(package_key) ON DELETE CASCADE,
  package_order INTEGER NOT NULL,
  PRIMARY KEY (product_id, package_key)
);

INSERT INTO fda_ndc_json.medicinal_product_has_packaged_medicinal_product (
  product_id,
  package_key,
  package_order
)
SELECT
  split_part(package_key, '-package-', 1) AS product_id,
  package_key,
  package_order
FROM fda_ndc_json.packaged_medicinal_product;

CREATE TABLE fda_ndc_json.package_identifier (
  package_identifier_key TEXT PRIMARY KEY,
  package_ndc TEXT NOT NULL
);

INSERT INTO fda_ndc_json.package_identifier (package_identifier_key, package_ndc)
SELECT
  package_key || '-identifier-package-ndc' AS package_identifier_key,
  package_ndc
FROM fda_ndc_json.packaged_medicinal_product
WHERE package_ndc IS NOT NULL;

CREATE TABLE fda_ndc_json.packaged_medicinal_product_has_identifier (
  package_key TEXT NOT NULL REFERENCES fda_ndc_json.packaged_medicinal_product(package_key) ON DELETE CASCADE,
  package_identifier_key TEXT NOT NULL REFERENCES fda_ndc_json.package_identifier(package_identifier_key) ON DELETE CASCADE,
  PRIMARY KEY (package_key, package_identifier_key)
);

INSERT INTO fda_ndc_json.packaged_medicinal_product_has_identifier (
  package_key,
  package_identifier_key
)
SELECT
  replace(package_identifier_key, '-identifier-package-ndc', '') AS package_key,
  package_identifier_key
FROM fda_ndc_json.package_identifier;

CREATE TABLE fda_ndc_json.active_ingredient (
  active_ingredient_key TEXT PRIMARY KEY,
  raw_record_id BIGINT NOT NULL REFERENCES fda_ndc_json_raw.fda_ndc_json(id) ON DELETE CASCADE,
  ingredient_order INTEGER NOT NULL,
  ingredient_name TEXT NOT NULL,
  ingredient_name_key TEXT NOT NULL,
  strength TEXT,
  ingredient_record JSONB NOT NULL
);

WITH ingredient_source AS (
  SELECT
    p.product_id,
    p.raw_record_id,
    ingredient.ordinality::INTEGER AS ingredient_order,
    NULLIF(trim(ingredient.value ->> 'name'), '') AS ingredient_name,
    upper(regexp_replace(trim(ingredient.value ->> 'name'), '\s+', ' ', 'g')) AS ingredient_name_key,
    NULLIF(trim(ingredient.value ->> 'strength'), '') AS strength,
    ingredient.value AS ingredient_record
  FROM fda_ndc_json.medicinal_product p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(p.record -> 'active_ingredients') = 'array'
        THEN p.record -> 'active_ingredients'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS ingredient(value, ordinality)
)
INSERT INTO fda_ndc_json.active_ingredient (
  active_ingredient_key,
  raw_record_id,
  ingredient_order,
  ingredient_name,
  ingredient_name_key,
  strength,
  ingredient_record
)
SELECT
  product_id || '-ingredient-' || ingredient_order AS active_ingredient_key,
  raw_record_id,
  ingredient_order,
  ingredient_name,
  ingredient_name_key,
  strength,
  ingredient_record
FROM ingredient_source
WHERE ingredient_name IS NOT NULL;

CREATE TABLE fda_ndc_json.product_composition_has_active_ingredient (
  product_composition_key TEXT NOT NULL REFERENCES fda_ndc_json.product_composition(product_composition_key) ON DELETE CASCADE,
  active_ingredient_key TEXT NOT NULL REFERENCES fda_ndc_json.active_ingredient(active_ingredient_key) ON DELETE CASCADE,
  ingredient_order INTEGER NOT NULL,
  PRIMARY KEY (product_composition_key, active_ingredient_key)
);

INSERT INTO fda_ndc_json.product_composition_has_active_ingredient (
  product_composition_key,
  active_ingredient_key,
  ingredient_order
)
SELECT
  split_part(active_ingredient_key, '-ingredient-', 1) || '-composition' AS product_composition_key,
  active_ingredient_key,
  ingredient_order
FROM fda_ndc_json.active_ingredient ai
WHERE EXISTS (
  SELECT 1
  FROM fda_ndc_json.product_composition pc
  WHERE pc.product_composition_key = split_part(ai.active_ingredient_key, '-ingredient-', 1) || '-composition'
);

CREATE TABLE fda_ndc_json.active_ingredient_played_by_gsrs_substance (
  active_ingredient_key TEXT NOT NULL REFERENCES fda_ndc_json.active_ingredient(active_ingredient_key) ON DELETE CASCADE,
  gsrs_uuid TEXT NOT NULL REFERENCES gsrs.substance(gsrs_uuid) ON DELETE CASCADE,
  unii TEXT NOT NULL,
  source_substance_name TEXT NOT NULL,
  ingredient_name_key TEXT NOT NULL,
  match_method TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  match_status TEXT NOT NULL,
  PRIMARY KEY (active_ingredient_key, gsrs_uuid)
);

INSERT INTO fda_ndc_json.active_ingredient_played_by_gsrs_substance (
  active_ingredient_key,
  gsrs_uuid,
  unii,
  source_substance_name,
  ingredient_name_key,
  match_method,
  confidence,
  match_status
)
SELECT DISTINCT
  ai.active_ingredient_key,
  s.gsrs_uuid,
  s.unii,
  ai.ingredient_name AS source_substance_name,
  ai.ingredient_name_key,
  'OPENFDA_UNII_EXACT_NAME' AS match_method,
  1.00::NUMERIC AS confidence,
  'verified' AS match_status
FROM fda_ndc_json.active_ingredient ai
JOIN fda_ndc_json.product_composition_has_active_ingredient pcai
  ON pcai.active_ingredient_key = ai.active_ingredient_key
JOIN fda_ndc_json.medicinal_product_defined_in_product_composition mpdc
  ON mpdc.product_composition_key = pcai.product_composition_key
JOIN fda_ndc_json.medicinal_product p
  ON p.product_id = mpdc.product_id
JOIN gsrs.unique_substance_name_lookup name_match
  ON name_match.name_key = ai.ingredient_name_key
JOIN gsrs.substance s
  ON s.gsrs_uuid = name_match.gsrs_uuid
JOIN fda_ndc_json.medicinal_product_has_unii_candidate hpuc
  ON hpuc.product_id = p.product_id
JOIN fda_ndc_json.product_unii_candidate puc
  ON puc.product_unii_key = hpuc.product_unii_key
 AND puc.unii = s.unii
WHERE s.status = 'approved'
  AND s.unii IS NOT NULL;

CREATE TABLE fda_ndc_json.unmatched_active_ingredient (
  active_ingredient_key TEXT PRIMARY KEY REFERENCES fda_ndc_json.active_ingredient(active_ingredient_key) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES fda_ndc_json.medicinal_product(product_id) ON DELETE CASCADE,
  ingredient_order INTEGER NOT NULL,
  ingredient_name TEXT NOT NULL,
  ingredient_name_key TEXT NOT NULL
);

INSERT INTO fda_ndc_json.unmatched_active_ingredient (
  active_ingredient_key,
  product_id,
  ingredient_order,
  ingredient_name,
  ingredient_name_key
)
SELECT
  ai.active_ingredient_key,
  mpdc.product_id,
  ai.ingredient_order,
  ai.ingredient_name,
  ai.ingredient_name_key
FROM fda_ndc_json.active_ingredient ai
JOIN fda_ndc_json.product_composition_has_active_ingredient pcai
  ON pcai.active_ingredient_key = ai.active_ingredient_key
JOIN fda_ndc_json.medicinal_product_defined_in_product_composition mpdc
  ON mpdc.product_composition_key = pcai.product_composition_key
JOIN fda_ndc_json.medicinal_product p
  ON p.product_id = mpdc.product_id
LEFT JOIN fda_ndc_json.active_ingredient_played_by_gsrs_substance verified
  ON verified.active_ingredient_key = ai.active_ingredient_key
WHERE verified.active_ingredient_key IS NULL;

CREATE TABLE fda_ndc_json.active_ingredient_name_match_candidate (
  active_ingredient_key TEXT NOT NULL REFERENCES fda_ndc_json.active_ingredient(active_ingredient_key) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  ingredient_name_key TEXT NOT NULL,
  matched_gsrs_uuid TEXT NOT NULL REFERENCES gsrs.substance(gsrs_uuid) ON DELETE CASCADE,
  matched_unii TEXT NOT NULL,
  match_method TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  match_status TEXT NOT NULL,
  PRIMARY KEY (active_ingredient_key, matched_gsrs_uuid)
);

INSERT INTO fda_ndc_json.active_ingredient_name_match_candidate (
  active_ingredient_key,
  ingredient_name,
  ingredient_name_key,
  matched_gsrs_uuid,
  matched_unii,
  match_method,
  confidence,
  match_status
)
SELECT
  u.active_ingredient_key,
  u.ingredient_name,
  u.ingredient_name_key,
  s.gsrs_uuid AS matched_gsrs_uuid,
  s.unii AS matched_unii,
  'EXACT_NAME' AS match_method,
  0.85::NUMERIC AS confidence,
  'candidate' AS match_status
FROM fda_ndc_json.unmatched_active_ingredient u
JOIN gsrs.unique_substance_name_lookup name_match
  ON name_match.name_key = u.ingredient_name_key
JOIN gsrs.substance s
  ON s.gsrs_uuid = name_match.gsrs_uuid
WHERE s.status = 'approved'
  AND s.unii IS NOT NULL;

CREATE TABLE fda_ndc_json.openfda_substance (
  substance_key TEXT PRIMARY KEY,
  ingredient_name_key TEXT NOT NULL,
  substance_name TEXT NOT NULL
);

INSERT INTO fda_ndc_json.openfda_substance (
  substance_key,
  ingredient_name_key,
  substance_name
)
SELECT
  active_ingredient_key AS substance_key,
  ingredient_name_key,
  ingredient_name AS substance_name
FROM fda_ndc_json.unmatched_active_ingredient;

CREATE TABLE fda_ndc_json.openfda_substance_name (
  substance_name_key TEXT PRIMARY KEY,
  substance_name TEXT NOT NULL
);

INSERT INTO fda_ndc_json.openfda_substance_name (substance_name_key, substance_name)
SELECT
  substance_key || '-name' AS substance_name_key,
  substance_name
FROM fda_ndc_json.openfda_substance;

CREATE TABLE fda_ndc_json.openfda_substance_has_name (
  substance_key TEXT NOT NULL REFERENCES fda_ndc_json.openfda_substance(substance_key) ON DELETE CASCADE,
  substance_name_key TEXT NOT NULL REFERENCES fda_ndc_json.openfda_substance_name(substance_name_key) ON DELETE CASCADE,
  PRIMARY KEY (substance_key, substance_name_key)
);

INSERT INTO fda_ndc_json.openfda_substance_has_name (
  substance_key,
  substance_name_key
)
SELECT
  substance_key,
  substance_key || '-name' AS substance_name_key
FROM fda_ndc_json.openfda_substance;

CREATE TABLE fda_ndc_json.active_ingredient_played_by_openfda_substance (
  active_ingredient_key TEXT NOT NULL REFERENCES fda_ndc_json.active_ingredient(active_ingredient_key) ON DELETE CASCADE,
  substance_key TEXT NOT NULL REFERENCES fda_ndc_json.openfda_substance(substance_key) ON DELETE CASCADE,
  PRIMARY KEY (active_ingredient_key, substance_key)
);

INSERT INTO fda_ndc_json.active_ingredient_played_by_openfda_substance (
  active_ingredient_key,
  substance_key
)
SELECT
  active_ingredient_key,
  active_ingredient_key AS substance_key
FROM fda_ndc_json.unmatched_active_ingredient;

CREATE TABLE fda_ndc_json.pharmaceutical_product_comprises_gsrs_substance (
  pharmaceutical_product_key TEXT NOT NULL REFERENCES fda_ndc_json.pharmaceutical_product(pharmaceutical_product_key) ON DELETE CASCADE,
  active_ingredient_key TEXT NOT NULL REFERENCES fda_ndc_json.active_ingredient(active_ingredient_key) ON DELETE CASCADE,
  gsrs_uuid TEXT NOT NULL REFERENCES gsrs.substance(gsrs_uuid) ON DELETE CASCADE,
  PRIMARY KEY (pharmaceutical_product_key, active_ingredient_key, gsrs_uuid)
);

INSERT INTO fda_ndc_json.pharmaceutical_product_comprises_gsrs_substance (
  pharmaceutical_product_key,
  active_ingredient_key,
  gsrs_uuid
)
SELECT
  mpdc.product_id AS pharmaceutical_product_key,
  verified.active_ingredient_key,
  verified.gsrs_uuid
FROM fda_ndc_json.active_ingredient_played_by_gsrs_substance verified
JOIN fda_ndc_json.product_composition_has_active_ingredient pcai
  ON pcai.active_ingredient_key = verified.active_ingredient_key
JOIN fda_ndc_json.medicinal_product_defined_in_product_composition mpdc
  ON mpdc.product_composition_key = pcai.product_composition_key;

CREATE TABLE fda_ndc_json.pharmaceutical_product_comprises_openfda_substance (
  pharmaceutical_product_key TEXT NOT NULL REFERENCES fda_ndc_json.pharmaceutical_product(pharmaceutical_product_key) ON DELETE CASCADE,
  active_ingredient_key TEXT NOT NULL REFERENCES fda_ndc_json.active_ingredient(active_ingredient_key) ON DELETE CASCADE,
  substance_key TEXT NOT NULL REFERENCES fda_ndc_json.openfda_substance(substance_key) ON DELETE CASCADE,
  PRIMARY KEY (pharmaceutical_product_key, active_ingredient_key, substance_key)
);

INSERT INTO fda_ndc_json.pharmaceutical_product_comprises_openfda_substance (
  pharmaceutical_product_key,
  active_ingredient_key,
  substance_key
)
SELECT
  u.product_id AS pharmaceutical_product_key,
  u.active_ingredient_key,
  u.active_ingredient_key AS substance_key
FROM fda_ndc_json.unmatched_active_ingredient u;

CREATE INDEX active_ingredient_name_key_idx
  ON fda_ndc_json.active_ingredient(ingredient_name_key);

CREATE INDEX active_ingredient_gsrs_match_uuid_idx
  ON fda_ndc_json.active_ingredient_played_by_gsrs_substance(gsrs_uuid);

CREATE INDEX product_unii_candidate_unii_idx
  ON fda_ndc_json.product_unii_candidate(unii);
