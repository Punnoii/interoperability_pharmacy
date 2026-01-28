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

INSERT INTO substance_master (substance_code, substance_kind, status) VALUES
  ('C-100', 'Chemical', 'active'),
  ('C-200', 'Protein', 'active'),
  ('C-300', 'Mixture', 'investigational')
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO substance_alias (alias_id, substance_code, alias_text, alias_kind, lang) VALUES
  (3000, 'C-100', 'Ibuprofen', 'Preferred', 'en'),
  (3001, 'C-100', 'Advil', 'Brand', 'en'),
  (3002, 'C-200', 'Insulin lispro', 'Preferred', 'en'),
  (3003, 'C-300', 'Caffeine Blend', 'Other', 'en')
ON DUPLICATE KEY UPDATE alias_text = VALUES(alias_text);

INSERT INTO substance_id_map (id_id, substance_code, id_value, id_system) VALUES
  (4000, 'C-100', 'UNII-9QF4577VGZ', 'UNII'),
  (4001, 'C-200', 'UNII-7X99W3T31F', 'UNII'),
  (4002, 'C-300', 'MIX-C-0003', 'LOCAL')
ON DUPLICATE KEY UPDATE id_value = VALUES(id_value);
