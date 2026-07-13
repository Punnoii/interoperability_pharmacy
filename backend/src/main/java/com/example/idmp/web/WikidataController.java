package com.example.idmp.web;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.idmp.service.WikidataEnrichmentService;
import com.example.idmp.web.dto.WikidataSearchResponse;

// optional wikidata lookup to enrich substances with external ids, best-effort, never fatal
@RestController
@RequestMapping("/api/enrichment/wikidata")
@CrossOrigin(origins = "*")
public class WikidataController {
  private static final Logger log = LoggerFactory.getLogger(WikidataController.class);

  private final WikidataEnrichmentService service;

  public WikidataController(WikidataEnrichmentService service) {
    this.service = service;
  }

  // free-text search against wikidata; swallow any failure and hand back an empty hit list
  @GetMapping("/search")
  public WikidataSearchResponse search(
      @RequestParam("q") String q,
      @RequestParam(name = "limit", defaultValue = "5") int limit) {
    try {
      return service.search(q, limit);
    } catch (Exception e) {
      // wikidata being down shouldn't break the page, log and degrade to no results
      log.warn("Wikidata search failed for '{}': {}", q, e.toString());
      return new WikidataSearchResponse("wikidata", q, List.of());
    }
  }
}
