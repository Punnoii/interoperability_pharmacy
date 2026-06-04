CREATE SCHEMA IF NOT EXISTS fda_ndc_json_raw;

DROP TABLE IF EXISTS fda_ndc_json_raw.openfda_ndc_json;

CREATE TABLE fda_ndc_json_raw.openfda_ndc_json (
  id BIGSERIAL PRIMARY KEY,
  source_last_updated TEXT,
  record JSONB NOT NULL,
  loaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);