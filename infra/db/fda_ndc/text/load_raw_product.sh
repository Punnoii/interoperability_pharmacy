#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 \
  -h postgres \
  -U postgres \
  -d postgres \
  -f /work/ndc-fda-raw.sql

psql -v ON_ERROR_STOP=1 \
  -h postgres \
  -U postgres \
  -d postgres \
  -c "\copy fda_ndc_raw.product (
    productid,
    productndc,
    producttypename,
    proprietaryname,
    proprietarynamesuffix,
    nonproprietaryname,
    dosageformname,
    routename,
    startmarketingdate,
    endmarketingdate,
    marketingcategoryname,
    applicationnumber,
    labelername,
    substancename,
    active_numerator_strength,
    active_ingred_unit,
    pharm_classes,
    deaschedule,
    ndc_exclude_flag,
    listing_record_certified_through
  ) FROM '/data/fda-ndc-raw/ndctext/product.txt'
  WITH (FORMAT csv, HEADER true, DELIMITER E'\t', QUOTE E'\b')"

