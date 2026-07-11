CREATE SCHEMA IF NOT EXISTS fda_ndc_json;

DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_ingredient_name_match_candidate;
DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_unmatched_ingredient;
DROP VIEW IF EXISTS fda_ndc_json.ndc_fda_ingredient_unii_match;

DROP SCHEMA IF EXISTS gsrs CASCADE;
CREATE SCHEMA gsrs;

CREATE TABLE gsrs.substance (
  gsrs_uuid TEXT PRIMARY KEY,
  unii TEXT UNIQUE,
  raw_record_id BIGINT NOT NULL,
  source_file TEXT NOT NULL,
  substance_class TEXT,
  status TEXT,
  definition_type TEXT,
  definition_level TEXT,
  approved_by TEXT,
  version TEXT,
  deprecated BOOLEAN
);

INSERT INTO gsrs.substance (
  gsrs_uuid,
  unii,
  raw_record_id,
  source_file,
  substance_class,
  status,
  definition_type,
  definition_level,
  approved_by,
  version,
  deprecated
)
SELECT DISTINCT ON (gsrs_uuid)
  gsrs_uuid,
  unii,
  raw_record_id,
  source_file,
  substance_class,
  status,
  definition_type,
  definition_level,
  approved_by,
  version,
  deprecated
FROM (
  SELECT
    NULLIF(trim(record ->> 'approvalID'), '') AS unii,
    id AS raw_record_id,
    source_file,
    NULLIF(trim(record ->> 'uuid'), '') AS gsrs_uuid,
    record ->> 'substanceClass' AS substance_class,
    record ->> 'status' AS status,
    record ->> 'definitionType' AS definition_type,
    record ->> 'definitionLevel' AS definition_level,
    record ->> 'approvedBy' AS approved_by,
    record ->> 'version' AS version,
    CASE
      WHEN record ? 'deprecated' THEN (record ->> 'deprecated')::boolean
      ELSE NULL
    END AS deprecated
  FROM gsrs_raw.gsrs_json
) s
WHERE gsrs_uuid IS NOT NULL
ORDER BY gsrs_uuid, raw_record_id;

CREATE INDEX idx_gsrs_substance_unii ON gsrs.substance (unii);
CREATE INDEX idx_gsrs_substance_status ON gsrs.substance (status);
CREATE INDEX idx_gsrs_substance_class ON gsrs.substance (substance_class);

CREATE TABLE gsrs.substance_name (
  name_uuid TEXT PRIMARY KEY,
  raw_record_id BIGINT NOT NULL,
  name_value TEXT,
  standard_name TEXT,
  name_type TEXT,
  preferred BOOLEAN,
  display_name BOOLEAN
);

INSERT INTO gsrs.substance_name (
  name_uuid,
  raw_record_id,
  name_value,
  standard_name,
  name_type,
  preferred,
  display_name
)
SELECT DISTINCT ON (name_uuid)
  name_uuid,
  raw_record_id,
  name_value,
  standard_name,
  name_type,
  preferred,
  display_name
FROM (
  SELECT
    NULLIF(trim(name.value ->> 'uuid'), '') AS name_uuid,
    s.gsrs_uuid,
    r.id AS raw_record_id,
    name.ordinality AS name_order,
    name.value ->> 'name' AS name_value,
    name.value ->> 'stdName' AS standard_name,
    name.value ->> 'type' AS name_type,
    CASE
      WHEN name.value ? 'preferred' THEN (name.value ->> 'preferred')::boolean
      ELSE NULL
    END AS preferred,
    CASE
      WHEN name.value ? 'displayName' THEN (name.value ->> 'displayName')::boolean
      ELSE NULL
    END AS display_name
  FROM gsrs_raw.gsrs_json r
  JOIN gsrs.substance s
    ON s.gsrs_uuid = NULLIF(trim(r.record ->> 'uuid'), '')
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(r.record -> 'names') = 'array' THEN r.record -> 'names'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS name(value, ordinality)
) n
WHERE name_uuid IS NOT NULL
ORDER BY name_uuid, raw_record_id, name_order;

CREATE INDEX idx_gsrs_substance_name_value ON gsrs.substance_name (name_value);

CREATE TABLE gsrs.substance_has_name (
  gsrs_uuid TEXT NOT NULL REFERENCES gsrs.substance (gsrs_uuid) ON DELETE CASCADE,
  name_uuid TEXT NOT NULL REFERENCES gsrs.substance_name (name_uuid) ON DELETE CASCADE,
  raw_record_id BIGINT NOT NULL,
  name_order BIGINT NOT NULL,
  PRIMARY KEY (gsrs_uuid, name_uuid),
  UNIQUE (gsrs_uuid, name_order)
);

