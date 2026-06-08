CREATE SCHEMA IF NOT EXISTS fda_ndc_json;

CREATE TABLE IF NOT EXISTS fda_ndc_json.substance_identifier_assertion (
  assertion_id BIGSERIAL PRIMARY KEY,

  source_system TEXT NOT NULL,
  source_dataset TEXT NOT NULL,
  source_last_updated TEXT,
  raw_record_id BIGINT NOT NULL,

  product_id TEXT NOT NULL,
  ingredient_order BIGINT NOT NULL,
  source_substance_name TEXT NOT NULL,

  identifier_type TEXT NOT NULL,
  identifier_value TEXT NOT NULL,

  match_method TEXT NOT NULL,
  assertion_status TEXT NOT NULL DEFAULT 'candidate',
  confidence TEXT NOT NULL DEFAULT 'medium',

  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,

  UNIQUE (
    product_id,
    ingredient_order,
    identifier_type,
    identifier_value,
    match_method
  )
);