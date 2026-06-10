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

import com.example.idmp.service.iso11238.SubstanceService;
import com.example.idmp.web.dto.iso11238.CrossSourceResult;
import com.example.idmp.web.dto.iso11238.SubstanceDetail;
import com.example.idmp.web.dto.iso11238.SubstanceSummary;

/**
 * REST controller for ISO 11238 Substance operations.
 * Delegates to {@link SubstanceService} for SPARQL-based queries.
 */
@RestController
@RequestMapping("/api/substances")
@CrossOrigin(origins = "*")
public class SubstanceController {

    private final SubstanceService substanceService;

    public SubstanceController(SubstanceService substanceService) {
        this.substanceService = substanceService;
    }

    /**
     * List all substances from every data source.
     */
    @GetMapping
    public List<SubstanceSummary> listAll() {
        return substanceService.listAll();
    }

    /**
     * Search substances by name (case-insensitive contains).
     */
    @GetMapping("/search")
    public List<SubstanceSummary> search(@RequestParam("name") String name) {
        validateKeyword(name);
        return substanceService.searchByName(name);
    }

    /**
     * Get full details for a single substance by IRI.
     * Wikidata enrichment will be added in Task 11.1.
     */
    @GetMapping("/details")
    public SubstanceDetail details(@RequestParam("iri") String iri) {
        validateIri(iri);
        return substanceService.getDetails(iri);
    }

    /**
     * Cross-source matching: find substances across all data sources
     * that share the given identifier value.
     */
    @GetMapping("/cross-source")
    public List<CrossSourceResult> crossSource(@RequestParam("identifier") String identifier) {
        validateNotBlank(identifier, "identifier");
        return substanceService.crossSourceLookup(identifier);
    }

    // ── validation helpers ──────────────────────────────────────────────

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