INSERT INTO gsrs.substance_has_name (
  gsrs_uuid,
  name_uuid,
  raw_record_id,
  name_order
)
SELECT DISTINCT ON (gsrs_uuid, name_uuid)
  gsrs_uuid,
  name_uuid,
  raw_record_id,
  name_order
FROM (
  SELECT
    s.gsrs_uuid,
    NULLIF(trim(name.value ->> 'uuid'), '') AS name_uuid,
    r.id AS raw_record_id,
    name.ordinality AS name_order
  FROM gsrs_raw.gsrs_json r
  JOIN gsrs.substance s
    ON s.gsrs_uuid = NULLIF(trim(r.record ->> 'uuid'), '')
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(r.record -> 'names') = 'array' THEN r.record -> 'names'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS name(value, ordinality)
) hn
WHERE name_uuid IS NOT NULL
ORDER BY gsrs_uuid, name_uuid, raw_record_id, name_order;

CREATE INDEX idx_gsrs_substance_has_name_name_uuid
ON gsrs.substance_has_name (name_uuid);

CREATE TABLE gsrs.substance_name_domain (
  domain_key TEXT PRIMARY KEY,
  domain_value TEXT NOT NULL,
  raw_record_id BIGINT NOT NULL
);

INSERT INTO gsrs.substance_name_domain (
  domain_key,
  domain_value,
  raw_record_id
)
SELECT DISTINCT ON (domain_key)
  lower(regexp_replace(trim(domain.value), '[^A-Za-z0-9]+', '-', 'g')) AS domain_key,
  trim(domain.value) AS domain_value,
  n.raw_record_id
FROM gsrs.substance_name n
JOIN gsrs_raw.gsrs_json r
  ON r.id = n.raw_record_id
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(r.record -> 'names') = 'array' THEN r.record -> 'names'
    ELSE '[]'::jsonb
  END
) AS name(value)
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE
    WHEN jsonb_typeof(name.value -> 'domains') = 'array' THEN name.value -> 'domains'
    ELSE '[]'::jsonb
  END
) AS domain(value)
WHERE NULLIF(trim(name.value ->> 'uuid'), '') = n.name_uuid
  AND NULLIF(trim(domain.value), '') IS NOT NULL
ORDER BY domain_key, domain.value, n.raw_record_id;

CREATE TABLE gsrs.substance_name_has_domain (
  name_uuid TEXT NOT NULL REFERENCES gsrs.substance_name (name_uuid) ON DELETE CASCADE,
  domain_key TEXT NOT NULL REFERENCES gsrs.substance_name_domain (domain_key) ON DELETE CASCADE,
  raw_record_id BIGINT NOT NULL,
  PRIMARY KEY (name_uuid, domain_key)
);

INSERT INTO gsrs.substance_name_has_domain (
  name_uuid,
  domain_key,
  raw_record_id
)
SELECT DISTINCT ON (n.name_uuid, domain_key)
  n.name_uuid,
  lower(regexp_replace(trim(domain.value), '[^A-Za-z0-9]+', '-', 'g')) AS domain_key,
  n.raw_record_id
FROM gsrs.substance_name n
JOIN gsrs_raw.gsrs_json r
  ON r.id = n.raw_record_id
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(r.record -> 'names') = 'array' THEN r.record -> 'names'
    ELSE '[]'::jsonb
  END
) AS name(value)
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE
    WHEN jsonb_typeof(name.value -> 'domains') = 'array' THEN name.value -> 'domains'
    ELSE '[]'::jsonb
  END
) AS domain(value)
WHERE NULLIF(trim(name.value ->> 'uuid'), '') = n.name_uuid
  AND NULLIF(trim(domain.value), '') IS NOT NULL
ORDER BY n.name_uuid, domain_key, domain.value;

CREATE TABLE gsrs.substance_name_has_language (
  name_uuid TEXT NOT NULL REFERENCES gsrs.substance_name (name_uuid) ON DELETE CASCADE,
  raw_record_id BIGINT NOT NULL,
  language_value TEXT NOT NULL,
  language_key TEXT NOT NULL,
  PRIMARY KEY (name_uuid, language_key)
);

INSERT INTO gsrs.substance_name_has_language (
  name_uuid,
  raw_record_id,
  language_value,
  language_key
)
SELECT DISTINCT ON (n.name_uuid, language_key)
  n.name_uuid,
  n.raw_record_id,
  trim(language.value) AS language_value,
  CASE
    WHEN lower(trim(language.value)) = 'english' THEN 'en'
    ELSE lower(trim(language.value))
  END AS language_key
