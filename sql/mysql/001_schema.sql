CREATE DATABASE IF NOT EXISTS company_b;
USE company_b;

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

INSERT INTO substance_master (substance_code, substance_kind, status) VALUES
  ('B-100', 'Chemical', 'active'),
  ('B-200', 'Protein', 'active'),
  ('B-300', 'Mixture', 'investigational')
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO substance_alias (alias_id, substance_code, alias_text, alias_kind, lang) VALUES
  (1000, 'B-100', 'Acetylsalicylic Acid', 'Preferred', 'en'),
  (1001, 'B-100', 'Aspirin', 'Brand', 'en'),
  (1002, 'B-200', 'Recombinant Insulin', 'Preferred', 'en'),
  (1003, 'B-300', 'Caffeine Mix', 'Other', 'en')
ON DUPLICATE KEY UPDATE alias_text = VALUES(alias_text);

INSERT INTO substance_id_map (id_id, substance_code, id_value, id_system) VALUES
  (2000, 'B-100', 'UNII-9R1P2Q5H5A', 'UNII'),
  (2001, 'B-200', 'UNII-7X99W3T31F', 'UNII'),
  (2002, 'B-300', 'MIX-B-0003', 'LOCAL')
ON DUPLICATE KEY UPDATE id_value = VALUES(id_value);
