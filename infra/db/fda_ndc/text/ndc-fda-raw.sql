CREATE SCHEMA IF NOT EXISTS fda_ndc_txt_raw;

DROP TABLE IF EXISTS fda_ndc_raw.product;

CREATE TABLE fda_ndc_raw.product (
  productid TEXT,
  productndc TEXT,
  producttypename TEXT,
  proprietaryname TEXT,
  proprietarynamesuffix TEXT,
  nonproprietaryname TEXT,
  dosageformname TEXT,
  routename TEXT,
  startmarketingdate TEXT,
  endmarketingdate TEXT,
  marketingcategoryname TEXT,
  applicationnumber TEXT,
  labelername TEXT,
  substancename TEXT,
  active_numerator_strength TEXT,
  active_ingred_unit TEXT,
  pharm_classes TEXT,
  deaschedule TEXT,
  ndc_exclude_flag TEXT,
  listing_record_certified_through TEXT
);


