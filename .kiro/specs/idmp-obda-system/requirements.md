# Requirements Document — ระบบ IDMP OBDA (Ontology-Based Data Access)

## บทนำ

ระบบ IDMP OBDA เป็นระบบที่ใช้ Ontology-Based Data Access (OBDA) เพื่อรวมข้อมูลสารออกฤทธิ์ (Substance) จากหลายแหล่งข้อมูลที่มีโครงสร้างต่างกัน (PostgreSQL, MySQL, MongoDB, CSV) ให้เป็นมุมมองเดียวกันผ่าน IDMP Ontology

### สถาปัตยกรรม Single SPARQL Endpoint (True OBDA)

ระบบใช้สถาปัตยกรรมแบบ **single SPARQL endpoint** ซึ่งเป็นหลักการ OBDA ที่แท้จริง — "one query across all sources" โดยมีองค์ประกอบหลัก:

- **Ontop Engine (ontop-trino):** OBDA engine เพียงตัวเดียวที่เชื่อมต่อกับ Trino เพื่อให้บริการ SPARQL endpoint
- **Trino Federation:** Trino ทำหน้าที่เป็น federated query engine ที่รวม PostgreSQL, MySQL, MongoDB เป็น single SQL interface
- **Single SPARQL Endpoint:** ผู้ใช้ส่ง SPARQL query ไปที่ endpoint เดียว แล้ว Ontop จะแปลงเป็น SQL ที่ Trino กระจายไปยังฐานข้อมูลต้นทางทั้งหมด
- **Spring Boot Backend:** REST API ที่เป็น proxy ระหว่าง frontend กับ Ontop SPARQL endpoint
- **Frontend:** เว็บแอปพลิเคชันสำหรับค้นหาและแสดงผลข้อมูล substance

ข้อดีของสถาปัตยกรรมนี้คือผู้ใช้ไม่ต้องเลือก endpoint หรือรู้ว่าข้อมูลอยู่ที่ฐานข้อมูลใด — SPARQL query เดียวสามารถดึงข้อมูลจากทุกแหล่งได้ทันที

### ขอบเขตของระบบ

**ขอบเขตหลัก (Primary Scope):** ระบบมุ่งเน้นการ implement OBDA mapping สำหรับ **ISO 11238 (Substances)** เป็นหลัก ครอบคลุมข้อมูล substance type, substance name, substance identifier จากทุก data source (Company A-E)

**การขยายในอนาคต (Future Extensibility):** สถาปัตยกรรมของระบบถูกออกแบบให้รองรับการขยายไปยังมาตรฐาน ISO IDMP อื่นๆ ในอนาคต ได้แก่:
- ISO 11615 — Medicinal Products
- ISO 11616 — Pharmaceutical Products
- ISO 11239 — Dose Forms & Routes of Administration
- ISO 11240 — Units of Measurement

**วัตถุประสงค์เชิงการเรียนรู้:** ระบบนี้ใช้ multi-database setup (PostgreSQL, MySQL, MongoDB, CSV) เพื่อสาธิตความสามารถของ OBDA ในการรวมข้อมูลจากแหล่งข้อมูลที่หลากหลาย เหมาะสำหรับการเรียนรู้และ demo

### การประเมินสถานะปัจจุบัน

**ส่วนที่มีอยู่แล้ว:**
- โครงสร้างฐานข้อมูล 5 แหล่ง (Company A/B บน PostgreSQL, Company C บน MySQL, Company D บน MongoDB, Company E จาก CSV โหลดเข้า PostgreSQL)
- IDMP Ontology v1.3.0 (CMNS, ISO, LCC, EXT, META, MVF, SPAR modules)
- Ontop OBDA Mapping สำหรับ ISO 11238-Substances ผ่าน Trino (`iso11238-trino.obda`) ครอบคลุม Company A-E ทั้งหมด
- Ontop container เดียว (ontop-trino) เชื่อมต่อกับ Trino เป็น single SPARQL endpoint
- Spring Boot Backend พร้อม SPARQL proxy, Entity/Navigate API, Wikidata enrichment
- Frontend demo สำหรับ SPARQL query
- Docker Compose orchestration พร้อม Trino federation

