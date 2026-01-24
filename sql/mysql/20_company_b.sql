USE company_b_db;
DROP TABLE IF EXISTS product_item;

CREATE TABLE product_item (
  item_code        VARCHAR(20) PRIMARY KEY,
  brand_name       VARCHAR(120) NOT NULL,    -- ไม่ใช้คำว่า trade_name
  maker            VARCHAR(120) NOT NULL,    -- ไม่ใช้ manufacturer_name
  active_substance VARCHAR(120) NOT NULL,    -- ไม่ใช้ ingredient_text
  dose_value       DECIMAL(10,2) NOT NULL,   -- แยกตัวเลข
  dose_unit        VARCHAR(10)   NOT NULL,   -- แยกหน่วย
  form_code        VARCHAR(20)   NOT NULL,   -- ใช้ code เช่น TAB/CAP
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO product_item(item_code, brand_name, maker, active_substance, dose_value, dose_unit, form_code) VALUES
('B-100','TYLENOL','MegaMed','Paracetamol',500,'mg','TAB'),
('B-101','Nurofen','MegaMed','Ibuprofen',200,'mg','CAP'),
('B-102','Claritin','Siam Drug','Loratadine',10,'mg','TAB'),
('B-103','Amoxil','ACME Pharma','Amoxicillin',500,'mg','CAP'),
('B-104','Ventolin','Siam Drug','Salbutamol',100,'mcg','INH');
