package com.example.idmp.web.dto.similarity;

import java.math.BigDecimal;
import java.util.List;

public class TopKResponse {

  private String concept;
  private int k;
  private int scope;
  private String scopePrefix;
  private String methodUsed;
  private String ontology;
  private long elapsedMs;
  private List<Neighbor> results;

  public TopKResponse() {}

  public TopKResponse(String concept, int k, int scope, String scopePrefix,
                      String methodUsed, String ontology, long elapsedMs, List<Neighbor> results) {
    this.concept = concept;
    this.k = k;
    this.scope = scope;
    this.scopePrefix = scopePrefix;
    this.methodUsed = methodUsed;
    this.ontology = ontology;
    this.elapsedMs = elapsedMs;
    this.results = results;
  }

  public String getConcept() { return concept; }
  public void setConcept(String concept) { this.concept = concept; }

  public int getK() { return k; }
  public void setK(int k) { this.k = k; }

  public int getScope() { return scope; }
  public void setScope(int scope) { this.scope = scope; }

  public String getScopePrefix() { return scopePrefix; }
  public void setScopePrefix(String scopePrefix) { this.scopePrefix = scopePrefix; }

  public String getMethodUsed() { return methodUsed; }
  public void setMethodUsed(String methodUsed) { this.methodUsed = methodUsed; }

  public String getOntology() { return ontology; }
  public void setOntology(String ontology) { this.ontology = ontology; }

  public long getElapsedMs() { return elapsedMs; }
  public void setElapsedMs(long elapsedMs) { this.elapsedMs = elapsedMs; }

  public List<Neighbor> getResults() { return results; }
  public void setResults(List<Neighbor> results) { this.results = results; }

  public static class Neighbor {
    private String concept;
    private String label;
    private BigDecimal score;

    public Neighbor() {}
    public Neighbor(String concept, String label, BigDecimal score) {
      this.concept = concept;
      this.label = label;
      this.score = score;
    }

    public String getConcept() { return concept; }
    public void setConcept(String concept) { this.concept = concept; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public BigDecimal getScore() { return score; }
    public void setScore(BigDecimal score) { this.score = score; }
  }
}
