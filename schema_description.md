# Schema Description (Week 1)

## DB1 (PostgreSQL) - table: drug_product
- product_id: Row/product ID (primary key).
- brand_name: Brand/trade name of the drug (may vary in case/spacing).
- generic_name: Recorded generic name (some rows use acetaminophen/paracetamol).
- active_ingredient: Active ingredient (maps to IDMP:Substance concept).
- strength_mg: Strength in mg (integer).
- dosage_form: Dosage form (tablet/capsule/suspension).
- route: Administration route (e.g., oral).
- manufacturer: Manufacturer/brand owner.
- country_code: Market/country (e.g., US/GB/TH).
- updated_at: Last updated timestamp.

## DB2 (MySQL) - table: medicine
- med_id: Row ID (primary key).
- trade_name: Trade name (same meaning as DB1.brand_name).
- substance: Active ingredient (same meaning as DB1.active_ingredient).
- dose_value: Strength value, may be 500 or 0.5.
- dose_unit: Strength unit (mg or g) -> normalize to mg in merge.
- form: tab/cap/susp -> normalize to tablet/capsule/suspension.
- administration_route: PO/by mouth/oral -> normalize to oral.
- org_name: Organization/manufacturer.
- market: Market/country.
- last_modified: Last updated timestamp.
