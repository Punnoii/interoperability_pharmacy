package com.example.idmp.web;

import com.example.idmp.service.OntopClient;
import com.example.idmp.util.SparqlTemplates;
import com.example.idmp.web.dto.SparqlRequest;

import java.net.URI;
import java.util.Map;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class SparqlController {
  private final OntopClient ontopClient;

  public SparqlController(OntopClient ontopClient) {
    this.ontopClient = ontopClient;
  }

  @PostMapping(value = "/sparql", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<String> sparql(@Valid @RequestBody SparqlRequest request) {
    return ontopClient.execute(request.endpoint(), request.query(), request.accept());
  }

  @GetMapping("/entity")
  public ResponseEntity<String> entity(
      @RequestParam("iri") String iri,
      @RequestParam(name = "limit", defaultValue = "100") int limit,
      @RequestParam(name = "endpoint", required = false) String endpoint,
      @RequestParam(name = "accept", required = false) String accept
  ) {
    validateIri(iri, "iri");
    int safeLimit = clampLimit(limit);
    String query = SparqlTemplates.entityDetails(iri, safeLimit);
    return ontopClient.execute(endpoint, query, accept);
  }

  @GetMapping("/navigate")
  public ResponseEntity<String> navigate(
      @RequestParam("iri") String iri,
      @RequestParam("predicate") String predicate,
      @RequestParam(name = "direction", defaultValue = "out") String direction,
      @RequestParam(name = "limit", defaultValue = "100") int limit,
      @RequestParam(name = "endpoint", required = false) String endpoint,
      @RequestParam(name = "accept", required = false) String accept
  ) {
    validateIri(iri, "iri");
    validateIri(predicate, "predicate");
    boolean incoming = parseDirection(direction);
    int safeLimit = clampLimit(limit);
    String query = SparqlTemplates.navigate(iri, predicate, incoming, safeLimit);
    return ontopClient.execute(endpoint, query, accept);
  }

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "ok");
  }

  private static int clampLimit(int limit) {
    if (limit < 1) {
      return 1;
    }
    if (limit > 500) {
      return 500;
    }
    return limit;
  }

  private static void validateIri(String value, String name) {
    if (value == null || value.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing " + name);
    }
    if (value.contains("<") || value.contains(">") || value.contains(" ")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid IRI for " + name);
    }
    try {
      URI.create(value);
    } catch (IllegalArgumentException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid IRI for " + name);
    }
  }

  private static boolean parseDirection(String direction) {
    String value = direction == null ? "out" : direction.trim().toLowerCase();
    if ("in".equals(value)) {
      return true;
    }
    if ("out".equals(value)) {
      return false;
    }
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "direction must be 'in' or 'out'");
  }
}
