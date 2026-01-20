import java.math.BigDecimal;
import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.io.FileWriter;
import java.io.IOException;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;

public class pharmacy_mapping {
    
    private static final String DB1_URL = "jdbc:postgresql://localhost:5432/pharmacy_db1";
    private static final String DB1_USERNAME = "postgres";
    private static final String DB1_PASSWORD = "postgres";
    
    private static final String DB2_URL = "jdbc:mysql://localhost:3306/pharmacy_db2";
    private static final String DB2_USERNAME = "root";
    private static final String DB2_PASSWORD = "root";
    
    // Output file paths
    private static final String OUTPUT_TTL = "output_mapped.ttl";
    private static final String OUTPUT_YAML = "output_mapping.yaml";
    
    // ============================================
    // Data Models (Inner Classes)
    // ============================================
    
    static class DrugProduct {
        Integer productId;
        String brandName;
        String genericName;
        String activeIngredient;
        Integer strengthMg;
        String dosageForm;
        String route;
        String manufacturer;
        String countryCode;
        LocalDateTime updatedAt;
    }
    
    static class Medicine {
        Integer medId;
        String tradeName;
        String substance;
        BigDecimal doseValue;
        String doseUnit;
        String form;
        String administrationRoute;
        String orgName;
        String market;
        LocalDateTime lastModified;
    }
    
    static class NormalizedProduct {
        String normalizedBrandName;
        String normalizedSubstance;
        Integer normalizedStrengthMg;
        String normalizedDosageForm;
        String normalizedRoute;
        String normalizedManufacturer;
        String normalizedMarket;
        Object originalData; // DrugProduct or Medicine
        String source; // "DB1" or "DB2"
        
        String getCompositeKey() {
            return String.format("%s|%d|%s|%s",
                    normalizedSubstance,
                    normalizedStrengthMg,
                    normalizedDosageForm,
                    normalizedRoute);
        }
    }
    
    static class MatchResult {
        DrugProduct db1Product;
        Medicine db2Medicine;
        NormalizedProduct normalizedDb1;
        NormalizedProduct normalizedDb2;
        boolean matched;
        String confidence; // "high", "medium", "low"
        String method;
        double similarityScore;
        boolean verified;
    }
    
    // ============================================
    // Database Connection Methods
    // ============================================
    
    static boolean testDB1Connection() {
        try (Connection conn = DriverManager.getConnection(DB1_URL, DB1_USERNAME, DB1_PASSWORD)) {
            return conn.isValid(2);
        } catch (SQLException e) {
            System.err.println("DB1 connection test failed: " + e.getMessage());
            return false;
        }
    }
    
    static boolean testDB2Connection() {
        try (Connection conn = DriverManager.getConnection(DB2_URL, DB2_USERNAME, DB2_PASSWORD)) {
            return conn.isValid(2);
        } catch (SQLException e) {
            System.err.println("DB2 connection test failed: " + e.getMessage());
            return false;
        }
    }
    
    static List<DrugProduct> fetchDB1Products() throws SQLException {
        List<DrugProduct> products = new ArrayList<>();
        String sql = "SELECT product_id, brand_name, generic_name, active_ingredient, " +
                     "strength_mg, dosage_form, route, manufacturer, country_code, updated_at " +
                     "FROM drug_product ORDER BY product_id";
        
        try (Connection conn = DriverManager.getConnection(DB1_URL, DB1_USERNAME, DB1_PASSWORD);
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            
            while (rs.next()) {
                DrugProduct product = new DrugProduct();
                product.productId = rs.getInt("product_id");
                product.brandName = rs.getString("brand_name");
                product.genericName = rs.getString("generic_name");
                product.activeIngredient = rs.getString("active_ingredient");
                product.strengthMg = rs.getInt("strength_mg");
                product.dosageForm = rs.getString("dosage_form");
                product.route = rs.getString("route");
                product.manufacturer = rs.getString("manufacturer");
                product.countryCode = rs.getString("country_code");
                Timestamp timestamp = rs.getTimestamp("updated_at");
                if (timestamp != null) {
                    product.updatedAt = timestamp.toLocalDateTime();
                }
                products.add(product);
            }
        }
        return products;
    }
    