FROM gsrs.substance_name n
JOIN gsrs_raw.gsrs_json r
  ON r.id = n.raw_record_id
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(r.record -> 'names') = 'array' THEN r.record -> 'names'
    ELSE '[]'::jsonb
  END
) AS name(value)
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE
    WHEN jsonb_typeof(name.value -> 'languages') = 'array' THEN name.value -> 'languages'
    ELSE '[]'::jsonb
  END
) AS language(value)
WHERE NULLIF(trim(name.value ->> 'uuid'), '') = n.name_uuid
  AND NULLIF(trim(language.value), '') IS NOT NULL
ORDER BY n.name_uuid, language_key, language.value;

CREATE INDEX idx_gsrs_substance_name_has_language_key
ON gsrs.substance_name_has_language (language_key);

CREATE TABLE gsrs.substance_code (
  code_uuid TEXT PRIMARY KEY,
  raw_record_id BIGINT NOT NULL,
  code_system TEXT,
  code_system_key TEXT,
  code_value TEXT,
  code_text TEXT,
  code_type TEXT,
  code_url TEXT,
  comments TEXT,
  deprecated BOOLEAN
);

INSERT INTO gsrs.substance_code (
  code_uuid,
  raw_record_id,
  code_system,
  code_system_key,
  code_value,
  code_text,
  code_type,
  code_url,
  comments,
  deprecated
)
SELECT DISTINCT ON (code_uuid)
  code_uuid,
  raw_record_id,
  code_system,
  code_system_key,
  code_value,
  code_text,
  code_type,
  code_url,
  comments,
  deprecated
FROM (
  SELECT
    NULLIF(trim(code.value ->> 'uuid'), '') AS code_uuid,
    s.gsrs_uuid,
    r.id AS raw_record_id,
    code.ordinality AS code_order,
    NULLIF(trim(code.value ->> 'codeSystem'), '') AS code_system,
    NULLIF(trim(both '-' from lower(regexp_replace(trim(code.value ->> 'codeSystem'), '[^A-Za-z0-9]+', '-', 'g'))), '') AS code_system_key,
    NULLIF(trim(code.value ->> 'code'), '') AS code_value,
    NULLIF(trim(code.value ->> 'codeText'), '') AS code_text,
    NULLIF(trim(code.value ->> 'type'), '') AS code_type,
    NULLIF(trim(code.value ->> 'url'), '') AS code_url,
    NULLIF(trim(code.value ->> 'comments'), '') AS comments,
    CASE
      WHEN code.value ? 'deprecated' THEN (code.value ->> 'deprecated')::boolean
      ELSE NULL
    END AS deprecated
  FROM gsrs_raw.gsrs_json r
  JOIN gsrs.substance s
    ON s.gsrs_uuid = NULLIF(trim(r.record ->> 'uuid'), '')
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(r.record -> 'codes') = 'array' THEN r.record -> 'codes'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS code(value, ordinality)
) c
WHERE code_uuid IS NOT NULL
ORDER BY code_uuid, raw_record_id, code_order;

CREATE INDEX idx_gsrs_substance_code_system_value
ON gsrs.substance_code (code_system, code_value);

CREATE INDEX idx_gsrs_substance_code_system_key
ON gsrs.substance_code (code_system_key);

CREATE TABLE gsrs.substance_has_code (
  gsrs_uuid TEXT NOT NULL REFERENCES gsrs.substance (gsrs_uuid) ON DELETE CASCADE,
  code_uuid TEXT NOT NULL REFERENCES gsrs.substance_code (code_uuid) ON DELETE CASCADE,
  raw_record_id BIGINT NOT NULL,
  code_order BIGINT NOT NULL,
  PRIMARY KEY (gsrs_uuid, code_uuid),
  UNIQUE (gsrs_uuid, code_order)
);

INSERT INTO gsrs.substance_has_code (
  gsrs_uuid,
  code_uuid,
  raw_record_id,
  code_order
)
SELECT DISTINCT ON (gsrs_uuid, code_uuid)
  gsrs_uuid,
  code_uuid,
  raw_record_id,
  code_order
FROM (
  SELECT
    s.gsrs_uuid,
    NULLIF(trim(code.value ->> 'uuid'), '') AS code_uuid,
    r.id AS raw_record_id,
    code.ordinality AS code_order
  FROM gsrs_raw.gsrs_json r
  JOIN gsrs.substance s
    ON s.gsrs_uuid = NULLIF(trim(r.record ->> 'uuid'), '')
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(r.record -> 'codes') = 'array' THEN r.record -> 'codes'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS code(value, ordinality)
) hc
WHERE code_uuid IS NOT NULL
ORDER BY gsrs_uuid, code_uuid, raw_record_id, code_order;

