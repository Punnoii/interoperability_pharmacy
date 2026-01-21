package com.pharmacy.semantic;

import com.pharmacy.interoperability.model.UnifiedDrug;
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
import java.util.List;

@Service
public class SemanticSearchService {
    private static final Logger LOGGER = LoggerFactory.getLogger(SemanticSearchService.class);
    private final Model model = ModelFactory.createDefaultModel();

    @EventListener(ApplicationReadyEvent.class)
    public void loadRdfOnStartup() {
        LOGGER.info("SemanticSearchService: loading RDF files into memory...");
        String[] candidateFiles = new String[] { "semantic_output.rdf", "semantic_output.ttl" };

        for (String path : candidateFiles) {
            try {
                File f = new File(path);
                if (f.exists() && f.isFile()) {
                    try (InputStream in = new FileInputStream(f)) {
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

    public List<UnifiedDrug> search(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return new ArrayList<>();
        }
        List<UnifiedDrug> results = new ArrayList<>();

        // Note: The RDF sample shows idmp:hasSubstance pointing to a resource like
        // iso11238:Substance_Acetaminophen.
        // We might need to adjust the query if the substance name is not directly
        // available or if the resource URI itself is what we want.
        // Looking at sample: <idmp:hasSubstance
        // rdf:resource="iso11238:Substance_Acetaminophen"/>
        // We probably need to parse the resource URI to get the name if there's no
        // label.
        // Let's refine the query slightly to handle the resource URI as fallback for
        // substance.

        String refinedQuery = "PREFIX idmp: <http://purl.org/onto/idmp/> " +
                "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
                "SELECT ?product ?brand ?sameAsProduct ?substanceRes ?strengthVal ?strengthUnit ?dosageForm ?route ?manufacturer ?market "
                +
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
                "  FILTER regex(?brand, ?kw, \"i\") " +
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
                drug.setOriginalId(qs.getResource("product").getLocalName()); // e.g. product_db1_1
                drug.setOntologyUri(qs.getResource("product").toString());

                if (qs.contains("brand")) {
                    drug.setBrandName(qs.getLiteral("brand").getString());
                }

                if (qs.contains("substanceRes")) {
                    String subUri = qs.getResource("substanceRes").getLocalName();
                    // Simple cleanup: remove "Substance_" prefix if present
                    if (subUri.startsWith("Substance_")) {
                        drug.setActiveIngredient(subUri.replace("Substance_", ""));
                    } else {
                        drug.setActiveIngredient(subUri);
                    }
                }

                if (qs.contains("strengthVal")) {
                    try {
                        drug.setStrengthMg(qs.getLiteral("strengthVal").getDouble());
                    } catch (Exception e) {
                        // ignore number format issues
                    }
                }

                // Note: UnifiedDrug might expect just strengthMg for sorting, but we can also
                // store unit if needed.
                // For now, assuming strengthVal is in mg if unit is mg.
                // The sample RDF says unit is "mg".

                if (qs.contains("dosageForm")) {
                    drug.setDosageForm(qs.getLiteral("dosageForm").getString());
                }

                if (qs.contains("route")) {
                    drug.setRoute(qs.getLiteral("route").getString());
                }

                if (qs.contains("manufacturer")) {
                    drug.setManufacturer(qs.getLiteral("manufacturer").getString());
                }

                if (qs.contains("market")) {
                    drug.setCountry(qs.getLiteral("market").getString());
                }

                if (qs.contains("sameAsProduct")) {
                    // We could put this in a custom field or description, but existing UnifiedDrug
                    // might not have a specific field for 'linkedTo'.
                    // For now, we rely on the main fields.
                }

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