    static List<Medicine> fetchDB2Medicines() throws SQLException {
        List<Medicine> medicines = new ArrayList<>();
        String sql = "SELECT med_id, trade_name, substance, dose_value, dose_unit, " +
                     "form, administration_route, org_name, market, last_modified " +
                     "FROM medicine ORDER BY med_id";
        
        try (Connection conn = DriverManager.getConnection(DB2_URL, DB2_USERNAME, DB2_PASSWORD);
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            
            while (rs.next()) {
                Medicine medicine = new Medicine();
                medicine.medId = rs.getInt("med_id");
                medicine.tradeName = rs.getString("trade_name");
                medicine.substance = rs.getString("substance");
                medicine.doseValue = rs.getBigDecimal("dose_value");
                medicine.doseUnit = rs.getString("dose_unit");
                medicine.form = rs.getString("form");
                medicine.administrationRoute = rs.getString("administration_route");
                medicine.orgName = rs.getString("org_name");
                medicine.market = rs.getString("market");
                Timestamp timestamp = rs.getTimestamp("last_modified");
                if (timestamp != null) {
                    medicine.lastModified = timestamp.toLocalDateTime();
                }
                medicines.add(medicine);
            }
        }
        return medicines;
    }
    
    // ============================================
    // Normalization Methods
    // ============================================
    
    static NormalizedProduct normalize(DrugProduct product) {
        NormalizedProduct normalized = new NormalizedProduct();
        normalized.normalizedBrandName = normalizeBrandName(product.brandName);
        normalized.normalizedSubstance = normalizeSubstance(product.activeIngredient);
        normalized.normalizedStrengthMg = product.strengthMg; // Already in mg
        normalized.normalizedDosageForm = normalizeDosageForm(product.dosageForm);
        normalized.normalizedRoute = normalizeRoute(product.route);
        normalized.normalizedManufacturer = product.manufacturer;
        normalized.normalizedMarket = normalizeMarket(product.countryCode);
        normalized.originalData = product;
        normalized.source = "DB1";
        return normalized;
    }
    
    static NormalizedProduct normalize(Medicine medicine) {
        NormalizedProduct normalized = new NormalizedProduct();
        normalized.normalizedBrandName = normalizeBrandName(medicine.tradeName);
        normalized.normalizedSubstance = normalizeSubstance(medicine.substance);
        normalized.normalizedStrengthMg = convertStrengthToMg(medicine.doseValue, medicine.doseUnit);
        normalized.normalizedDosageForm = normalizeDosageForm(medicine.form);
        normalized.normalizedRoute = normalizeRoute(medicine.administrationRoute);
        normalized.normalizedManufacturer = medicine.orgName;
        normalized.normalizedMarket = normalizeMarket(medicine.market);
        normalized.originalData = medicine;
        normalized.source = "DB2";
        return normalized;
    }
    
    static String normalizeBrandName(String brandName) {
        if (brandName == null) return "";
        return brandName.trim().replaceAll("\\s+", " ");
    }
    
    static String normalizeSubstance(String substance) {
        if (substance == null) return "";
        return substance.toLowerCase().trim();
    }
    
    static Integer convertStrengthToMg(BigDecimal doseValue, String doseUnit) {
        if (doseValue == null) return 0;
        int value = doseValue.intValue();
        if (doseUnit == null) return value;
        String unit = doseUnit.toLowerCase().trim();
        if ("g".equals(unit)) {
            return value * 1000; // Convert grams to milligrams
        } else if ("mg".equals(unit)) {
            return value;
        }
        return value;
    }
    
    static String normalizeDosageForm(String form) {
        if (form == null) return "";
        String normalized = form.toLowerCase().trim();
        switch (normalized) {
            case "tab": return "tablet";
            case "cap": return "capsule";
            case "susp": return "suspension";
            default: return normalized;
        }
    }
    
