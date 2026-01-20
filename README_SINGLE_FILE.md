# Pharmacy Mapping Tool - Single File Version

ไฟล์ `PharmacyMapping.java` เป็นไฟล์เดียวที่รวมทุกอย่างไว้:
- Data Models (inner classes)
- Database Connection
- Normalization Logic
- Matching Logic
- TTL Generation
- YAML Generation

## วิธีใช้งาน

### 1. Setup ฐานข้อมูล

```bash
# PostgreSQL (DB1)
psql -U postgres -f db1.sql

# MySQL (DB2)
mysql -u root -p < db2.sql
```

### 2. แก้ไข Database Connection Settings

เปิดไฟล์ `PharmacyMapping.java` และแก้ไขส่วนนี้:

```java
// Database Connection Settings - แก้ไขตาม environment ของคุณ
private static final String DB1_URL = "jdbc:postgresql://localhost:5432/pharmacy_db1";
private static final String DB1_USERNAME = "postgres";
private static final String DB1_PASSWORD = "postgres";

private static final String DB2_URL = "jdbc:mysql://localhost:3306/pharmacy_db2";
private static final String DB2_USERNAME = "root";
private static final String DB2_PASSWORD = "root";
```

### 3. Compile และ Run

#### วิธีที่ 1: ใช้ Maven (แนะนำ)

```bash
# Compile
mvn clean compile

# Run
mvn exec:java
```

#### วิธีที่ 2: ใช้ javac และ java โดยตรง

```bash
# Download dependencies ก่อน (หรือใช้ Maven)
# จากนั้น compile:
javac -cp ".:postgresql-42.7.1.jar:mysql-connector-j-8.0.33.jar:snakeyaml-2.2.jar:commons-lang3-3.14.0.jar" PharmacyMapping.java

# Run:
java -cp ".:postgresql-42.7.1.jar:mysql-connector-j-8.0.33.jar:snakeyaml-2.2.jar:commons-lang3-3.14.0.jar" PharmacyMapping
```

## Output Files

หลังจากรันเสร็จ จะได้ไฟล์:

- **output_mapped.ttl** - RDF/Turtle file ที่มี product instances และ match relationships
- **output_mapping.yaml** - YAML file ที่มี statistics และ detailed match results

## โครงสร้างไฟล์

ไฟล์ `PharmacyMapping.java` แบ่งเป็น sections:

1. **Database Connection Settings** - ตั้งค่า connection
2. **Data Models** - Inner classes สำหรับ DrugProduct, Medicine, NormalizedProduct, MatchResult
3. **Database Connection Methods** - testConnection, fetchDB1Products, fetchDB2Medicines
4. **Normalization Methods** - normalize, normalizeBrandName, normalizeSubstance, etc.
5. **Matching Methods** - match, matchAll, calculateSimilarity, verifyMatch
6. **TTL Generation Methods** - generateTTL, writeProductTTL, writeMedicineTTL
7. **YAML Generation Methods** - generateYAML
8. **Main Method** - Orchestrate ทั้งหมด

## กระบวนการทำงาน

1. **Connect** - เชื่อมต่อกับ DB1 และ DB2
2. **Fetch** - ดึงข้อมูลทั้งหมด
3. **Normalize** - แปลงข้อมูลให้อยู่ในรูปแบบเดียวกัน
4. **Match** - Match records ด้วย hierarchical matching
5. **Generate TTL** - สร้างไฟล์ RDF/Turtle
6. **Generate YAML** - สร้างไฟล์ YAML mapping

## Normalization Rules

- **Brand Name**: Trim whitespace, remove multiple spaces
- **Substance**: Lowercase
- **Strength**: Convert to mg (g × 1000 = mg)
- **Dosage Form**: tab → tablet, cap → capsule, susp → suspension
- **Route**: PO, by mouth → oral
- **Market**: Uppercase

## Matching Strategy

ใช้ **Hierarchical Matching** 3 ระดับ:

1. **Level 1**: Exact match (substance + strength + form + route) + fuzzy brand
2. **Level 2**: Fuzzy match บน full composite key
3. **Level 3**: Loose match (substance + brand only)

## Troubleshooting

### ไม่สามารถเชื่อมต่อฐานข้อมูลได้
- ตรวจสอบว่า PostgreSQL และ MySQL กำลังรันอยู่
- ตรวจสอบ connection string ในไฟล์
- ตรวจสอบ username/password

### Compile Error
- ตรวจสอบว่าได้ download dependencies แล้ว (ใช้ Maven จะจัดการให้อัตโนมัติ)
- ตรวจสอบว่าใช้ Java 11+

### ไม่พบข้อมูล
- ตรวจสอบว่าได้รัน SQL scripts เพื่อสร้างข้อมูลแล้ว
- ตรวจสอบชื่อ database และ table
