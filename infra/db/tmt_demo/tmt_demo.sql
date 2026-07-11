\set ON_ERROR_STOP on

CREATE SCHEMA IF NOT EXISTS tmt_demo;

CREATE TEMP TABLE raw_tmt_demo_load (
  tpu_code integer,
  active_ingredient text,
  strength text,
  dosage_form text,
  cont_value text,
  cont_unit text,
  disp_unit text,
  trade_name text,
  manufacturer text,
  fsn text,
  status text,
  country text
);

\copy raw_tmt_demo_load (tpu_code, active_ingredient, strength, dosage_form, cont_value, cont_unit, disp_unit, trade_name, manufacturer, fsn, status, country) FROM STDIN WITH (FORMAT csv, HEADER true)

DROP TABLE IF EXISTS tmt_demo.product_ingredient;
DROP TABLE IF EXISTS tmt_demo.product;

CREATE TABLE tmt_demo.product AS
SELECT DISTINCT
  tpu_code,
  trade_name,
  fsn,
  dosage_form,
  cont_value,
  cont_unit,
  disp_unit,
  manufacturer,
  status,
  country
FROM raw_tmt_demo_load;

ALTER TABLE tmt_demo.product
ADD PRIMARY KEY (tpu_code);

CREATE TABLE tmt_demo.product_ingredient AS
WITH split_raw AS (
  SELECT
    tpu_code,
    regexp_split_to_array(active_ingredient, '\s*\+\s*') AS ingredients,
    regexp_split_to_array(strength, '\s*\+\s*') AS strengths
  FROM raw_tmt_demo_load
)
SELECT
  tpu_code,
  n AS ingredient_order,
  NULLIF(trim(ingredients[n]), '') AS active_ingredient,
  NULLIF(trim(strengths[n]), '') AS strength
FROM split_raw
CROSS JOIN generate_series(1, cardinality(ingredients)) AS n;

ALTER TABLE tmt_demo.product_ingredient
ADD PRIMARY KEY (tpu_code, ingredient_order);

DROP TABLE IF EXISTS tmt_demo.active_ingredient_played_by_gsrs_substance;

CREATE TABLE tmt_demo.active_ingredient_played_by_gsrs_substance AS
SELECT DISTINCT
  pi.tpu_code,
  pi.ingredient_order,
  s.gsrs_uuid,
  s.unii,
  pi.active_ingredient AS source_ingredient_name
FROM tmt_demo.product_ingredient pi
JOIN gsrs.unique_substance_name_lookup l
  ON l.name_key = upper(regexp_replace(trim(pi.active_ingredient), '\s+', ' ', 'g'))
JOIN gsrs.substance s
  ON s.gsrs_uuid = l.gsrs_uuid
WHERE pi.active_ingredient IS NOT NULL;

CREATE INDEX idx_tmt_ai_played_by_gsrs
ON tmt_demo.active_ingredient_played_by_gsrs_substance (tpu_code, ingredient_order);

ANALYZE tmt_demo.product;
ANALYZE tmt_demo.product_ingredient;
ANALYZE tmt_demo.active_ingredient_played_by_gsrs_substance;