**ส่วนที่ต้อง cleanup:**
- docker-compose.yml ยังมี service `ontop-postgres` และ `ontop-mysql` ที่ไม่ใช้แล้ว (ต้องลบออก)
- application.yml ยังมี mysql endpoint configuration ที่ไม่ใช้แล้ว (ต้องลบออก)
- ไฟล์ OBDA mapping เก่า (`iso11238-postgres.obda`, `iso11238-mysql.obda`) และ properties files ที่ไม่ใช้แล้ว (ต้องลบออก)

**ส่วนที่ยังขาดและต้องพัฒนาเพิ่ม:**
- ข้อมูล demo ยังไม่สมจริงเพียงพอ (substance แต่ละ company มีเพียง 3 รายการ, ขาดข้อมูลเชิงลึกเช่น molecular formula, CAS number)
- ยังไม่มี SPARQL query templates สำหรับ use cases ทางธุรกิจ (cross-source substance matching, regulatory reporting)
- Frontend ยังเป็น raw SPARQL editor ไม่มี UI สำหรับ business user
- ยังไม่มี data validation/quality checks
- ยังไม่มี unit tests และ integration tests
- ยังไม่มี API documentation
- ยังไม่มีระบบ monitoring/observability
- สถาปัตยกรรมยังไม่มี extensibility pattern สำหรับการเพิ่ม ISO module ใหม่ในอนาคต
- Backend ยังมี multi-endpoint configuration ที่ต้องปรับเป็น single endpoint

## อภิธานศัพท์

- **OBDA_System**: ระบบ Ontology-Based Data Access ที่แปลงข้อมูลจากฐานข้อมูลเชิงสัมพันธ์เป็น RDF virtual graph ผ่าน Ontop Engine โดยใช้ single SPARQL endpoint ผ่าน Trino federation
- **IDMP_Ontology**: ชุด ontology ตามมาตรฐาน ISO IDMP (Identification of Medicinal Products) เวอร์ชัน 1.3.0 จาก Pistoia Alliance
- **ISO_11238_Ontology**: ส่วนของ IDMP Ontology ที่ครอบคลุมมาตรฐาน Substances — เป็นขอบเขตหลักของระบบนี้
- **Ontop_Engine**: OBDA engine (ontop-trino) ที่แปลง SPARQL queries เป็น SQL queries ผ่าน OBDA mappings โดยเชื่อมต่อกับ Trino เป็น single endpoint
- **Trino_Federation**: Trino query engine ที่รวม data sources หลายตัว (PostgreSQL, MySQL, MongoDB) เป็น single SQL interface
- **SPARQL_Endpoint**: HTTP endpoint เดียว (ontop-trino) ที่รับ SPARQL queries และส่งคืนผลลัพธ์จากทุก data source ผ่าน Trino federation
- **Substance**: สารออกฤทธิ์ตามนิยาม ISO 11238 ที่มี type, name, identifier
- **Backend_API**: Spring Boot REST API ที่เป็น proxy ระหว่าง frontend กับ Ontop SPARQL endpoint (single endpoint)
- **Mapping_File**: ไฟล์ OBDA (`iso11238-trino.obda`) ที่กำหนดการแปลงจาก SQL result เป็น RDF triples ตาม IDMP ontology ผ่าน Trino
- **Data_Source**: แหล่งข้อมูลแต่ละแห่ง (Company A-E) ที่มี schema เฉพาะตัว เข้าถึงผ่าน Trino federation
- **Frontend_Application**: เว็บแอปพลิเคชันสำหรับผู้ใช้ในการค้นหาและแสดงผลข้อมูล substance
- **Wikidata_Service**: บริการเสริมที่ค้นหาข้อมูลจาก Wikidata เพื่อ enrich ข้อมูล substance
- **Name_Type_Map**: ตาราง lookup ที่แปลง name type ของแต่ละ company ไปเป็น IDMP classifier IRI
- **Extensibility_Pattern**: รูปแบบสถาปัตยกรรมที่ออกแบบให้สามารถเพิ่ม ISO module ใหม่ (เช่น ISO 11615, ISO 11616) ได้โดยไม่ต้องแก้ไขโค้ดหลัก
- **Demo_Data**: ข้อมูลตัวอย่างที่ใช้ในระบบเพื่อสาธิตการทำงาน ควรสะท้อนข้อมูลจริงในอุตสาหกรรมยา