CREATE INDEX idx_gsrs_substance_has_code_code_uuid
ON gsrs.substance_has_code (code_uuid);

CREATE TABLE gsrs.code_system (
  code_system_key TEXT PRIMARY KEY,
  code_system TEXT NOT NULL
);

INSERT INTO gsrs.code_system (
  code_system_key,
  code_system
)
SELECT
  code_system_key,
  MIN(code_system) AS code_system
FROM gsrs.substance_code
WHERE code_system_key IS NOT NULL
GROUP BY code_system_key;

CREATE TABLE gsrs.substance_code_in_code_system (
  code_uuid TEXT NOT NULL REFERENCES gsrs.substance_code (code_uuid) ON DELETE CASCADE,
  code_system_key TEXT NOT NULL REFERENCES gsrs.code_system (code_system_key) ON DELETE CASCADE,
  PRIMARY KEY (code_uuid, code_system_key)
);

INSERT INTO gsrs.substance_code_in_code_system (
  code_uuid,
  code_system_key
)
SELECT DISTINCT
  code_uuid,
  code_system_key
FROM gsrs.substance_code
WHERE code_system_key IS NOT NULL;

CREATE TABLE gsrs.substance_structure (
  structure_key TEXT PRIMARY KEY,
  raw_record_id BIGINT NOT NULL,
  structure_id TEXT,
  molecular_formula TEXT,
  smiles TEXT,
  molecular_weight TEXT,
  molfile TEXT,
  charge TEXT,
  stereochemistry TEXT,
  stereochemistry_classifier TEXT,
  optical_activity TEXT,
  optical_activity_classifier TEXT,
  atropisomerism TEXT,
  stereo_centers TEXT,
  defined_stereo TEXT,
  ez_centers TEXT,
  digest TEXT,
  structure_hash TEXT
);

INSERT INTO gsrs.substance_structure (
  structure_key,
  raw_record_id,
  structure_id,
  molecular_formula,
  smiles,
  molecular_weight,
  molfile,
  charge,
  stereochemistry,
  stereochemistry_classifier,
  optical_activity,
  optical_activity_classifier,
  atropisomerism,
  stereo_centers,
  defined_stereo,
  ez_centers,
  digest,
  structure_hash
)
SELECT
  s.gsrs_uuid AS structure_key,
  s.raw_record_id,
  NULLIF(trim(r.record -> 'structure' ->> 'id'), '') AS structure_id,
  NULLIF(trim(r.record -> 'structure' ->> 'formula'), '') AS molecular_formula,
  NULLIF(trim(r.record -> 'structure' ->> 'smiles'), '') AS smiles,
  CASE
    WHEN NULLIF(trim(r.record -> 'structure' ->> 'mwt'), '') ~ '^[-+]?[0-9]+(\.[0-9]+)?$'
    THEN NULLIF(trim(r.record -> 'structure' ->> 'mwt'), '')
  END AS molecular_weight,
  NULLIF(r.record -> 'structure' ->> 'molfile', '') AS molfile,
  NULLIF(trim(r.record -> 'structure' ->> 'charge'), '') AS charge,
  NULLIF(trim(r.record -> 'structure' ->> 'stereochemistry'), '') AS stereochemistry,
  CASE upper(NULLIF(trim(r.record -> 'structure' ->> 'stereochemistry'), ''))
    WHEN 'ABSOLUTE' THEN 'Stereochemistry-Absolute'
    WHEN 'ACHIRAL' THEN 'Stereochemistry-Achiral'
    WHEN 'AXIAL-S' THEN 'Stereochemistry-AxialS'
    WHEN 'CIS' THEN 'Stereochemistry-Cis'
    WHEN 'EPIMERIC' THEN 'Stereochemistry-Epimeric'
    WHEN 'MIXED' THEN 'Stereochemistry-Mixed'
    WHEN 'OCTAHEDRAL 22' THEN 'Stereochemistry-Octahedral22'
    WHEN 'RACEMIC' THEN 'Stereochemistry-Racemic'
    WHEN 'TRANS' THEN 'Stereochemistry-Trans'
    WHEN 'UNKNOWN' THEN 'Stereochemistry-Unknown'
  END AS stereochemistry_classifier,
  NULLIF(trim(r.record -> 'structure' ->> 'opticalActivity'), '') AS optical_activity,
  CASE regexp_replace(upper(NULLIF(trim(r.record -> 'structure' ->> 'opticalActivity'), '')), '[[:space:]]+', '', 'g')
    WHEN '(+)' THEN 'OpticalActivity-Right'
    WHEN '(-)' THEN 'OpticalActivity-Left'
    WHEN '(+/-)' THEN 'OpticalActivity-EitherDirection'
    WHEN 'NONE' THEN 'OpticalActivity-None'
  END AS optical_activity_classifier,
  NULLIF(trim(r.record -> 'structure' ->> 'atropisomerism'), '') AS atropisomerism,
  NULLIF(trim(r.record -> 'structure' ->> 'stereoCenters'), '') AS stereo_centers,
  NULLIF(trim(r.record -> 'structure' ->> 'definedStereo'), '') AS defined_stereo,
  NULLIF(trim(r.record -> 'structure' ->> 'ezCenters'), '') AS ez_centers,
  NULLIF(trim(r.record -> 'structure' ->> 'digest'), '') AS digest,
  NULLIF(trim(r.record -> 'structure' ->> 'hash'), '') AS structure_hash
