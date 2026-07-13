package com.example.idmp.web.dto;

// one Wikidata hit shown in the enrichment sidebar
public record WikidataSearchItem(
    String qid,
    String iri,
    String label,
    String description,
    String source
){}