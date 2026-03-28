TRUNCATE TABLE company_e_raw.substance_catalog_raw;
TRUNCATE TABLE company_e_raw.name_entries_raw;
TRUNCATE TABLE company_e_raw.identifier_registry_raw;
TRUNCATE TABLE company_e_raw.name_type_lookup_raw;

\copy company_e_raw.substance_catalog_raw FROM '/work/csv/company_e/substance_catalog.csv' WITH (FORMAT csv, HEADER true);
\copy company_e_raw.name_entries_raw FROM '/work/csv/company_e/name_entries.csv' WITH (FORMAT csv, HEADER true);
\copy company_e_raw.identifier_registry_raw FROM '/work/csv/company_e/identifier_registry.csv' WITH (FORMAT csv, HEADER true);
\copy company_e_raw.name_type_lookup_raw FROM '/work/csv/company_e/name_type_lookup.csv' WITH (FORMAT csv, HEADER true);
