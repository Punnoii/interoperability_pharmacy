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
    id_value: "UNII-9100L32L2N",
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

// ============================================================
// Additional substances — covering all 5 types (6 total new)
// Cross-source match: D-100 Metformin shares UNII-9100L32L2N with Company A (substance_id=4)
// ============================================================

// --- substance_master: D-400 to D-800 ---
upsertBy(
  { substance_code: "D-400" },
  {
    substance_code: "D-400",
    substance_kind: "Protein",
    status: "active",
    created_on: new Date("2026-01-15T00:00:00Z"),
  },
  "substance_master"
);

upsertBy(
  { substance_code: "D-500" },
  {
    substance_code: "D-500",
    substance_kind: "NucleicAcid",
    status: "active",
    created_on: new Date("2026-01-15T00:00:00Z"),
  },
  "substance_master"
);

upsertBy(
  { substance_code: "D-600" },
  {
    substance_code: "D-600",
    substance_kind: "Polymer",
    status: "active",
    created_on: new Date("2026-01-15T00:00:00Z"),
  },
  "substance_master"
);

upsertBy(
  { substance_code: "D-700" },
  {
    substance_code: "D-700",
    substance_kind: "Mixture",
    status: "active",
    created_on: new Date("2026-01-15T00:00:00Z"),
  },
  "substance_master"
);

upsertBy(
  { substance_code: "D-800" },
  {
    substance_code: "D-800",
    substance_kind: "Chemical",
    status: "active",
    created_on: new Date("2026-01-15T00:00:00Z"),
  },
  "substance_master"
);

// --- substance_alias: names for D-400 to D-800 ---
upsertBy(
  { alias_id: 5004 },
  {
    alias_id: 5004,
    substance_code: "D-400",
    alias_text: "Adalimumab",
    alias_kind: "Preferred",
    lang: "en",
  },
  "substance_alias"
);

upsertBy(
  { alias_id: 5005 },
  {
    alias_id: 5005,
    substance_code: "D-400",
    alias_text: "Humira",
    alias_kind: "Brand",
    lang: "en",
  },
  "substance_alias"
);

upsertBy(
  { alias_id: 5006 },
  {
    alias_id: 5006,
    substance_code: "D-500",
    alias_text: "Nusinersen",
    alias_kind: "Preferred",
    lang: "en",
  },
  "substance_alias"
);

upsertBy(
  { alias_id: 5007 },
  {
    alias_id: 5007,
    substance_code: "D-500",
    alias_text: "Spinraza",
    alias_kind: "Brand",
    lang: "en",
  },
  "substance_alias"
);

upsertBy(
  { alias_id: 5008 },
  {
    alias_id: 5008,
    substance_code: "D-600",
    alias_text: "Carbomer",
    alias_kind: "Preferred",
    lang: "en",
  },
  "substance_alias"
);

upsertBy(
  { alias_id: 5009 },
  {
    alias_id: 5009,
    substance_code: "D-700",
    alias_text: "Electrolyte Blend",
    alias_kind: "Preferred",
    lang: "en",
  },
  "substance_alias"
);

upsertBy(
  { alias_id: 5010 },
  {
    alias_id: 5010,
    substance_code: "D-800",
    alias_text: "Amoxicillin",
    alias_kind: "Preferred",
    lang: "en",
  },
  "substance_alias"
);

upsertBy(
  { alias_id: 5011 },
  {
    alias_id: 5011,
    substance_code: "D-800",
    alias_text: "Amoxil",
    alias_kind: "Brand",
    lang: "en",
  },
  "substance_alias"
);

// --- substance_id_map: identifiers for D-400 to D-800 ---
upsertBy(
  { id_id: 6003 },
  {
    id_id: 6003,
    substance_code: "D-400",
    id_value: "UNII-FYS6T7F842",
    id_system: "UNII",
  },
  "substance_id_map"
);

upsertBy(
  { id_id: 6004 },
  {
    id_id: 6004,
    substance_code: "D-500",
    id_value: "UNII-0S4TQG4NHQ",
    id_system: "UNII",
  },
  "substance_id_map"
);

upsertBy(
  { id_id: 6005 },
  {
    id_id: 6005,
    substance_code: "D-600",
    id_value: "UNII-97TBZ6CKJF",
    id_system: "UNII",
  },
  "substance_id_map"
);

upsertBy(
  { id_id: 6006 },
  {
    id_id: 6006,
    substance_code: "D-700",
    id_value: "MIX-EB002",
    id_system: "LOCAL",
  },
  "substance_id_map"
);

upsertBy(
  { id_id: 6007 },
  {
    id_id: 6007,
    substance_code: "D-800",
    id_value: "UNII-804826J2HU",
    id_system: "UNII",
  },
  "substance_id_map"
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