FROM gsrs.substance s
JOIN gsrs_raw.gsrs_json r
  ON r.id = s.raw_record_id
WHERE r.record -> 'structure' IS NOT NULL
  AND jsonb_typeof(r.record -> 'structure') = 'object';

CREATE TABLE gsrs.substance_has_structure (
  gsrs_uuid TEXT NOT NULL REFERENCES gsrs.substance (gsrs_uuid) ON DELETE CASCADE,
  structure_key TEXT NOT NULL REFERENCES gsrs.substance_structure (structure_key) ON DELETE CASCADE,
  PRIMARY KEY (gsrs_uuid, structure_key)
);

INSERT INTO gsrs.substance_has_structure (
  gsrs_uuid,
  structure_key
)
SELECT
  s.gsrs_uuid,
  s.gsrs_uuid AS structure_key
FROM gsrs.substance s
JOIN gsrs_raw.gsrs_json r
  ON r.id = s.raw_record_id
WHERE r.record -> 'structure' IS NOT NULL
  AND jsonb_typeof(r.record -> 'structure') = 'object';

CREATE TABLE gsrs.substance_has_molecular_formula (
  gsrs_uuid TEXT NOT NULL REFERENCES gsrs.substance (gsrs_uuid) ON DELETE CASCADE,
  structure_key TEXT NOT NULL REFERENCES gsrs.substance_structure (structure_key) ON DELETE CASCADE,
  PRIMARY KEY (gsrs_uuid, structure_key)
);

INSERT INTO gsrs.substance_has_molecular_formula (
  gsrs_uuid,
  structure_key
)
SELECT hs.gsrs_uuid,
       hs.structure_key
FROM gsrs.substance_has_structure hs
JOIN gsrs.substance_structure st
  ON st.structure_key = hs.structure_key
WHERE st.molecular_formula IS NOT NULL;

CREATE TABLE gsrs.substance_has_molecular_weight (
  gsrs_uuid TEXT NOT NULL REFERENCES gsrs.substance (gsrs_uuid) ON DELETE CASCADE,
  structure_key TEXT NOT NULL REFERENCES gsrs.substance_structure (structure_key) ON DELETE CASCADE,
  PRIMARY KEY (gsrs_uuid, structure_key)
);

INSERT INTO gsrs.substance_has_molecular_weight (
  gsrs_uuid,
  structure_key
)
SELECT hs.gsrs_uuid,
       hs.structure_key
FROM gsrs.substance_has_structure hs
JOIN gsrs.substance_structure st
  ON st.structure_key = hs.structure_key
WHERE st.molecular_weight IS NOT NULL;

CREATE TABLE gsrs.molecular_structure_has_smiles (
  structure_key TEXT PRIMARY KEY REFERENCES gsrs.substance_structure (structure_key) ON DELETE CASCADE
);

INSERT INTO gsrs.molecular_structure_has_smiles (
  structure_key
)
SELECT structure_key
FROM gsrs.substance_structure
WHERE smiles IS NOT NULL;

CREATE TABLE gsrs.molecular_structure_has_molfile (
  structure_key TEXT PRIMARY KEY REFERENCES gsrs.substance_structure (structure_key) ON DELETE CASCADE
);

INSERT INTO gsrs.molecular_structure_has_molfile (
  structure_key
)
SELECT structure_key
FROM gsrs.substance_structure
WHERE molfile IS NOT NULL;

CREATE TABLE gsrs.substance_relationship (
  relationship_uuid TEXT PRIMARY KEY,
  raw_record_id BIGINT NOT NULL,
  relationship_type TEXT,
  relationship_type_key TEXT,
  originator_uuid TEXT,
  related_name TEXT,
  related_preferred_name TEXT,
  related_substance_class TEXT,
  qualification TEXT,
  interaction_type TEXT,
  interaction_type_key TEXT,
  comments TEXT,
  amount JSONB,
  mediator_substance JSONB
);

