# แผนการ Implement: ระบบ IDMP OBDA (Ontology-Based Data Access)

## ภาพรวม

แผนนี้แบ่งการ implement ออกเป็นขั้นตอนที่ต่อเนื่องกัน เริ่มจาก cleanup สถาปัตยกรรม → เพิ่มข้อมูล demo → สร้าง business API → สร้าง frontend → เพิ่ม caching/health checks → เขียน tests → ปรับ Docker Compose ให้ production-ready → สร้างเอกสาร

## Tasks

- [x] 1. Cleanup สถาปัตยกรรม — ลบ service/config ที่ไม่ใช้แล้ว
  - [x] 1.1 ลบ service `ontop-postgres` และ `ontop-mysql` ออกจาก `docker-compose.yml`
    - ลบ service definitions ทั้งสองออก
    - ตรวจสอบว่าไม่มี service อื่นที่ depends_on service ที่ลบ
    - _Requirements: 9.5_
  - [x] 1.2 ลบ mysql endpoint ออกจาก `backend/src/main/resources/application.yml`
    - ลบ `mysql` key ออกจาก `ontop.endpoints`
    - ปรับ OntopProperties ให้เป็น single endpoint (ลบ map-based endpoints, ใช้ single URL)
    - _Requirements: 9.5_
  - [x] 1.3 ลบไฟล์ OBDA mapping และ properties ที่ไม่ใช้แล้ว
    - ลบ `iso11238-postgres.obda`, `iso11238-mysql.obda` (ถ้ามี)
    - ลบ `regulator-postgres.properties`, `regulator-mysql.properties` (ถ้ามี)
    - _Requirements: 9.5_
  - [x] 1.4 ปรับ `OntopClient.java` ให้ใช้ single endpoint
    - ลบ `endpointKey` parameter ออกจาก `execute()` method
    - ใช้ default endpoint URL ตรงๆ จาก properties
    - ปรับ `SparqlController.java` ให้เรียก `execute()` แบบใหม่
    - _Requirements: 9.5_

- [x] 2. Checkpoint — ตรวจสอบว่า cleanup ไม่ทำให้ระบบเดิมพัง
  - ตรวจสอบว่า compile ผ่าน, ถามผู้ใช้หากมีข้อสงสัย

- [x] 3. ปรับโครงสร้าง package ให้เป็น modular ตาม ISO module
  - [x] 3.1 สร้าง package `service/iso11238/` และย้าย/สร้าง `SubstanceService.java`
    - สร้าง interface `SubstanceService` พร้อม methods: `listAll()`, `searchByName()`, `getDetails()`, `crossSourceLookup()`
    - สร้าง implementation `SubstanceServiceImpl` ที่ใช้ `OntopClient` ส่ง SPARQL query และ parse ผลลัพธ์
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.2_
  - [x] 3.2 สร้าง SPARQL templates ใน `util/iso11238/SubstanceSparqlTemplates.java`
    - สร้าง constants: `LIST_ALL`, `SEARCH_BY_NAME`, `DETAILS`, `CROSS_SOURCE`, `COUNT_PER_SOURCE`
    - ใช้ IDMP ontology prefixes ที่ถูกต้อง
    - Implement input sanitization สำหรับ SPARQL string literals
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.2_
  - [x] 3.3 สร้าง DTOs ใน `web/dto/iso11238/`
    - สร้าง records: `SubstanceSummary`, `SubstanceDetail`, `NameEntry`, `IdentifierEntry`, `WikidataEnrichment`, `CrossSourceResult`
    - _Requirements: 1.1, 1.3, 1.4, 7.3_
  - [x] 3.4 สร้าง `SubstanceController.java` ใน `web/iso11238/`
    - Implement endpoints: `GET /api/substances`, `GET /api/substances/search`, `GET /api/substances/{iri}/details`, `GET /api/substances/cross-source`
    - เรียก `SubstanceService` และ `WikidataEnrichmentService` สำหรับ detail endpoint
    - Implement input validation (IRI format, keyword length max 200)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1, 8.3_
  - [ ]* 3.5 เขียน property test สำหรับ SPARQL template generation
    - **Property 5: All Substance IRIs Follow Naming Convention**
    - **Validates: Requirements 3.4**
  - [ ]* 3.6 เขียน property test สำหรับ search filter
    - **Property 2: Search Filter Returns Only Matching Results**
    - **Validates: Requirements 1.2**
  - [ ]* 3.7 เขียน unit tests สำหรับ SubstanceSparqlTemplates
    - ตรวจสอบว่า template มี PREFIX ครบ, FILTER ถูกต้อง, input sanitization ทำงาน
    - _Requirements: 1.1, 1.2_

