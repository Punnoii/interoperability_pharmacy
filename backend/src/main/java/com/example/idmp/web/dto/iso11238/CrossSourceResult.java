package com.example.idmp.web.dto.iso11238;

// one cross-source match — same substance seen under another provider, keyed by the identifier that matched
public record CrossSourceResult(String iri, String preferredName, String substanceType, String source, String matchedIdentifier) {}
