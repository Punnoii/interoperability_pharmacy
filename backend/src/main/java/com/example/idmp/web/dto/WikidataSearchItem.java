package com.example.idmp.web.dto;

public record WikidataSearchItem(
    String qid,
    String iri,
    String label,
    String description,
    String source
){}