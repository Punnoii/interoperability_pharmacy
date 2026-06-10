CREATE SCHEMA IF NOT EXISTS gsrs;

DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_ingredient_name_match_candidate;
DROP MATERIALIZED VIEW IF EXISTS gsrs.substance_name_lookup;
DROP VIEW IF EXISTS gsrs.substance_relationship;
DROP VIEW IF EXISTS gsrs.substance_name_domain;
DROP VIEW IF EXISTS gsrs.substance_name_language;
DROP VIEW IF EXISTS gsrs.substance_name;
DROP VIEW IF EXISTS gsrs.substance_code;
DROP VIEW IF EXISTS gsrs.substance;

CREATE VIEW gsrs.substance AS
SELECT
  id AS raw_record_id,
  source_file,
  record ->> 'uuid' AS gsrs_uuid,
  record ->> 'approvalID' AS unii,
  record ->> 'substanceClass' AS substance_class,
  record ->> 'status' AS status,
  record ->> 'definitionType' AS definition_type,
  record ->> 'definitionLevel' AS definition_level,
  record ->> 'approvedBy' AS approved_by,
  record ->> 'version' AS version,
  record -> 'structure' ->> 'formula' AS molecular_formula,
  record -> 'structure' ->> 'smiles' AS smiles,
  record -> 'structure' ->> 'mwt' AS molecular_weight,
  record
FROM gsrs_raw.gsrs_json;

DROP VIEW IF EXISTS gsrs.substance_name;

CREATE VIEW gsrs.substance_name AS
SELECT
  r.id AS raw_record_id,
  r.record ->> 'uuid' AS gsrs_uuid,
  r.record ->> 'approvalID' AS unii,
  name.ordinality AS name_order,
  name.value ->> 'uuid' AS name_uuid,
  name.value ->> 'name' AS name_value,
  name.value ->> 'stdName' AS standard_name,
  name.value ->> 'type' AS name_type,
  (name.value ->> 'preferred')::boolean AS preferred,
  (name.value ->> 'displayName')::boolean AS display_name,
  name.value -> 'languages' AS languages,
  name.value -> 'domains' AS domains,
  name.value AS name_record
FROM gsrs_raw.gsrs_json r
CROSS JOIN LATERAL jsonb_array_elements(r.record -> 'names')
  WITH ORDINALITY AS name(value, ordinality);

DROP VIEW IF EXISTS gsrs.substance_code;

CREATE VIEW gsrs.substance_code AS
SELECT
  r.id AS raw_record_id,
  r.record ->> 'uuid' AS gsrs_uuid,
  r.record ->> 'approvalID' AS unii,
  code.ordinality AS code_order,
  code.value ->> 'uuid' AS code_uuid,
  code.value ->> 'codeSystem' AS code_system,
  code.value ->> 'code' AS code_value,
  code.value ->> 'type' AS code_type,
  code.value ->> 'url' AS code_url,
  code.value AS code_record
FROM gsrs_raw.gsrs_json r
CROSS JOIN LATERAL jsonb_array_elements(r.record -> 'codes')
  WITH ORDINALITY AS code(value, ordinality);

DROP VIEW IF EXISTS gsrs.substance_name_domain;

CREATE VIEW gsrs.substance_name_domain AS
SELECT
  n.raw_record_id,
  n.gsrs_uuid,
  n.unii,
  n.name_uuid,
  domain.value AS domain_value,
  lower(regexp_replace(domain.value, '[^A-Za-z0-9]+', '-', 'g')) AS domain_key
FROM gsrs.substance_name n
CROSS JOIN LATERAL jsonb_array_elements_text(n.domains) AS domain(value)
WHERE n.domains IS NOT NULL
  AND jsonb_typeof(n.domains) = 'array'
  AND domain.value <> '';

DROP VIEW IF EXISTS gsrs.substance_name_language;

CREATE VIEW gsrs.substance_name_language AS
SELECT
  n.raw_record_id,
  n.gsrs_uuid,
  n.unii,
  n.name_uuid,
  language.value AS language_value,
  CASE
    WHEN lower(language.value) = 'english' THEN 'en'
    ELSE lower(language.value)
  END AS language_key
FROM gsrs.substance_name n
CROSS JOIN LATERAL jsonb_array_elements_text(n.languages) AS language(value)
WHERE n.languages IS NOT NULL
  AND jsonb_typeof(n.languages) = 'array'
  AND language.value <> '';



CREATE MATERIALIZED VIEW gsrs.substance_name_lookup AS
SELECT DISTINCT
  upper(regexp_replace(trim(name_value), '\s+', ' ', 'g')) AS name_key,
  unii
FROM gsrs.substance_name
WHERE name_value IS NOT NULL
  AND unii IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gsrs_substance_name_lookup_name_key
ON gsrs.substance_name_lookup (name_key);

CREATE VIEW gsrs.substance_relationship AS
SELECT
  r.id AS raw_record_id,
  r.record ->> 'uuid' AS source_gsrs_uuid,
  r.record ->> 'approvalID' AS source_unii,
  rel.ordinality AS relationship_order,
  rel.value ->> 'uuid' AS relationship_uuid,
  rel.value ->> 'type' AS relationship_type,
  lower(regexp_replace(trim(rel.value ->> 'type'), '[^A-Za-z0-9]+', '-', 'g')) AS relationship_type_key,
  rel.value ->> 'originatorUuid' AS originator_uuid,
  rel.value -> 'relatedSubstance' ->> 'uuid' AS related_gsrs_uuid,
  rel.value -> 'relatedSubstance' ->> 'approvalID' AS related_unii,
  rel.value -> 'relatedSubstance' ->> 'name' AS related_name,
  rel.value -> 'relatedSubstance' ->> 'refPname' AS related_preferred_name,
  rel.value -> 'relatedSubstance' ->> 'substanceClass' AS related_substance_class,
  rel.value AS relationship_record
FROM gsrs_raw.gsrs_json r
CROSS JOIN LATERAL jsonb_array_elements(r.record -> 'relationships')
  WITH ORDINALITY AS rel(value, ordinality)
WHERE r.record -> 'relationships' IS NOT NULL
  AND jsonb_typeof(r.record -> 'relationships') = 'array';