package com.example.idmp.web;

import com.example.idmp.config.OntopProperties;
import com.example.idmp.service.OntopClient;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class HealthController {

    private static final Logger log = LoggerFactory.getLogger(HealthController.class);
    private static final String SPARQL_JSON = "application/sparql-results+json";
    // cheapest possible query that still proves Ontop can answer — one triple, then bail
    private static final String HEALTH_QUERY = "SELECT * WHERE { ?s ?p ?o } LIMIT 1";

    private final OntopClient ontopClient;
    private final OntopProperties ontopProperties;

    public HealthController(OntopClient ontopClient, OntopProperties ontopProperties) {
        this.ontopClient = ontopClient;
        this.ontopProperties = ontopProperties;
    }

    // deeper probe than /api/health — actually round-trips to Ontop and reports latency
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
            // never 500 on a health check — report unavailable + why so the UI can show it
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
}
