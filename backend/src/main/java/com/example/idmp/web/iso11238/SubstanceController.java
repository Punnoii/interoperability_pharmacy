package com.example.idmp.web.iso11238;

import java.net.URI;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.idmp.service.iso11238.SubstanceQuickSearchService;
import com.example.idmp.service.iso11238.SubstanceService;
import com.example.idmp.web.dto.iso11238.CrossSourceResult;
import com.example.idmp.web.dto.iso11238.SubstanceDetail;
import com.example.idmp.web.dto.iso11238.SubstanceQuickHit;
import com.example.idmp.web.dto.iso11238.SubstanceSummary;

@RestController
@RequestMapping("/api/substances")
@CrossOrigin(origins = "*")
public class SubstanceController {

    private final SubstanceService substanceService;
    private final SubstanceQuickSearchService quickSearchService;

    public SubstanceController(SubstanceService substanceService,
                               SubstanceQuickSearchService quickSearchService) {
        this.substanceService = substanceService;
        this.quickSearchService = quickSearchService;
    }

    @GetMapping
    public List<SubstanceSummary> listAll() {
        return substanceService.listAll();
    }

    @GetMapping("/quick-search")
    public List<SubstanceQuickHit> quickSearch(
            @RequestParam("q") String q,
            @RequestParam(name = "limit", defaultValue = "8") int limit) {
        validateKeyword(q);
        return quickSearchService.search(q, limit);
    }

    @GetMapping("/search")
    public List<SubstanceSummary> search(@RequestParam("name") String name) {
        validateKeyword(name);
        return substanceService.searchByName(name);
    }

    @GetMapping("/details")
    public SubstanceDetail details(@RequestParam("iri") String iri) {
        validateIri(iri);
        return substanceService.getDetails(iri);
    }

    @GetMapping("/cross-source")
    public List<CrossSourceResult> crossSource(@RequestParam("identifier") String identifier) {
        validateNotBlank(identifier, "identifier");
        return substanceService.crossSourceLookup(identifier);
    }

    private static void validateIri(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing iri");
        }
        if (value.contains("<") || value.contains(">") || value.contains(" ")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid IRI format");
        }
        try {
            URI.create(value);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid IRI format");
        }
    }

    private static void validateKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing name");
        }
        if (keyword.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Keyword too long (max 200 characters)");
        }
    }

    private static void validateNotBlank(String value, String paramName) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing " + paramName);
        }
    }
}
