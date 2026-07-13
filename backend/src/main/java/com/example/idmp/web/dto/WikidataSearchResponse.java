package com.example.idmp.web.dto;

import java.util.List;

// wraps a Wikidata lookup — echoes source/query alongside the hits
public record WikidataSearchResponse(
    String source,
    String query,
    List<WikidataSearchItem> items
){}