- [x] 4. Implement SparqlCacheService (LRU Cache with TTL)
  - [x] 4.1 สร้าง `config/CacheConfig.java` และ `service/SparqlCacheService.java`
    - Implement LRU cache ด้วย `LinkedHashMap` หรือ `ConcurrentHashMap` + access order tracking
    - กำหนด TTL = 5 นาที, max entries = 100
    - Methods: `get(queryHash)`, `put(queryHash, result)`, `clearAll()`, `size()`
    - ใช้ SHA-256 hash ของ query + accept header เป็น cache key
    - _Requirements: 10.1, 10.4_
  - [x] 4.2 ปรับ `OntopClient` หรือสร้าง wrapper ให้ใช้ cache
    - ตรวจสอบ cache ก่อน query Ontop
    - เพิ่ม `X-Cache-Hit` header ใน response เมื่อ cache hit
    - _Requirements: 10.1, 10.3_
  - [x] 4.3 สร้าง `web/CacheController.java`
    - Implement `DELETE /api/cache/clear` endpoint
    - _Requirements: 10.2_
  - [ ]* 4.4 เขียน property test สำหรับ cache hit consistency
    - **Property 11: Cache Hit Returns Same Result with X-Cache-Hit Header**
    - **Validates: Requirements 10.1, 10.3**
  - [ ]* 4.5 เขียน property test สำหรับ LRU invariant
    - **Property 12: Cache Size Never Exceeds Maximum (LRU Invariant)**
    - **Validates: Requirements 10.4**
  - [ ]* 4.6 เขียน unit tests สำหรับ SparqlCacheService
    - ทดสอบ TTL expiry, LRU eviction, clear all, concurrent access
    - _Requirements: 10.1, 10.4_

- [x] 5. Checkpoint — ตรวจสอบว่า cache และ business API ทำงานถูกต้อง
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Health Check และ Validation Endpoints
  - [x] 6.1 สร้าง `web/HealthController.java`
    - Implement `GET /api/health/ontop` — ส่ง simple SPARQL query ไปยัง Ontop เพื่อตรวจสอบ connectivity
    - ส่งคืน `{ status, endpoint, responseTimeMs }` หรือ `{ status: "unavailable", error }` เมื่อไม่สามารถเชื่อมต่อได้
    - Implement `GET /api/validation/substance-count` — ส่ง COUNT_PER_SOURCE SPARQL query
    - บันทึก warning log เมื่อ count mismatch
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 6.2 เขียน property test สำหรับ substance count validation
    - **Property 7: Substance Count Per Source Matches Database**
    - **Validates: Requirements 5.3**
  - [ ]* 6.3 เขียน unit tests สำหรับ HealthController
    - ทดสอบ Ontop available/unavailable scenarios
    - _Requirements: 5.1, 5.2_

- [x] 7. ปรับปรุงข้อมูล Demo ให้สมจริงและครอบคลุม
  - [x] 7.1 เพิ่มข้อมูล substance ใน PostgreSQL (Company A, B)
    - เพิ่มเป็นอย่างน้อย 5 substances ต่อ company ครอบคลุม 5 types: Chemical, Protein, Nucleic Acid, Polymer, Mixture
    - ใช้ชื่อสารจริง (Amoxicillin, Metformin, Fomivirsen, Polyethylene glycol, etc.)
    - เพิ่ม cross-source matching pairs (UNII เดียวกันใน Company A + D)
    - เพิ่ม multilingual names (Japanese, Thai)
    - แก้ไข `infra/db/postgres/001_schema.sql` และ `infra/db/postgres/002_lookup_name_type.sql`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 7.2 เพิ่มข้อมูล substance ใน MySQL (Company C)
    - เพิ่มเป็นอย่างน้อย 5 substances ครอบคลุม 5 types
    - เพิ่ม cross-source matching pair (UNII เดียวกันกับ Company B)
    - แก้ไข `infra/db/mysql/001_schema.sql`
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 7.3 เพิ่มข้อมูล substance ใน MongoDB (Company D)
    - เพิ่มเป็นอย่างน้อย 5 substances ครอบคลุม 5 types
    - เพิ่ม cross-source matching pair (UNII เดียวกันกับ Company A)
    - แก้ไข `infra/db/mongo/001_seed_company_d.js`
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 7.4 เพิ่มข้อมูล substance ใน CSV/PostgreSQL (Company E)
    - เพิ่มเป็นอย่างน้อย 5 substances ครอบคลุม 5 types
    - แก้ไข CSV files ใน `infra/db/csv/company_e/` และ SQL files ใน `infra/db/postgres_csv/`
    - _Requirements: 4.1, 4.2_

- [x] 8. Checkpoint — ตรวจสอบว่าข้อมูล demo ครบถ้วนและ OBDA mapping ทำงานถูกต้อง
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. พัฒนา Frontend สำหรับ Business User
  - [x] 9.1 สร้าง shared styles และ API client module
    - สร้าง `frontend/css/style.css` — shared styles
    - สร้าง `frontend/js/api.js` — API client module สำหรับเรียก backend endpoints
    - _Requirements: 2.1_
  - [x] 9.2 สร้างหน้า Business UI (`frontend/index.html`)
    - ย้าย SPARQL editor ไปที่ `frontend/sparql.html`
    - สร้างหน้าค้นหา substance ที่มี: navigation bar, search panel (ช่องค้นหา + ตัวกรอง type), results table, detail panel
    - เรียก `/api/substances/search` และ `/api/substances/{iri}/details`
    - แสดง Wikidata enrichment ใน detail panel
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 9.3 ปรับ SPARQL Editor (`frontend/sparql.html`)
    - ย้าย inline script จาก `index.html` เดิมไปเป็น `frontend/js/sparql-editor.js`
    - ลบ endpoint selector (ใช้ single endpoint)
    - เพิ่ม link กลับไปหน้า Business UI
    - _Requirements: 2.4_

