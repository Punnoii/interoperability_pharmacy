package com.example.idmp.web;

import com.example.idmp.config.OntopProperties;
import com.example.idmp.service.OntopClient;
import com.example.idmp.util.iso11238.SubstanceSparqlTemplates;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class HealthController {

    private static final Logger log = LoggerFactory.getLogger(HealthController.class);
    private static final String SPARQL_JSON = "application/sparql-results+json";
    private static final String HEALTH_QUERY = "SELECT * WHERE { ?s ?p ?o } LIMIT 1";

    private final OntopClient ontopClient;
    private final OntopProperties ontopProperties;
    private final ObjectMapper objectMapper;

    public HealthController(OntopClient ontopClient, OntopProperties ontopProperties, ObjectMapper objectMapper) {
        this.ontopClient = ontopClient;
        this.ontopProperties = ontopProperties;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/api/health/ontop")
    public Map<String, Object> healthOntop() {
        String endpoint = ontopProperties.getEndpoint();
        long start = System.nanoTime();
        try {
            ontopClient.execute(HEALTH_QUERY, SPARQL_JSON);
            long elapsed = (System.nanoTime() - start) / 1_000_000;
            return Map.of(
                    "status", "available",
                    "endpoint", endpoint,
                    "responseTimeMs", elapsed
            );
        } catch (Exception ex) {
            long elapsed = (System.nanoTime() - start) / 1_000_000;
            log.warn("Ontop health check failed: {}", ex.getMessage());
            return Map.of(
                    "status", "unavailable",
                    "endpoint", endpoint,
                    "error", ex.getMessage() != null ? ex.getMessage() : "Unknown error",
                    "responseTimeMs", elapsed
            );
        }
    }

    @GetMapping("/api/validation/substance-count")
    public Map<String, Integer> substanceCount() {
        ResponseEntity<String> response = ontopClient.execute(
                SubstanceSparqlTemplates.COUNT_PER_SOURCE, SPARQL_JSON);

        Map<String, Integer> counts = new LinkedHashMap<>();
        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode bindings = root.path("results").path("bindings");
            for (JsonNode binding : bindings) {
                String source = binding.path("source").path("value").asText("");
                int count = binding.path("count").path("value").asInt(0);
                if (!source.isEmpty()) {
                    counts.put(source, count);
                }
            }
        } catch (Exception ex) {
            log.error("Failed to parse substance count results: {}", ex.getMessage());
        }

        // Log warning if any count seems unexpected (e.g. zero or mismatched)
        counts.forEach((source, count) -> {
            if (count == 0) {
                log.warn("Substance count for source '{}' is 0 — possible data issue", source);
            }
        });

        if (counts.size() > 1) {
            int first = counts.values().iterator().next();
            counts.forEach((source, count) -> {
                if (count != first) {
                    log.warn("Substance count mismatch: source '{}' has {} substances, "
                            + "differs from other sources", source, count);
                }
            });
        }

        return counts;
    }
}
