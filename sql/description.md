# DB1: company_db (MySQL)

## company_product
- product_id: รหัสสินค้า (PK)
- trade_name: ชื่อการค้า/ชื่อแบรนด์ 
- manufacturer_name: บริษัทผู้ผลิต
- ingredient_text: สารออกฤทธิ์แบบข้อความ (อาจเป็น synonym/สะกดต่าง)
- strength_text: ความแรงแบบข้อความ (format ไม่สม่ำเสมอ)
- dosage_form_text: รูปแบบยาแบบข้อความ (TAB/tablet/cap ฯลฯ)

# DB2: regulator_db (PostgreSQL)

## substance_ref
- substance_code: รหัสสาร (PK)
- preferred_name: ชื่อสารมาตรฐาน

## drug_registry
- reg_id: รหัสทะเบียน (PK)
- generic_name: ชื่อสามัญ
- substance_code: FK ไปสารมาตรฐาน
- strength_value/strength_unit: ความแรง (แยกตัวเลข/หน่วย)
- dosage_form_code: โค้ดรูปแบบยา (TAB/CAP/INH)
- marketing_status: สถานะทะเบียน
- holder_name: ผู้ถือทะเบียน/หน่วยงาน