## Requirements

### Requirement 1: เพิ่ม SPARQL Query Templates สำหรับ Business Use Cases

**User Story:** ในฐานะนักพัฒนา ฉันต้องการ SPARQL query templates สำเร็จรูปสำหรับ use cases ทั่วไป เพื่อให้สามารถเรียกใช้ผ่าน API ได้สะดวก

#### Acceptance Criteria

1. THE Backend_API SHALL มี endpoint `/api/substances` ที่ส่งคืนรายการ substance ทั้งหมดพร้อม type, preferred name, และ identifier โดย query ผ่าน single SPARQL_Endpoint
2. WHEN ผู้ใช้ส่ง request ไปยัง `/api/substances/search` พร้อม parameter `name`, THE Backend_API SHALL ส่งคืน substance ที่มีชื่อตรงกับ keyword ที่ค้นหา
3. THE Backend_API SHALL มี endpoint `/api/substances/{iri}/details` ที่ส่งคืนข้อมูลครบถ้วนของ substance รวมถึงชื่อทุกประเภท, identifier ทั้งหมด, และ substance type
4. WHEN ผู้ใช้ส่ง request ไปยัง `/api/substances/cross-source` พร้อม parameter `identifier`, THE Backend_API SHALL ส่งคืน substance จากทุก Data_Source ที่มี identifier ตรงกัน โดยผลลัพธ์มาจาก single SPARQL query ผ่าน Trino_Federation

### Requirement 2: พัฒนา Frontend สำหรับ Business User

**User Story:** ในฐานะ business user ฉันต้องการหน้าเว็บที่ใช้งานง่ายสำหรับค้นหาและดูข้อมูล substance เพื่อไม่ต้องเขียน SPARQL เอง

#### Acceptance Criteria

1. THE Frontend_Application SHALL แสดงหน้าค้นหา substance ที่มีช่องค้นหาด้วยชื่อ และตัวกรองตาม substance type
2. WHEN ผู้ใช้พิมพ์ชื่อ substance ในช่องค้นหา, THE Frontend_Application SHALL แสดงผลลัพธ์เป็นตารางที่มีคอลัมน์: ชื่อ, ประเภท, identifier, และแหล่งข้อมูล
3. WHEN ผู้ใช้คลิกที่ substance ในตารางผลลัพธ์, THE Frontend_Application SHALL แสดงหน้ารายละเอียดที่มีชื่อทุกประเภท, identifier ทั้งหมด, และข้อมูลจาก Wikidata (ถ้ามี)
4. THE Frontend_Application SHALL ยังคงมีหน้า SPARQL editor สำหรับ advanced user ที่ต้องการเขียน query เอง

### Requirement 3: สถาปัตยกรรมที่รองรับการขยายไปยัง ISO IDMP Modules อื่น

**User Story:** ในฐานะผู้ดูแลระบบ ฉันต้องการให้สถาปัตยกรรมของระบบรองรับการเพิ่ม ontology modules ใหม่ (เช่น ISO 11615 Medicinal Products, ISO 11616 Pharmaceutical Products, ISO 11239 Dose Forms, ISO 11240 Units) ในอนาคตได้โดยไม่ต้องแก้ไขโค้ดหลัก

#### Acceptance Criteria

1. THE OBDA_System SHALL จัดโครงสร้าง Mapping_File แบบ modular โดยแยกไฟล์ mapping ตาม ISO module (เช่น `iso11238-trino.obda` สำหรับ Substances) เพื่อให้สามารถเพิ่มไฟล์ mapping ใหม่สำหรับ module อื่นได้
2. THE Backend_API SHALL จัดโครงสร้าง SPARQL query templates แบบ modular โดยแยกตาม ISO module เพื่อให้สามารถเพิ่ม query templates สำหรับ module ใหม่ได้โดยไม่กระทบ module เดิม
3. THE OBDA_System SHALL มีเอกสาร extensibility guide ที่อธิบายขั้นตอนการเพิ่ม ISO module ใหม่ ครอบคลุม: การสร้าง database schema, การเขียน OBDA mapping สำหรับ Trino, การเพิ่ม SPARQL templates, และการเพิ่ม API endpoints
4. THE OBDA_System SHALL ใช้ IRI naming convention ที่สอดคล้องกัน (เช่น `:substance/{company}/{id}` สำหรับ ISO 11238) เพื่อให้ module ใหม่สามารถใช้ pattern เดียวกันได้ (เช่น `:medicinalproduct/{company}/{id}` สำหรับ ISO 11615)

