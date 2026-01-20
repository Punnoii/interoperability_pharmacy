-- db2.sql (MySQL)

DROP TABLE IF EXISTS medicine;

CREATE TABLE medicine (
  med_id               INT AUTO_INCREMENT PRIMARY KEY,
  trade_name           VARCHAR(120) NOT NULL,
  substance            VARCHAR(120) NOT NULL,
  dose_value           DECIMAL(10,3) NOT NULL,
  dose_unit            VARCHAR(10) NOT NULL,   -- mg / g
  form                 VARCHAR(60) NOT NULL,   -- tab/cap/susp
  administration_route VARCHAR(60) NOT NULL,  -- PO / by mouth / oral
  org_name             VARCHAR(120),
  market               VARCHAR(10),
  last_modified        DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Paracetamol/Acetaminophen (12 rows)
INSERT INTO medicine
(trade_name, substance, dose_value, dose_unit, form, administration_route, org_name, market)
VALUES
('Tylenol', 'acetaminophen', 0.500, 'g', 'tab', 'PO', 'J&J', 'US'),  -- unit mismatch vs db1 (g instead of mg)
('tylenol', 'acetaminophen', 500, 'mg', 'tab', 'PO', 'J&J', 'US'),   -- lowercase brand
('Panadol', 'paracetamol', 500, 'mg', 'tab', 'by mouth', 'GSK', 'GB'),
('Panadol Extra', 'paracetamol', 500, 'mg', 'tab', 'by mouth', 'GSK', 'GB'),
('CALPOL', 'paracetamol', 120, 'mg', 'susp', 'oral', 'Haleon', 'GB'),
('Sara', 'paracetamol', 500, 'mg', 'tab', 'oral', 'LocalPharma', 'TH'),
('Paracap', 'paracetamol', 500, 'mg', 'cap', 'oral', 'LocalPharma', 'TH'),
('Aceta 500', 'paracetamol', 500, 'mg', 'tab', 'PO', 'GenericCo', 'IN'),
('Acetaminophen ER', 'acetaminophen', 650, 'mg', 'tab', 'PO', 'GenericCo', 'US'),
('Tylenol  ', 'acetaminophen', 500, 'mg', 'tab', 'PO', 'J&J', 'US'), -- double space trailing
('Panadol-500', 'paracetamol', 500, 'mg', 'tab', 'PO', 'GSK', 'GB'),
('Paracetamol Kids', 'paracetamol', 160, 'mg', 'susp', 'oral', 'GenericCo', 'US');

-- Ibuprofen (12 rows)
INSERT INTO medicine
(trade_name, substance, dose_value, dose_unit, form, administration_route, org_name, market)
VALUES
('Advil', 'ibuprofen', 200, 'mg', 'tab', 'PO', 'Pfizer', 'US'),
('ADVIL ', 'ibuprofen', 200, 'mg', 'tab', 'PO', 'Pfizer', 'US'), -- trailing space
('Nurofen', 'ibuprofen', 0.200, 'g', 'tab', 'by mouth', 'Reckitt', 'GB'), -- unit mismatch
('Brufen', 'ibuprofen', 400, 'mg', 'tab', 'oral', 'Abbott', 'GB'),
('Ibu-400', 'ibuprofen', 400, 'mg', 'cap', 'PO', 'GenericCo', 'IN'),
('Ibuprofen Kids', 'ibuprofen', 100, 'mg', 'susp', 'oral', 'GenericCo', 'US'),
('Advil Liqui-Gels', 'ibuprofen', 200, 'mg', 'cap', 'PO', 'Pfizer', 'US'),
('Nurofen Express', 'ibuprofen', 400, 'mg', 'cap', 'by mouth', 'Reckitt', 'GB'),
('Brufen 200', 'ibuprofen', 200, 'mg', 'tab', 'oral', 'Abbott', 'GB'),
('Ibu Pro', 'ibuprofen', 200, 'mg', 'tab', 'PO', 'GenericCo', 'TH'),
('Ibuprofen-200', 'ibuprofen', 200, 'mg', 'tab', 'PO', 'GenericCo', 'US'),
('Nurofen for Children', 'ibuprofen', 100, 'mg', 'susp', 'oral', 'Reckitt', 'GB');

-- Amoxicillin (12 rows)
INSERT INTO medicine
(trade_name, substance, dose_value, dose_unit, form, administration_route, org_name, market)
VALUES
('Amoxil', 'amoxicillin', 500, 'mg', 'cap', 'PO', 'GSK', 'US'),
('amoxil', 'amoxicillin', 500, 'mg', 'cap', 'PO', 'GSK', 'US'), -- lowercase
('Trimox', 'amoxicillin', 0.500, 'g', 'cap', 'by mouth', 'GenericCo', 'US'), -- unit mismatch
('Moxatag', 'amoxicillin', 775, 'mg', 'tab', 'oral', 'LocalPharma', 'US'),
('Amoxicillin', 'amoxicillin', 250, 'mg', 'cap', 'PO', 'GenericCo', 'TH'),
('Amoxicillin', 'amoxicillin', 500, 'mg', 'cap', 'PO', 'GenericCo', 'TH'),
('Amoxicillin Suspension', 'amoxicillin', 125, 'mg', 'susp', 'oral', 'GenericCo', 'TH'),
('Amoxil Suspension', 'amoxicillin', 125, 'mg', 'susp', 'oral', 'GSK', 'US'),
('Amoxi 500', 'amoxicillin', 500, 'mg', 'cap', 'PO', 'GenericCo', 'IN'),
('Amoxi-250', 'amoxicillin', 250, 'mg', 'cap', 'PO', 'GenericCo', 'IN'),
('Amoxicillin 500', 'amoxicillin', 500, 'mg', 'cap', 'PO', 'GenericCo', 'US'),
('Amoxicillin DS', 'amoxicillin', 250, 'mg', 'susp', 'oral', 'GenericCo', 'US');
