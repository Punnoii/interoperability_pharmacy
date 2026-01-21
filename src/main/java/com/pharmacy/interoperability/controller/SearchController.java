package com.pharmacy.interoperability.controller;

import com.pharmacy.interoperability.model.UnifiedDrug;
import com.pharmacy.interoperability.service.SearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<UnifiedDrug>> search(@RequestParam(value = "term", required = false) String term,
            @RequestParam(value = "substance", required = false) String substance) {
        String query = term;
        if (query == null || query.isEmpty()) {
            query = substance;
        }
        if (query == null || query.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<UnifiedDrug> results = searchService.search(query);
        return ResponseEntity.ok(results);
    }
}
