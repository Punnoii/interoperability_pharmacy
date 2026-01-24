USE company_a_db;
DROP TABLE IF EXISTS company_product;

CREATE TABLE company_product (
  product_id        VARCHAR(20) PRIMARY KEY,
  trade_name        VARCHAR(100) NOT NULL,
  manufacturer_name VARCHAR(100) NOT NULL,
  ingredient_text   VARCHAR(200) NOT NULL,  -- messy text
  strength_text     VARCHAR(50)  NOT NULL,  -- "500mg", "0.5 g"
  dosage_form_text  VARCHAR(50)  NOT NULL,  -- "TAB", "tablet"
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO company_product VALUES
('A-001','Tylenol','ACME Pharma','Acetaminophen','500 mg','TAB',DEFAULT),
('A-002','Panadol','BKK Pharma','Paracetamol','500mg','Tablet',DEFAULT),
('A-003','Advil','ACME Pharma','Ibuprofen','200MG','CAPSULE',DEFAULT),
('A-004','Zyrtec','ACME Pharma','Cetirizine','10 mg','tablet',DEFAULT),
('A-005','Augmentin','BKK Pharma','Amoxicillin + Clavulanate','875/125 mg','tablet',DEFAULT);
