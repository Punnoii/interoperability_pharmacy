# Extensibility Guide — Adding a New ISO IDMP Module

This guide explains how to add a new ISO IDMP module to the OBDA system, using **ISO 11615 (Medicinal Products)** as an example. The existing **ISO 11238 (Substances)** implementation serves as the reference.

## IRI Naming Convention

All modules follow the same IRI pattern:

```
Base:    http://example.com/idmp-demo/
Pattern: :entity-type/{company-letter}/{local-id}

ISO 11238 (current):
  :substance/{company}/{id}
  :substance-name/{company}/{name_id}
  :substance-identifier/{company}/{id_id}

ISO 11615 (example):
  :medicinalproduct/{company}/{id}
  :productname/{company}/{name_id}

ISO 11616 (example):
  :pharmaceuticalproduct/{company}/{id}
```

## Step 1 — Database Schema

Add tables for the new module in each data source. Follow the existing naming conventions per company.

**PostgreSQL** (`infra/db/postgres/`):

```sql
-- Company A schema
CREATE TABLE company_a.medicinal_product (
    product_id   SERIAL PRIMARY KEY,
    product_type VARCHAR(50) NOT NULL,
    status       VARCHAR(20) DEFAULT 'active',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE company_a.product_name (
    name_id    SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES company_a.medicinal_product(product_id),
    name_value VARCHAR(500) NOT NULL,
    name_type  VARCHAR(50)  NOT NULL,
    language_code VARCHAR(5) DEFAULT 'en'
);
```

Repeat for Company B (using `company_b` schema with its own column naming), Company C (MySQL `company_c`), Company D (MongoDB `company_d`), and Company E (CSV → `company_e_raw`).

## Step 2 — OBDA Mapping

Create a new mapping file: `infra/ontop/obda/iso11615-trino.obda`

Use the same structure as `iso11238-trino.obda`. Each company needs 6 mapping entries (entity, type, name node, name link, identifier node, identifier link).

```
[PrefixDeclaration]
:            http://example.com/idmp-demo/
idmp-mpd:    https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11615-MedicinalProducts/
cmns-id:     https://www.omg.org/spec/Commons/Identifiers/
cmns-txt:    https://www.omg.org/spec/Commons/TextDatatype/
rdf:         http://www.w3.org/1999/02/22-rdf-syntax-ns#
xsd:         http://www.w3.org/2001/XMLSchema#

[MappingDeclaration] @collection [[

mappingId MedicinalProductCompanyA
target :medicinalproduct/a/{product_id} a idmp-mpd:MedicinalProduct .
source SELECT product_id
       FROM postgres.company_a.medicinal_product

mappingId MedicinalProductTypeCompanyA
target :medicinalproduct/a/{product_id} idmp-mpd:hasProductType <{product_type_iri}> .
source SELECT product_id,
       concat('https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11615-MedicinalProducts/ProductTypeClassifier-', product_type) AS product_type_iri
       FROM postgres.company_a.medicinal_product

-- ... repeat name node, name link, identifier node, identifier link
-- ... repeat for Company B, C, D, E

]]
```

Reference: see `iso11238-trino.obda` for the complete pattern with all 6 mapping types per company.

## Step 3 — Ontology Entry Point

Update `infra/ontop/obda/idmp-entry-iso11238-core-lcc.rdf` (or create a new entry point) to import the new module's ontology:

```xml
<owl:imports rdf:resource="file:/opt/ontop/ontology/ISO/ISO11615-MedicinalProducts.rdf"/>
```

If using a separate Ontop instance for the new module, create a new entry point file (e.g., `idmp-entry-iso11615.rdf`). If extending the existing instance, add the import to the current file.

## Step 4 — SPARQL Templates

Create: `backend/src/main/java/com/example/idmp/util/iso11615/MedicinalProductSparqlTemplates.java`

Follow the same pattern as `SubstanceSparqlTemplates.java`:

