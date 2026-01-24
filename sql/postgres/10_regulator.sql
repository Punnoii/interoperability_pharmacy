DROP TABLE IF EXISTS drug_registry;
DROP TABLE IF EXISTS substance_ref;

CREATE TABLE substance_ref (
  substance_code   VARCHAR(30) PRIMARY KEY,
  preferred_name   VARCHAR(100) NOT NULL
);

CREATE TABLE drug_registry (
  reg_id            VARCHAR(20) PRIMARY KEY,
  generic_name      VARCHAR(120) NOT NULL,
  substance_code    VARCHAR(30) NOT NULL REFERENCES substance_ref(substance_code),
  strength_value    NUMERIC(10,2) NOT NULL,
  strength_unit     VARCHAR(10)   NOT NULL,
  dosage_form_code  VARCHAR(20)   NOT NULL,
  marketing_status  VARCHAR(20)   NOT NULL,
  holder_name       VARCHAR(100)  NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO substance_ref VALUES
('SUB_PARA','Paracetamol'),
('SUB_IBU','Ibuprofen'),
('SUB_CET','Cetirizine'),
('SUB_LOR','Loratadine'),
('SUB_AMOX','Amoxicillin'),
('SUB_AMC','Amoxicillin/Clavulanate'),
('SUB_SAL','Salbutamol');

INSERT INTO drug_registry(reg_id, generic_name, substance_code, strength_value, strength_unit, dosage_form_code, marketing_status, holder_name) VALUES
('R-001','Paracetamol','SUB_PARA',500,'mg','TAB','ACTIVE','Ministry Health'),
('R-002','Ibuprofen','SUB_IBU',200,'mg','CAP','ACTIVE','Ministry Health'),
('R-003','Cetirizine','SUB_CET',10,'mg','TAB','ACTIVE','Ministry Health'),
('R-004','Loratadine','SUB_LOR',10,'mg','TAB','ACTIVE','Ministry Health'),
('R-005','Amoxicillin','SUB_AMOX',500,'mg','CAP','ACTIVE','Ministry Health'),
('R-006','Salbutamol','SUB_SAL',100,'mcg','INH','ACTIVE','Ministry Health');
