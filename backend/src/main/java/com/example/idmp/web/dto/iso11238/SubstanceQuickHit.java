package com.example.idmp.web.dto.iso11238;

// slim hit for the search autocomplete, iri + name + unii
public record SubstanceQuickHit(
    String iri,
    String name,
    String unii
){}