### Requirement 4: ปรับปรุงข้อมูล Demo ให้สมจริงและครอบคลุมมากขึ้น

**User Story:** ในฐานะผู้ใช้ระบบ demo ฉันต้องการข้อมูลตัวอย่างที่สมจริงและหลากหลาย เพื่อให้การสาธิตระบบ OBDA สะท้อนการใช้งานจริงในอุตสาหกรรมยา

#### Acceptance Criteria

1. THE Demo_Data SHALL มี substance อย่างน้อย 5 รายการต่อ Data_Source (Company A-E) ครอบคลุม substance type ทั้ง Chemical, Protein, Nucleic Acid, Polymer, และ Mixture
2. THE Demo_Data SHALL ใช้ชื่อสาร identifier (เช่น UNII code) และ substance name ที่อ้างอิงจากข้อมูลจริงในอุตสาหกรรมยา (เช่น Amoxicillin, Metformin, Insulin glargine)
3. THE Demo_Data SHALL มี substance ที่ปรากฏในหลาย Data_Source ด้วย identifier เดียวกัน (เช่น UNII code เดียวกัน) อย่างน้อย 2 คู่ เพื่อสาธิต cross-source matching
4. THE Demo_Data SHALL มี substance name หลายภาษา (อย่างน้อย English และภาษาอื่นอีก 1 ภาษา) อย่างน้อย 2 รายการ เพื่อสาธิต multilingual support
5. WHEN Demo_Data ถูกโหลดเข้าฐานข้อมูลทุกแหล่ง, THE OBDA_System SHALL สามารถ query ข้อมูลทั้งหมดผ่าน single SPARQL_Endpoint ได้ครบถ้วนโดยไม่มี data loss

### Requirement 5: Data Validation และ Quality Monitoring

**User Story:** ในฐานะผู้ดูแลระบบ ฉันต้องการระบบตรวจสอบคุณภาพข้อมูลและ mapping เพื่อให้มั่นใจว่าข้อมูลที่ expose ผ่าน SPARQL ถูกต้อง

#### Acceptance Criteria

1. THE Backend_API SHALL มี endpoint `/api/health/ontop` ที่ตรวจสอบสถานะการเชื่อมต่อของ Ontop_Engine (ontop-trino) ซึ่งเป็น single SPARQL_Endpoint
2. WHEN Ontop_Engine ไม่สามารถเชื่อมต่อได้, THE Backend_API SHALL ส่งคืน status "unavailable" พร้อมรายละเอียดข้อผิดพลาด
3. THE Backend_API SHALL มี endpoint `/api/validation/substance-count` ที่ส่งคืนจำนวน substance ต่อ Data_Source (แยกตาม company) ผ่าน single SPARQL query เพื่อตรวจสอบความครบถ้วน
4. WHEN จำนวน substance จาก SPARQL query ไม่ตรงกับจำนวนในฐานข้อมูลต้นทาง, THE Backend_API SHALL บันทึก warning log

### Requirement 6: Integration Tests สำหรับ OBDA Pipeline

**User Story:** ในฐานะนักพัฒนา ฉันต้องการ integration tests ที่ตรวจสอบ OBDA pipeline ตั้งแต่ database ถึง SPARQL result เพื่อป้องกัน regression

#### Acceptance Criteria

1. THE OBDA_System SHALL มี integration test ที่ตรวจสอบว่า SPARQL query สำหรับ substance list ส่งคืนจำนวน substance ที่ถูกต้องจากแต่ละ Data_Source ผ่าน single SPARQL_Endpoint
2. THE OBDA_System SHALL มี integration test ที่ตรวจสอบว่า substance name mapping ส่งคืน name type IRI ที่ถูกต้องตาม Name_Type_Map
3. THE OBDA_System SHALL มี integration test ที่ตรวจสอบว่า cross-source query ผ่าน Trino_Federation ส่งคืนข้อมูลจากทุก Data_Source ใน single query
4. FOR ALL substance ที่มีอยู่ในฐานข้อมูล, การ query ผ่าน SPARQL แล้วตรวจสอบ identifier value SHALL ตรงกับค่าในฐานข้อมูลต้นทาง (round-trip property)

