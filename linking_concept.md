# Concept การเชื่อม (Linking/Matching) ระหว่าง DB1 และ DB2

## คำถามหลัก
1. **เชื่อมกันด้วยอะไร?** - ใช้ field อะไรเป็น key ในการ match
2. **ใช้อะไรเชื่อม?** - ใช้กลไก/algorithm อะไร
3. **รู้ได้ไงว่ามันเชื่อมกันได้อย่างถูกต้อง?** - วิธี verify ว่าถูกต้อง

---

## 1. เชื่อมกันด้วยอะไร? (Linking Keys)

### 1.1 Composite Key (Key หลักสำหรับการ Match)

ในการเชื่อมข้อมูลระหว่าง DB1 และ DB2 เราใช้ **Composite Key** ที่ประกอบด้วยหลาย field:

```
Composite Key = [Brand Name, Substance, Strength (normalized), Dosage Form (normalized), Route (normalized)]
```

**เหตุผล:**
- ไม่มี single unique identifier ที่ share กันระหว่าง DB1 และ DB2
- `product_id` (DB1) ≠ `med_id` (DB2) - เป็น internal ID ที่ไม่เกี่ยวข้องกัน
- ต้องใช้ **semantic identity** (ความหมายของข้อมูล) แทน

### 1.2 Field ที่ใช้ในการ Match

| Field | DB1 Column | DB2 Column | Normalization Required |
|-------|------------|------------|------------------------|
| **Brand Name** | `brand_name` | `trade_name` | ✅ Trim whitespace, remove multiple spaces |
| **Substance** | `active_ingredient` | `substance` | ✅ Lowercase |
| **Strength** | `strength_mg` | `dose_value + dose_unit` | ✅ Convert to mg (g → mg) |
| **Dosage Form** | `dosage_form` | `form` | ✅ Expand abbreviations (tab→tablet) |
| **Route** | `route` | `administration_route` | ✅ Normalize (PO→oral) |

### 1.3 Optional Fields (ช่วยเพิ่มความแม่นยำ)

| Field | DB1 Column | DB2 Column | Usage |
|-------|------------|------------|-------|
| **Manufacturer** | `manufacturer` | `org_name` | Secondary check (อาจมีหลาย manufacturer สำหรับยี่ห้อเดียวกัน) |
| **Market** | `country_code` | `market` | Secondary check (อาจมีหลาย market) |

---

## 2. ใช้อะไรเชื่อม? (Matching Mechanism)

### 2.1 Matching Strategy (กลยุทธ์การ Match)

#### Strategy 1: Exact Match (หลัง Normalization)
```
1. Normalize ทั้ง DB1 และ DB2 ตาม rules
2. สร้าง normalized composite key
3. Match แบบ exact (string comparison)
```

**ข้อดี:** เร็ว, แม่นยำสูง  
**ข้อเสีย:** ไม่เจอกรณีที่ normalize แล้วยังไม่เหมือน (เช่น "Tylenol" vs "Tylenol PM")

#### Strategy 2: Fuzzy Match (แนะนำ)
```
1. Normalize ทั้ง DB1 และ DB2
2. ใช้ similarity score (Levenshtein, Jaro-Winkler)
3. Match ถ้า score > threshold (เช่น 0.85)
```

**ข้อดี:** จับกรณีที่ normalize แล้วยังไม่เหมือนกัน 100%  
**ข้อเสีย:** ช้ากว่า, อาจมี false positive

#### Strategy 3: Hierarchical Match (แนะนำที่สุด)
```
Level 1: Exact match on [Substance + Strength + Dosage Form + Route]
  → ถ้า match → ตรวจ Brand Name ด้วย fuzzy match
Level 2: ถ้า Level 1 ไม่ match → ลอง fuzzy match ทั้ง composite key
Level 3: ถ้ายังไม่ match → ใช้ Brand Name + Substance เท่านั้น (loose match)
```

### 2.2 Normalization Pipeline

ก่อน match ต้อง normalize ทั้งสองฝั่ง:

