// Seed demo MongoDB dataset for a new source: company_d
// This mirrors the structure used in relational demo sources.

const companyDb = db.getSiblingDB("company_d");

// Core collections
companyDb.createCollection("substance_master");
companyDb.createCollection("substance_alias");
companyDb.createCollection("substance_id_map");
companyDb.createCollection("name_type_map");

// Upsert style seed helper
function upsertBy(filter, doc, collection) {
  companyDb[collection].updateOne(filter, { $set: doc }, { upsert: true });
}

// Master substances
upsertBy(
  { substance_code: "D-100" },
  {
    substance_code: "D-100",
    substance_kind: "Chemical",
    status: "active",
    created_on: new Date("2026-01-01T00:00:00Z"),
  },
  "substance_master"
);

upsertBy(
  { substance_code: "D-200" },
  {
    substance_code: "D-200",
    substance_kind: "Protein",
    status: "active",
    created_on: new Date("2026-01-01T00:00:00Z"),
  },
  "substance_master"
);

upsertBy(
  { substance_code: "D-300" },
  {
    substance_code: "D-300",
    substance_kind: "Mixture",
    status: "investigational",
    created_on: new Date("2026-01-01T00:00:00Z"),
  },
  "substance_master"
);

// Names / aliases
upsertBy(
  { alias_id: 5000 },
  {
    alias_id: 5000,
    substance_code: "D-100",
    alias_text: "Metformin",
    alias_kind: "Preferred",
    lang: "en",
  },
  "substance_alias"
);

upsertBy(
  { alias_id: 5001 },
  {
    alias_id: 5001,
    substance_code: "D-100",
    alias_text: "Glucophage",
    alias_kind: "Brand",
    lang: "en",
  },
  "substance_alias"
);

upsertBy(
  { alias_id: 5002 },
  {
    alias_id: 5002,
    substance_code: "D-200",
    alias_text: "Insulin glargine",
    alias_kind: "Preferred",
    lang: "en",
  },
  "substance_alias"
);

upsertBy(
  { alias_id: 5003 },
  {
    alias_id: 5003,
    substance_code: "D-300",
    alias_text: "Vitamin Blend D",
    alias_kind: "Other",
    lang: "en",
  },
  "substance_alias"
);

// Identifiers
upsertBy(
  { id_id: 6000 },
  {
    id_id: 6000,
    substance_code: "D-100",
    id_value: "UNII-XT9YQ2H9CD",
    id_system: "UNII",
  },
  "substance_id_map"
);

upsertBy(
  { id_id: 6001 },
  {
    id_id: 6001,
    substance_code: "D-200",
    id_value: "UNII-2K9A0X9Q9L",
    id_system: "UNII",
  },
  "substance_id_map"
);

upsertBy(
  { id_id: 6002 },
  {
    id_id: 6002,
    substance_code: "D-300",
    id_value: "MIX-D-0003",
    id_system: "LOCAL",
  },
  "substance_id_map"
);

// Name type mapping (IDMP classifier IRIs)
upsertBy(
  { company_code: "D", source_name_type: "Preferred" },
  {
    company_code: "D",
    source_name_type: "Preferred",
    idmp_name_type_iri:
      "https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-PreferredName",
  },
  "name_type_map"
);

upsertBy(
  { company_code: "D", source_name_type: "Brand" },
  {
    company_code: "D",
    source_name_type: "Brand",
    idmp_name_type_iri:
      "https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-BrandName",
  },
  "name_type_map"
);

upsertBy(
  { company_code: "D", source_name_type: "Other" },
  {
    company_code: "D",
    source_name_type: "Other",
    idmp_name_type_iri:
      "https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-OtherName",
  },
  "name_type_map"
);

// Basic indexes for demo query behavior
companyDb.substance_master.createIndex({ substance_code: 1 }, { unique: true });
companyDb.substance_alias.createIndex({ alias_id: 1 }, { unique: true });
companyDb.substance_alias.createIndex({ substance_code: 1 });
companyDb.substance_id_map.createIndex({ id_id: 1 }, { unique: true });
companyDb.substance_id_map.createIndex({ substance_code: 1 });
companyDb.name_type_map.createIndex(
  { company_code: 1, source_name_type: 1 },
  { unique: true }
);
