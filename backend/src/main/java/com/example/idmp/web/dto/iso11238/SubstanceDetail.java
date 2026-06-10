package com.example.idmp.web.dto.iso11238;

import java.util.List;

public record SubstanceDetail(String iri, String substanceType, List<NameEntry> names, List<IdentifierEntry> identifiers, WikidataEnrichment wikidata) {}
