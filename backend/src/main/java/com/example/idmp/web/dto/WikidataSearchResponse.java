package com.example.idmp.web.dto;

import java.util.List;

public record WikidataSearchResponse(
    String source,
    String query,
    List<WikidataSearchItem> items
){}