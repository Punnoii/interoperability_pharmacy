package com.example.idmp.web.dto.iso11238;

// one row in the substance search/list results
public record SubstanceSummary(String iri, String preferredName, String substanceType, String identifier, String source) {}