```python
# Pseudo-code
def normalize_for_matching(db1_record, db2_record):
    # 1. Brand Name
    db1_brand = normalize_brand_name(db1_record.brand_name)
    db2_brand = normalize_brand_name(db2_record.trade_name)
    
    # 2. Substance
    db1_substance = db1_record.active_ingredient.lower()
    db2_substance = db2_record.substance.lower()
    
    # 3. Strength (convert to mg)
    db1_strength = db1_record.strength_mg  # Already in mg
    db2_strength = convert_to_mg(db2_record.dose_value, db2_record.dose_unit)
    
    # 4. Dosage Form
    db1_form = normalize_form(db1_record.dosage_form)  # tablet/capsule/suspension
    db2_form = normalize_form(db2_record.form)  # tab→tablet, cap→capsule, susp→suspension
    
    # 5. Route
    db1_route = normalize_route(db1_record.route)  # oral
    db2_route = normalize_route(db2_record.administration_route)  # PO/by mouth→oral
    
    return {
        'db1': (db1_brand, db1_substance, db1_strength, db1_form, db1_route),
        'db2': (db2_brand, db2_substance, db2_strength, db2_form, db2_route)
    }
```

### 2.3 Matching Algorithm

```python
def match_records(db1_record, db2_record):
    # Normalize
    norm_db1, norm_db2 = normalize_for_matching(db1_record, db2_record)
    
    # Extract composite keys
    key_db1 = (norm_db1['substance'], norm_db1['strength'], 
               norm_db1['form'], norm_db1['route'])
    key_db2 = (norm_db2['substance'], norm_db2['strength'], 
               norm_db2['form'], norm_db2['route'])
    
    # Level 1: Exact match on substance+strength+form+route
    if key_db1 == key_db2:
        # Check brand name similarity
        brand_similarity = fuzzy_match(norm_db1['brand'], norm_db2['brand'])
        if brand_similarity >= 0.85:
            return {'match': True, 'confidence': 'high', 'method': 'exact+brand'}
        elif brand_similarity >= 0.70:
            return {'match': True, 'confidence': 'medium', 'method': 'exact+brand_fuzzy'}
    
    # Level 2: Fuzzy match on full composite key
    full_similarity = composite_fuzzy_match(norm_db1, norm_db2)
    if full_similarity >= 0.90:
        return {'match': True, 'confidence': 'high', 'method': 'fuzzy_composite'}
    elif full_similarity >= 0.75:
        return {'match': True, 'confidence': 'medium', 'method': 'fuzzy_composite'}
    
    # Level 3: Loose match (substance + brand only)
    if norm_db1['substance'] == norm_db2['substance']:
        brand_similarity = fuzzy_match(norm_db1['brand'], norm_db2['brand'])
        if brand_similarity >= 0.80:
            return {'match': True, 'confidence': 'low', 'method': 'loose_substance_brand'}
    
    return {'match': False}
```

---

## 3. รู้ได้ไงว่ามันเชื่อมกันได้อย่างถูกต้อง? (Verification)

### 3.1 Verification Methods

#### Method 1: Manual Review (Gold Standard)
- ตรวจสอบด้วยมือว่าคู่ที่ match กันเป็นยาตัวเดียวกันจริงหรือไม่
- ใช้สำหรับสร้าง **ground truth dataset**

#### Method 2: Consistency Check
ตรวจสอบความสอดคล้องของข้อมูล:

