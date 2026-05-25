package com.example.idmp.service;

import com.example.idmp.config.OntopProperties;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
public class OntopClient {
  private final RestClient restClient;
  private final OntopProperties properties;
  private final SparqlCacheService cacheService;

  public OntopClient(RestClient restClient, OntopProperties properties, SparqlCacheService cacheService) {
    this.restClient = restClient;
    this.properties = properties;
    this.cacheService = cacheService;
  }

  public ResponseEntity<String> execute(String query, String accept) {
    if (query == null || query.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query is empty");
    }

    String endpoint = properties.getEndpoint();
    if (endpoint == null || endpoint.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ontop endpoint is not configured");
    }

    String acceptValue = (accept == null || accept.isBlank())
        ? properties.getDefaultAccept()
        : accept.trim();

    MediaType acceptType;
    try {
      acceptType = MediaType.parseMediaType(acceptValue);
    } catch (InvalidMediaTypeException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Accept header: " + acceptValue);
    }

    // Check cache before querying Ontop
    String cacheKey = SparqlCacheService.computeHash(query, acceptValue);
    Optional<String> cached = cacheService.get(cacheKey);
    if (cached.isPresent()) {
      return ResponseEntity.ok()
          .contentType(acceptType)
          .header("X-Cache-Hit", "true")
          .body(cached.get());
    }

    // Cache miss — query Ontop
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("query", query);

    try {
      ResponseEntity<String> response = restClient.post()
          .uri(endpoint)
          .contentType(MediaType.APPLICATION_FORM_URLENCODED)
          .accept(acceptType)
          .body(form)
          .retrieve()
          .toEntity(String.class);

      MediaType responseType = response.getHeaders().getContentType();
      if (responseType == null) {
        responseType = acceptType;
      }

      // Store result in cache
      String responseBody = response.getBody();
      if (responseBody != null) {
        cacheService.put(cacheKey, responseBody);
      }

      return ResponseEntity.status(response.getStatusCode())
          .contentType(responseType)
          .header("X-Cache-Hit", "false")
          .body(responseBody);
    } catch (RestClientResponseException ex) {
      HttpStatusCode status = ex.getStatusCode();
      if (status == null) {
        status = HttpStatus.BAD_GATEWAY;
      }
      String message = ex.getResponseBodyAsString();
      if (message == null || message.isBlank()) {
        message = "Ontop request failed";
      }
      throw new ResponseStatusException(status, message, ex);
    }
  }
}