WITH extracted AS (
  SELECT
    NULLIF(trim(rel.value ->> 'uuid'), '') AS relationship_uuid,
    r.id AS raw_record_id,
    s.gsrs_uuid AS source_gsrs_uuid,
    rel.ordinality AS relationship_order,
    NULLIF(trim(rel.value ->> 'type'), '') AS relationship_type,
    NULLIF(
      trim(
        both '-' from lower(
          regexp_replace(
            regexp_replace(trim(rel.value ->> 'type'), '[[:space:]]*->[[:space:]]*', '-to-', 'g'),
            '[^A-Za-z0-9]+',
            '-',
            'g'
          )
        )
      ),
      ''
    ) AS relationship_type_key,
    NULLIF(trim(rel.value ->> 'originatorUuid'), '') AS originator_uuid,
    NULLIF(trim(rel.value -> 'relatedSubstance' ->> 'refuuid'), '') AS related_gsrs_uuid,
    NULLIF(trim(rel.value -> 'relatedSubstance' ->> 'name'), '') AS related_name,
    NULLIF(trim(rel.value -> 'relatedSubstance' ->> 'refPname'), '') AS related_preferred_name,
    NULLIF(trim(rel.value -> 'relatedSubstance' ->> 'substanceClass'), '') AS related_substance_class,
    NULLIF(trim(rel.value ->> 'qualification'), '') AS qualification,
    NULLIF(trim(rel.value ->> 'interactionType'), '') AS interaction_type,
    NULLIF(trim(both '-' from lower(regexp_replace(trim(rel.value ->> 'interactionType'), '[^A-Za-z0-9]+', '-', 'g'))), '') AS interaction_type_key,
    NULLIF(trim(rel.value ->> 'comments'), '') AS comments,
    rel.value -> 'amount' AS amount,
    rel.value -> 'mediatorSubstance' AS mediator_substance
  FROM gsrs_raw.gsrs_json r
  JOIN gsrs.substance s
    ON s.gsrs_uuid = NULLIF(trim(r.record ->> 'uuid'), '')
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(r.record -> 'relationships') = 'array' THEN r.record -> 'relationships'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS rel(value, ordinality)
)
INSERT INTO gsrs.substance_relationship (
  relationship_uuid,
  raw_record_id,
  relationship_type,
  relationship_type_key,
  originator_uuid,
  related_name,
  related_preferred_name,
  related_substance_class,
  qualification,
  interaction_type,
  interaction_type_key,
  comments,
  amount,
  mediator_substance
)
SELECT DISTINCT ON (e.relationship_uuid)
  e.relationship_uuid,
  e.raw_record_id,
  e.relationship_type,
  e.relationship_type_key,
  e.originator_uuid,
  e.related_name,
  e.related_preferred_name,
  e.related_substance_class,
  e.qualification,
  e.interaction_type,
  e.interaction_type_key,
  e.comments,
  e.amount,
  e.mediator_substance
FROM extracted e
JOIN gsrs.substance related
  ON related.gsrs_uuid = e.related_gsrs_uuid
WHERE e.relationship_uuid IS NOT NULL
  AND e.related_gsrs_uuid IS NOT NULL
ORDER BY e.relationship_uuid, e.raw_record_id, e.relationship_order;

CREATE INDEX idx_gsrs_substance_relationship_type
ON gsrs.substance_relationship (relationship_type_key);

CREATE INDEX idx_gsrs_substance_relationship_interaction_type
ON gsrs.substance_relationship (interaction_type_key);

CREATE TABLE gsrs.substance_relationship_has_subject (
  relationship_uuid TEXT PRIMARY KEY REFERENCES gsrs.substance_relationship (relationship_uuid) ON DELETE CASCADE,
  source_gsrs_uuid TEXT NOT NULL REFERENCES gsrs.substance (gsrs_uuid) ON DELETE CASCADE,
  relationship_order BIGINT NOT NULL,
  UNIQUE (source_gsrs_uuid, relationship_order)
);

