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

INSERT INTO company_a.substance (substance_id, substance_type, status) VALUES
  (1, 'Chemical', 'active'),
  (2, 'Protein', 'active'),
  (3, 'Mixture', 'investigational')
ON CONFLICT (substance_id) DO NOTHING;

INSERT INTO company_a.substance_name (name_id, substance_id, name_value, name_type, language_code) VALUES
  (10, 1, 'Amoxicillin', 'Preferred', 'en'),
  (11, 1, 'Amoxil', 'Brand', 'en'),
  (12, 2, 'Insulin human', 'Preferred', 'en'),
  (13, 3, 'Paracetamol + Caffeine', 'Other', 'en')
ON CONFLICT (name_id) DO NOTHING;

INSERT INTO company_a.substance_identifier (identifier_id, substance_id, identifier_value, identifier_type) VALUES
  (100, 1, 'UNII-9ZC6WZ9CB7', 'UNII'),
  (101, 2, 'UNII-8A4S6Y5W0C', 'UNII'),
  (102, 3, 'MIX-0001', 'LOCAL')
ON CONFLICT (identifier_id) DO NOTHING;

INSERT INTO company_b.substance_master (substance_code, substance_kind, status) VALUES
  ('B-100', 'Chemical', 'active'),
  ('B-200', 'Protein', 'active'),
  ('B-300', 'Mixture', 'investigational')
ON CONFLICT (substance_code) DO NOTHING;

INSERT INTO company_b.substance_alias (alias_id, substance_code, alias_text, alias_kind, lang) VALUES
  (1000, 'B-100', 'Acetylsalicylic Acid', 'Preferred', 'en'),
  (1001, 'B-100', 'Aspirin', 'Brand', 'en'),
  (1002, 'B-200', 'Recombinant Insulin', 'Preferred', 'en'),
  (1003, 'B-300', 'Caffeine Mix', 'Other', 'en')
ON CONFLICT (alias_id) DO NOTHING;

INSERT INTO company_b.substance_id_map (id_id, substance_code, id_value, id_system) VALUES
  (2000, 'B-100', 'UNII-9R1P2Q5H5A', 'UNII'),
  (2001, 'B-200', 'UNII-7X99W3T31F', 'UNII'),
  (2002, 'B-300', 'MIX-B-0003', 'LOCAL')
ON CONFLICT (id_id) DO NOTHING;
