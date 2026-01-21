package com.pharmacy.interoperability.service;

import com.pharmacy.interoperability.model.UnifiedDrug;
import org.apache.jena.rdf.model.*;
import org.apache.jena.util.FileManager;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

@Component
public class DrugMapper {

    private Map<String, String> db1Cols;
    private Map<String, String> db2Cols;
    private Map<String, String> ontologyLookup; // Brand (lowercase) -> Ontology URI

    private static final String NS_IDMP = "http://purl.org/onto/idmp/";

    public DrugMapper() {
        this.db1Cols = new HashMap<>();
        this.db2Cols = new HashMap<>();
        this.ontologyLookup = new HashMap<>();
        setDefaultColumns();
        loadRdfModel();
    }

    private void setDefaultColumns() {
        this.db1Cols = Map.of(
            "brand", "brand_name", 
            "substance", "active_ingredient", 
            "strength", "strength_mg", 
            "form", "dosage_form", 
            "route", "route", 
            "man", "manufacturer", 
            "loc", "country_code", 
            "id", "product_id"
        );
        this.db2Cols = Map.of(
            "brand", "trade_name", 
            "substance", "substance", 
            "strength_val", "dose_value",
            "strength_unit", "dose_unit", 
            "form", "form", 
            "route", "administration_route", 
            "man", "org_name",
            "loc", "market", 
            "id", "med_id"
        );
    }

    private void loadRdfModel() {
        try (InputStream inputStream = getClass().getResourceAsStream("/semantic_output.rdf")) {
            if (inputStream == null) {
                System.err.println("Could not find semantic_output.rdf");
                return;
            }

            Model model = ModelFactory.createDefaultModel();
            model.read(inputStream, null);

            Property pBrand = model.createProperty(NS_IDMP + "brandName");
            Property pSubstance = model.createProperty(NS_IDMP + "hasSubstance");

            // Iterate over all resources that have a brand name
            ResIterator iter = model.listResourcesWithProperty(pBrand);
            while (iter.hasNext()) {
                Resource res = iter.nextResource();
                
                // Get Brand Name
                String brand = "";
                if (res.hasProperty(pBrand)) {
                    brand = res.getProperty(pBrand).getString();
                }

                // Get Substance URI
                String uri = "";
                if (res.hasProperty(pSubstance)) {
                    Resource subRes = res.getProperty(pSubstance).getResource();
                    uri = subRes.getURI();
                }

                if (!brand.isEmpty() && !uri.isEmpty()) {
                    ontologyLookup.put(brand.toLowerCase().trim(), uri);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Error loading RDF model: " + e.getMessage());
        }
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
        if (brand != null && ontologyLookup.containsKey(brand.toLowerCase().trim())) {
            drug.setOntologyUri(ontologyLookup.get(brand.toLowerCase().trim()));
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
        if (brand != null && ontologyLookup.containsKey(brand.toLowerCase().trim())) {
            drug.setOntologyUri(ontologyLookup.get(brand.toLowerCase().trim()));
        }

        return drug;
    }
}