WITH extracted AS (
  SELECT
    NULLIF(trim(rel.value ->> 'uuid'), '') AS relationship_uuid,
    s.gsrs_uuid AS source_gsrs_uuid,
    rel.ordinality AS relationship_order,
    NULLIF(trim(rel.value -> 'relatedSubstance' ->> 'refuuid'), '') AS related_gsrs_uuid
  FROM gsrs_raw.gsrs_json r
  JOIN gsrs.substance s
    ON s.gsrs_uuid = NULLIF(trim(r.record ->> 'uuid'), '')
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(r.record -> 'relationships') = 'array' THEN r.record -> 'relationships'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS rel(value, ordinality)
)
INSERT INTO gsrs.substance_relationship_has_subject (
  relationship_uuid,
  source_gsrs_uuid,
  relationship_order
)
SELECT DISTINCT ON (e.relationship_uuid)
  e.relationship_uuid,
  e.source_gsrs_uuid,
  e.relationship_order
FROM extracted e
JOIN gsrs.substance_relationship r
  ON r.relationship_uuid = e.relationship_uuid
JOIN gsrs.substance related
  ON related.gsrs_uuid = e.related_gsrs_uuid
WHERE e.relationship_uuid IS NOT NULL
ORDER BY e.relationship_uuid, e.relationship_order;

CREATE INDEX idx_gsrs_substance_relationship_subject_source
ON gsrs.substance_relationship_has_subject (source_gsrs_uuid);

CREATE TABLE gsrs.substance_relationship_has_related (
  relationship_uuid TEXT PRIMARY KEY REFERENCES gsrs.substance_relationship (relationship_uuid) ON DELETE CASCADE,
  related_gsrs_uuid TEXT NOT NULL REFERENCES gsrs.substance (gsrs_uuid) ON DELETE CASCADE
);

WITH extracted AS (
  SELECT
    NULLIF(trim(rel.value ->> 'uuid'), '') AS relationship_uuid,
    NULLIF(trim(rel.value -> 'relatedSubstance' ->> 'refuuid'), '') AS related_gsrs_uuid
  FROM gsrs_raw.gsrs_json r
  JOIN gsrs.substance s
    ON s.gsrs_uuid = NULLIF(trim(r.record ->> 'uuid'), '')
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(r.record -> 'relationships') = 'array' THEN r.record -> 'relationships'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS rel(value, ordinality)
)
INSERT INTO gsrs.substance_relationship_has_related (
  relationship_uuid,
  related_gsrs_uuid
)
SELECT DISTINCT ON (e.relationship_uuid)
  e.relationship_uuid,
  e.related_gsrs_uuid
FROM extracted e
JOIN gsrs.substance_relationship r
  ON r.relationship_uuid = e.relationship_uuid
JOIN gsrs.substance related
  ON related.gsrs_uuid = e.related_gsrs_uuid
WHERE e.relationship_uuid IS NOT NULL
  AND e.related_gsrs_uuid IS NOT NULL
ORDER BY e.relationship_uuid;

CREATE INDEX idx_gsrs_substance_relationship_related_related
ON gsrs.substance_relationship_has_related (related_gsrs_uuid);

CREATE TABLE gsrs.substance_relationship_has_code (
  relationship_uuid TEXT PRIMARY KEY REFERENCES gsrs.substance_relationship (relationship_uuid) ON DELETE CASCADE,
  relationship_type_key TEXT NOT NULL
);

INSERT INTO gsrs.substance_relationship_has_code (
  relationship_uuid,
  relationship_type_key
)
SELECT relationship_uuid,
       relationship_type_key
FROM gsrs.substance_relationship
WHERE relationship_type_key IS NOT NULL;

CREATE TABLE gsrs.substance_relationship_has_interaction_type (
  relationship_uuid TEXT PRIMARY KEY REFERENCES gsrs.substance_relationship (relationship_uuid) ON DELETE CASCADE,
  interaction_type_key TEXT NOT NULL
);

INSERT INTO gsrs.substance_relationship_has_interaction_type (
  relationship_uuid,
  interaction_type_key
)
SELECT relationship_uuid,
       interaction_type_key
FROM gsrs.substance_relationship
WHERE interaction_type_key IS NOT NULL;

CREATE TABLE gsrs.substance_relationship_unresolved (
  relationship_uuid TEXT,
  raw_record_id BIGINT NOT NULL,
  source_gsrs_uuid TEXT NOT NULL REFERENCES gsrs.substance (gsrs_uuid) ON DELETE CASCADE,
  relationship_order BIGINT NOT NULL,
  relationship_type TEXT,
  related_gsrs_uuid TEXT,
  related_approval_id TEXT,
  related_name TEXT,
  PRIMARY KEY (source_gsrs_uuid, relationship_order)
);