```java
package com.example.idmp.util.iso11615;

public final class MedicinalProductSparqlTemplates {

    private MedicinalProductSparqlTemplates() {}

    private static final String PREFIXES = """
        PREFIX idmp-mpd: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11615-MedicinalProducts/>
        PREFIX cmns-id:  <https://www.omg.org/spec/Commons/Identifiers/>
        PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>
        """;

    public static final String LIST_ALL = PREFIXES + """
        SELECT ?product ?name ?productType ?identifier WHERE {
            ?product a idmp-mpd:MedicinalProduct .
            ?product idmp-mpd:hasProductType ?productType .
            ...
        }
        """;

    public static String searchByName(String keyword) {
        String safe = sanitize(keyword);
        return PREFIXES + "...".formatted(safe);
    }

    // Reuse the same sanitize() and validateIri() logic
    // from com.example.idmp.util.SparqlTemplates or copy them here
}
```

## Step 5 — Service Layer

Create: `backend/src/main/java/com/example/idmp/service/iso11615/`

```
service/iso11615/
├── MedicinalProductService.java       # Interface
└── MedicinalProductServiceImpl.java   # Implementation
```

Follow the same pattern as `SubstanceService` / `SubstanceServiceImpl`:

```java
package com.example.idmp.service.iso11615;

public interface MedicinalProductService {
    List<ProductSummary> listAll();
    List<ProductSummary> searchByName(String keyword);
    ProductDetail getDetails(String productIri);
}
```

The implementation injects `OntopClient`, sends SPARQL from `MedicinalProductSparqlTemplates`, and parses the JSON result into DTOs.

## Step 6 — DTOs

Create: `backend/src/main/java/com/example/idmp/web/dto/iso11615/`

```java
package com.example.idmp.web.dto.iso11615;

public record ProductSummary(
    String iri,
    String name,
    String productType,
    String identifier,
    String source
) {}

public record ProductDetail(
    String iri,
    String productType,
    List<NameEntry> names,
    List<IdentifierEntry> identifiers
) {}
```

Reuse shared records (e.g., `NameEntry`, `IdentifierEntry`) from `web/dto/iso11238/` if the structure is identical, or create module-specific versions.

## Step 7 — REST Controller

Create: `backend/src/main/java/com/example/idmp/web/iso11615/MedicinalProductController.java`

```java
package com.example.idmp.web.iso11615;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class MedicinalProductController {

    private final MedicinalProductService service;

    public MedicinalProductController(MedicinalProductService service) {
        this.service = service;
    }

    @GetMapping
    public List<ProductSummary> listAll() { ... }

    @GetMapping("/search")
    public List<ProductSummary> search(@RequestParam("name") String name) { ... }

    @GetMapping("/details")
    public ProductDetail details(@RequestParam("iri") String iri) { ... }
}
```

## Checklist

| # | Step | Files to create/modify |
|---|------|----------------------|
| 1 | Database schema | `infra/db/postgres/`, `infra/db/mysql/`, `infra/db/mongo/`, `infra/db/csv/` |
| 2 | OBDA mapping | `infra/ontop/obda/iso11615-trino.obda` |
| 3 | Ontology entry point | `infra/ontop/obda/idmp-entry-*.rdf` |
| 4 | SPARQL templates | `backend/.../util/iso11615/MedicinalProductSparqlTemplates.java` |
| 5 | Service layer | `backend/.../service/iso11615/MedicinalProductService[Impl].java` |
| 6 | DTOs | `backend/.../web/dto/iso11615/ProductSummary.java`, etc. |
| 7 | REST controller | `backend/.../web/iso11615/MedicinalProductController.java` |

## Reference

- Existing ISO 11238 mapping: `infra/ontop/obda/iso11238-trino.obda`
- Existing SPARQL templates: `backend/.../util/iso11238/SubstanceSparqlTemplates.java`
- Existing service: `backend/.../service/iso11238/SubstanceService.java`
- Existing controller: `backend/.../web/iso11238/SubstanceController.java`
- Existing DTOs: `backend/.../web/dto/iso11238/`
