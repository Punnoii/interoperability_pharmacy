package com.example.idmp.web.dto.similarity;

import jakarta.validation.constraints.NotBlank;

// two concept codes to score against each other
public class PairSimilarityRequest {

  @NotBlank
  private String conceptA;

  @NotBlank
  private String conceptB;

  public PairSimilarityRequest() {}

  public PairSimilarityRequest(String conceptA, String conceptB) {
    this.conceptA = conceptA;
    this.conceptB = conceptB;
  }

  public String getConceptA() { return conceptA; }
  public void setConceptA(String conceptA) { this.conceptA = conceptA; }

  public String getConceptB() { return conceptB; }
  public void setConceptB(String conceptB) { this.conceptB = conceptB; }
}