WITH extracted AS (
  SELECT
    NULLIF(trim(rel.value ->> 'uuid'), '') AS relationship_uuid,
    r.id AS raw_record_id,
    s.gsrs_uuid AS source_gsrs_uuid,
    rel.ordinality AS relationship_order,
    rel.value ->> 'type' AS relationship_type,
    NULLIF(trim(rel.value -> 'relatedSubstance' ->> 'refuuid'), '') AS related_gsrs_uuid,
    NULLIF(trim(rel.value -> 'relatedSubstance' ->> 'approvalID'), '') AS related_approval_id,
    rel.value -> 'relatedSubstance' ->> 'name' AS related_name
  FROM gsrs_raw.gsrs_json r
  JOIN gsrs.substance s
    ON s.gsrs_uuid = NULLIF(trim(r.record ->> 'uuid'), '')
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(r.record -> 'relationships') = 'array' THEN r.record -> 'relationships'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS rel(value, ordinality)
)
INSERT INTO gsrs.substance_relationship_unresolved (
  relationship_uuid,
  raw_record_id,
  source_gsrs_uuid,
  relationship_order,
  relationship_type,
  related_gsrs_uuid,
  related_approval_id,
  related_name
)
SELECT
  e.relationship_uuid,
  e.raw_record_id,
  e.source_gsrs_uuid,
  e.relationship_order,
  e.relationship_type,
  e.related_gsrs_uuid,
  e.related_approval_id,
  e.related_name
FROM extracted e
LEFT JOIN gsrs.substance related
  ON related.gsrs_uuid = e.related_gsrs_uuid
WHERE e.relationship_uuid IS NULL
   OR e.related_gsrs_uuid IS NULL
   OR related.gsrs_uuid IS NULL;

CREATE TABLE gsrs.substance_name_lookup (
  name_key TEXT NOT NULL,
  gsrs_uuid TEXT NOT NULL REFERENCES gsrs.substance (gsrs_uuid) ON DELETE CASCADE,
  PRIMARY KEY (name_key, gsrs_uuid)
);

INSERT INTO gsrs.substance_name_lookup (name_key, gsrs_uuid)
SELECT DISTINCT
  upper(regexp_replace(trim(n.name_value), '\s+', ' ', 'g')) AS name_key,
  hn.gsrs_uuid
FROM gsrs.substance_name n
JOIN gsrs.substance_has_name hn
  ON hn.name_uuid = n.name_uuid
JOIN gsrs.substance s
  ON s.gsrs_uuid = hn.gsrs_uuid
WHERE n.name_value IS NOT NULL
  AND trim(n.name_value) <> ''
  AND s.unii IS NOT NULL
  AND s.status = 'approved';

CREATE INDEX idx_gsrs_substance_name_lookup_gsrs_uuid
ON gsrs.substance_name_lookup (gsrs_uuid);

CREATE TABLE gsrs.unique_substance_name_lookup (
  name_key TEXT PRIMARY KEY,
  gsrs_uuid TEXT NOT NULL REFERENCES gsrs.substance (gsrs_uuid) ON DELETE CASCADE
);

INSERT INTO gsrs.unique_substance_name_lookup (name_key, gsrs_uuid)
SELECT
  name_key,
  min(gsrs_uuid) AS gsrs_uuid
FROM gsrs.substance_name_lookup
GROUP BY name_key
HAVING count(DISTINCT gsrs_uuid) = 1;

CREATE INDEX idx_gsrs_unique_substance_name_lookup_gsrs_uuid
ON gsrs.unique_substance_name_lookup (gsrs_uuid);

ANALYZE gsrs.substance;
ANALYZE gsrs.substance_name;
ANALYZE gsrs.substance_has_name;
ANALYZE gsrs.substance_name_domain;
ANALYZE gsrs.substance_name_has_domain;
ANALYZE gsrs.substance_name_has_language;
ANALYZE gsrs.substance_code;
ANALYZE gsrs.substance_has_code;
ANALYZE gsrs.code_system;
ANALYZE gsrs.substance_code_in_code_system;
ANALYZE gsrs.substance_structure;
ANALYZE gsrs.substance_has_structure;
ANALYZE gsrs.substance_has_molecular_formula;
ANALYZE gsrs.substance_has_molecular_weight;
ANALYZE gsrs.molecular_structure_has_smiles;
ANALYZE gsrs.molecular_structure_has_molfile;
ANALYZE gsrs.substance_relationship;
ANALYZE gsrs.substance_relationship_has_subject;
ANALYZE gsrs.substance_relationship_has_related;
ANALYZE gsrs.substance_relationship_has_code;
ANALYZE gsrs.substance_relationship_has_interaction_type;
ANALYZE gsrs.substance_relationship_unresolved;
ANALYZE gsrs.substance_name_lookup;
ANALYZE gsrs.unique_substance_name_lookup;
