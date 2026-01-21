package com.pharmacy.interoperability.service;

import com.pharmacy.interoperability.model.UnifiedDrug;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class SearchService {

    private final JdbcTemplate db1JdbcTemplate;
    private final JdbcTemplate db2JdbcTemplate;
    private final DrugMapper drugMapper;

    public SearchService(@Qualifier("db1JdbcTemplate") JdbcTemplate db1JdbcTemplate,
            @Qualifier("db2JdbcTemplate") JdbcTemplate db2JdbcTemplate,
            DrugMapper drugMapper) {
        this.db1JdbcTemplate = db1JdbcTemplate;
        this.db2JdbcTemplate = db2JdbcTemplate;
        this.drugMapper = drugMapper;
    }

    public List<UnifiedDrug> search(String term) {
        List<UnifiedDrug> results = new ArrayList<>();
        String likeTerm = "%" + term.toLowerCase() + "%";

        // Query DB1
        // DB1 uses brand_name, generic_name, active_ingredient
        String sql1 = "SELECT * FROM drug_product WHERE LOWER(brand_name) LIKE ? OR LOWER(generic_name) LIKE ? OR LOWER(active_ingredient) LIKE ?";
        results.addAll(db1JdbcTemplate.query(sql1, drugMapper::mapDb1, likeTerm, likeTerm, likeTerm));

        // Query DB2
        // DB2 uses trade_name, substance
        String sql2 = "SELECT * FROM medicine WHERE LOWER(trade_name) LIKE ? OR LOWER(substance) LIKE ?";
        results.addAll(db2JdbcTemplate.query(sql2, drugMapper::mapDb2, likeTerm, likeTerm));

        return results;
    }
}
