package com.example.idmp.web.dto.similarity;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class TopKRequest {

  @NotBlank
  private String concept;

  @Min(1)
  private int k = 10;

  @Min(0)
  private int scope = 2;

  public TopKRequest() {}

  public TopKRequest(String concept, int k, int scope) {
    this.concept = concept;
    this.k = k;
    this.scope = scope;
  }

  public String getConcept() { return concept; }
  public void setConcept(String concept) { this.concept = concept; }

  public int getK() { return k; }
  public void setK(int k) { this.k = k; }

  public int getScope() { return scope; }
  public void setScope(int scope) { this.scope = scope; }
}