```python
def verify_match(db1_record, db2_record, match_result):
    checks = []
    
    # Check 1: Substance ต้องเหมือนกัน (หลัง normalize)
    checks.append({
        'check': 'substance_match',
        'pass': normalize_substance(db1_record.active_ingredient) == 
                normalize_substance(db2_record.substance),
        'weight': 'critical'  # ถ้าไม่ผ่าน = ไม่ใช่ยาตัวเดียวกัน
    })
    
    # Check 2: Strength ต้องใกล้เคียงกัน (หลัง normalize)
    db1_strength = db1_record.strength_mg
    db2_strength = convert_to_mg(db2_record.dose_value, db2_record.dose_unit)
    strength_diff = abs(db1_strength - db2_strength)
    checks.append({
        'check': 'strength_match',
        'pass': strength_diff <= 1,  # อนุญาตให้ต่างกันไม่เกิน 1 mg
        'weight': 'critical'
    })
    
    # Check 3: Dosage Form ต้องเหมือนกัน (หลัง normalize)
    checks.append({
        'check': 'form_match',
        'pass': normalize_form(db1_record.dosage_form) == 
                normalize_form(db2_record.form),
        'weight': 'critical'
    })
    
    # Check 4: Route ต้องเหมือนกัน (หลัง normalize)
    checks.append({
        'check': 'route_match',
        'pass': normalize_route(db1_record.route) == 
                normalize_route(db2_record.administration_route),
        'weight': 'critical'
    })
    
    # Check 5: Brand Name ควรคล้ายกัน (fuzzy)
    brand_similarity = fuzzy_match(db1_record.brand_name, db2_record.trade_name)
    checks.append({
        'check': 'brand_similarity',
        'pass': brand_similarity >= 0.70,
        'weight': 'important'  # อาจมีกรณีที่ brand name ต่างกันแต่เป็นยาตัวเดียวกัน
    })
    
    # Check 6: Manufacturer (optional, อาจต่างกันได้)
    checks.append({
        'check': 'manufacturer_match',
        'pass': db1_record.manufacturer == db2_record.org_name,
        'weight': 'optional'  # อาจมีหลาย manufacturer
    })
    
    # Check 7: Market (optional, อาจต่างกันได้)
    checks.append({
        'check': 'market_match',
        'pass': db1_record.country_code.upper() == db2_record.market.upper(),
        'weight': 'optional'  # อาจมีหลาย market
    })
    
    # Calculate verification score
    critical_passed = all(c['pass'] for c in checks if c['weight'] == 'critical')
    important_passed = all(c['pass'] for c in checks if c['weight'] == 'important')
    
    return {
        'verified': critical_passed and important_passed,
        'checks': checks,
        'confidence': 'high' if critical_passed and important_passed else 'low'
    }
```

#### Method 3: Statistical Validation
- ตรวจสอบ distribution ของ match scores
- ถ้ามี match score สูงมาก (>0.95) เยอะ = ดี
- ถ้ามี match score ต่ำ (<0.70) เยอะ = อาจมีปัญหา

#### Method 4: Cross-Validation
- แบ่งข้อมูลเป็น train/test
- สร้าง ground truth จาก train set
- ทดสอบ accuracy บน test set

### 3.2 Quality Metrics

```python
def calculate_match_quality(matches):
    """
    matches: list of match results
    """
    metrics = {
        'total_matches': len(matches),
        'high_confidence': sum(1 for m in matches if m['confidence'] == 'high'),
        'medium_confidence': sum(1 for m in matches if m['confidence'] == 'medium'),
        'low_confidence': sum(1 for m in matches if m['confidence'] == 'low'),
        'verified_matches': sum(1 for m in matches if m.get('verified', False)),
        'average_similarity': sum(m.get('similarity', 0) for m in matches) / len(matches)
    }
    
    metrics['high_confidence_rate'] = metrics['high_confidence'] / metrics['total_matches']
    metrics['verification_rate'] = metrics['verified_matches'] / metrics['total_matches']
    
    return metrics
```

---

## 4. ตัวอย่างการ Match จากข้อมูลจริง

### Example 1: Perfect Match (หลัง Normalization)

**DB1:**
```sql
product_id=1, brand_name='Tylenol', active_ingredient='acetaminophen', 
strength_mg=500, dosage_form='tablet', route='oral'
```

**DB2:**
```sql
med_id=1, trade_name='Tylenol', substance='acetaminophen', 
dose_value=500, dose_unit='mg', form='tab', administration_route='PO'
```

**Normalization:**
- DB1: `('Tylenol', 'acetaminophen', 500, 'tablet', 'oral')`
- DB2: `('Tylenol', 'acetaminophen', 500, 'tablet', 'oral')`

**Result:** ✅ **MATCH** (Exact match, High confidence)

---

### Example 2: Match ที่ต้อง Normalize

**DB1:**
```sql
product_id=22, brand_name='Tylenol', active_ingredient='acetaminophen', 
strength_mg=500, dosage_form='tablet', route='oral'
```

**DB2:**
```sql
med_id=22, trade_name='Tylenol', substance='acetaminophen', 
dose_value=0.500, dose_unit='g', form='tab', administration_route='PO'
```

**Normalization:**
- DB1: `('Tylenol', 'acetaminophen', 500, 'tablet', 'oral')`
- DB2: `('Tylenol', 'acetaminophen', 500, 'tablet', 'oral')` ← แปลง 0.5g → 500mg, tab→tablet, PO→oral

**Result:** ✅ **MATCH** (Exact match after normalization, High confidence)

---

### Example 3: Match ที่ต้องใช้ Fuzzy Matching

