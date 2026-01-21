# Copilot Instructions for Pharmacy Interoperability Project

## Project Overview

This is a **pharmaceutical data interoperability system** that maps and links drug product data across two heterogeneous databases (PostgreSQL and MySQL) with intentionally different schemas, formats, and terminology. The core challenge is matching records without a shared primary key.

**Key objective:** Demonstrate real-world data harmonization by normalizing values, applying composite-key matching, and generating semantic outputs (TTL/RDF).

## Architecture & Data Flow

### Three-Layer Design

1. **Data Fetching Layer** (`fetchDB1Products()`, `fetchDB2Medicines()`)
   - PostgreSQL (DB1): `drug_product` table with columns like `brand_name`, `strength_mg`, `dosage_form`
   - MySQL (DB2): `medicine` table with equivalent but differently-named columns like `trade_name`, `dose_value`, `dose_unit`
   - Both databases intentionally contain matching records with subtle differences

2. **Normalization Layer** (`normalize()` methods)
   - Converts DB1 and DB2 records into a unified `NormalizedProduct` class
   - Handles critical transformations:
     - **Strength units**: Converts g → mg (e.g., `dose_value=0.5` + `dose_unit=g` → `500 mg`)
     - **Dosage forms**: Expands abbreviations (tab→tablet, cap→capsule, susp→suspension)
     - **Administration routes**: Normalizes variants (PO, "by mouth" → oral)
     - **Whitespace**: Trims extra spaces and normalizes casing for brand names
   - Composite key generated: `substance|strength_mg|dosage_form|route`

3. **Matching & Output Layer** (`matchProducts()`, `generateTTL()`, `generateYAML()`)
   - Matches normalized products from DB1 with DB2 using composite key
   - Generates three outputs:
     - **TTL** (Turtle): Semantic web format using IDMP/CMNS ontologies
     - **RDF/XML**: For interoperability with IDMP systems
     - **YAML**: Human-readable mapping metadata

## Key Design Patterns

### Composite Key Matching (Non-ID Based)

Since DB1's `product_id` and DB2's `med_id` are unrelated, matching relies on **semantic identity**:

```
Match Key = [normalized_substance | normalized_strength | normalized_form | normalized_route]
```

Example: "Tylenol (500 mg tablet)" in DB1 matches "tylenol (0.5 g tab)" in DB2 after normalization.

### Data Model Classes (Inner Classes)

- **DrugProduct** / **Medicine**: Direct mappings from database schemas
- **NormalizedProduct**: Unified representation after transformation
- **MatchResult**: Contains both original records, normalized versions, and match metadata (confidence, method, similarity score)

### Normalization Functions

All normalization rules are encapsulated in dedicated methods:
- `normalizeBrandName()` - trim, lowercase
- `normalizeSubstance()` - lowercase, handle synonym pairs (acetaminophen/paracetamol)
- `convertStrengthToMg()` - convert g→mg based on dose_unit
- `normalizeDosageForm()` - map abbreviations to canonical forms
- `normalizeRoute()` - handle multiple route representations

**Important:** When adding new substances or forms, extend these methods rather than inline logic.

## Critical Developer Workflows

### Database Setup

```bash
# PostgreSQL (DB1)
psql -U postgres -f db1.sql

# MySQL (DB2)
mysql -u root < db2.sql
```

Edit `pharmacy_mapping.java` to match your local DB credentials:
```java
private static final String DB1_URL = "jdbc:postgresql://localhost:5432/pharmacy_db1";
private static final String DB1_USERNAME = "postgres";
private static final String DB1_PASSWORD = "postgres";
```

### Compile & Run

```bash
# Maven (recommended)
mvn clean compile
mvn exec:java

# Or direct compilation
javac pharmacy_mapping.java
java pharmacy_mapping
```

### Testing Database Connections

The code includes test methods:
```java
testDB1Connection()  // Returns boolean, prints errors
testDB2Connection()  // Returns boolean, prints errors
```

Before running the full matching pipeline, verify both connections succeed in the main() method.

### Adding New Test Data

Both `db1.sql` and `db2.sql` follow the same pattern: insert tuples with intentional collisions (same drug, different formats). Expand by adding similar rows following the existing comment annotations, e.g., `-- casing + trailing space`.

## Important Conventions

1. **Normalization is idempotent**: Running `normalize()` twice produces the same `NormalizedProduct`.
2. **Composite key format**: Always use the string pattern `substance|strength|form|route` for consistency with matching logic.
3. **Confidence levels**: Match results are tagged as "high", "medium", or "low" (currently based on key similarity; extensible for fuzzy matching).
4. **IDMP ontology references**: TTL output uses IDMP/CMNS prefixes; see `generateTTL()` for mapping constants.
5. **DateTime handling**: Convert SQL timestamps to `LocalDateTime` using `.toLocalDateTime()` to avoid timezone issues.

## Integration Points

### IDMP Ontology (RDF folder structure)

The project references IDMP (International Data Model for Pharmaceuticals) vocabularies:
- **ISO11238**: Substance definitions
- **ISO11240**: Units of measurement
- **ISO11615/11616**: Medicinal/Pharmaceutical products
- **CMNS**: Common Management Namespace (e.g., Organizations, Identifiers)

TTL output generates RDF triples using these namespaces for semantic interoperability.

### External Dependencies (pom.xml)

- **PostgreSQL JDBC** (42.7.1): DB1 connectivity
- **MySQL Connector-J** (8.0.33): DB2 connectivity
- **SnakeYAML** (2.2): YAML serialization
- **Commons Lang3** (3.14.0): String utilities (trim, normalize)
- **SLF4J** (2.0.9): Logging framework

## Common Extension Points

### Adding Fuzzy Matching

Currently matching is exact after normalization. To implement fuzzy matching (Levenshtein distance):

1. Add a method like `fuzzyMatchScore(String s1, String s2)`
2. Modify `matchProducts()` to call this when exact composite key fails
3. Update `MatchResult.confidence` to reflect score thresholds

### Adding New Normalization Rules

1. Identify the pattern (e.g., new abbreviations for forms)
2. Add a new method like `normalizeNewField()` following existing patterns
3. Update both `normalize(DrugProduct)` and `normalize(Medicine)` to call it
4. Test with sample data in `db1.sql` and `db2.sql`

### Supporting New Output Formats

Extend `generateTTL()` and `generateYAML()` to handle different serialization formats. Ensure `MatchResult` is the single source of truth for match data.

## Troubleshooting Checklist

- **No matches found**: Check normalization methods; enable debug output in `normalize()` to inspect normalized values
- **Database connection fails**: Verify credentials, port, database names match your local setup
- **TTL/YAML files empty**: Ensure `matchProducts()` returns non-empty `List<MatchResult>`
- **ClassCastException in output generation**: Verify `MatchResult.originalData` type before casting to `DrugProduct`/`Medicine`

## File Manifest

| File | Purpose |
|------|---------|
| [pharmacy_mapping.java](../pharmacy_mapping.java) | Single Java file with all logic; inner classes + static methods |
| [db1.sql](../db1.sql) | PostgreSQL schema + sample drug data (3 substances × 12 rows) |
| [db2.sql](../db2.sql) | MySQL schema + sample medicine data with intentional collisions |
| [schema_description.md](../schema_description.md) | Field-by-field mapping guide (DB1 ↔ DB2) |
| [linking_concept.md](../linking_concept.md) | Detailed composite key matching strategy (in Thai/English) |
| [pom.xml](../pom.xml) | Maven configuration + dependency versions |
