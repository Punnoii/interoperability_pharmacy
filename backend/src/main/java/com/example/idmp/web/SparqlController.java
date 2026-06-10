package com.example.idmp.web;

import com.example.idmp.service.OntopClient;
import com.example.idmp.web.dto.SparqlRequest;

import java.util.Map;

import jakarta.validation.Valid;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
    return ontopClient.execute(request.query(), request.accept());
  }

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "ok");
  }
}
