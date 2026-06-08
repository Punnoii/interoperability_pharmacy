CREATE SCHEMA IF NOT EXISTS gsrs;

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