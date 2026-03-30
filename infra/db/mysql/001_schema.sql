CREATE DATABASE IF NOT EXISTS company_c;
USE company_c;

CREATE TABLE IF NOT EXISTS substance_master (
  substance_code VARCHAR(32) PRIMARY KEY,
  substance_kind VARCHAR(32) NOT NULL,
  status VARCHAR(32),
  created_on DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS substance_alias (
  alias_id INT PRIMARY KEY,
  substance_code VARCHAR(32) NOT NULL,
  alias_text VARCHAR(255) NOT NULL,
  alias_kind VARCHAR(32),
  lang VARCHAR(5),
  CONSTRAINT fk_alias_substance FOREIGN KEY (substance_code)
    REFERENCES substance_master(substance_code)
);

CREATE TABLE IF NOT EXISTS substance_id_map (
  id_id INT PRIMARY KEY,
  substance_code VARCHAR(32) NOT NULL,
  id_value VARCHAR(64) NOT NULL,
  id_system VARCHAR(32),
  CONSTRAINT fk_id_substance FOREIGN KEY (substance_code)
    REFERENCES substance_master(substance_code)
);

-- ============================================================
-- Company C: 8 substances covering all 5 types
-- Cross-source match: Ibuprofen (C-100) shares UNII with Company B (B-400)
-- ============================================================
INSERT INTO substance_master (substance_code, substance_kind, status) VALUES
  ('C-100', 'Chemical', 'active'),
  ('C-200', 'Protein', 'active'),
  ('C-300', 'Mixture', 'investigational'),
  ('C-400', 'Chemical', 'active'),
  ('C-500', 'Protein', 'active'),
  ('C-600', 'NucleicAcid', 'active'),
  ('C-700', 'Polymer', 'active'),
  ('C-800', 'Mixture', 'active')
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO substance_alias (alias_id, substance_code, alias_text, alias_kind, lang) VALUES
  (3000, 'C-100', 'Ibuprofen', 'Preferred', 'en'),
  (3001, 'C-100', 'Advil', 'Brand', 'en'),
  (3002, 'C-200', 'Insulin lispro', 'Preferred', 'en'),
  (3003, 'C-300', 'Caffeine Blend', 'Preferred', 'en'),
  (3004, 'C-400', 'Acetylsalicylic Acid', 'Preferred', 'en'),
  (3005, 'C-400', 'Aspirin', 'Brand', 'en'),
  (3006, 'C-500', 'Epoetin alfa', 'Preferred', 'en'),
  (3007, 'C-600', 'Fomivirsen', 'Preferred', 'en'),
  (3008, 'C-700', 'Polyethylene glycol', 'Preferred', 'en'),
  (3009, 'C-700', 'PEG', 'Other', 'en'),
  (3010, 'C-800', 'Vitamin Blend', 'Preferred', 'en')
ON DUPLICATE KEY UPDATE alias_text = VALUES(alias_text);

INSERT INTO substance_id_map (id_id, substance_code, id_value, id_system) VALUES
  -- Cross-source match: same UNII value as Company B (B-400 Ibuprofen)
  (4000, 'C-100', 'UNII-WK2XYI10QM', 'UNII'),
  (4001, 'C-200', 'UNII-7X99W3T31F', 'UNII'),
  (4002, 'C-300', 'MIX-C-0003', 'LOCAL'),
  (4003, 'C-400', 'UNII-R16CO5Y76E', 'UNII'),
  (4004, 'C-500', 'UNII-64FS3BFH5W', 'UNII'),
  (4005, 'C-600', 'UNII-4V8GXP0V8U', 'UNII'),
  (4006, 'C-700', 'UNII-3WJQ0SDW1A', 'UNII'),
  (4007, 'C-800', 'MIX-VB001', 'LOCAL')
ON DUPLICATE KEY UPDATE id_value = VALUES(id_value);
