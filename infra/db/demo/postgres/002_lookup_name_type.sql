-- CREATE SCHEMA IF NOT EXISTS regulator;

-- CREATE TABLE IF NOT EXISTS regulator.name_type_map (
--   company_code TEXT NOT NULL,
--   source_name_type TEXT NOT NULL,
--   idmp_name_type_iri TEXT NOT NULL,
--   PRIMARY KEY (company_code, source_name_type)
-- );

-- INSERT INTO regulator.name_type_map (company_code, source_name_type, idmp_name_type_iri) VALUES
--   ('A', 'Preferred', 'https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-PreferredName'),
--   ('A', 'Brand', 'https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-BrandName'),
--   ('A', 'Other', 'https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-OtherName'),
--   ('B', 'Preferred', 'https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-PreferredName'),
--   ('B', 'Brand', 'https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-BrandName'),
--   ('B', 'Other', 'https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-OtherName')
-- ON CONFLICT (company_code, source_name_type) DO NOTHING;
