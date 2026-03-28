package com.example.idmp.web;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.idmp.service.WikidataEnrichmentService;
import com.example.idmp.web.dto.WikidataSearchResponse;

@RestController
@RequestMapping("/api/enrichment/wikidata")
@CrossOrigin(origins = "*")
public class WikidataController {
  private final WikidataEnrichmentService service;

  public WikidataController(WikidataEnrichmentService service) {
    this.service = service;
  }

  @GetMapping("/search")
  public WikidataSearchResponse search(
      @RequestParam("q") String q,
      @RequestParam(name = "limit", defaultValue = "5") int limit) {
    return service.search(q, limit);
  }
}
