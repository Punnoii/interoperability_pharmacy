package com.example.idmp.service;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import com.example.idmp.web.dto.WikidataSearchItem;
import com.example.idmp.web.dto.WikidataSearchResponse;
import com.fasterxml.jackson.databind.JsonNode;

// pulls extra context for a substance off the public Wikidata search API
@Service
public class WikidataEnrichmentService {

  private final RestClient restClient;
  private final String apiUrl;
  private final String language;

  // dedicated wikidataRestClient bean keeps its timeouts separate from our internal calls;
  // url/language are overridable but default to the public en endpoint
  public WikidataEnrichmentService(
      @Qualifier("wikidataRestClient") RestClient restClient,
      @Value("${wikidata.api-url:https://www.wikidata.org/w/api.php}") String apiUrl,
      @Value("${wikidata.language:en}") String language){
    this.restClient = restClient;
    this.apiUrl = apiUrl;
    this.language = language;
    }

  public WikidataSearchResponse search(String query, int limit) {
    // clamp to 1..10, this is best-effort enrichment, no reason to hammer their API
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
        // Wikidata asks for a descriptive User-Agent or they may throttle/block
        .header("User-Agent", "idmp-backend-demo/0.1 (educational project)")
        .header("Accept", "application/json")
        .retrieve()
        .body(JsonNode.class);

    // walk the "search" array by hand rather than binding a full DTO, we only want a few fields
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
