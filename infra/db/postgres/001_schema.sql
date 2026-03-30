CREATE SCHEMA IF NOT EXISTS company_a;
CREATE SCHEMA IF NOT EXISTS company_b;

CREATE TABLE IF NOT EXISTS company_a.substance (
  substance_id INTEGER PRIMARY KEY,
  substance_type TEXT NOT NULL,
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_a.substance_name (
  name_id INTEGER PRIMARY KEY,
  substance_id INTEGER NOT NULL REFERENCES company_a.substance(substance_id),
  name_value TEXT NOT NULL,
  name_type TEXT,
  language_code TEXT
);

CREATE TABLE IF NOT EXISTS company_a.substance_identifier (
  identifier_id INTEGER PRIMARY KEY,
  substance_id INTEGER NOT NULL REFERENCES company_a.substance(substance_id),
  identifier_value TEXT NOT NULL,
  identifier_type TEXT
);

CREATE TABLE IF NOT EXISTS company_b.substance_master (
  substance_code TEXT PRIMARY KEY,
  substance_kind TEXT NOT NULL,
  status TEXT,
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_b.substance_alias (
  alias_id INTEGER PRIMARY KEY,
  substance_code TEXT NOT NULL REFERENCES company_b.substance_master(substance_code),
  alias_text TEXT NOT NULL,
  alias_kind TEXT,
  lang TEXT
);

CREATE TABLE IF NOT EXISTS company_b.substance_id_map (
  id_id INTEGER PRIMARY KEY,
  substance_code TEXT NOT NULL REFERENCES company_b.substance_master(substance_code),
  id_value TEXT NOT NULL,
  id_system TEXT
);

-- ============================================================
-- Company A: 6 substances covering all 5 types
-- Cross-source match: Metformin (substance_id=4) shares UNII with Company D (D-100)
-- Multilingual: Amoxicillin (ja), Metformin (th)
-- ============================================================
INSERT INTO company_a.substance (substance_id, substance_type, status) VALUES
  (1, 'Chemical', 'active'),
  (2, 'Protein', 'active'),
  (3, 'Mixture', 'investigational'),
  (4, 'Chemical', 'active'),
  (5, 'NucleicAcid', 'active'),
  (6, 'Polymer', 'active')
ON CONFLICT (substance_id) DO NOTHING;

INSERT INTO company_a.substance_name (name_id, substance_id, name_value, name_type, language_code) VALUES
  (10, 1, 'Amoxicillin', 'Preferred', 'en'),
  (11, 1, 'Amoxil', 'Brand', 'en'),
  (12, 2, 'Insulin human', 'Preferred', 'en'),
  (13, 3, 'Paracetamol+Caffeine', 'Preferred', 'en'),
  (14, 4, 'Metformin', 'Preferred', 'en'),
  (15, 4, 'Glucophage', 'Brand', 'en'),
  (16, 5, 'Fomivirsen', 'Preferred', 'en'),
  (17, 6, 'Polyethylene glycol', 'Preferred', 'en'),
  -- Multilingual names
  (18, 1, 'アモキシシリン', 'Other', 'ja'),
  (19, 4, 'เมทฟอร์มิน', 'Other', 'th')
ON CONFLICT (name_id) DO NOTHING;

INSERT INTO company_a.substance_identifier (identifier_id, substance_id, identifier_value, identifier_type) VALUES
  (100, 1, 'UNII-804826J2HU', 'UNII'),
  (101, 2, 'UNII-1Y17CTI5SR', 'UNII'),
  (102, 3, 'MIX-PC001', 'MIX'),
  -- Cross-source match: same value as Company D (D-100 Metformin)
  (103, 4, 'UNII-9100L32L2N', 'UNII'),
  (104, 5, 'UNII-4V8GXP0V8U', 'UNII'),
  (105, 6, 'UNII-3WJQ0SDW1A', 'UNII')
ON CONFLICT (identifier_id) DO NOTHING;

-- ============================================================
-- Company B: 6 substances covering all 5 types
-- Cross-source match: Ibuprofen (B-400) shares UNII with Company C (C-100)
-- ============================================================
INSERT INTO company_b.substance_master (substance_code, substance_kind, status) VALUES
  ('B-100', 'Chemical', 'active'),
  ('B-200', 'Protein', 'active'),
  ('B-300', 'Mixture', 'investigational'),
  ('B-400', 'Chemical', 'active'),
  ('B-500', 'Chemical', 'active'),
  ('B-600', 'NucleicAcid', 'active'),
  ('B-700', 'Polymer', 'active')
ON CONFLICT (substance_code) DO NOTHING;

INSERT INTO company_b.substance_alias (alias_id, substance_code, alias_text, alias_kind, lang) VALUES
  (1000, 'B-100', 'Acetylsalicylic Acid', 'Preferred', 'en'),
  (1001, 'B-100', 'Aspirin', 'Brand', 'en'),
  (1002, 'B-200', 'Insulin glargine', 'Preferred', 'en'),
  (1003, 'B-300', 'Electrolyte Blend', 'Preferred', 'en'),
  (1004, 'B-400', 'Ibuprofen', 'Preferred', 'en'),
  (1005, 'B-400', 'Advil', 'Brand', 'en'),
  (1006, 'B-500', 'Clopidogrel', 'Preferred', 'en'),
  (1007, 'B-600', 'Nusinersen', 'Preferred', 'en'),
  (1008, 'B-700', 'Carbomer', 'Preferred', 'en')
ON CONFLICT (alias_id) DO NOTHING;

INSERT INTO company_b.substance_id_map (id_id, substance_code, id_value, id_system) VALUES
  (2000, 'B-100', 'UNII-9R1P2Q5H5A', 'UNII'),
  (2001, 'B-200', 'UNII-2ZM8CX04RZ', 'UNII'),
  (2002, 'B-300', 'MIX-EB001', 'MIX'),
  -- Cross-source match: same value as Company C (C-100 Ibuprofen)
  (2003, 'B-400', 'UNII-WK2XYI10QM', 'UNII'),
  (2004, 'B-500', 'UNII-A74586SNO7', 'UNII'),
  (2005, 'B-600', 'UNII-0S4TQG4NHQ', 'UNII'),
  (2006, 'B-700', 'UNII-97TBZ6CKJF', 'UNII')
ON CONFLICT (id_id) DO NOTHING;