### Requirement 7: API Documentation และ SPARQL Examples

**User Story:** ในฐานะนักพัฒนาภายนอก ฉันต้องการเอกสาร API และตัวอย่าง SPARQL query เพื่อให้สามารถใช้งานระบบได้อย่างถูกต้อง

#### Acceptance Criteria

1. THE Backend_API SHALL มี OpenAPI/Swagger documentation ที่ครอบคลุม endpoints ทั้งหมด
2. THE OBDA_System SHALL มีไฟล์ตัวอย่าง SPARQL queries อย่างน้อย 5 ตัวอย่างที่ครอบคลุม: list substances, search by name, get details, cross-source lookup, และ CONSTRUCT RDF output
3. THE Backend_API SHALL ส่งคืน response ในรูปแบบ JSON ที่มี field descriptions ชัดเจนสำหรับทุก endpoint

### Requirement 8: Wikidata Enrichment Integration กับ Substance Data

**User Story:** ในฐานะ business user ฉันต้องการให้ระบบเชื่อมโยงข้อมูล substance กับ Wikidata โดยอัตโนมัติ เพื่อเพิ่มข้อมูลเสริมเช่น chemical formula, CAS number

#### Acceptance Criteria

1. WHEN ผู้ใช้ดูรายละเอียด substance, THE Backend_API SHALL ค้นหาข้อมูลเพิ่มเติมจาก Wikidata โดยใช้ preferred name ของ substance
2. THE Backend_API SHALL ส่งคืนข้อมูล Wikidata enrichment ที่มี: Wikidata QID, label, description, และ concept URI
3. IF Wikidata API ไม่สามารถเข้าถึงได้, THEN THE Backend_API SHALL ส่งคืนข้อมูล substance ปกติโดยไม่มี enrichment data พร้อม field `wikidataAvailable: false`
4. THE Wikidata_Service SHALL จำกัดจำนวน results ไม่เกิน 10 รายการต่อการค้นหา

### Requirement 9: Docker Compose Production-Ready Configuration

**User Story:** ในฐานะ DevOps engineer ฉันต้องการ Docker Compose configuration ที่พร้อมใช้งานจริง เพื่อให้ deploy ระบบได้อย่างมั่นคง

#### Acceptance Criteria

1. THE OBDA_System SHALL มี Docker Compose configuration ที่กำหนด health checks สำหรับทุก service (postgres, mysql, mongo, trino, ontop-trino, backend)
2. THE OBDA_System SHALL มี Docker Compose configuration ที่กำหนด resource limits (memory, CPU) สำหรับ Ontop_Engine container (ontop-trino)
3. THE OBDA_System SHALL มี environment variable configuration ที่แยก credentials ออกจาก docker-compose.yml ผ่าน `.env` file
4. WHEN service ใดหยุดทำงาน, THE OBDA_System SHALL restart service นั้นโดยอัตโนมัติผ่าน restart policy
5. THE OBDA_System SHALL ลบ service definitions ที่ไม่ใช้แล้ว (ontop-postgres, ontop-mysql) ออกจาก Docker Compose configuration

### Requirement 10: SPARQL Query Result Caching

**User Story:** ในฐานะนักพัฒนา ฉันต้องการระบบ caching สำหรับ SPARQL query results เพื่อลดภาระของ Ontop_Engine สำหรับ query ที่ซ้ำกัน

#### Acceptance Criteria

1. WHEN SPARQL query เดียวกันถูกส่งซ้ำภายใน 5 นาที, THE Backend_API SHALL ส่งคืนผลลัพธ์จาก cache แทนการ query Ontop_Engine ใหม่
2. THE Backend_API SHALL มี endpoint `/api/cache/clear` ที่ล้าง cache ทั้งหมด
3. THE Backend_API SHALL ส่งคืน HTTP header `X-Cache-Hit: true` เมื่อผลลัพธ์มาจาก cache
4. IF cache มีขนาดเกิน 100 entries, THEN THE Backend_API SHALL ลบ entry ที่เก่าที่สุดออก (LRU eviction)
