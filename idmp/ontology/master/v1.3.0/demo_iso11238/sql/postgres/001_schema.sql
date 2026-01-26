CREATE TABLE IF NOT EXISTS substance (
  substance_id INTEGER PRIMARY KEY,
  substance_type TEXT NOT NULL,
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS substance_name (
  name_id INTEGER PRIMARY KEY,
  substance_id INTEGER NOT NULL REFERENCES substance(substance_id),
  name_value TEXT NOT NULL,
  name_type TEXT,
  language_code TEXT
);

CREATE TABLE IF NOT EXISTS substance_identifier (
  identifier_id INTEGER PRIMARY KEY,
  substance_id INTEGER NOT NULL REFERENCES substance(substance_id),
  identifier_value TEXT NOT NULL,
  identifier_type TEXT
);

INSERT INTO substance (substance_id, substance_type, status) VALUES
  (1, 'Chemical', 'active'),
  (2, 'Protein', 'active'),
  (3, 'Mixture', 'investigational')
ON CONFLICT (substance_id) DO NOTHING;

INSERT INTO substance_name (name_id, substance_id, name_value, name_type, language_code) VALUES
  (10, 1, 'Amoxicillin', 'Preferred', 'en'),
  (11, 1, 'Amoxil', 'Brand', 'en'),
  (12, 2, 'Insulin human', 'Preferred', 'en'),
  (13, 3, 'Paracetamol + Caffeine', 'Other', 'en')
ON CONFLICT (name_id) DO NOTHING;

INSERT INTO substance_identifier (identifier_id, substance_id, identifier_value, identifier_type) VALUES
  (100, 1, 'UNII-9ZC6WZ9CB7', 'UNII'),
  (101, 2, 'UNII-8A4S6Y5W0C', 'UNII'),
  (102, 3, 'MIX-0001', 'LOCAL')
ON CONFLICT (identifier_id) DO NOTHING;
