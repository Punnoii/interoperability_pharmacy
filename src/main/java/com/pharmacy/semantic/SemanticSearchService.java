package com.pharmacy.semantic;

import org.apache.jena.query.*;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.rdf.model.RDFNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SemanticSearchService {
    private static final Logger LOGGER = LoggerFactory.getLogger(SemanticSearchService.class);
    private final Model model = ModelFactory.createDefaultModel();

    @EventListener(ApplicationReadyEvent.class)
    public void loadRdfOnStartup() {
        LOGGER.info("SemanticSearchService: loading RDF files into memory...");
        // 1. แก้ไข: ลบ .yaml ออก เพราะ Jena อ่านไม่ได้
        String[] candidateFiles = new String[]{"semantic_output.rdf", "semantic_output.ttl"}; 
        
        for (String path : candidateFiles) {
            try {
                File f = new File(path);
                if (f.exists() && f.isFile()) {
                    try (InputStream in = new FileInputStream(f)) {
                        // Jena ฉลาดพอที่จะเดานามสกุลไฟล์เองได้ ใส่ null ไปเลยก็ได้ครับ
                        model.read(in, null); 
                        LOGGER.info("Loaded RDF file: {}", path);
                    }
                }
            } catch (Exception e) {
                LOGGER.warn("Failed to load RDF file {}: {}", path, e.getMessage());
            }
        }
        LOGGER.info("Model size (triples): {}", model.size());
    }

    public List<Map<String, String>> search(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return new ArrayList<>();
        }
        List<Map<String, String>> results = new ArrayList<>();
        
        // 2. แก้ไข: เปลี่ยน SPARQL ให้ดึงข้อมูลแบบ IDMP (ชื่อยา + ลิงก์)
        String queryString = 
            "PREFIX idmp: <http://purl.org/onto/idmp/> " +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "SELECT ?product ?brand ?sameAsProduct " +
            "WHERE { " +
            "  ?product a <http://purl.org/onto/idmp/PharmaceuticalProduct> . " +
            "  ?product idmp:brandName ?brand . " +
            "  OPTIONAL { ?product owl:sameAs ?sameAsProduct } . " +
            "  FILTER regex(?brand, ?kw, \"i\") " + 
            "} LIMIT 50";

        ParameterizedSparqlString pss = new ParameterizedSparqlString();
        pss.setCommandText(queryString);
        pss.setLiteral("kw", keyword);

        try (QueryExecution qexec = QueryExecutionFactory.create(pss.asQuery(), model)) {
            ResultSet rs = qexec.execSelect();
            while (rs.hasNext()) {
                QuerySolution qs = rs.next();
                Map<String, String> row = new HashMap<>();
                
                // ดึงข้อมูลออกมาใส่ Map ให้สวยงาม
                row.put("uri", qs.getResource("product").toString());
                row.put("brandName", qs.getLiteral("brand").getString());
                
                if (qs.contains("sameAsProduct")) {
                    row.put("linkedTo", qs.getResource("sameAsProduct").toString());
                }
                
                results.add(row);
            }
        } catch (Exception ex) {
            LOGGER.error("SPARQL search failed: {}", ex.getMessage(), ex);
        }
        return results;
    }

    public long countTriples() {
        return model.size();
    }
}