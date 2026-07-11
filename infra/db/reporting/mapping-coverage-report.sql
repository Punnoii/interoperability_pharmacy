/*
Mapping coverage report for the GSRS and OpenFDA curated tables.

Purpose
-------
This query produces reproducible coverage evidence for the OBDA mappings in:

  infra/ontop/obda/ontop-mapping.obda

Each row defines:
  - the denominator population being evaluated,
  - the mapped population produced by the curated-table rule,
  - the remainder population that is not mapped by that rule, and
  - the percentage represented by the mapped population.

The report is intentionally grouped by coverage question. Some rows cover more
than one OBDA mapping ID when those mappings share the same source population
and mapping rule.
*/

WITH
approved_substance AS (
  SELECT gsrs_uuid,
         unii,
         substance_class
  FROM gsrs.substance
  WHERE status = 'approved'
),
recognized_substance_subclass AS (
  SELECT gsrs_uuid
  FROM approved_substance
  WHERE substance_class IN (
    'chemical',
    'protein',
    'nucleicAcid',
    'polymer',
    'mixture',
    'structurallyDiverse',
    'specifiedSubstanceG1'
  )
),
approved_substance_name AS (
  SELECT DISTINCT n.name_uuid,
         n.name_type,
         n.name_value,
         n.standard_name
  FROM gsrs.substance_name n
  JOIN gsrs.substance_has_name hn
    ON hn.name_uuid = n.name_uuid
  JOIN approved_substance s
    ON s.gsrs_uuid = hn.gsrs_uuid
),
approved_substance_has_name AS (
  SELECT DISTINCT hn.gsrs_uuid,
         hn.name_uuid
  FROM gsrs.substance_has_name hn
  JOIN approved_substance s
    ON s.gsrs_uuid = hn.gsrs_uuid
),
approved_name_domain AS (
  SELECT DISTINCT hd.domain_key
  FROM gsrs.substance_name_has_domain hd
  JOIN approved_substance_has_name ahn
    ON ahn.name_uuid = hd.name_uuid
),
approved_name_has_domain AS (
  SELECT DISTINCT hd.name_uuid,
         hd.domain_key
  FROM gsrs.substance_name_has_domain hd
  JOIN approved_substance_has_name ahn
    ON ahn.name_uuid = hd.name_uuid
),
approved_name_language AS (
  SELECT DISTINCT hl.name_uuid,
         hl.language_key
  FROM gsrs.substance_name_has_language hl
  JOIN approved_substance_has_name ahn
    ON ahn.name_uuid = hl.name_uuid
),
approved_code AS (
  SELECT DISTINCT c.code_uuid,
         c.code_system,
         c.code_system_key,
         c.code_value,
         c.code_text,
         c.code_url,
         c.comments
  FROM gsrs.substance_code c
  JOIN gsrs.substance_has_code hc
    ON hc.code_uuid = c.code_uuid
  JOIN approved_substance s
    ON s.gsrs_uuid = hc.gsrs_uuid
),
approved_code_link AS (
  SELECT DISTINCT hc.gsrs_uuid,
         hc.code_uuid
  FROM gsrs.substance_has_code hc
  JOIN approved_substance s
    ON s.gsrs_uuid = hc.gsrs_uuid
),
generic_code AS (
  SELECT code_uuid
  FROM approved_code
  WHERE NOT (
    code_system IN ('FDA UNII', 'CAS', 'CHEBI', 'MESH')
    OR (
      code_system = 'EVMPD'
      AND code_value ~ '^SUB[A-Z0-9]+$'
    )
  )
),
specialized_code AS (
  SELECT code_uuid
  FROM approved_code
  WHERE code_system IN ('FDA UNII', 'CAS', 'CHEBI', 'MESH')

  UNION

  SELECT code_uuid
  FROM approved_code
  WHERE code_system = 'EVMPD'
    AND code_value ~ '^SUB[A-Z0-9]+$'
),
classified_code AS (
  SELECT code_uuid
  FROM generic_code

  UNION

  SELECT code_uuid
  FROM specialized_code
),
approved_code_system AS (
  SELECT DISTINCT cs.code_system_key
  FROM gsrs.code_system cs
  JOIN gsrs.substance_code_in_code_system cics
    ON cics.code_system_key = cs.code_system_key
  JOIN approved_code ac
    ON ac.code_uuid = cics.code_uuid
),
approved_code_in_code_system AS (
  SELECT DISTINCT cics.code_uuid,
         cics.code_system_key
  FROM gsrs.substance_code_in_code_system cics
  JOIN approved_code ac
    ON ac.code_uuid = cics.code_uuid
),
approved_structure AS (
  SELECT DISTINCT st.structure_key,
         st.structure_id,
         st.molecular_formula,
         st.molecular_weight,
         st.smiles,
         st.molfile,
         st.stereochemistry_classifier,
         st.optical_activity_classifier
  FROM gsrs.substance_structure st
  JOIN gsrs.substance_has_structure hs
    ON hs.structure_key = st.structure_key
  JOIN approved_substance s
    ON s.gsrs_uuid = hs.gsrs_uuid
),
approved_structure_link AS (
  SELECT DISTINCT hs.gsrs_uuid,
         hs.structure_key
  FROM gsrs.substance_has_structure hs
  JOIN approved_substance s
    ON s.gsrs_uuid = hs.gsrs_uuid
),
raw_relationship_count AS (
  SELECT (
    (SELECT COUNT(*) FROM gsrs.substance_relationship)
    +
    (SELECT COUNT(*) FROM gsrs.substance_relationship_unresolved)
  )::BIGINT AS relationship_count
),
endpoint_valid_relationship AS (
  SELECT DISTINCT r.relationship_uuid,
         r.relationship_type_key,
         r.interaction_type_key,
         r.comments
  FROM gsrs.substance_relationship r
  JOIN gsrs.substance_relationship_has_subject hs
    ON hs.relationship_uuid = r.relationship_uuid
  JOIN gsrs.substance_relationship_has_related hr
    ON hr.relationship_uuid = r.relationship_uuid
  JOIN approved_substance source_substance
    ON source_substance.gsrs_uuid = hs.source_gsrs_uuid
  JOIN approved_substance related_substance
    ON related_substance.gsrs_uuid = hr.related_gsrs_uuid
),
raw_fda_product AS (
  SELECT id,
         product_id,
         finished
  FROM (
    SELECT id,
           NULLIF(trim(record ->> 'product_id'), '') AS product_id,
           CASE lower(record ->> 'finished')
             WHEN 'true' THEN TRUE
             WHEN 'false' THEN FALSE
             ELSE NULL
           END AS finished
    FROM fda_ndc_json_raw.fda_ndc_json
  ) src
  WHERE product_id IS NOT NULL
),
raw_fda_product_id AS (
  SELECT DISTINCT product_id
  FROM raw_fda_product
),
raw_fda_finished_product_id AS (
  SELECT DISTINCT product_id
  FROM raw_fda_product
  WHERE finished = TRUE
),
fda_product_with_name AS (
  SELECT DISTINCT product_id
  FROM fda_ndc_json.medicinal_product_has_name
),
fda_product_with_identifier AS (
  SELECT DISTINCT product_id
  FROM fda_ndc_json.medicinal_product_has_identifier
),
fda_product_with_dose_form AS (
  SELECT DISTINCT pp.product_id
  FROM fda_ndc_json.pharmaceutical_product pp
  JOIN fda_ndc_json.pharmaceutical_product_has_dose_form hdf
    ON hdf.pharmaceutical_product_key = pp.pharmaceutical_product_key
),
fda_product_with_route AS (
  SELECT DISTINCT pp.product_id
  FROM fda_ndc_json.pharmaceutical_product pp
  JOIN fda_ndc_json.pharmaceutical_product_has_route hr
    ON hr.pharmaceutical_product_key = pp.pharmaceutical_product_key
),
fda_product_with_package AS (
  SELECT DISTINCT product_id
  FROM fda_ndc_json.medicinal_product_has_packaged_medicinal_product
),
active_ingredient_substance_role AS (
  SELECT active_ingredient_key
  FROM fda_ndc_json.active_ingredient_played_by_gsrs_substance

  UNION

  SELECT active_ingredient_key
  FROM fda_ndc_json.active_ingredient_played_by_openfda_substance
),
pharmaceutical_product_comprises_any_substance AS (
  SELECT active_ingredient_key
  FROM fda_ndc_json.pharmaceutical_product_comprises_gsrs_substance

  UNION

  SELECT active_ingredient_key
  FROM fda_ndc_json.pharmaceutical_product_comprises_openfda_substance
),
coverage_rows AS (
  SELECT
    10 AS sort_order,
    'coverage' AS metric_kind,
    'GSRS substance' AS coverage_group,
    'Approved GSRS substances mapped to idmp-sub:Substance' AS coverage_item,
    'GsrsSubstance' AS mapping_ids,
    'gsrs.substance' AS source_table,
    'gsrs_uuid' AS source_id_column,
    'all GSRS substance IDs' AS denominator_label,
    (SELECT COUNT(*) FROM gsrs.substance)::BIGINT AS denominator_count,
    'approved substance IDs mapped to idmp-sub:Substance' AS mapped_label,
    (SELECT COUNT(*) FROM approved_substance)::BIGINT AS mapped_count,
    'substance IDs not approved or not eligible for the base substance mapping' AS remainder_label,
    'idmp-sub:Substance' AS target_class_or_property,
    'The base GSRS substance mapping intentionally filters to status = approved.' AS coverage_note

  UNION ALL

  SELECT
    20,
    'coverage',
    'GSRS substance',
    'Approved GSRS substances mapped to a specific IDMP substance subclass',
    'GsrsChemicalSubstance; GsrsProteinSubstance; GsrsNucleicAcidSubstance; GsrsPolymerSubstance; GsrsMixtureSubstance; GsrsStructurallyDiverseSubstance; GsrsSpecifiedSubstance',
    'gsrs.substance',
    'gsrs_uuid',
    'approved GSRS substance IDs',
    (SELECT COUNT(*) FROM approved_substance)::BIGINT,
    'approved substance IDs with a recognized substance_class value',
    (SELECT COUNT(*) FROM recognized_substance_subclass)::BIGINT,
    'approved substance IDs with missing or unmapped substance_class values',
    'IDMP substance subclass classes',
    'This is the main subclass coverage metric requested for the substance_class field.'

  UNION ALL

  SELECT
    21,
    'classification_distribution',
    'GSRS substance',
    'Approved GSRS substances classified as chemical',
    'GsrsChemicalSubstance',
    'gsrs.substance',
    'gsrs_uuid',
    'approved GSRS substance IDs',
    (SELECT COUNT(*) FROM approved_substance)::BIGINT,
    'approved substance IDs where substance_class = chemical',
    (SELECT COUNT(*) FROM approved_substance WHERE substance_class = 'chemical')::BIGINT,
    'approved substance IDs with another or unmapped substance_class value',
    'idmp-sub:ChemicalSubstance',
    'Distribution row for a specific mapped subclass.'

  UNION ALL

  SELECT
    22,
    'classification_distribution',
    'GSRS substance',
    'Approved GSRS substances classified as protein',
    'GsrsProteinSubstance',
    'gsrs.substance',
    'gsrs_uuid',
    'approved GSRS substance IDs',
    (SELECT COUNT(*) FROM approved_substance)::BIGINT,
    'approved substance IDs where substance_class = protein',
    (SELECT COUNT(*) FROM approved_substance WHERE substance_class = 'protein')::BIGINT,
    'approved substance IDs with another or unmapped substance_class value',
    'idmp-sub:ProteinSubstance',
    'Distribution row for a specific mapped subclass.'

  UNION ALL

  SELECT
    23,
    'classification_distribution',
    'GSRS substance',
    'Approved GSRS substances classified as nucleic acid',
    'GsrsNucleicAcidSubstance',
    'gsrs.substance',
    'gsrs_uuid',
    'approved GSRS substance IDs',
    (SELECT COUNT(*) FROM approved_substance)::BIGINT,
    'approved substance IDs where substance_class = nucleicAcid',
    (SELECT COUNT(*) FROM approved_substance WHERE substance_class = 'nucleicAcid')::BIGINT,
    'approved substance IDs with another or unmapped substance_class value',
    'idmp-sub:NucleicAcidSubstance',
    'Distribution row for a specific mapped subclass.'

  UNION ALL

  SELECT
    24,
    'classification_distribution',
    'GSRS substance',
    'Approved GSRS substances classified as polymer',
    'GsrsPolymerSubstance',
    'gsrs.substance',
    'gsrs_uuid',
    'approved GSRS substance IDs',
    (SELECT COUNT(*) FROM approved_substance)::BIGINT,
    'approved substance IDs where substance_class = polymer',
    (SELECT COUNT(*) FROM approved_substance WHERE substance_class = 'polymer')::BIGINT,
    'approved substance IDs with another or unmapped substance_class value',
    'idmp-sub:PolymerSubstance',
    'Distribution row for a specific mapped subclass.'

  UNION ALL

  SELECT
    25,
    'classification_distribution',
    'GSRS substance',
    'Approved GSRS substances classified as mixture',
    'GsrsMixtureSubstance',
    'gsrs.substance',
    'gsrs_uuid',
    'approved GSRS substance IDs',
    (SELECT COUNT(*) FROM approved_substance)::BIGINT,
    'approved substance IDs where substance_class = mixture',
    (SELECT COUNT(*) FROM approved_substance WHERE substance_class = 'mixture')::BIGINT,
    'approved substance IDs with another or unmapped substance_class value',
    'idmp-sub:Mixture',
    'Distribution row for a specific mapped subclass.'

  UNION ALL

  SELECT
    26,
    'classification_distribution',
    'GSRS substance',
    'Approved GSRS substances classified as structurally diverse',
    'GsrsStructurallyDiverseSubstance',
    'gsrs.substance',
    'gsrs_uuid',
    'approved GSRS substance IDs',
    (SELECT COUNT(*) FROM approved_substance)::BIGINT,
    'approved substance IDs where substance_class = structurallyDiverse',
    (SELECT COUNT(*) FROM approved_substance WHERE substance_class = 'structurallyDiverse')::BIGINT,
    'approved substance IDs with another or unmapped substance_class value',
    'idmp-sub:StructurallyDiverseSubstance',
    'Distribution row for a specific mapped subclass.'

  UNION ALL

  SELECT
    27,
    'classification_distribution',
    'GSRS substance',
    'Approved GSRS substances classified as specified substance',
    'GsrsSpecifiedSubstance',
    'gsrs.substance',
    'gsrs_uuid',
    'approved GSRS substance IDs',
    (SELECT COUNT(*) FROM approved_substance)::BIGINT,
    'approved substance IDs where substance_class = specifiedSubstanceG1',
    (SELECT COUNT(*) FROM approved_substance WHERE substance_class = 'specifiedSubstanceG1')::BIGINT,
    'approved substance IDs with another or unmapped substance_class value',
    'idmp-sub:SpecifiedSubstance',
    'Distribution row for a specific mapped subclass.'

  UNION ALL

  SELECT
    100,
    'coverage',
    'GSRS name',
    'Substance names linked to approved GSRS substances',
    'GsrsSubstanceName',
    'gsrs.substance_name; gsrs.substance_has_name; gsrs.substance',
    'name_uuid',
    'all GSRS substance name IDs',
    (SELECT COUNT(*) FROM gsrs.substance_name)::BIGINT,
    'name IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_substance_name)::BIGINT,
    'name IDs not linked to an approved mapped substance',
    'idmp-sub:SubstanceName',
    'Names are mapped only when their parent substance is approved.'

  UNION ALL

  SELECT
    110,
    'coverage',
    'GSRS name',
    'Substance-to-name links for approved GSRS substances',
    'GsrsSubstanceHasName',
    'gsrs.substance_has_name; gsrs.substance',
    'gsrs_uuid; name_uuid',
    'all GSRS substance-name links',
    (SELECT COUNT(*) FROM gsrs.substance_has_name)::BIGINT,
    'substance-name links whose substance is approved',
    (SELECT COUNT(*) FROM approved_substance_has_name)::BIGINT,
    'substance-name links whose substance is not approved',
    'idmp-sub:hasSubstanceName',
    'Relationship coverage for the GSRS name association.'

  UNION ALL

  SELECT
    120,
    'coverage',
    'GSRS name',
    'Approved GSRS names classified by a mapped name type',
    'GsrsSubstanceNameTypeCommon; GsrsSubstanceNameTypeSystematic; GsrsSubstanceNameTypeCompanyCode; GsrsSubstanceNameTypeOfficial; GsrsSubstanceNameTypeBrand',
    'gsrs.substance_name; gsrs.substance_has_name; gsrs.substance',
    'name_uuid',
    'name IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_substance_name)::BIGINT,
    'approved-parent name IDs with name_type in cn, sys, cd, of, or bn',
    (SELECT COUNT(*) FROM approved_substance_name WHERE name_type IN ('cn', 'sys', 'cd', 'of', 'bn'))::BIGINT,
    'approved-parent name IDs with missing or unmapped name_type values',
    'idmp-sub:SubstanceNameType classifiers',
    'This measures the coverage of the curated name_type-to-classifier mapping.'

  UNION ALL

  SELECT
    121,
    'classification_distribution',
    'GSRS name',
    'Approved GSRS names with common name type',
    'GsrsSubstanceNameTypeCommon',
    'gsrs.substance_name',
    'name_uuid',
    'name IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_substance_name)::BIGINT,
    'approved-parent name IDs where name_type = cn',
    (SELECT COUNT(*) FROM approved_substance_name WHERE name_type = 'cn')::BIGINT,
    'approved-parent name IDs with another or unmapped name_type value',
    'idmp-sub:CommonName',
    'Distribution row for a specific mapped GSRS name type.'

  UNION ALL

  SELECT
    122,
    'classification_distribution',
    'GSRS name',
    'Approved GSRS names with systematic name type',
    'GsrsSubstanceNameTypeSystematic',
    'gsrs.substance_name',
    'name_uuid',
    'name IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_substance_name)::BIGINT,
    'approved-parent name IDs where name_type = sys',
    (SELECT COUNT(*) FROM approved_substance_name WHERE name_type = 'sys')::BIGINT,
    'approved-parent name IDs with another or unmapped name_type value',
    'idmp-sub:SystematicName',
    'Distribution row for a specific mapped GSRS name type.'

  UNION ALL

  SELECT
    123,
    'classification_distribution',
    'GSRS name',
    'Approved GSRS names with company code name type',
    'GsrsSubstanceNameTypeCompanyCode',
    'gsrs.substance_name',
    'name_uuid',
    'name IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_substance_name)::BIGINT,
    'approved-parent name IDs where name_type = cd',
    (SELECT COUNT(*) FROM approved_substance_name WHERE name_type = 'cd')::BIGINT,
    'approved-parent name IDs with another or unmapped name_type value',
    'idmp-sub:CompanyCodeName',
    'Distribution row for a specific mapped GSRS name type.'

  UNION ALL

  SELECT
    124,
    'classification_distribution',
    'GSRS name',
    'Approved GSRS names with official name type',
    'GsrsSubstanceNameTypeOfficial',
    'gsrs.substance_name',
    'name_uuid',
    'name IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_substance_name)::BIGINT,
    'approved-parent name IDs where name_type = of',
    (SELECT COUNT(*) FROM approved_substance_name WHERE name_type = 'of')::BIGINT,
    'approved-parent name IDs with another or unmapped name_type value',
    'idmp-sub:OfficialName',
    'Distribution row for a specific mapped GSRS name type.'

  UNION ALL

  SELECT
    125,
    'classification_distribution',
    'GSRS name',
    'Approved GSRS names with brand name type',
    'GsrsSubstanceNameTypeBrand',
    'gsrs.substance_name',
    'name_uuid',
    'name IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_substance_name)::BIGINT,
    'approved-parent name IDs where name_type = bn',
    (SELECT COUNT(*) FROM approved_substance_name WHERE name_type = 'bn')::BIGINT,
    'approved-parent name IDs with another or unmapped name_type value',
    'idmp-sub:BrandName',
    'Distribution row for a specific mapped GSRS name type.'

  UNION ALL

  SELECT
    130,
    'coverage',
    'GSRS name',
    'Substance name domains used by approved GSRS names',
    'GsrsSubstanceNameDomain',
    'gsrs.substance_name_domain; gsrs.substance_name_has_domain',
    'domain_key',
    'all GSRS substance name domain IDs',
    (SELECT COUNT(*) FROM gsrs.substance_name_domain)::BIGINT,
    'domain IDs attached to names whose substance is approved',
    (SELECT COUNT(*) FROM approved_name_domain)::BIGINT,
    'domain IDs used only outside approved mapped substances',
    'idmp-sub:SubstanceNameDomain',
    'Domain entities are counted by distinct domain_key.'

  UNION ALL

  SELECT
    131,
    'coverage',
    'GSRS name',
    'Approved GSRS name-to-domain links',
    'GsrsSubstanceNameHasDomain',
    'gsrs.substance_name_has_domain; gsrs.substance_has_name; gsrs.substance',
    'name_uuid; domain_key',
    'all GSRS name-domain links',
    (SELECT COUNT(*) FROM gsrs.substance_name_has_domain)::BIGINT,
    'name-domain links whose name belongs to an approved substance',
    (SELECT COUNT(*) FROM approved_name_has_domain)::BIGINT,
    'name-domain links outside approved mapped substances',
    'idmp-sub:hasSubstanceNameDomain',
    'Relationship coverage for name-domain associations.'

  UNION ALL

  SELECT
    132,
    'coverage',
    'GSRS name',
    'Approved GSRS name language links',
    'GsrsSubstanceNameLanguage',
    'gsrs.substance_name_has_language; gsrs.substance_has_name; gsrs.substance',
    'name_uuid; language_key',
    'all GSRS name-language links',
    (SELECT COUNT(*) FROM gsrs.substance_name_has_language)::BIGINT,
    'name-language links whose name belongs to an approved substance',
    (SELECT COUNT(*) FROM approved_name_language)::BIGINT,
    'name-language links outside approved mapped substances',
    'idmp-dtp:hasLanguageCode',
    'Relationship coverage for language-code assignments.'

  UNION ALL

  SELECT
    200,
    'coverage',
    'GSRS code',
    'Approved GSRS substance codes mapped to a code class',
    'GsrsSubstanceCode; GsrsUniqueIngredientNumber; GsrsCasRegistryNumber; GsrsChebiIdentifier; GsrsMeshIdentifier; GsrsEudraVigilanceCode',
    'gsrs.substance_code; gsrs.substance_has_code; gsrs.substance',
    'code_uuid',
    'code IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_code)::BIGINT,
    'approved-parent code IDs mapped to generic or specialized code classes',
    (SELECT COUNT(*) FROM classified_code)::BIGINT,
    'approved-parent code IDs with missing or unmapped code-system classification',
    'GSRS and IDMP/NARA/EURA code classes',
    'This measures whether each approved-parent code receives a code class.'

  UNION ALL

  SELECT
    201,
    'classification_distribution',
    'GSRS code',
    'Approved GSRS codes mapped to the generic SubstanceCode class',
    'GsrsSubstanceCode',
    'gsrs.substance_code',
    'code_uuid',
    'code IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_code)::BIGINT,
    'approved-parent code IDs not classified as one of the specialized code classes',
    (SELECT COUNT(*) FROM generic_code)::BIGINT,
    'approved-parent code IDs mapped to a specialized class or unmapped because of null classification fields',
    'idmp-sub:SubstanceCode',
    'Generic code class distribution row.'

  UNION ALL

  SELECT
    202,
    'classification_distribution',
    'GSRS code',
    'Approved GSRS codes mapped as FDA UNII identifiers',
    'GsrsUniqueIngredientNumber',
    'gsrs.substance_code',
    'code_uuid',
    'code IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_code)::BIGINT,
    'approved-parent code IDs where code_system = FDA UNII',
    (SELECT COUNT(*) FROM approved_code WHERE code_system = 'FDA UNII')::BIGINT,
    'approved-parent code IDs with another code_system value',
    'idmp-nara:UniqueIngredientNumber',
    'Specialized code class distribution row.'

  UNION ALL

  SELECT
    203,
    'classification_distribution',
    'GSRS code',
    'Approved GSRS codes mapped as CAS registry numbers',
    'GsrsCasRegistryNumber',
    'gsrs.substance_code',
    'code_uuid',
    'code IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_code)::BIGINT,
    'approved-parent code IDs where code_system = CAS',
    (SELECT COUNT(*) FROM approved_code WHERE code_system = 'CAS')::BIGINT,
    'approved-parent code IDs with another code_system value',
    'idmp-nara:CASRegistryNumber',
    'Specialized code class distribution row.'

  UNION ALL

  SELECT
    204,
    'classification_distribution',
    'GSRS code',
    'Approved GSRS codes mapped as ChEBI identifiers',
    'GsrsChebiIdentifier',
    'gsrs.substance_code',
    'code_uuid',
    'code IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_code)::BIGINT,
    'approved-parent code IDs where code_system = CHEBI',
    (SELECT COUNT(*) FROM approved_code WHERE code_system = 'CHEBI')::BIGINT,
    'approved-parent code IDs with another code_system value',
    'idmp-eura:ChemicalEntitiesOfBiologicalInterestIdentifier',
    'Specialized code class distribution row.'

  UNION ALL

  SELECT
    205,
    'classification_distribution',
    'GSRS code',
    'Approved GSRS codes mapped as MeSH identifiers',
    'GsrsMeshIdentifier',
    'gsrs.substance_code',
    'code_uuid',
    'code IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_code)::BIGINT,
    'approved-parent code IDs where code_system = MESH',
    (SELECT COUNT(*) FROM approved_code WHERE code_system = 'MESH')::BIGINT,
    'approved-parent code IDs with another code_system value',
    'idmp-nara:MedicalSubjectHeadingsUniqueIdentifier',
    'Specialized code class distribution row.'

  UNION ALL

  SELECT
    206,
    'classification_distribution',
    'GSRS code',
    'Approved GSRS codes mapped as EudraVigilance identifiers',
    'GsrsEudraVigilanceCode',
    'gsrs.substance_code',
    'code_uuid',
    'code IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_code)::BIGINT,
    'approved-parent EVMPD code IDs matching ^SUB[A-Z0-9]+$',
    (SELECT COUNT(*) FROM approved_code WHERE code_system = 'EVMPD' AND code_value ~ '^SUB[A-Z0-9]+$')::BIGINT,
    'approved-parent code IDs with another code_system value or non-EudraVigilance EVMPD pattern',
    'idmp-eura:EudraVigilanceCode',
    'Specialized code class distribution row.'

  UNION ALL

  SELECT
    210,
    'coverage',
    'GSRS code',
    'Approved GSRS substance-to-code links',
    'GsrsSubstanceCodeIdentifies',
    'gsrs.substance_has_code; gsrs.substance',
    'gsrs_uuid; code_uuid',
    'all GSRS substance-code links',
    (SELECT COUNT(*) FROM gsrs.substance_has_code)::BIGINT,
    'substance-code links whose substance is approved',
    (SELECT COUNT(*) FROM approved_code_link)::BIGINT,
    'substance-code links whose substance is not approved',
    'cmns-id:identifies; cmns-id:isIdentifiedBy',
    'Relationship coverage for GSRS substance-code associations.'

  UNION ALL

  SELECT
    220,
    'literal_presence',
    'GSRS code',
    'Approved GSRS codes with non-null code values',
    'GsrsSubstanceCodeValue',
    'gsrs.substance_code',
    'code_uuid',
    'code IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_code)::BIGINT,
    'approved-parent code IDs with code_value present',
    (SELECT COUNT(*) FROM approved_code WHERE code_value IS NOT NULL)::BIGINT,
    'approved-parent code IDs with missing code_value',
    'cmns-txt:hasTextValue',
    'Literal-value presence for the code value mapping.'

  UNION ALL

  SELECT
    221,
    'literal_presence',
    'GSRS code',
    'Approved GSRS codes with display text',
    'GsrsSubstanceCodeDisplayName',
    'gsrs.substance_code',
    'code_uuid',
    'code IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_code)::BIGINT,
    'approved-parent code IDs with code_text present',
    (SELECT COUNT(*) FROM approved_code WHERE code_text IS NOT NULL)::BIGINT,
    'approved-parent code IDs with missing code_text',
    'idmp-dtp:hasDisplayName',
    'Literal-value presence for the code display-name mapping.'

  UNION ALL

  SELECT
    222,
    'literal_presence',
    'GSRS code',
    'Approved GSRS codes with HTTP reference URLs',
    'GsrsSubstanceCodeReferenceUrl',
    'gsrs.substance_code',
    'code_uuid',
    'code IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_code)::BIGINT,
    'approved-parent code IDs with code_url matching ^https?://',
    (SELECT COUNT(*) FROM approved_code WHERE code_url ~ '^https?://')::BIGINT,
    'approved-parent code IDs with missing or non-HTTP code_url',
    'idmp-dtp:hasReferenceURL',
    'The OBDA mapping explicitly requires an HTTP or HTTPS URL.'

  UNION ALL

  SELECT
    223,
    'literal_presence',
    'GSRS code',
    'Approved GSRS codes with comments',
    'GsrsSubstanceCodeComment',
    'gsrs.substance_code',
    'code_uuid',
    'code IDs linked to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_code)::BIGINT,
    'approved-parent code IDs with comments present',
    (SELECT COUNT(*) FROM approved_code WHERE comments IS NOT NULL)::BIGINT,
    'approved-parent code IDs with missing comments',
    'idmp-sub:hasComment',
    'Literal-value presence for optional code comments.'

  UNION ALL

  SELECT
    230,
    'coverage',
    'GSRS code',
    'Code systems used by approved GSRS codes',
    'GsrsCodeSystem',
    'gsrs.code_system; gsrs.substance_code_in_code_system',
    'code_system_key',
    'all GSRS code-system IDs',
    (SELECT COUNT(*) FROM gsrs.code_system)::BIGINT,
    'code-system IDs used by approved-parent codes',
    (SELECT COUNT(*) FROM approved_code_system)::BIGINT,
    'code-system IDs used only outside approved mapped substances',
    'idmp-dtp:CodeSystem',
    'Code-system class coverage counted by distinct code_system_key.'

  UNION ALL

  SELECT
    231,
    'coverage',
    'GSRS code',
    'Approved GSRS code-to-code-system links',
    'GsrsSubstanceCodeInCodeSystem',
    'gsrs.substance_code_in_code_system; gsrs.substance_has_code; gsrs.substance',
    'code_uuid; code_system_key',
    'all GSRS code-to-code-system links',
    (SELECT COUNT(*) FROM gsrs.substance_code_in_code_system)::BIGINT,
    'code-to-code-system links whose code belongs to an approved substance',
    (SELECT COUNT(*) FROM approved_code_in_code_system)::BIGINT,
    'code-to-code-system links outside approved mapped substances',
    'cmns-col:isMemberOf',
    'Relationship coverage for code-system membership.'

  UNION ALL

  SELECT
    300,
    'coverage',
    'GSRS structure',
    'Approved GSRS substances with a defining molecular structure',
    'GsrsMolecularStructure; GsrsSubstanceHasDefiningStructure',
    'gsrs.substance_structure; gsrs.substance_has_structure; gsrs.substance',
    'gsrs_uuid; structure_key',
    'approved GSRS substance IDs',
    (SELECT COUNT(*) FROM approved_substance)::BIGINT,
    'approved substance IDs with a defining structure',
    (SELECT COUNT(DISTINCT gsrs_uuid) FROM approved_structure_link)::BIGINT,
    'approved substance IDs without a defining structure',
    'idmp-sub:MolecularStructure; idmp-sub:hasDefiningStructure',
    'Structure coverage is measured at the approved substance level.'

  UNION ALL

  SELECT
    301,
    'literal_presence',
    'GSRS structure',
    'Approved GSRS structures with structure identifiers',
    'GsrsMolecularStructureIdentifier',
    'gsrs.substance_structure',
    'structure_key',
    'molecular structures attached to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_structure)::BIGINT,
    'approved-parent structures with structure_id present',
    (SELECT COUNT(*) FROM approved_structure WHERE structure_id IS NOT NULL)::BIGINT,
    'approved-parent structures with missing structure_id',
    'idmp-sub:MolecularStructureIdentifier',
    'Identifier presence for molecular-structure IDs.'

  UNION ALL

  SELECT
    302,
    'literal_presence',
    'GSRS structure',
    'Approved GSRS structures with molecular formula values',
    'GsrsMolecularFormula; GsrsSubstanceHasMolecularFormula',
    'gsrs.substance_structure; gsrs.substance_has_molecular_formula',
    'structure_key',
    'molecular structures attached to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_structure)::BIGINT,
    'approved-parent structures with molecular_formula present',
    (SELECT COUNT(*) FROM approved_structure WHERE molecular_formula IS NOT NULL)::BIGINT,
    'approved-parent structures with missing molecular_formula',
    'idmp-sub:MolecularFormula; idmp-sub:hasDefiningMolecularFormula',
    'Formula coverage covers both the formula node and the substance-to-formula link.'

  UNION ALL

  SELECT
    303,
    'literal_presence',
    'GSRS structure',
    'Approved GSRS structures with molecular weight values',
    'GsrsMolecularWeight; GsrsSubstanceHasMolecularWeight',
    'gsrs.substance_structure; gsrs.substance_has_molecular_weight',
    'structure_key',
    'molecular structures attached to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_structure)::BIGINT,
    'approved-parent structures with molecular_weight present',
    (SELECT COUNT(*) FROM approved_structure WHERE molecular_weight IS NOT NULL)::BIGINT,
    'approved-parent structures with missing or non-numeric molecular_weight',
    'idmp-sub:MolecularWeight; idmp-sub:hasDefiningMolecularWeight',
    'The curated table only stores molecular_weight when the raw value is numeric.'

  UNION ALL

  SELECT
    304,
    'literal_presence',
    'GSRS structure',
    'Approved GSRS structures with SMILES values',
    'GsrsSmiles; GsrsMolecularStructureHasSmiles',
    'gsrs.substance_structure; gsrs.molecular_structure_has_smiles',
    'structure_key',
    'molecular structures attached to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_structure)::BIGINT,
    'approved-parent structures with smiles present',
    (SELECT COUNT(*) FROM approved_structure WHERE smiles IS NOT NULL)::BIGINT,
    'approved-parent structures with missing smiles',
    'idmp-sub:SMILES; idmp-sub:hasSMILES',
    'SMILES coverage covers both the SMILES node and the structure-to-SMILES link.'

  UNION ALL

  SELECT
    305,
    'literal_presence',
    'GSRS structure',
    'Approved GSRS structures with molfile values',
    'GsrsMolfile; GsrsMolecularStructureHasMolfile',
    'gsrs.substance_structure; gsrs.molecular_structure_has_molfile',
    'structure_key',
    'molecular structures attached to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_structure)::BIGINT,
    'approved-parent structures with molfile present',
    (SELECT COUNT(*) FROM approved_structure WHERE molfile IS NOT NULL)::BIGINT,
    'approved-parent structures with missing molfile',
    'idmp-sub:Molfile; idmp-sub:hasMolfile',
    'Molfile coverage covers both the molfile node and the structure-to-molfile link.'

  UNION ALL

  SELECT
    306,
    'classification_distribution',
    'GSRS structure',
    'Approved GSRS structures with mapped stereochemistry classifiers',
    'GsrsSubstanceStereochemistry',
    'gsrs.substance_structure',
    'structure_key',
    'molecular structures attached to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_structure)::BIGINT,
    'approved-parent structures with stereochemistry_classifier present',
    (SELECT COUNT(*) FROM approved_structure WHERE stereochemistry_classifier IS NOT NULL)::BIGINT,
    'approved-parent structures with missing or unmapped stereochemistry values',
    'idmp-sub:hasStereochemistry',
    'Classifier coverage for curated stereochemistry values.'

  UNION ALL

  SELECT
    307,
    'classification_distribution',
    'GSRS structure',
    'Approved GSRS structures with mapped optical-activity classifiers',
    'GsrsSubstanceOpticalActivity',
    'gsrs.substance_structure',
    'structure_key',
    'molecular structures attached to approved GSRS substances',
    (SELECT COUNT(*) FROM approved_structure)::BIGINT,
    'approved-parent structures with optical_activity_classifier present',
    (SELECT COUNT(*) FROM approved_structure WHERE optical_activity_classifier IS NOT NULL)::BIGINT,
    'approved-parent structures with missing or unmapped optical_activity values',
    'idmp-sub:hasOpticalActivity',
    'Classifier coverage for curated optical-activity values.'

  UNION ALL

  SELECT
    400,
    'coverage',
    'GSRS relationship',
    'Raw GSRS relationship rows mapped to approved endpoint relationships',
    'GsrsSubstanceRelationship; GsrsSubstanceRelationshipSubject; GsrsSubstanceRelationshipRelated',
    'gsrs.substance_relationship; gsrs.substance_relationship_unresolved; gsrs.substance_relationship_has_subject; gsrs.substance_relationship_has_related',
    'relationship_uuid',
    'raw GSRS relationship rows captured as resolved or unresolved curated rows',
    (SELECT relationship_count FROM raw_relationship_count),
    'relationship IDs with approved source and approved related substances',
    (SELECT COUNT(*) FROM endpoint_valid_relationship)::BIGINT,
    'relationship rows unresolved or excluded because at least one endpoint is not an approved mapped substance',
    'idmp-sub:SubstanceRelationship; idmp-sub:hasSubjectSubstance; idmp-sub:hasRelatedSubstance',
    'This is the main relationship connectivity coverage metric.'

  UNION ALL

  SELECT
    401,
    'diagnostic_share',
    'GSRS relationship',
    'Raw GSRS relationship rows stored as unresolved',
    'No direct OBDA mapping; diagnostic for relationship coverage',
    'gsrs.substance_relationship_unresolved',
    'source_gsrs_uuid; relationship_order',
    'raw GSRS relationship rows captured as resolved or unresolved curated rows',
    (SELECT relationship_count FROM raw_relationship_count),
    'relationship rows in gsrs.substance_relationship_unresolved',
    (SELECT COUNT(*) FROM gsrs.substance_relationship_unresolved)::BIGINT,
    'relationship rows resolved into gsrs.substance_relationship',
    'coverage diagnostic',
    'This row measures a source-data limitation, not a mapped ontology class.'

  UNION ALL

  SELECT
    410,
    'coverage',
    'GSRS relationship',
    'Approved-endpoint GSRS relationships with relationship type codes',
    'GsrsSubstanceRelationshipCode; GsrsSubstanceRelationshipCodeLink',
    'gsrs.substance_relationship; gsrs.substance_relationship_has_code',
    'relationship_uuid; relationship_type_key',
    'GSRS relationship IDs with approved endpoints',
    (SELECT COUNT(*) FROM endpoint_valid_relationship)::BIGINT,
    'approved-endpoint relationship IDs with relationship_type_key present',
    (SELECT COUNT(*) FROM endpoint_valid_relationship WHERE relationship_type_key IS NOT NULL)::BIGINT,
    'approved-endpoint relationship IDs with missing relationship_type_key',
    'idmp-sub:SubstanceRelationshipCode; cmns-dsg:isSignifiedBy',
    'Classifier/link coverage for relationship type codes.'

  UNION ALL

  SELECT
    411,
    'coverage',
    'GSRS relationship',
    'Approved-endpoint GSRS relationships with interaction type classifiers',
    'GsrsSubstanceRelationshipInteractionType; GsrsSubstanceRelationshipInteractionTypeLink',
    'gsrs.substance_relationship; gsrs.substance_relationship_has_interaction_type',
    'relationship_uuid; interaction_type_key',
    'GSRS relationship IDs with approved endpoints',
    (SELECT COUNT(*) FROM endpoint_valid_relationship)::BIGINT,
    'approved-endpoint relationship IDs with interaction_type_key present',
    (SELECT COUNT(*) FROM endpoint_valid_relationship WHERE interaction_type_key IS NOT NULL)::BIGINT,
    'approved-endpoint relationship IDs with missing interaction_type_key',
    'idmp-sub:SubstanceRelationshipType; cmns-cls:isClassifiedBy',
    'Classifier/link coverage for interaction type values.'

  UNION ALL

  SELECT
    412,
    'literal_presence',
    'GSRS relationship',
    'Approved-endpoint GSRS relationships with comments',
    'GsrsSubstanceRelationshipComment',
    'gsrs.substance_relationship',
    'relationship_uuid',
    'GSRS relationship IDs with approved endpoints',
    (SELECT COUNT(*) FROM endpoint_valid_relationship)::BIGINT,
    'approved-endpoint relationship IDs with comments present',
    (SELECT COUNT(*) FROM endpoint_valid_relationship WHERE comments IS NOT NULL)::BIGINT,
    'approved-endpoint relationship IDs with missing comments',
    'idmp-sub:hasComment',
    'Optional relationship comment literal coverage.'

  UNION ALL

  SELECT
    500,
    'coverage',
    'OpenFDA product',
    'Raw OpenFDA product IDs selected as finished medicinal products',
    'FdaMedicinalProduct',
    'fda_ndc_json_raw.fda_ndc_json; fda_ndc_json.medicinal_product',
    'product_id',
    'distinct raw OpenFDA product IDs',
    (SELECT COUNT(*) FROM raw_fda_product_id)::BIGINT,
    'finished raw product IDs mapped to medicinal products',
    (SELECT COUNT(*) FROM fda_ndc_json.medicinal_product)::BIGINT,
    'raw product IDs not selected, usually because finished is not true',
    'idmp-mprd:MedicinalProduct',
    'This documents the OpenFDA product-level eligibility rule.'

  UNION ALL

  SELECT
    510,
    'coverage',
    'OpenFDA product name/identifier',
    'Medicinal products with generated product-name nodes',
    'FdaMedicinalProductName; FdaMedicinalProductHasName; FdaMedicinalProductNameValue',
    'fda_ndc_json.medicinal_product; fda_ndc_json.medicinal_product_name; fda_ndc_json.medicinal_product_has_name',
    'product_id; product_name_key',
    'curated medicinal product IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.medicinal_product)::BIGINT,
    'medicinal product IDs with brand_name or generic_name available',
    (SELECT COUNT(*) FROM fda_product_with_name)::BIGINT,
    'medicinal product IDs without brand_name and generic_name',
    'idmp-mprd:MedicinalProductName; cmns-dsg:hasName; idmp-mprd:hasFullMedicinalProductName',
    'Name-node coverage is product-level because one generated name node is created per product when a name exists.'

  UNION ALL

  SELECT
    520,
    'coverage',
    'OpenFDA product name/identifier',
    'Medicinal products with generated identifier nodes',
    'FdaMedicinalProductIdentifier; FdaMedicinalProductIdentifierValue; FdaMedicinalProductIdentifierIdentifies; FdaMedicinalProductIsIdentifiedBy',
    'fda_ndc_json.medicinal_product_identifier; fda_ndc_json.medicinal_product_has_identifier',
    'product_id; identifier_key',
    'curated medicinal product IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.medicinal_product)::BIGINT,
    'medicinal product IDs with at least one product NDC, RxCUI, SPL set ID, or UPC identifier',
    (SELECT COUNT(*) FROM fda_product_with_identifier)::BIGINT,
    'medicinal product IDs without a curated identifier',
    'idmp-mprd:MedicinalProductIdentifier; cmns-id:identifies; cmns-id:isIdentifiedBy',
    'Identifier-node coverage is product-level; individual identifier rows can exceed product count.'

  UNION ALL

  SELECT
    521,
    'coverage',
    'OpenFDA product name/identifier',
    'Medicinal product identifiers with identifier-type classifiers',
    'FdaMedicinalProductIdentifierType; FdaMedicinalProductIdentifierHasType',
    'fda_ndc_json.medicinal_product_identifier; fda_ndc_json.medicinal_product_identifier_has_type',
    'identifier_key; identifier_type_key',
    'curated medicinal product identifier IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.medicinal_product_identifier)::BIGINT,
    'identifier IDs linked to an identifier-type classifier',
    (SELECT COUNT(DISTINCT identifier_key) FROM fda_ndc_json.medicinal_product_identifier_has_type)::BIGINT,
    'identifier IDs without an identifier-type classifier',
    'cmns-cls:Classifier; cmns-cls:isClassifiedBy',
    'Classifier coverage for medicinal product identifiers.'

  UNION ALL

  SELECT
    530,
    'coverage',
    'OpenFDA composition',
    'Medicinal products mapped to pharmaceutical products',
    'FdaPharmaceuticalProduct; FdaMedicinalProductComprisesPharmaceuticalProduct',
    'fda_ndc_json.medicinal_product; fda_ndc_json.pharmaceutical_product',
    'product_id; pharmaceutical_product_key',
    'curated medicinal product IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.medicinal_product)::BIGINT,
    'medicinal product IDs with generated pharmaceutical products',
    (SELECT COUNT(*) FROM fda_ndc_json.pharmaceutical_product)::BIGINT,
    'medicinal product IDs without generated pharmaceutical products',
    'idmp-mprd:PharmaceuticalProduct; cmns-col:comprises',
    'One pharmaceutical product is generated for each curated medicinal product.'

  UNION ALL

  SELECT
    540,
    'coverage',
    'OpenFDA composition',
    'Medicinal products mapped to product composition nodes',
    'FdaProductComposition; FdaMedicinalProductDefinedInProductComposition; FdaProductCompositionDefinesMedicinalProduct; FdaPharmaceuticalProductDefinedInProductComposition; FdaProductCompositionDefinesPharmaceuticalProduct',
    'fda_ndc_json.medicinal_product; fda_ndc_json.product_composition',
    'product_id; product_composition_key',
    'curated medicinal product IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.medicinal_product)::BIGINT,
    'medicinal product IDs with generated product compositions',
    (SELECT COUNT(*) FROM fda_ndc_json.product_composition)::BIGINT,
    'medicinal product IDs without generated product compositions',
    'idmp-mprd:ProductComposition and composition definition links',
    'One product composition is generated for each curated medicinal product.'

  UNION ALL

  SELECT
    541,
    'classification_distribution',
    'OpenFDA composition',
    'Product compositions classified as quantitative',
    'FdaQuantitativeProductComposition',
    'fda_ndc_json.product_composition',
    'product_composition_key',
    'curated product composition IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.product_composition)::BIGINT,
    'composition IDs where all listed active ingredients have strength values',
    (SELECT COUNT(*) FROM fda_ndc_json.product_composition WHERE composition_type = 'quantitative')::BIGINT,
    'composition IDs with qualitative or unspecified composition type',
    'idmp-mprd:QuantitativeComposition',
    'Distribution row for OpenFDA composition_type.'

  UNION ALL

  SELECT
    542,
    'classification_distribution',
    'OpenFDA composition',
    'Product compositions classified as qualitative',
    'FdaQualitativeProductComposition',
    'fda_ndc_json.product_composition',
    'product_composition_key',
    'curated product composition IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.product_composition)::BIGINT,
    'composition IDs where at least one active ingredient lacks a strength value',
    (SELECT COUNT(*) FROM fda_ndc_json.product_composition WHERE composition_type = 'qualitative')::BIGINT,
    'composition IDs with quantitative or unspecified composition type',
    'idmp-mprd:QualitativeComposition',
    'Distribution row for OpenFDA composition_type.'

  UNION ALL

  SELECT
    543,
    'diagnostic_share',
    'OpenFDA composition',
    'Product compositions with unspecified composition type',
    'No direct OBDA subclass mapping; diagnostic for composition classification',
    'fda_ndc_json.product_composition',
    'product_composition_key',
    'curated product composition IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.product_composition)::BIGINT,
    'composition IDs with no listed active ingredients',
    (SELECT COUNT(*) FROM fda_ndc_json.product_composition WHERE composition_type = 'unspecified')::BIGINT,
    'composition IDs classified as quantitative or qualitative',
    'coverage diagnostic',
    'Unspecified compositions do not map to the quantitative or qualitative subclass mappings.'

  UNION ALL

  SELECT
    550,
    'coverage',
    'OpenFDA dose/route',
    'Medicinal products with dose-form mappings',
    'FdaPharmaceuticalDoseForm; FdaPharmaceuticalProductHasDoseForm',
    'fda_ndc_json.medicinal_product; fda_ndc_json.pharmaceutical_product_has_dose_form',
    'product_id; dose_form_key',
    'curated medicinal product IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.medicinal_product)::BIGINT,
    'medicinal product IDs with dosage_form present',
    (SELECT COUNT(*) FROM fda_product_with_dose_form)::BIGINT,
    'medicinal product IDs with missing dosage_form',
    'idmp-mprd:PharmaceuticalDoseForm; idmp-mprd:hasDoseForm',
    'Dose-form coverage is measured at product level.'

  UNION ALL

  SELECT
    560,
    'coverage',
    'OpenFDA dose/route',
    'Medicinal products with route-of-administration mappings',
    'FdaRouteOfAdministration; FdaRouteOfAdministrationCode; FdaRouteOfAdministrationCodeLink; FdaPharmaceuticalProductHasRouteOfAdministration',
    'fda_ndc_json.medicinal_product; fda_ndc_json.pharmaceutical_product_has_route',
    'product_id; route_key',
    'curated medicinal product IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.medicinal_product)::BIGINT,
    'medicinal product IDs with at least one route value',
    (SELECT COUNT(*) FROM fda_product_with_route)::BIGINT,
    'medicinal product IDs with no route value',
    'idmp-mprd:RouteOfAdministration and route links',
    'Route coverage is measured at product level; one product can have multiple routes.'

  UNION ALL

  SELECT
    570,
    'coverage',
    'OpenFDA package',
    'Medicinal products with package mappings',
    'FdaPackagedMedicinalProduct; FdaPackagedMedicinalProductDefinedInMedicinalProduct',
    'fda_ndc_json.packaged_medicinal_product; fda_ndc_json.medicinal_product_has_packaged_medicinal_product',
    'product_id; package_key',
    'curated medicinal product IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.medicinal_product)::BIGINT,
    'medicinal product IDs with at least one packaging row',
    (SELECT COUNT(*) FROM fda_product_with_package)::BIGINT,
    'medicinal product IDs without packaging rows',
    'idmp-mprd:PackagedMedicinalProduct; cmns-dsg:isDefinedIn',
    'Package coverage is measured at product level; one product can have multiple packages.'

  UNION ALL

  SELECT
    571,
    'literal_presence',
    'OpenFDA package',
    'Packaged medicinal products with package descriptions',
    'FdaPackagedMedicinalProductDescription',
    'fda_ndc_json.packaged_medicinal_product',
    'package_key',
    'curated package IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.packaged_medicinal_product)::BIGINT,
    'package IDs with package_description present',
    (SELECT COUNT(*) FROM fda_ndc_json.packaged_medicinal_product WHERE package_description IS NOT NULL)::BIGINT,
    'package IDs with missing package_description',
    'cmns-dsg:hasDescription',
    'Optional package description literal coverage.'

  UNION ALL

  SELECT
    572,
    'coverage',
    'OpenFDA package',
    'Packaged medicinal products with package NDC identifiers',
    'FdaPackageIdentifier; FdaPackageIdentifierValue; FdaPackageIdentifierIdentifies; FdaPackageIsIdentifiedBy',
    'fda_ndc_json.package_identifier; fda_ndc_json.packaged_medicinal_product_has_identifier',
    'package_key; package_identifier_key',
    'curated package IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.packaged_medicinal_product)::BIGINT,
    'package IDs with package_ndc present',
    (SELECT COUNT(DISTINCT package_key) FROM fda_ndc_json.packaged_medicinal_product_has_identifier)::BIGINT,
    'package IDs without package_ndc',
    'idmp-mprd:PackageIdentifier; cmns-id:identifies; cmns-id:isIdentifiedBy',
    'Package identifier coverage is measured at package level.'

  UNION ALL

  SELECT
    600,
    'coverage',
    'OpenFDA active ingredient/substance',
    'Active ingredients linked to product compositions',
    'FdaActiveIngredient; FdaProductCompositionHasActiveIngredient',
    'fda_ndc_json.active_ingredient; fda_ndc_json.product_composition_has_active_ingredient',
    'active_ingredient_key; product_composition_key',
    'curated active ingredient IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.active_ingredient)::BIGINT,
    'active ingredient IDs linked to a product composition',
    (SELECT COUNT(DISTINCT active_ingredient_key) FROM fda_ndc_json.product_composition_has_active_ingredient)::BIGINT,
    'active ingredient IDs without a product composition link',
    'idmp-sub:ActiveIngredient; idmp-mprd:hasActiveIngredient',
    'Core active-ingredient role coverage.'

  UNION ALL

  SELECT
    610,
    'coverage',
    'OpenFDA active ingredient/substance',
    'Active ingredients mapped to either GSRS substances or local OpenFDA fallback substances',
    'FdaActiveIngredientPlayedByGsrsSubstance; FdaOpenFdaSubstance; FdaActiveIngredientPlayedByOpenFdaSubstance',
    'fda_ndc_json.active_ingredient; fda_ndc_json.active_ingredient_played_by_gsrs_substance; fda_ndc_json.active_ingredient_played_by_openfda_substance',
    'active_ingredient_key',
    'curated active ingredient IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.active_ingredient)::BIGINT,
    'active ingredient IDs with either a verified GSRS substance or local OpenFDA fallback substance',
    (SELECT COUNT(*) FROM active_ingredient_substance_role)::BIGINT,
    'active ingredient IDs without any substance role target',
    'cmns-rlcmp:isPlayedBy',
    'This measures whether every active ingredient role has some substance target.'

  UNION ALL

  SELECT
    611,
    'coverage',
    'OpenFDA active ingredient/substance',
    'Active ingredients verified against approved GSRS substances',
    'FdaActiveIngredientPlayedByGsrsSubstance; FdaPharmaceuticalProductComprisesGsrsSubstance; FdaVerifiedIngredientUniiIdentifier; FdaVerifiedIngredientUniiIdentifierValue; FdaVerifiedIngredientUniiIdentifierIdentifiesGsrsSubstance; FdaGsrsSubstanceIsIdentifiedByOpenFdaUnii',
    'fda_ndc_json.active_ingredient_played_by_gsrs_substance',
    'active_ingredient_key; gsrs_uuid',
    'curated active ingredient IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.active_ingredient)::BIGINT,
    'active ingredient IDs with verified GSRS substance matches',
    (SELECT COUNT(DISTINCT active_ingredient_key) FROM fda_ndc_json.active_ingredient_played_by_gsrs_substance)::BIGINT,
    'active ingredient IDs not verified against GSRS and therefore handled by fallback or remain unmatched',
    'GSRS substance links and verified UNII identifier mappings',
    'This is the main OpenFDA-to-GSRS substance matching coverage metric.'

  UNION ALL

  SELECT
    612,
    'diagnostic_share',
    'OpenFDA active ingredient/substance',
    'Active ingredients handled by local OpenFDA fallback substances',
    'FdaOpenFdaSubstance; FdaActiveIngredientPlayedByOpenFdaSubstance; FdaOpenFdaSubstanceName; FdaOpenFdaSubstanceHasName; FdaOpenFdaSubstanceNameValue; FdaPharmaceuticalProductComprisesOpenFdaSubstance',
    'fda_ndc_json.unmatched_active_ingredient; fda_ndc_json.openfda_substance',
    'active_ingredient_key; substance_key',
    'curated active ingredient IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.active_ingredient)::BIGINT,
    'active ingredient IDs represented by local OpenFDA substance fallback rows',
    (SELECT COUNT(*) FROM fda_ndc_json.unmatched_active_ingredient)::BIGINT,
    'active ingredient IDs verified against GSRS',
    'local fda_ndc_json OpenFDA substance mappings',
    'Fallback share is a diagnostic complement to verified GSRS matching.'

  UNION ALL

  SELECT
    613,
    'diagnostic_share',
    'OpenFDA active ingredient/substance',
    'Unmatched active ingredients with candidate GSRS name matches',
    'No direct final OBDA mapping; diagnostic for manual review and future curation',
    'fda_ndc_json.active_ingredient_name_match_candidate',
    'active_ingredient_key; matched_gsrs_uuid',
    'unmatched active ingredient IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.unmatched_active_ingredient)::BIGINT,
    'unmatched active ingredient IDs with at least one candidate GSRS name match',
    (SELECT COUNT(DISTINCT active_ingredient_key) FROM fda_ndc_json.active_ingredient_name_match_candidate)::BIGINT,
    'unmatched active ingredient IDs without candidate GSRS name matches',
    'coverage diagnostic',
    'Candidate matches are not final verified mappings, but they explain possible future coverage gains.'

  UNION ALL

  SELECT
    614,
    'coverage',
    'OpenFDA active ingredient/substance',
    'Pharmaceutical products comprising GSRS or local OpenFDA substance targets',
    'FdaPharmaceuticalProductComprisesGsrsSubstance; FdaPharmaceuticalProductComprisesOpenFdaSubstance',
    'fda_ndc_json.pharmaceutical_product_comprises_gsrs_substance; fda_ndc_json.pharmaceutical_product_comprises_openfda_substance',
    'pharmaceutical_product_key; active_ingredient_key',
    'curated active ingredient IDs',
    (SELECT COUNT(*) FROM fda_ndc_json.active_ingredient)::BIGINT,
    'active ingredient IDs represented in pharmaceutical-product comprises links',
    (SELECT COUNT(*) FROM pharmaceutical_product_comprises_any_substance)::BIGINT,
    'active ingredient IDs missing from pharmaceutical-product comprises links',
    'cmns-col:comprises',
    'This checks that active ingredient substance targets are also represented in product composition semantics.'
)
SELECT
  CURRENT_TIMESTAMP AS generated_at,
  current_database() AS database_name,
  sort_order,
  metric_kind,
  coverage_group,
  coverage_item,
  mapping_ids,
  source_table,
  source_id_column,
  denominator_label,
  denominator_count,
  mapped_label,
  mapped_count,
  remainder_label,
  (denominator_count - mapped_count) AS remainder_count,
  CASE
    WHEN denominator_count = 0 THEN NULL
    ELSE ROUND((mapped_count::NUMERIC / denominator_count::NUMERIC) * 100, 2)
  END AS coverage_percent,
  target_class_or_property,
  coverage_note
FROM coverage_rows
ORDER BY sort_order;
