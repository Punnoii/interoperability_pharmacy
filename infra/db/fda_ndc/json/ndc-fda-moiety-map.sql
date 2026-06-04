CREATE SCHEMA IF NOT EXISTS fda_ndc_json;

DROP TABLE IF EXISTS fda_ndc_json.ndc_fda_substance_active_moiety_map;

CREATE TABLE fda_ndc_json.ndc_fda_substance_active_moiety_map (
  substance_key TEXT PRIMARY KEY,
  source_substance_name TEXT NOT NULL,
  active_moiety_key TEXT NOT NULL,
  active_moiety_name TEXT NOT NULL,
  mapping_source TEXT NOT NULL,
  confidence TEXT NOT NULL,
  source_identifier TEXT,
  notes TEXT
);