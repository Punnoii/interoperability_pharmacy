package com.pharmacy.interoperability.service;

import com.pharmacy.interoperability.model.UnifiedDrug;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;

@Component
public class DrugMapper {

    public UnifiedDrug mapDb1(ResultSet rs, int rowNum) throws SQLException {
        UnifiedDrug drug = new UnifiedDrug();
        drug.setSource("db1");
        drug.setOriginalId(String.valueOf(rs.getInt("product_id")));
        drug.setBrandName(rs.getString("brand_name"));
        drug.setActiveIngredient(rs.getString("active_ingredient"));
        drug.setStrengthMg(rs.getDouble("strength_mg"));
        drug.setDosageForm(rs.getString("dosage_form"));
        drug.setRoute(rs.getString("route"));
        drug.setManufacturer(rs.getString("manufacturer"));
        drug.setCountry(rs.getString("country_code"));
        return drug;
    }

    public UnifiedDrug mapDb2(ResultSet rs, int rowNum) throws SQLException {
        UnifiedDrug drug = new UnifiedDrug();
        drug.setSource("db2");
        drug.setOriginalId(String.valueOf(rs.getInt("med_id")));
        drug.setBrandName(rs.getString("trade_name"));
        drug.setActiveIngredient(rs.getString("substance"));

        // Normalize Strength
        double val = rs.getDouble("dose_value");
        String unit = rs.getString("dose_unit");
        if ("g".equalsIgnoreCase(unit)) {
            drug.setStrengthMg(val * 1000);
        } else {
            drug.setStrengthMg(val);
        }

        drug.setDosageForm(rs.getString("form"));

        // Normalize Route
        String route = rs.getString("administration_route");
        if ("PO".equalsIgnoreCase(route) || "by mouth".equalsIgnoreCase(route)) {
            drug.setRoute("oral");
        } else {
            drug.setRoute(route);
        }

        drug.setManufacturer(rs.getString("org_name"));
        drug.setCountry(rs.getString("market"));
        return drug;
    }
}
