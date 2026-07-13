package com.example.idmp.web.dto.similarity;

import java.math.BigDecimal;

// pairwise similarity result — the score plus which method/ontology produced it
public class PairSimilarityResponse {

  private String conceptA;
  private String conceptB;
  private BigDecimal score;
  private String methodUsed;
  private String ontology;

  public PairSimilarityResponse() {}

  public PairSimilarityResponse(String conceptA, String conceptB, BigDecimal score,
                                String methodUsed, String ontology) {
    this.conceptA = conceptA;
    this.conceptB = conceptB;
    this.score = score;
    this.methodUsed = methodUsed;
    this.ontology = ontology;
  }

  public String getConceptA() { return conceptA; }
  public void setConceptA(String conceptA) { this.conceptA = conceptA; }

  public String getConceptB() { return conceptB; }
  public void setConceptB(String conceptB) { this.conceptB = conceptB; }

  public BigDecimal getScore() { return score; }
  public void setScore(BigDecimal score) { this.score = score; }

  public String getMethodUsed() { return methodUsed; }
  public void setMethodUsed(String methodUsed) { this.methodUsed = methodUsed; }

  public String getOntology() { return ontology; }
  public void setOntology(String ontology) { this.ontology = ontology; }
}
