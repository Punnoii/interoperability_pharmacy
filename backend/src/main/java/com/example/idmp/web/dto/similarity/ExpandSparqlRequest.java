package com.example.idmp.web.dto.similarity;

import jakarta.validation.constraints.NotBlank;

// body for /expand, raw SPARQL carrying the @expand annotations
public class ExpandSparqlRequest {

  @NotBlank
  private String sparql;

  public ExpandSparqlRequest() {}
  public ExpandSparqlRequest(String sparql) { this.sparql = sparql; }

  public String getSparql() { return sparql; }
  public void setSparql(String sparql) { this.sparql = sparql; }
}
