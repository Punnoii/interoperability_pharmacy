-- db1.sql (PostgreSQL)

DROP TABLE IF EXISTS drug_product;

CREATE TABLE drug_product (
  product_id       SERIAL PRIMARY KEY,
  brand_name       VARCHAR(120) NOT NULL,
  generic_name     VARCHAR(120),
  active_ingredient VARCHAR(120) NOT NULL,
  strength_mg      INTEGER NOT NULL,
  dosage_form      VARCHAR(60) NOT NULL,
  route            VARCHAR(40) NOT NULL,
  manufacturer     VARCHAR(120),
  country_code     CHAR(2),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Paracetamol/Acetaminophen (12 rows)
INSERT INTO drug_product
(brand_name, generic_name, active_ingredient, strength_mg, dosage_form, route, manufacturer, country_code)
VALUES
('Tylenol', 'acetaminophen', 'acetaminophen', 500, 'tablet', 'oral', 'J&J', 'US'),
('TYLENOL ', 'acetaminophen', 'acetaminophen', 500, 'tablet', 'oral', 'J&J', 'US'), -- casing + trailing space
('Panadol', 'paracetamol', 'paracetamol', 500, 'tablet', 'oral', 'GSK', 'GB'),
('Panadol Extra', 'paracetamol', 'paracetamol', 500, 'tablet', 'oral', 'GSK', 'GB'),
('Calpol', 'paracetamol', 'paracetamol', 120, 'suspension', 'oral', 'Haleon', 'GB'),
('Sara', 'paracetamol', 'paracetamol', 500, 'tablet', 'oral', 'LocalPharma', 'TH'),
('Paracap', 'paracetamol', 'paracetamol', 500, 'capsule', 'oral', 'LocalPharma', 'TH'),
('Aceta-500', 'paracetamol', 'paracetamol', 500, 'tablet', 'oral', 'GenericCo', 'IN'),
('Acetaminophen ER', 'acetaminophen', 'acetaminophen', 650, 'tablet', 'oral', 'GenericCo', 'US'),
('Tylenol PM', 'acetaminophen', 'acetaminophen', 500, 'tablet', 'oral', 'J&J', 'US'),
('Panadol  500', 'paracetamol', 'paracetamol', 500, 'tablet', 'oral', 'GSK', 'GB'), -- double space
('Paracetamol Kids', 'paracetamol', 'paracetamol', 160, 'suspension', 'oral', 'GenericCo', 'US');

-- Ibuprofen (12 rows)
INSERT INTO drug_product
(brand_name, generic_name, active_ingredient, strength_mg, dosage_form, route, manufacturer, country_code)
VALUES
('Advil', 'ibuprofen', 'ibuprofen', 200, 'tablet', 'oral', 'Pfizer', 'US'),
('ADVIL', 'ibuprofen', 'ibuprofen', 200, 'tablet', 'oral', 'Pfizer', 'US'), -- casing diff
('Nurofen', 'ibuprofen', 'ibuprofen', 200, 'tablet', 'oral', 'Reckitt', 'GB'),
('Brufen', 'ibuprofen', 'ibuprofen', 400, 'tablet', 'oral', 'Abbott', 'GB'),
('Ibu-400', 'ibuprofen', 'ibuprofen', 400, 'capsule', 'oral', 'GenericCo', 'IN'),
('Ibuprofen Kids', 'ibuprofen', 'ibuprofen', 100, 'suspension', 'oral', 'GenericCo', 'US'),
('Advil Liqui-Gels', 'ibuprofen', 'ibuprofen', 200, 'capsule', 'oral', 'Pfizer', 'US'),
('Nurofen Express', 'ibuprofen', 'ibuprofen', 400, 'capsule', 'oral', 'Reckitt', 'GB'),
('Brufen 200', 'ibuprofen', 'ibuprofen', 200, 'tablet', 'oral', 'Abbott', 'GB'),
('Ibu Pro', 'ibuprofen', 'ibuprofen', 200, 'tablet', 'oral', 'GenericCo', 'TH'),
('Ibuprofen  200', 'ibuprofen', 'ibuprofen', 200, 'tablet', 'oral', 'GenericCo', 'US'), -- double space
('Nurofen for Children', 'ibuprofen', 'ibuprofen', 100, 'suspension', 'oral', 'Reckitt', 'GB');

-- Amoxicillin (12 rows)
INSERT INTO drug_product
(brand_name, generic_name, active_ingredient, strength_mg, dosage_form, route, manufacturer, country_code)
VALUES
('Amoxil', 'amoxicillin', 'amoxicillin', 500, 'capsule', 'oral', 'GSK', 'US'),
('AMOXIL', 'amoxicillin', 'amoxicillin', 500, 'capsule', 'oral', 'GSK', 'US'), -- casing diff
('Trimox', 'amoxicillin', 'amoxicillin', 500, 'capsule', 'oral', 'GenericCo', 'US'),
('Moxatag', 'amoxicillin', 'amoxicillin', 775, 'tablet', 'oral', 'LocalPharma', 'US'),
('Amoxicillin', 'amoxicillin', 'amoxicillin', 250, 'capsule', 'oral', 'GenericCo', 'TH'),
('Amoxicillin', 'amoxicillin', 'amoxicillin', 500, 'capsule', 'oral', 'GenericCo', 'TH'),
('Amoxicillin Suspension', 'amoxicillin', 'amoxicillin', 125, 'suspension', 'oral', 'GenericCo', 'TH'),
('Amoxil Suspension', 'amoxicillin', 'amoxicillin', 125, 'suspension', 'oral', 'GSK', 'US'),
('Amoxi 500', 'amoxicillin', 'amoxicillin', 500, 'capsule', 'oral', 'GenericCo', 'IN'),
('Amoxi-250', 'amoxicillin', 'amoxicillin', 250, 'capsule', 'oral', 'GenericCo', 'IN'),
('Amoxicillin 500 ', 'amoxicillin', 'amoxicillin', 500, 'capsule', 'oral', 'GenericCo', 'US'), -- trailing space in brand
('Amoxicillin DS', 'amoxicillin', 'amoxicillin', 250, 'suspension', 'oral', 'GenericCo', 'US');
