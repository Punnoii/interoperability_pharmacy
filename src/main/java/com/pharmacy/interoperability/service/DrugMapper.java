package com.pharmacy.interoperability.service;

import com.pharmacy.interoperability.model.UnifiedDrug;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class DrugMapper {

    private Map<String, String> db1Cols;
    private Map<String, String> db2Cols;
    private Map<String, String> ontologyLookup; // Brand (lowercase) -> Ontology URI

    public DrugMapper() {
        this.db1Cols = new HashMap<>(); // Initialize to avoid NPE fallback
        this.db2Cols = new HashMap<>();
        this.ontologyLookup = new HashMap<>();
        parseMappingFile();
    }

    @SuppressWarnings("unchecked")
    private void parseMappingFile() {
        try (InputStream inputStream = getClass().getResourceAsStream("/mapping.yaml")) {
            Yaml yaml = new Yaml();
            Map<String, Object> root = yaml.load(inputStream);

            // adapt to "matches" list format
            List<Map<String, Object>> matches = (List<Map<String, Object>>) root.get("matches");
            if (matches != null && !matches.isEmpty()) {
                // Infer columns from the first match
                Map<String, Object> firstMatch = matches.get(0);
                Map<String, Object> db1Sample = (Map<String, Object>) firstMatch.get("db1"); // Note: YAML currently
                                                                                             // uses flat keys
                                                                                             // "db1_brand" NOT nested
                                                                                             // "db1: {...}"

                // FIX: User's latest YAML flat format is:
                // - method: ...
                // db1_brand: Tylenol
                // substance_iso_uri: ...

                // Let's adapt to this flat structure if nested structure is missing
                if (firstMatch.containsKey("db1_brand")) {
                    // Flat structure detected
                    // Hardcode standard columns since we can't infer from flat matches easily, OR
                    // just use standard defaults
                    // For the Ontology Linking task, the most important part is reading the URI

                    for (Map<String, Object> match : matches) {
                        String uri = (String) match.get("substance_iso_uri");
                        String db1Brand = (String) match.get("db1_brand");
                        String db2Brand = (String) match.get("db2_brand");

                        if (uri != null) {
                            if (db1Brand != null)
                                ontologyLookup.put(db1Brand.toLowerCase(), uri);
                            if (db2Brand != null)
                                ontologyLookup.put(db2Brand.toLowerCase(), uri);
                        }
                    }

                    // Fallback to defaults (or assume standard naming since schema inference is
                    // hard on flat structure)
                    this.db1Cols = Map.of("brand", "brand_name", "substance", "active_ingredient", "strength",
                            "strength_mg", "form", "dosage_form", "route", "route", "man", "manufacturer", "loc",
                            "country_code", "id", "product_id");
                    this.db2Cols = Map.of("brand", "trade_name", "substance", "substance", "strength_val", "dose_value",
                            "strength_unit", "dose_unit", "form", "form", "route", "administration_route", "man",
                            "org_name", "loc", "market", "id", "med_id");

                } else {
                    // Nested structure (previous version), use previous logic
                    Map<String, Object> db1 = (Map<String, Object>) firstMatch.get("db1");
                    Map<String, Object> db2 = (Map<String, Object>) firstMatch.get("db2");
                    this.db1Cols = inferColumns(db1, "db1");
                    this.db2Cols = inferColumns(db2, "db2");
                }

            } else {
                // Fallback defaults
                this.db1Cols = Map.of("brand", "brand_name", "substance", "active_ingredient", "strength",
                        "strength_mg", "form", "dosage_form", "route", "route", "man", "manufacturer", "loc",
                        "country_code", "id", "product_id");
                this.db2Cols = Map.of("brand", "trade_name", "substance", "substance", "strength_val", "dose_value",
                        "strength_unit", "dose_unit", "form", "form", "route", "administration_route", "man",
                        "org_name", "loc", "market", "id", "med_id");
            }
        } catch (Exception e) {
            e.printStackTrace();
            // Fallback defaults if file fails
            this.db1Cols = Map.of("brand", "brand_name", "substance", "active_ingredient", "strength", "strength_mg",
                    "form", "dosage_form", "route", "route", "man", "manufacturer", "loc", "country_code", "id",
                    "product_id");
            this.db2Cols = Map.of("brand", "trade_name", "substance", "substance", "strength_val", "dose_value",
                    "strength_unit", "dose_unit", "form", "form", "route", "administration_route", "man", "org_name",
                    "loc", "market", "id", "med_id");
        }
    }

    // Simple heuristic to find column names based on available keys
    private Map<String, String> inferColumns(Map<String, Object> sample, String dbName) {
        if (sample == null)
            return new HashMap<>();
        // We need to map: brand, substance, strength, form, route, man, loc, id
        // We look for keys in 'sample' that contain keywords
        return Map.of(
                "id", findKey(sample, "id", "code"),
                "brand", findKey(sample, "brand", "trade", "name"),
                "substance", findKey(sample, "substance", "ingredient", "generic"),
                "strength", dbName.equals("db1") ? findKey(sample, "strength", "mg") : "", // DB2 handled specially
                "strength_val", dbName.equals("db2") ? findKey(sample, "value", "val") : "",
                "strength_unit", dbName.equals("db2") ? findKey(sample, "unit") : "",
                "form", findKey(sample, "form", "dosage"),
                "route", findKey(sample, "route", "admin"),
                "man", findKey(sample, "org", "manufacturer", "manuf"), // Manuf might not be in sample, handle null
                "loc", findKey(sample, "market", "country", "loc"));
    }

    private String findKey(Map<String, Object> sample, String... keywords) {
        for (String k : sample.keySet()) {
            String lower = k.toLowerCase();
            for (String kw : keywords) {
                if (lower.contains(kw))
                    return k;
            }
        }
        return ""; // Not found
    }

    public UnifiedDrug mapDb1(ResultSet rs, int rowNum) throws SQLException {
        UnifiedDrug drug = new UnifiedDrug();
        drug.setSource("db1");

        String idCol = db1Cols.getOrDefault("id", "product_id");
        if (idCol != null && !idCol.isEmpty())
            drug.setOriginalId(String.valueOf(rs.getObject(idCol)));

        String brand = rs.getString(db1Cols.getOrDefault("brand", "brand_name"));
        drug.setBrandName(brand);
        drug.setActiveIngredient(rs.getString(db1Cols.getOrDefault("substance", "active_ingredient")));

        String strCol = db1Cols.get("strength");
        if (strCol != null && !strCol.isEmpty())
            drug.setStrengthMg(rs.getDouble(strCol));

        drug.setDosageForm(rs.getString(db1Cols.getOrDefault("form", "dosage_form")));
        drug.setRoute(rs.getString(db1Cols.getOrDefault("route", "route")));

        String manCol = db1Cols.get("man");
        if (manCol != null && !manCol.isEmpty())
            drug.setManufacturer(rs.getString(manCol));

        String locCol = db1Cols.get("loc");
        if (locCol != null && !locCol.isEmpty())
            drug.setCountry(rs.getString(locCol));

        // Ontology Lookup
        if (brand != null && ontologyLookup.containsKey(brand.toLowerCase())) {
            drug.setOntologyUri(ontologyLookup.get(brand.toLowerCase()));
        }

        return drug;
    }

    public UnifiedDrug mapDb2(ResultSet rs, int rowNum) throws SQLException {
        UnifiedDrug drug = new UnifiedDrug();
        drug.setSource("db2");

        String idCol = db2Cols.getOrDefault("id", "med_id");
        if (idCol != null && !idCol.isEmpty())
            drug.setOriginalId(String.valueOf(rs.getObject(idCol)));

        String brand = rs.getString(db2Cols.getOrDefault("brand", "trade_name"));
        drug.setBrandName(brand);
        drug.setActiveIngredient(rs.getString(db2Cols.getOrDefault("substance", "substance")));

        // DB2 Logic: Value + Unit
        String valCol = db2Cols.getOrDefault("strength_val", "dose_value");
        String unitCol = db2Cols.getOrDefault("strength_unit", "dose_unit");

        double val = 0;
        if (valCol != null && !valCol.isEmpty())
            val = rs.getDouble(valCol);

        String unit = "mg";
        if (unitCol != null && !unitCol.isEmpty())
            unit = rs.getString(unitCol);

        if ("g".equalsIgnoreCase(unit)) {
            drug.setStrengthMg(val * 1000);
        } else {
            drug.setStrengthMg(val);
        }

        drug.setDosageForm(rs.getString(db2Cols.getOrDefault("form", "form")));

        String routeCol = db2Cols.getOrDefault("route", "administration_route");
        String route = (routeCol != null && !routeCol.isEmpty()) ? rs.getString(routeCol) : "";

        if ("PO".equalsIgnoreCase(route) || "by mouth".equalsIgnoreCase(route)) {
            drug.setRoute("oral");
        } else {
            drug.setRoute(route);
        }

        String manCol = db2Cols.get("man");
        if (manCol != null && !manCol.isEmpty()) {
            try {
                drug.setManufacturer(rs.getString(manCol));
            } catch (Exception e) {
            }
        }

        String locCol = db2Cols.get("loc");
        if (locCol != null && !locCol.isEmpty()) {
            try {
                drug.setCountry(rs.getString(locCol));
            } catch (Exception e) {
            }
        }

        // Ontology Lookup
        if (brand != null && ontologyLookup.containsKey(brand.toLowerCase())) {
            drug.setOntologyUri(ontologyLookup.get(brand.toLowerCase()));
        }

        return drug;
    }
}
