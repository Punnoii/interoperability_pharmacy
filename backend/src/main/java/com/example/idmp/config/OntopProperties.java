package com.example.idmp.config;

import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ontop")
public class OntopProperties {
  private String defaultEndpoint = "default";
  private String defaultAccept = "application/sparql-results+json";
  private Map<String, String> endpoints = new HashMap<>();

  public String getDefaultEndpoint() {
    return defaultEndpoint;
  }

  public void setDefaultEndpoint(String defaultEndpoint) {
    this.defaultEndpoint = defaultEndpoint;
  }

  public String getDefaultAccept() {
    return defaultAccept;
  }

  public void setDefaultAccept(String defaultAccept) {
    this.defaultAccept = defaultAccept;
  }

  public Map<String, String> getEndpoints() {
    return endpoints;
  }

  public void setEndpoints(Map<String, String> endpoints) {
    this.endpoints = endpoints;
  }
}
