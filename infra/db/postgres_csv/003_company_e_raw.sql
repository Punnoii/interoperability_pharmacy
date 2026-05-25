CREATE SCHEMA IF NOT EXISTS company_e_raw;

CREATE TABLE IF NOT EXISTS company_e_raw.substance_catalog_raw (
    record_id INTEGER PRIMARY KEY ,
    partner_substance_code TEXT NOT NULL,
    substance_class TEXT NOT NULL,
    lifecycle_state TEXT,
    registered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS company_e_raw.name_type_lookup_raw (
    source_system TEXT NOT NULL,
    source_name_category TEXT NOT NULL,
    idmp_name_type_iri TEXT NOT NULL,
    PRIMARY KEY (source_system,source_name_category)
);

CREATE TABLE IF NOT EXISTS company_e_raw.name_entries_raw (
    name_row_id INTEGER PRIMARY KEY,
    linked_substance_code TEXT NOT NULL,
    display_name TEXT NOT NULL,
    name_category TEXT NOT NULL,
    lang_tag TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS company_e_raw.identifier_registry_raw (
    registry_row_id INTEGER PRIMARY KEY,
    linked_substance_code TEXT NOT NULL,
    external_code TEXT NOT NULL,
    code_namespace TEXT NOT NULL
);