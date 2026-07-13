package com.example.idmp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

// where the Ontop SPARQL endpoint lives + the accept header we send it, bound from ontop.* config
@ConfigurationProperties(prefix = "ontop")
public class OntopProperties {
  private String endpoint = "http://localhost:8080/sparql";
  private String defaultAccept = "application/sparql-results+json";

  public String getEndpoint() {
    return endpoint;
  }

  public void setEndpoint(String endpoint) {
    this.endpoint = endpoint;
  }

  public String getDefaultAccept() {
    return defaultAccept;
  }

  public void setDefaultAccept(String defaultAccept) {
    this.defaultAccept = defaultAccept;
  }
}