    static String normalizeRoute(String route) {
        if (route == null) return "";
        String normalized = route.toLowerCase().trim();
        if ("po".equals(normalized) || "by mouth".equals(normalized) || "oral".equals(normalized)) {
            return "oral";
        }
        return normalized;
    }
    
    static String normalizeMarket(String market) {
        if (market == null) return "";
        return market.toUpperCase().trim();
    }
    
    // ============================================
    // Matching Methods
    // ============================================
    
    static double calculateSimilarity(String str1, String str2) {
        if (str1 == null || str2 == null) return 0.0;
        if (str1.equals(str2)) return 1.0;
        
        int maxLength = Math.max(str1.length(), str2.length());
        if (maxLength == 0) return 1.0;
        
        // Simple Levenshtein distance calculation
        int distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
        return 1.0 - ((double) distance / maxLength);
    }
    
    static int levenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];
        for (int i = 0; i <= s1.length(); i++) {
            for (int j = 0; j <= s2.length(); j++) {
                if (i == 0) {
                    dp[i][j] = j;
                } else if (j == 0) {
                    dp[i][j] = i;
                } else {
                    dp[i][j] = Math.min(Math.min(
                        dp[i - 1][j] + 1,
                        dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + (s1.charAt(i - 1) == s2.charAt(j - 1) ? 0 : 1));
                }
            }
        }
        return dp[s1.length()][s2.length()];
    }
    
    static double calculateCompositeSimilarity(NormalizedProduct p1, NormalizedProduct p2) {
        double brandSim = calculateSimilarity(p1.normalizedBrandName, p2.normalizedBrandName);
        double substanceSim = p1.normalizedSubstance.equals(p2.normalizedSubstance) ? 1.0 : 0.0;
        double strengthSim = Math.abs(p1.normalizedStrengthMg - p2.normalizedStrengthMg) <= 1 ? 1.0 : 0.0;
        double formSim = p1.normalizedDosageForm.equals(p2.normalizedDosageForm) ? 1.0 : 0.0;
        double routeSim = p1.normalizedRoute.equals(p2.normalizedRoute) ? 1.0 : 0.0;
        return (brandSim * 0.3 + substanceSim * 0.25 + strengthSim * 0.2 + formSim * 0.15 + routeSim * 0.1);
    }
    
    static boolean verifyMatch(NormalizedProduct p1, NormalizedProduct p2) {
        boolean substanceMatch = p1.normalizedSubstance.equals(p2.normalizedSubstance);
        boolean strengthMatch = Math.abs(p1.normalizedStrengthMg - p2.normalizedStrengthMg) <= 1;
        boolean formMatch = p1.normalizedDosageForm.equals(p2.normalizedDosageForm);
        boolean routeMatch = p1.normalizedRoute.equals(p2.normalizedRoute);
        return substanceMatch && strengthMatch && formMatch && routeMatch;
    }
    
    static MatchResult match(NormalizedProduct db1Product, NormalizedProduct db2Medicine) {
        MatchResult result = new MatchResult();
        result.normalizedDb1 = db1Product;
        result.normalizedDb2 = db2Medicine;
        
        if (db1Product.originalData instanceof DrugProduct) {
            result.db1Product = (DrugProduct) db1Product.originalData;
        }
        if (db2Medicine.originalData instanceof Medicine) {
            result.db2Medicine = (Medicine) db2Medicine.originalData;
        }
        
        // Level 1: Exact match on substance + strength + form + route
        String key1 = db1Product.getCompositeKey();
        String key2 = db2Medicine.getCompositeKey();
        
        if (key1.equals(key2)) {
            double brandSimilarity = calculateSimilarity(
                db1Product.normalizedBrandName,
                db2Medicine.normalizedBrandName
            );
            
            if (brandSimilarity >= 0.85) {
                result.matched = true;
                result.confidence = "high";
                result.method = "exact+brand";
                result.similarityScore = brandSimilarity;
                result.verified = verifyMatch(db1Product, db2Medicine);
                return result;
            } else if (brandSimilarity >= 0.70) {
                result.matched = true;
                result.confidence = "medium";
                result.method = "exact+brand_fuzzy";
                result.similarityScore = brandSimilarity;
                result.verified = verifyMatch(db1Product, db2Medicine);
                return result;
            }
        }
        
        // Level 2: Fuzzy match on full composite key
        double fullSimilarity = calculateCompositeSimilarity(db1Product, db2Medicine);
        if (fullSimilarity >= 0.90) {
            result.matched = true;
            result.confidence = "high";
            result.method = "fuzzy_composite";
            result.similarityScore = fullSimilarity;
            result.verified = verifyMatch(db1Product, db2Medicine);
            return result;
        } else if (fullSimilarity >= 0.75) {
            result.matched = true;
            result.confidence = "medium";
            result.method = "fuzzy_composite";
            result.similarityScore = fullSimilarity;
            result.verified = verifyMatch(db1Product, db2Medicine);
            return result;
        }
        
        // Level 3: Loose match (substance + brand only)
        if (db1Product.normalizedSubstance.equals(db2Medicine.normalizedSubstance)) {
            double brandSimilarity = calculateSimilarity(
                db1Product.normalizedBrandName,
                db2Medicine.normalizedBrandName
            );
            
            if (brandSimilarity >= 0.80) {
                result.matched = true;
                result.confidence = "low";
                result.method = "loose_substance_brand";
                result.similarityScore = brandSimilarity;
                result.verified = verifyMatch(db1Product, db2Medicine);
                return result;
            }
        }
        
        result.matched = false;
        return result;
    }
    
    static List<MatchResult> matchAll(List<NormalizedProduct> db1Products, List<NormalizedProduct> db2Medicines) {
        List<MatchResult> results = new ArrayList<>();
        for (NormalizedProduct db1Product : db1Products) {
            for (NormalizedProduct db2Medicine : db2Medicines) {
                MatchResult match = match(db1Product, db2Medicine);
                if (match.matched) {
                    results.add(match);
                }
            }
        }
        return results;
    }
    
    // ============================================
    // TTL Generation Methods
    // ============================================
    
    static void generateTTL(List<NormalizedProduct> db1Products,
                             List<NormalizedProduct> db2Medicines,
                             List<MatchResult> matches,
                             String outputPath) throws IOException {
        DateTimeFormatter dateFormatter = DateTimeFormatter.ISO_DATE_TIME;
        
        try (FileWriter writer = new FileWriter(outputPath)) {
            // Write prefixes
            writer.write("@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n");
            writer.write("@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n");
            writer.write("@prefix owl: <http://www.w3.org/2002/07/owl#> .\n");
            writer.write("@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n");
            writer.write("@prefix idmp: <http://purl.org/onto/idmp/> .\n");
            writer.write("@prefix pharm: <http://pharmacy.interoperability.com/> .\n");
            
            // Write DB1 products
            writer.write("\n# DB1 Products\n");
            for (NormalizedProduct product : db1Products) {
                if (product.originalData instanceof DrugProduct) {
                    DrugProduct p = (DrugProduct) product.originalData;
                    writer.write(String.format("\npharm:product_db1_%d\n", p.productId));
                    writer.write("    a idmp:PharmaceuticalProduct ;\n");
                    writer.write(String.format("    idmp:brandName \"%s\" ;\n", escapeString(p.brandName)));
                    if (p.genericName != null) {
                        writer.write(String.format("    idmp:genericName \"%s\" ;\n", escapeString(p.genericName)));
                    }
                    writer.write("    idmp:hasSubstance [\n");
                    writer.write("        a idmp:Substance ;\n");
                    writer.write(String.format("        idmp:substanceName \"%s\"\n", product.normalizedSubstance));
                    writer.write("    ] ;\n");
                    writer.write("    idmp:hasStrength [\n");
                    writer.write("        a idmp:Strength ;\n");
                    writer.write(String.format("        idmp:strengthValue %d ;\n", product.normalizedStrengthMg));
                    writer.write("        idmp:strengthUnit \"mg\"\n");
                    writer.write("    ] ;\n");
                    writer.write("    idmp:hasDosageForm [\n");
                    writer.write("        a idmp:DosageForm ;\n");
                    writer.write(String.format("        idmp:dosageFormName \"%s\"\n", product.normalizedDosageForm));
                    writer.write("    ] ;\n");
                    writer.write("    idmp:hasRouteOfAdministration [\n");
                    writer.write("        a idmp:RouteOfAdministration ;\n");
                    writer.write(String.format("        idmp:routeName \"%s\"\n", product.normalizedRoute));
                    writer.write("    ] ;\n");
                    if (p.manufacturer != null) {
                        writer.write("    idmp:manufacturedBy [\n");
                        writer.write("        a idmp:Manufacturer ;\n");
                        writer.write(String.format("        idmp:manufacturerName \"%s\"\n", escapeString(p.manufacturer)));
                        writer.write("    ] ;\n");
                    }
                    if (p.countryCode != null) {
                        writer.write("    idmp:availableIn [\n");
                        writer.write("        a idmp:Market ;\n");
                        writer.write(String.format("        idmp:marketCode \"%s\"\n", product.normalizedMarket));
                        writer.write("    ] ;\n");
                    }
                    if (p.updatedAt != null) {
                        writer.write(String.format("    idmp:lastUpdated \"%s\"^^xsd:dateTime ;\n",
                            p.updatedAt.format(dateFormatter)));
                    }
                    writer.write("    .\n");
                }
            }
            
            // Write DB2 medicines
            writer.write("\n# DB2 Medicines\n");
            for (NormalizedProduct medicine : db2Medicines) {
                if (medicine.originalData instanceof Medicine) {
                    Medicine m = (Medicine) medicine.originalData;
                    writer.write(String.format("\npharm:medicine_db2_%d\n", m.medId));
                    writer.write("    a idmp:PharmaceuticalProduct ;\n");
                    writer.write(String.format("    idmp:brandName \"%s\" ;\n", escapeString(m.tradeName)));
                    writer.write("    idmp:hasSubstance [\n");
                    writer.write("        a idmp:Substance ;\n");
                    writer.write(String.format("        idmp:substanceName \"%s\"\n", medicine.normalizedSubstance));
                    writer.write("    ] ;\n");
                    writer.write("    idmp:hasStrength [\n");
                    writer.write("        a idmp:Strength ;\n");
                    writer.write(String.format("        idmp:strengthValue %d ;\n", medicine.normalizedStrengthMg));
                    writer.write("        idmp:strengthUnit \"mg\"\n");
                    writer.write("    ] ;\n");
                    writer.write("    idmp:hasDosageForm [\n");
                    writer.write("        a idmp:DosageForm ;\n");
                    writer.write(String.format("        idmp:dosageFormName \"%s\"\n", medicine.normalizedDosageForm));
                    writer.write("    ] ;\n");
                    writer.write("    idmp:hasRouteOfAdministration [\n");
                    writer.write("        a idmp:RouteOfAdministration ;\n");
                    writer.write(String.format("        idmp:routeName \"%s\"\n", medicine.normalizedRoute));
                    writer.write("    ] ;\n");
                    if (m.orgName != null) {
                        writer.write("    idmp:manufacturedBy [\n");
                        writer.write("        a idmp:Manufacturer ;\n");
                        writer.write(String.format("        idmp:manufacturerName \"%s\"\n", escapeString(m.orgName)));
                        writer.write("    ] ;\n");
                    }
                    if (m.market != null) {
                        writer.write("    idmp:availableIn [\n");
                        writer.write("        a idmp:Market ;\n");
                        writer.write(String.format("        idmp:marketCode \"%s\"\n", medicine.normalizedMarket));
                        writer.write("    ] ;\n");
                    }
                    if (m.lastModified != null) {
                        writer.write(String.format("    idmp:lastUpdated \"%s\"^^xsd:dateTime ;\n",
                            m.lastModified.format(dateFormatter)));
                    }
                    writer.write("    .\n");
                }
            }
            
            // Write match relationships
            writer.write("\n# Matches\n");
            for (MatchResult match : matches) {
                if (match.matched && match.db1Product != null && match.db2Medicine != null) {
                    writer.write(String.format("\npharm:match_%d_%d\n",
                        match.db1Product.productId, match.db2Medicine.medId));
                    writer.write(String.format("    owl:sameAs pharm:product_db1_%d ;\n", match.db1Product.productId));
                    writer.write(String.format("    owl:sameAs pharm:medicine_db2_%d ;\n", match.db2Medicine.medId));
                    writer.write(String.format("    rdfs:comment \"Match confidence: %s, method: %s, similarity: %.2f\" ;\n",
                        match.confidence, match.method, match.similarityScore));
                    writer.write("    .\n");
                }
            }
        }
    }
    
    static String escapeString(String str) {
        if (str == null) return "";
        return str.replace("\"", "\\\"").replace("\n", "\\n");
    }
    
    // ============================================
    // YAML Generation Methods
    // ============================================
    
    static void generateYAML(List<MatchResult> matches, String outputPath) throws IOException {
        Map<String, Object> yamlData = new LinkedHashMap<>();
        yamlData.put("description", "Generated mapping file from DB1 and DB2 matching results");
        yamlData.put("generated_at", new java.util.Date().toString());
        yamlData.put("total_matches", matches.size());
        
        // Statistics
        Map<String, Object> statistics = new LinkedHashMap<>();
        long highConfidence = matches.stream().filter(m -> "high".equals(m.confidence)).count();
        long mediumConfidence = matches.stream().filter(m -> "medium".equals(m.confidence)).count();
        long lowConfidence = matches.stream().filter(m -> "low".equals(m.confidence)).count();
        long verified = matches.stream().filter(m -> m.verified).count();
        
        statistics.put("high_confidence", highConfidence);
        statistics.put("medium_confidence", mediumConfidence);
        statistics.put("low_confidence", lowConfidence);
        statistics.put("verified_matches", verified);
        statistics.put("verification_rate", verified > 0 ? String.format("%.2f%%", (verified * 100.0 / matches.size())) : "0%");
        
        double avgSimilarity = matches.stream()
            .mapToDouble(m -> m.similarityScore)
            .average()
            .orElse(0.0);
        statistics.put("average_similarity", String.format("%.2f", avgSimilarity));
        
        yamlData.put("statistics", statistics);
        
        // Matches
        List<Map<String, Object>> matchList = new ArrayList<>();
        for (MatchResult match : matches) {
            Map<String, Object> matchMap = new LinkedHashMap<>();
            
            if (match.db1Product != null) {
                Map<String, Object> db1 = new LinkedHashMap<>();
                db1.put("product_id", match.db1Product.productId);
                db1.put("brand_name", match.db1Product.brandName);
                db1.put("active_ingredient", match.db1Product.activeIngredient);
                db1.put("strength_mg", match.db1Product.strengthMg);
                db1.put("dosage_form", match.db1Product.dosageForm);
                db1.put("route", match.db1Product.route);
                matchMap.put("db1", db1);
            }
            
            if (match.db2Medicine != null) {
                Map<String, Object> db2 = new LinkedHashMap<>();
                db2.put("med_id", match.db2Medicine.medId);
                db2.put("trade_name", match.db2Medicine.tradeName);
                db2.put("substance", match.db2Medicine.substance);
                db2.put("dose_value", match.db2Medicine.doseValue);
                db2.put("dose_unit", match.db2Medicine.doseUnit);
                db2.put("form", match.db2Medicine.form);
                db2.put("administration_route", match.db2Medicine.administrationRoute);
                matchMap.put("db2", db2);
            }
            
            if (match.normalizedDb1 != null) {
                Map<String, Object> normalized = new LinkedHashMap<>();
                normalized.put("brand_name", match.normalizedDb1.normalizedBrandName);
                normalized.put("substance", match.normalizedDb1.normalizedSubstance);
                normalized.put("strength_mg", match.normalizedDb1.normalizedStrengthMg);
                normalized.put("dosage_form", match.normalizedDb1.normalizedDosageForm);
                normalized.put("route", match.normalizedDb1.normalizedRoute);
                matchMap.put("normalized", normalized);
            }
            
            Map<String, Object> metadata = new LinkedHashMap<>();
            metadata.put("matched", match.matched);
            metadata.put("confidence", match.confidence);
            metadata.put("method", match.method);
            metadata.put("similarity_score", String.format("%.2f", match.similarityScore));
            metadata.put("verified", match.verified);
            matchMap.put("match_metadata", metadata);
            
            matchList.add(matchMap);
        }
        
        yamlData.put("matches", matchList);
        
        // Write YAML
        DumperOptions options = new DumperOptions();
        options.setIndent(2);
        options.setPrettyFlow(true);
        options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
        
        Yaml yaml = new Yaml(options);
        try (FileWriter writer = new FileWriter(outputPath)) {
            yaml.dump(yamlData, writer);
        }
    }
    
    // ============================================
    // Main Method
    // ============================================
    
    public static void main(String[] args) {
        System.out.println("=== Pharmacy Interoperability Mapping ===");
        System.out.println();
        
        try {
            // Step 1: Prepare data
            System.out.println("Step 1: Preparing sample data (no real DB connection)...");
            List<DrugProduct> db1Products = buildSampleDB1Products();
            List<Medicine> db2Medicines = buildSampleDB2Medicines();
            System.out.println("Prepared " + db1Products.size() + " sample products from DB1");
            System.out.println("Prepared " + db2Medicines.size() + " sample medicines from DB2");
            System.out.println();
            
            // Step 3: Normalize data
            System.out.println("Step 3: Normalizing data...");
            List<NormalizedProduct> normalizedDb1 = new ArrayList<>();
            for (DrugProduct product : db1Products) {
                normalizedDb1.add(normalize(product));
            }
            List<NormalizedProduct> normalizedDb2 = new ArrayList<>();
            for (Medicine medicine : db2Medicines) {
                normalizedDb2.add(normalize(medicine));
            }
            System.out.println("Normalized " + normalizedDb1.size() + " DB1 products");
            System.out.println("Normalized " + normalizedDb2.size() + " DB2 medicines");
            System.out.println();
            
            // Step 4: Match records
            System.out.println("Step 4: Matching records...");
            List<MatchResult> matches = matchAll(normalizedDb1, normalizedDb2);
            long highConfidence = matches.stream().filter(m -> "high".equals(m.confidence)).count();
            long mediumConfidence = matches.stream().filter(m -> "medium".equals(m.confidence)).count();
            long lowConfidence = matches.stream().filter(m -> "low".equals(m.confidence)).count();
            long verified = matches.stream().filter(m -> m.verified).count();
            System.out.println("Found " + matches.size() + " matches");
            System.out.println("  - High confidence: " + highConfidence);
            System.out.println("  - Medium confidence: " + mediumConfidence);
            System.out.println("  - Low confidence: " + lowConfidence);
            System.out.println("  - Verified: " + verified);
            System.out.println();
            
            // Step 5: Generate TTL file
            System.out.println("Step 5: Generating TTL file...");
            generateTTL(normalizedDb1, normalizedDb2, matches, OUTPUT_TTL);
            System.out.println("Generated: " + OUTPUT_TTL);
            System.out.println();
            
            // Step 6: Generate YAML file
            System.out.println("Step 6: Generating YAML file...");
            generateYAML(matches, OUTPUT_YAML);
            System.out.println("Generated: " + OUTPUT_YAML);
            System.out.println();
            
            System.out.println("=== Mapping Complete ===");
            System.out.println("Output files:");
            System.out.println("  - " + OUTPUT_TTL);
            System.out.println("  - " + OUTPUT_YAML);
            
        } catch (Exception e) {
            System.err.println("ERROR: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // ============================================
    // Sample Data Builders (no real DB required)
    // ============================================

    private static List<DrugProduct> buildSampleDB1Products() {
        List<DrugProduct> list = new ArrayList<>();

        // Tylenol 500 mg tablet oral US
        DrugProduct p1 = new DrugProduct();
        p1.productId = 1;
        p1.brandName = "Tylenol";
        p1.genericName = "acetaminophen";
        p1.activeIngredient = "acetaminophen";
        p1.strengthMg = 500;
        p1.dosageForm = "tablet";
        p1.route = "oral";
        p1.manufacturer = "J&J";
        p1.countryCode = "US";
        p1.updatedAt = LocalDateTime.now();
        list.add(p1);

        // Panadol 500 mg tablet oral GB
        DrugProduct p2 = new DrugProduct();
        p2.productId = 2;
        p2.brandName = "Panadol";
        p2.genericName = "paracetamol";
        p2.activeIngredient = "paracetamol";
        p2.strengthMg = 500;
        p2.dosageForm = "tablet";
        p2.route = "oral";
        p2.manufacturer = "GSK";
        p2.countryCode = "GB";
        p2.updatedAt = LocalDateTime.now();
        list.add(p2);

        // Advil 200 mg tablet oral US (ibuprofen)
        DrugProduct p3 = new DrugProduct();
        p3.productId = 3;
        p3.brandName = "Advil";
        p3.genericName = "ibuprofen";
        p3.activeIngredient = "ibuprofen";
        p3.strengthMg = 200;
        p3.dosageForm = "tablet";
        p3.route = "oral";
        p3.manufacturer = "Pfizer";
        p3.countryCode = "US";
        p3.updatedAt = LocalDateTime.now();
        list.add(p3);

        return list;
    }

    private static List<Medicine> buildSampleDB2Medicines() {
        List<Medicine> list = new ArrayList<>();

        // Tylenol 0.5 g tab PO US (Should match with p1)
        Medicine m1 = new Medicine();
        m1.medId = 1;
        m1.tradeName = "Tylenol";
        m1.substance = "acetaminophen";
        m1.doseValue = new BigDecimal("0.500");
        m1.doseUnit = "g";  // normalize to 500 mg
        m1.form = "tab";    // normalize to tablet
        m1.administrationRoute = "PO"; // normalize to oral
        m1.orgName = "J&J";
        m1.market = "US";
        m1.lastModified = LocalDateTime.now();
        list.add(m1);

        // Panadol 500 mg tab by mouth GB (Should match with p2)
        Medicine m2 = new Medicine();
        m2.medId = 2;
        m2.tradeName = "Panadol";
        m2.substance = "paracetamol";
        m2.doseValue = new BigDecimal("500");
        m2.doseUnit = "mg";
        m2.form = "tab";
        m2.administrationRoute = "by mouth";
        m2.orgName = "GSK";
        m2.market = "GB";
        m2.lastModified = LocalDateTime.now();
        list.add(m2);

        // Advil 200 mg tab PO US (Should match with p3)
        Medicine m3 = new Medicine();
        m3.medId = 3;
        m3.tradeName = "Advil";
        m3.substance = "ibuprofen";
        m3.doseValue = new BigDecimal("200");
        m3.doseUnit = "mg";
        m3.form = "tab";
        m3.administrationRoute = "PO";
        m3.orgName = "Pfizer";
        m3.market = "US";
        m3.lastModified = LocalDateTime.now();
        list.add(m3);

        return list;
    }
}
