package com.pharmacy.semantic;

import com.pharmacy.interoperability.model.UnifiedDrug;
import org.apache.jena.query.*;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;
import org.apache.jena.vocabulary.OWL;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Service
public class SemanticSearchService {
    private static final Logger LOGGER = LoggerFactory.getLogger(SemanticSearchService.class);
    
    // Jena Model (Memory)
    private final Model model = ModelFactory.createDefaultModel();
    
    // เครื่องมือยิง SQL สำหรับทั้งสองฐานข้อมูล
    private final JdbcTemplate db1JdbcTemplate;
    private final JdbcTemplate db2JdbcTemplate;

    // Namespaces
    private static final String IDMP_NS = "http://purl.org/onto/idmp/";
    private static final String ISO_NS = "http://purl.org/onto/idmp/iso11238/";
    private static final String PHARM_NS = "http://pharmacy.interoperability.com/";

    // --- Helpers ---
    private String normalizeBrand(String raw) {
        if (raw == null) return "";
        String s = raw.trim().replaceAll("\\s+", " ");
        String[] parts = s.split(" ");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            String p = parts[i];
            if (p.length() == 0) continue;
            sb.append(p.substring(0,1).toUpperCase()).append(p.substring(1).toLowerCase());
            if (i < parts.length - 1) sb.append(' ');
        }
        return sb.toString();
    }

    // Inject specific JdbcTemplate beans เข้ามา
    public SemanticSearchService(@Qualifier("db1JdbcTemplate") JdbcTemplate db1JdbcTemplate,
                                 @Qualifier("db2JdbcTemplate") JdbcTemplate db2JdbcTemplate) {
        this.db1JdbcTemplate = db1JdbcTemplate;
        this.db2JdbcTemplate = db2JdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void init() {
        LOGGER.info(" Starting Data Bridge: SQL -> RDF conversion...");
        // 1. ล้าง Model เก่า (ถ้ามี)
        model.removeAll();
        try {
        InputStream in = this.getClass().getClassLoader().getResourceAsStream("semantic_output.rdf");
        if (in != null) model.read(in, null);
        } catch (Exception e) { LOGGER.warn("RDF file not loaded"); }

        // 2. ตั้งค่า Prefix ให้ Model (เพื่อให้ Export สวยงาม)
        model.setNsPrefix("idmp", IDMP_NS);
        model.setNsPrefix("iso11238", ISO_NS);
        model.setNsPrefix("pharm", PHARM_NS);
        model.setNsPrefix("owl", OWL.getURI());

        // 3. แปลงข้อมูลจาก DB1 (drug_product)
        bridgeDb1Data();

        // 4. แปลงข้อมูลจาก DB2 (medicine)
        bridgeDb2Data();

        LOGGER.info("✅ Data Bridge Complete! Total Triples in Memory: {}", model.size());
    }

    // --- ส่วนสะพาน: แปลง DB1 ---
    private void bridgeDb1Data() {
        String sql = "SELECT * FROM drug_product";
        
        db1JdbcTemplate.query(sql, (rs) -> {
            // สร้าง Resource URI: pharm:product_db1_{id}
            String uri = PHARM_NS + "product_db1_" + rs.getInt("product_id");
            Resource drug = model.createResource(uri);

            // Define Properties
            Property pBrand = model.createProperty(IDMP_NS + "brandName");
            Property pSubstance = model.createProperty(IDMP_NS + "hasSubstance");
            Property pDosage = model.createProperty(IDMP_NS + "hasDosageForm");
            Property pStrength = model.createProperty(IDMP_NS + "hasStrength");
            Property pManu = model.createProperty(IDMP_NS + "manufacturedBy");
            Property pMarket = model.createProperty(IDMP_NS + "availableIn");

            // Add Properties (Triples)
            drug.addProperty(RDF.type, model.createResource(IDMP_NS + "PharmaceuticalProduct"));
            drug.addProperty(pBrand, normalizeBrand(rs.getString("brand_name")));
            
            // Substance (Link ไปหา Resource อื่น)
            String substName = rs.getString("active_ingredient");
            // แปลงชื่อให้เป็น Capitalize (เช่น amoxicillin -> Amoxicillin) เพื่อความสวยงาม
            String capSubst = substName.substring(0, 1).toUpperCase() + substName.substring(1);
            drug.addProperty(pSubstance, model.createResource(ISO_NS + "Substance_" + capSubst));

            // Dosage Form (Complex Object)
            Resource dosageNode = model.createResource(); // Blank Node
            dosageNode.addProperty(RDF.type, model.createResource(IDMP_NS + "DosageForm"));
            dosageNode.addProperty(model.createProperty(IDMP_NS + "dosageFormName"), rs.getString("dosage_form"));
            drug.addProperty(pDosage, dosageNode);

            // Strength (Complex Object)
            Resource strNode = model.createResource();
            strNode.addProperty(RDF.type, model.createResource(IDMP_NS + "Strength"));
            strNode.addLiteral(model.createProperty(IDMP_NS + "strengthValue"), rs.getDouble("strength_mg"));
            strNode.addProperty(model.createProperty(IDMP_NS + "strengthUnit"), "mg");
            drug.addProperty(pStrength, strNode);

            // Metadata
            if (rs.getString("manufacturer") != null) {
                Resource manuNode = model.createResource();
                manuNode.addProperty(model.createProperty(IDMP_NS + "manufacturerName"), rs.getString("manufacturer"));
                drug.addProperty(pManu, manuNode);
            }
            if (rs.getString("country_code") != null) {
                Resource marketNode = model.createResource();
                marketNode.addProperty(model.createProperty(IDMP_NS + "marketCode"), rs.getString("country_code"));
                drug.addProperty(pMarket, marketNode);
            }
        });
        LOGGER.info("   -> Loaded data from DB1 (drug_product)");
    }

    // --- ส่วนสะพาน: แปลง DB2 ---
    private void bridgeDb2Data() {
        String sql = "SELECT * FROM medicine";

        db2JdbcTemplate.query(sql, (rs) -> {
            // สร้าง Resource URI: pharm:medicine_db2_{id}
            String uri = PHARM_NS + "medicine_db2_" + rs.getInt("med_id");
            Resource drug = model.createResource(uri);

            // Define Properties
            Property pBrand = model.createProperty(IDMP_NS + "brandName");
            Property pSubstance = model.createProperty(IDMP_NS + "hasSubstance");
            Property pDosage = model.createProperty(IDMP_NS + "hasDosageForm");
            Property pStrength = model.createProperty(IDMP_NS + "hasStrength");
            Property pManu = model.createProperty(IDMP_NS + "manufacturedBy");
            Property pMarket = model.createProperty(IDMP_NS + "availableIn");

            drug.addProperty(RDF.type, model.createResource(IDMP_NS + "PharmaceuticalProduct"));
            drug.addProperty(pBrand, normalizeBrand(rs.getString("trade_name"))); // DB2 ใช้ trade_name

            // Substance
            String substName = rs.getString("substance");
            String capSubst = substName.substring(0, 1).toUpperCase() + substName.substring(1);
            drug.addProperty(pSubstance, model.createResource(ISO_NS + "Substance_" + capSubst));

            // Dosage Form
            Resource dosageNode = model.createResource();
            dosageNode.addProperty(RDF.type, model.createResource(IDMP_NS + "DosageForm"));
            dosageNode.addProperty(model.createProperty(IDMP_NS + "dosageFormName"), rs.getString("form"));
            drug.addProperty(pDosage, dosageNode);

            // Strength (DB2 แยก value กับ unit)
            Resource strNode = model.createResource();
            strNode.addProperty(RDF.type, model.createResource(IDMP_NS + "Strength"));
            strNode.addLiteral(model.createProperty(IDMP_NS + "strengthValue"), rs.getDouble("dose_value"));
            strNode.addProperty(model.createProperty(IDMP_NS + "strengthUnit"), rs.getString("dose_unit"));
            drug.addProperty(pStrength, strNode);

            // Metadata
            if (rs.getString("org_name") != null) {
                Resource manuNode = model.createResource();
                manuNode.addProperty(model.createProperty(IDMP_NS + "manufacturerName"), rs.getString("org_name"));
                drug.addProperty(pManu, manuNode);
            }
            if (rs.getString("market") != null) {
                Resource marketNode = model.createResource();
                marketNode.addProperty(model.createProperty(IDMP_NS + "marketCode"), rs.getString("market"));
                drug.addProperty(pMarket, marketNode);
            }
        });
        LOGGER.info("   -> Loaded data from DB2 (medicine)");
    }

    // --- Search Logic เดิม (ไม่ต้องแก้) ---
    public List<UnifiedDrug> search(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) return new ArrayList<>();
        if (model.isEmpty()) return new ArrayList<>();

        List<UnifiedDrug> results = new ArrayList<>();
        
        // SPARQL Query นี้รองรับโครงสร้างที่เราเพิ่งสร้างขึ้นมา
        String refinedQuery = "PREFIX idmp: <http://purl.org/onto/idmp/> " +
                "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
                "SELECT ?product ?brand ?sameAsProduct ?substanceRes ?strengthVal ?strengthUnit ?dosageForm ?route ?manufacturer ?market " +
                "WHERE { " +
                "  ?product a <http://purl.org/onto/idmp/PharmaceuticalProduct> . " +
                "  ?product idmp:brandName ?brand . " +
                "  OPTIONAL { ?product owl:sameAs ?sameAsProduct } . " +
                "  OPTIONAL { ?product idmp:hasSubstance ?substanceRes } . " +
                "  OPTIONAL { " +
                "    ?product idmp:hasStrength ?strNode . " +
                "    ?strNode idmp:strengthValue ?strengthVal . " +
                "    ?strNode idmp:strengthUnit ?strengthUnit . " +
                "  } . " +
                "  OPTIONAL { ?product idmp:hasDosageForm ?df . ?df idmp:dosageFormName ?dosageForm } . " +
                "  OPTIONAL { ?product idmp:hasRouteOfAdministration ?ro . ?ro idmp:routeName ?route } . " +
                "  OPTIONAL { ?product idmp:manufacturedBy ?man . ?man idmp:manufacturerName ?manufacturer } . " +
                "  OPTIONAL { ?product idmp:availableIn ?mkt . ?mkt idmp:marketCode ?market } . " +
                "  FILTER (regex(?brand, ?kw, \"i\") || regex(str(?substanceRes), ?kw, \"i\")) " +
                "} LIMIT 50";

        ParameterizedSparqlString pss = new ParameterizedSparqlString();
        pss.setCommandText(refinedQuery);
        pss.setLiteral("kw", keyword);

        try (QueryExecution qexec = QueryExecutionFactory.create(pss.asQuery(), model)) {
            ResultSet rs = qexec.execSelect();
            while (rs.hasNext()) {
                QuerySolution qs = rs.next();
                UnifiedDrug drug = new UnifiedDrug();
                drug.setSource("semantic");

                if (qs.contains("product")) {
                     drug.setOriginalId(qs.getResource("product").getLocalName());
                     drug.setOntologyUri(qs.getResource("product").toString());
                }
                if (qs.contains("brand")) drug.setBrandName(qs.getLiteral("brand").getString());
                
                if (qs.contains("substanceRes")) {
                    String subUri = qs.getResource("substanceRes").getLocalName();
                    drug.setActiveIngredient(subUri.replace("Substance_", ""));
                }
                
                if (qs.contains("strengthVal")) {
                     try { drug.setStrengthMg(qs.getLiteral("strengthVal").getDouble()); } catch (Exception e) {}
                }
                if (qs.contains("dosageForm")) drug.setDosageForm(qs.getLiteral("dosageForm").getString());
                if (qs.contains("route")) drug.setRoute(qs.getLiteral("route").getString());
                if (qs.contains("manufacturer")) drug.setManufacturer(qs.getLiteral("manufacturer").getString());
                if (qs.contains("market")) drug.setCountry(qs.getLiteral("market").getString());

                results.add(drug);
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