package com.pharmacy.semantic;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/semantic")
public class SemanticSearchController {
    private static final Logger LOGGER = LoggerFactory.getLogger(SemanticSearchController.class);
    private final SemanticSearchService service;

    public SemanticSearchController(SemanticSearchService service) {
        this.service = service;
    }

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, String>>> searchGet(@RequestParam(name = "q") String q) {
        LOGGER.info("Received GET search request: {}", q);
        return ResponseEntity.ok(service.search(q));
    }

    @PostMapping("/search")
    public ResponseEntity<List<Map<String, String>>> searchPost(@RequestBody Map<String, String> body) {
        String q = body != null ? body.get("q") : null;
        LOGGER.info("Received POST search request: {}", q);
        return ResponseEntity.ok(service.search(q));
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> count() {
        long c = service.countTriples();
        return ResponseEntity.ok(Map.of("triples", c));
    }
}