- [x] 10. ปรับ Docker Compose ให้ Production-Ready
  - [x] 10.1 เพิ่ม health checks สำหรับทุก service
    - เพิ่ม `healthcheck` configuration สำหรับ postgres, mysql, mongo, trino, ontop-trino, backend
    - _Requirements: 9.1_
  - [x] 10.2 เพิ่ม resource limits และ restart policy
    - เพิ่ม `deploy.resources.limits` สำหรับ ontop-trino (memory, CPU)
    - เพิ่ม `restart: unless-stopped` สำหรับทุก service
    - _Requirements: 9.2, 9.4_
  - [x] 10.3 สร้าง `.env` file สำหรับ credentials
    - ย้าย database passwords และ configuration ออกจาก docker-compose.yml
    - ใช้ environment variable references ใน docker-compose.yml
    - สร้าง `.env.example` เป็น template
    - _Requirements: 9.3_

- [x] 11. Implement Wikidata Enrichment Integration กับ Substance Detail
  - [x] 11.1 ปรับ `SubstanceService` ให้เรียก `WikidataEnrichmentService` ใน `getDetails()`
    - ใช้ preferred name ของ substance เป็น search keyword
    - Handle graceful degradation เมื่อ Wikidata API ไม่ตอบ (ส่งคืน `wikidataAvailable: false`)
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ]* 11.2 เขียน property test สำหรับ Wikidata limit clamping
    - **Property 10: Wikidata Limit Clamping**
    - **Validates: Requirements 8.4**
  - [ ]* 11.3 เขียน unit tests สำหรับ Wikidata integration
    - Mock Wikidata API responses, unavailable scenario
    - _Requirements: 8.1, 8.3_

- [x] 12. สร้างเอกสาร Extensibility Guide และ SPARQL Examples
  - [x] 12.1 สร้าง `infra/ontop/obda/README-extensibility.md`
    - อธิบายขั้นตอนการเพิ่ม ISO module ใหม่: database schema, OBDA mapping, SPARQL templates, API endpoints
    - _Requirements: 3.3_
  - [x] 12.2 สร้าง `infra/ontop/obda/demo/sample-queries.sparql`
    - เพิ่มตัวอย่าง SPARQL queries อย่างน้อย 5 ตัวอย่าง: list substances, search by name, get details, cross-source lookup, CONSTRUCT RDF output
    - _Requirements: 7.2_

- [x] 13. เพิ่ม test dependencies และเขียน integration tests
  - [x] 13.1 เพิ่ม jqwik และ test dependencies ใน `pom.xml`
    - เพิ่ม jqwik 1.8.5, Testcontainers (ถ้าต้องการ integration tests)
    - _Requirements: 6.1_
  - [ ]* 13.2 เขียน property test สำหรับ list all substances
    - **Property 1: List All Substances Returns Complete Data**
    - **Validates: Requirements 1.1**
  - [ ]* 13.3 เขียน property test สำหรับ detail completeness
    - **Property 3: Detail Endpoint Returns Complete Substance Data with Wikidata Enrichment**
    - **Validates: Requirements 1.3, 8.1, 8.2**
  - [ ]* 13.4 เขียน property test สำหรับ cross-source matching
    - **Property 4: Cross-Source Matching Returns All Sources with Matching Identifier**
    - **Validates: Requirements 1.4**
  - [ ]* 13.5 เขียน property test สำหรับ name type mapping
    - **Property 8: Name Type Mapping Produces Correct IDMP IRIs**
    - **Validates: Requirements 6.2**
  - [ ]* 13.6 เขียน property test สำหรับ identifier round-trip
    - **Property 9: Identifier Value Round-Trip**
    - **Validates: Requirements 6.4**
  - [ ]* 13.7 เขียน property test สำหรับ SPARQL round-trip completeness
    - **Property 6: SPARQL Query Returns All Substances (Round-Trip Completeness)**
    - **Validates: Requirements 4.5**
  - [ ]* 13.8 เขียน integration tests สำหรับ OBDA pipeline
    - ทดสอบ full pipeline: DB → Trino → Ontop → SPARQL result
    - ทดสอบ cross-source query ผ่าน Trino federation
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 14. Final Checkpoint — ตรวจสอบว่าทุกอย่างทำงานถูกต้อง
  - Ensure all tests pass, ask the user if questions arise.

## หมายเหตุ

- Tasks ที่มีเครื่องหมาย `*` เป็น optional สามารถข้ามได้สำหรับ MVP
- แต่ละ task อ้างอิง requirements เฉพาะเพื่อ traceability
- Checkpoints ช่วยตรวจสอบความถูกต้องเป็นระยะ
- Property tests ตรวจสอบ correctness properties ที่เป็น universal
- Unit tests ตรวจสอบ specific examples และ edge cases
