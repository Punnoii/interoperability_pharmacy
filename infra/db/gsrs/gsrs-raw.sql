CREATE SCHEMA IF NOT EXISTS gsrs_raw;

DROP TABLE IF EXISTS gsrs_raw.gsrs_json;

CREATE TABLE gsrs_raw.gsrs_json (
  id BIGSERIAL PRIMARY KEY,
  source_file TEXT NOT NULL DEFAULT 'dump-public-2026-02-26.gsrs',
  record JSONB NOT NULL,
  loaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);