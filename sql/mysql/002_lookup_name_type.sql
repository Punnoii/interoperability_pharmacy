CREATE DATABASE IF NOT EXISTS company_c;
USE company_c;

CREATE TABLE IF NOT EXISTS name_type_map (
  company_code VARCHAR(8) NOT NULL,
  source_name_type VARCHAR(32) NOT NULL,
  idmp_name_type_iri VARCHAR(255) NOT NULL,
  PRIMARY KEY (company_code, source_name_type)
);

INSERT INTO name_type_map (company_code, source_name_type, idmp_name_type_iri) VALUES
  ('C', 'Preferred', 'https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-PreferredName'),
  ('C', 'Brand', 'https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-BrandName'),
  ('C', 'Other', 'https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-OtherName')
ON DUPLICATE KEY UPDATE idmp_name_type_iri = VALUES(idmp_name_type_iri);
