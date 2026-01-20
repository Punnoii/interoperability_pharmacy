# interoperability_pharmacy

## Week 1 goal
- Two databases with clearly different schemas.
- Data focused on drug brand/trade names.
- At least two collision cases:
  - Different column names with the same meaning (brand_name vs trade_name).
  - Small value/format differences (case, whitespace, mg vs g, route/form terms).
- Third-party API can fetch and merge without a reasoner.

## Chosen setup
- PostgreSQL (DB1) + MySQL (DB2) to show real system differences.
- Easier alternative: PostgreSQL with two schemas (less realistic differences).

## Files
- db1.sql: PostgreSQL schema A and sample data.
- db2.sql: MySQL schema B and sample data.
- schema_description.md: mapping notes for the merge team.

## Quick checks
PostgreSQL:
```sql
SELECT brand_name, active_ingredient, strength_mg
FROM drug_product
WHERE LOWER(TRIM(brand_name)) = 'tylenol';
```

MySQL:
```sql
SELECT trade_name, substance, dose_value, dose_unit
FROM medicine
WHERE LOWER(TRIM(trade_name)) = 'tylenol';
```

## Expand to ~50 rows
- Add another substance (e.g., cetirizine or loratadine) with ~12 rows.
- Or add 10-15 more variations of brand, market, or form.
