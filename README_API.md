# Pharmacy Interoperability API Demo

This project demonstrates an interoperability layer that connects to two disparate databases (DB1: PostgreSQL-like, DB2: MySQL-like) and serves unified, normalized drug data via a single REST API endpoint.

## Features
- **Single Endpoint**: `/search`
- **Federated Query**: Queries both DB1 and DB2 in real-time.
- **Normalization**: Maps different schemas (fields, units, codes) to a common format.
  - Normalizes `dose_unit` (g -> mg).
  - Normalizes `administration_route` (PO/by mouth -> oral).
- **Source Tagging**: Identifies the source of each record.

## Prerequisites
- Java 11 or higher
- Maven

## How to Run
1. Navigate to the project directory:
   ```bash
   cd interoperability_pharmacy
   ```
2. Run the application using Maven:
   ```bash
   mvn spring-boot:run
   ```
   The H2 databases will be automatically initialized with data from `src/main/resources/schema-db1.sql` and `src/main/resources/schema-db2.sql`.

## API Usage

### Endpoint
`GET /search`

### Parameters
- `term` (or `substance`): The search keyword (searches brand name, generic name, substance).

### Example Request
```http
GET http://localhost:8080/search?term=paracetamol
```
OR
```http
GET http://localhost:8080/search?substance=ibuprofen
```

### Example Response
```json
[
  {
    "source": "db1",
    "originalId": "3",
    "brandName": "Panadol",
    "activeIngredient": "paracetamol",
    "strengthMg": 500.0,
    "dosageForm": "tablet",
    "route": "oral",
    "manufacturer": "GSK",
    "country": "GB"
  },
  {
    "source": "db2",
    "originalId": "3",
    "brandName": "Panadol",
    "activeIngredient": "paracetamol",
    "strengthMg": 500.0,
    "dosageForm": "tab",
    "route": "oral",
    "manufacturer": "GSK",
    "country": "GB"
  }
]
```

## Schema
The output format is defined in `Seman/result_schema.json`.