**DB1:**
```sql
product_id=23, brand_name='TYLENOL ', active_ingredient='acetaminophen', 
strength_mg=500, dosage_form='tablet', route='oral'
```

**DB2:**
```sql
med_id=23, trade_name='tylenol', substance='acetaminophen', 
dose_value=500, dose_unit='mg', form='tab', administration_route='PO'
```

**Normalization:**
- DB1: `('TYLENOL', 'acetaminophen', 500, 'tablet', 'oral')` ← trim space
- DB2: `('tylenol', 'acetaminophen', 500, 'tablet', 'oral')` ← lowercase

**Brand Name Similarity:** `fuzzy_match('TYLENOL', 'tylenol') = 1.0` (case-insensitive)

**Result:** ✅ **MATCH** (Exact match on substance+strength+form+route, Brand fuzzy match, High confidence)

---

### Example 4: Non-Match (ยาต่างกัน)

**DB1:**
```sql
product_id=1, brand_name='Tylenol', active_ingredient='acetaminophen', 
strength_mg=500, dosage_form='tablet', route='oral'
```

**DB2:**
```sql
med_id=39, trade_name='Advil', substance='ibuprofen', 
dose_value=200, dose_unit='mg', form='tab', administration_route='PO'
```

**Normalization:**
- DB1: `('Tylenol', 'acetaminophen', 500, 'tablet', 'oral')`
- DB2: `('Advil', 'ibuprofen', 200, 'tablet', 'oral')`

**Result:** ❌ **NO MATCH** (Substance ต่างกัน: acetaminophen ≠ ibuprofen)

---

### Example 5: Ambiguous Match (ต้องระวัง)

**DB1:**
```sql
product_id=24, brand_name='Panadol', active_ingredient='paracetamol', 
strength_mg=500, dosage_form='tablet', route='oral'
```

**DB2:**
```sql
med_id=25, trade_name='Panadol Extra', substance='paracetamol', 
dose_value=500, dose_unit='mg', form='tab', administration_route='by mouth'
```

**Normalization:**
- DB1: `('Panadol', 'paracetamol', 500, 'tablet', 'oral')`
- DB2: `('Panadol Extra', 'paracetamol', 500, 'tablet', 'oral')`

**Brand Name Similarity:** `fuzzy_match('Panadol', 'Panadol Extra') = 0.75`

**Result:** ⚠️ **POSSIBLE MATCH** (Medium confidence) - อาจเป็นยาตัวเดียวกันหรือคนละตัว (Panadol vs Panadol Extra)

**Recommendation:** ต้องตรวจสอบ manual หรือใช้ข้อมูลเพิ่มเติม (เช่น manufacturer, market)

---

## 5. Implementation Checklist

### Step 1: Normalization
- [ ] Implement brand name normalization (trim, remove spaces)
- [ ] Implement substance normalization (lowercase)
- [ ] Implement strength conversion (g → mg)
- [ ] Implement form expansion (tab → tablet)
- [ ] Implement route normalization (PO → oral)

### Step 2: Matching
- [ ] Implement exact matching
- [ ] Implement fuzzy matching (Levenshtein/Jaro-Winkler)
- [ ] Implement hierarchical matching (Level 1, 2, 3)
- [ ] Set similarity thresholds

### Step 3: Verification
- [ ] Implement consistency checks
- [ ] Calculate match quality metrics
- [ ] Generate match reports

### Step 4: Testing
- [ ] Create test cases (perfect match, normalization needed, fuzzy match, non-match)
- [ ] Validate against ground truth
- [ ] Measure accuracy/precision/recall

---

## 6. สรุป

### เชื่อมกันด้วยอะไร?
- **Composite Key:** [Brand Name, Substance, Strength, Dosage Form, Route]
- ใช้ semantic identity แทน unique identifier

### ใช้อะไรเชื่อม?
- **Normalization Pipeline:** แปลงข้อมูลให้อยู่ในรูปแบบเดียวกัน
- **Hierarchical Matching:** Exact → Fuzzy → Loose
- **Similarity Scoring:** Levenshtein, Jaro-Winkler

### รู้ได้ไงว่าถูกต้อง?
- **Verification Checks:** ตรวจสอบ consistency ของทุก field
- **Quality Metrics:** Confidence score, verification rate
- **Manual Review:** Ground truth validation
