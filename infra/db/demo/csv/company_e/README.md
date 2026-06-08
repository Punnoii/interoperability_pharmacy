This folder contains a CSV-based demo source for `company_e`.

The files intentionally use column names that differ from the relational
examples so the source is still about the same business concepts while being
less uniform at the physical schema level.

Files
- `substance_catalog.csv`: one row per substance
- `name_entries.csv`: name rows linked by `linked_substance_code`
- `identifier_registry.csv`: identifier rows linked by `linked_substance_code`
- `name_type_lookup.csv`: source name categories mapped to IDMP classifier IRIs
