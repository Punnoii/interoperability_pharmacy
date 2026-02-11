# Interoperability Pharmacy

โปรเจคระบบ Semantic Data Integration สำหรับข้อมูลยา โดยใช้ SPARQL Endpoint ผ่าน Ontop เพื่อเชื่อมต่อกับฐานข้อมูล MySQL และ PostgreSQL

## 📋 สถาปัตยกรรมระบบ

```
Frontend (Next.js) → Backend (Spring Boot) → Ontop → Database (MySQL/PostgreSQL)
                                           ↘ Trino
```

### Components
- **Frontend**: Next.js 15 (TypeScript, React)
- **Backend**: Spring Boot (Java 17)
- **Data Access Layer**: 
  - Ontop (SPARQL to SQL mapping)
  - Trino (Distributed SQL query engine)
- **Databases**: MySQL 8.0, PostgreSQL 16

---

## 🚀 การติดตั้งและรันโปรเจค

### Prerequisites
- Docker & Docker Compose
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd interoperability_pharmacy
```

### 2. รันระบบทั้งหมดด้วย Docker Compose

#### สร้าง Docker Images และรันทุก Services
```bash
docker-compose up -d --build
```

#### รัน Services (ถ้า Build แล้ว)
```bash
docker-compose up -d
```

#### หยุดทุก Services
```bash
docker-compose down
```

#### ดู Logs
```bash
# ดู logs ทั้งหมด
docker-compose logs -f

# ดู logs เฉพาะ service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 3. เข้าใช้งานระบบ

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:3000 | 3000 |
| Backend API | http://localhost:8082 | 8082 |
| Ontop (PostgreSQL) | http://localhost:8080/sparql | 8080 |
| Ontop (MySQL) | http://localhost:8081/sparql | 8081 |
| Trino | http://localhost:8090 | 8090 |
| MySQL | localhost:3306 | 3306 |
| PostgreSQL | localhost:5432 | 5432 |

---

## 🔌 Backend API Endpoints

### 1. **Execute SPARQL Query**
```http
POST /api/sparql
Content-Type: application/json

{
  "endpoint": "default",  // "default" หรือ "mysql"
  "query": "SELECT * WHERE { ?s ?p ?o } LIMIT 10",
  "accept": "application/sparql-results+json"
}
```

### 2. **Get Entity Details**
```http
GET /api/entity?iri=<entity-iri>&limit=100&endpoint=default
```

### 3. **Navigate Graph**
```http
GET /api/navigate?iri=<entity-iri>&predicate=<predicate-iri>&direction=out&limit=100
```

### 4. **Health Check**
```http
GET /api/health
```

---

## 🛠️ Development

### รัน Frontend แยก (Development Mode)
```bash
cd frontend
npm install
npm run dev
```
เข้าใช้งานที่: http://localhost:3000

### รัน Backend แยก (Development Mode)
```bash
cd backend
mvn spring-boot:run
```
API จะรันที่: http://localhost:8082

### Environment Variables

#### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8082
```

#### Backend (`application.yml`)
```yaml
server:
  port: 8082

ontop:
  endpoint:
    default: http://localhost:8080/sparql
    mysql: http://localhost:8081/sparql
```

---

## 📦 Docker Services

### Build เฉพาะ Service
```bash
# Build frontend
docker-compose build frontend

# Build backend
docker-compose build backend
```

### Restart Service
```bash
docker-compose restart frontend
docker-compose restart backend
```

### ลบ Containers และ Networks
```bash
docker-compose down -v
```

---

## 🔍 การใช้งาน SPARQL Query

### ตัวอย่าง Query
```sparql
# ดึงข้อมูลทั้งหมด 10 รายการ
SELECT * WHERE { 
  ?s ?p ?o 
} LIMIT 10

# ค้นหา Entity ตาม Type
SELECT ?entity ?label WHERE {
  ?entity a <http://example.com/Substance> .
  ?entity rdfs:label ?label .
}
```

### วิธีใช้งานผ่าน Frontend
1. เปิด http://localhost:3000
2. พิมพ์ SPARQL query ในช่องค้นหา
3. กดปุ่ม **Run**
4. ดูผลลัพธ์ใน **Console Log** ของเบราว์เซอร์ (F12)

---

## 🐛 Troubleshooting

### ปัญหา: Frontend ไม่เชื่อมต่อ Backend
**แก้ไข:** ตรวจสอบว่า Backend รันอยู่ที่ port 8082
```bash
docker-compose logs backend
```

### ปัญหา: Database Connection Error
**แก้ไข:** รอให้ Database เริ่มทำงานก่อน
```bash
docker-compose up -d mysql postgres
# รอ 10-15 วินาที
docker-compose up -d ontop ontop-mysql backend
```

### ปัญหา: Port ถูกใช้งานแล้ว
**แก้ไข:** เปลี่ยน port ใน `docker-compose.yml`
```yaml
ports:
  - "3001:3000"  # เปลี่ยนจาก 3000 เป็น 3001
```

---

## 📚 เอกสารเพิ่มเติม

- [Next.js Documentation](https://nextjs.org/docs)
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Ontop Documentation](https://ontop-vkg.org/)
- [SPARQL Query Language](https://www.w3.org/TR/sparql11-query/)

---

## 📄 License

This project is licensed under the MIT License.
