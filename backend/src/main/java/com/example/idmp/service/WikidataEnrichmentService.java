package com.example.idmp.service;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import com.example.idmp.web.dto.WikidataSearchItem;
import com.example.idmp.web.dto.WikidataSearchResponse;
import com.fasterxml.jackson.databind.JsonNode;

@Service
public class WikidataEnrichmentService {

  private final RestClient restClient;
  private final String apiUrl;
  private final String language;

  public WikidataEnrichmentService(
      RestClient restClient,
      @Value("${wikidata.api-url}") String apiUrl,
      @Value("${wikidata.language}") String language){
    this.restClient = restClient;
    this.apiUrl = apiUrl;
    this.language = language;
    }

  public WikidataSearchResponse search(String query, int limit) {
    int safeLimit = Math.max(1,Math.min(limit,10));

    URI uri = UriComponentsBuilder.fromUriString(apiUrl)
        .queryParam("action", "wbsearchentities")
        .queryParam("format", "json")
        .queryParam("language", language)
        .queryParam("search", query)
        .queryParam("limit", safeLimit)
        .build()
        .toUri();
    JsonNode root = restClient.get()
        .uri(uri)
        .header("User-Agent", "idmp-backend-demo/0.1 (educational project)")
        .header("Accept", "application/json")
        .retrieve()
        .body(JsonNode.class);


    List<WikidataSearchItem> items = new ArrayList<>();
    if (root != null) {
      for (JsonNode item : root.path("search")) {
        items.add(new WikidataSearchItem(
            item.path("id").asText(),
            item.path("concepturi").asText(),
            item.path("label").asText(),
            item.path("description").asText(),
            "wikidata"));
      }
    }

    return new WikidataSearchResponse("wikidata", query, items);
  }
}
