package com.example.idmp.util.iso11238;

public final class SubstanceSparqlTemplates {

    private SubstanceSparqlTemplates() {}

    private static final String PREFIXES = """
        PREFIX idmp-sub: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/>
        PREFIX cmns-id:  <https://www.omg.org/spec/Commons/Identifiers/>
        PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>
        """;

    public static final String LIST_ALL = PREFIXES + """
        SELECT ?substance ?preferredName ?substanceType ?identifier WHERE {
            ?substance a idmp-sub:Substance .
            OPTIONAL { ?substance idmp-sub:hasSubstanceType ?substanceType . }
            ?substance idmp-sub:hasSubstanceName ?nameNode .
            ?nameNode idmp-sub:hasSubstanceNameValue ?preferredName .
            ?nameNode idmp-sub:hasSubstanceNameType
                <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-PreferredName> .
            OPTIONAL {
                ?substance cmns-id:isIdentifiedBy ?idNode .
                ?idNode cmns-txt:hasTextValue ?identifier .
            }
        }
        LIMIT 500
        """;

    public static final String COUNT_PER_SOURCE = PREFIXES + """
        SELECT ?source (COUNT(DISTINCT ?substance) AS ?count) WHERE {
            ?substance a idmp-sub:Substance .
            BIND(REPLACE(STR(?substance), "^.*/substance/([a-z])/.*$", "$1") AS ?source)
        }
        GROUP BY ?source
        """;

    public static String searchByName(String keyword) {
        String safe = sanitize(keyword);
        return PREFIXES + """
            SELECT ?substance ?name ?substanceType ?identifier WHERE {
                ?substance a idmp-sub:Substance .
                OPTIONAL { ?substance idmp-sub:hasSubstanceType ?substanceType . }
                ?substance idmp-sub:hasSubstanceName ?nameNode .
                ?nameNode idmp-sub:hasSubstanceNameValue ?name .
                FILTER(CONTAINS(LCASE(?name), LCASE("%s")))
                OPTIONAL {
                    ?substance cmns-id:isIdentifiedBy ?idNode .
                    ?idNode cmns-txt:hasTextValue ?identifier .
                }
            }
            LIMIT 100
            """.formatted(safe);
    }

    public static String details(String substanceIri) {
        String safeIri = validateIri(substanceIri);
        return PREFIXES + """
            SELECT ?substanceType ?nameValue ?nameType ?langCode ?idValue WHERE {
                <%s> a idmp-sub:Substance .
                OPTIONAL { <%s> idmp-sub:hasSubstanceType ?substanceType . }
                <%s> idmp-sub:hasSubstanceName ?nameNode .
                ?nameNode idmp-sub:hasSubstanceNameValue ?nameValue .
                ?nameNode idmp-sub:hasSubstanceNameType ?nameType .
                OPTIONAL { ?nameNode idmp-sub:hasLanguageCode ?langCode . }
                OPTIONAL {
                    <%s> cmns-id:isIdentifiedBy ?idNode .
                    ?idNode cmns-txt:hasTextValue ?idValue .
                }
            }
            """.formatted(safeIri, safeIri, safeIri, safeIri);
    }

    public static String crossSource(String identifier) {
        String safe = sanitize(identifier);
        return PREFIXES + """
            SELECT ?substance ?preferredName ?substanceType ?identifier WHERE {
                ?substance a idmp-sub:Substance .
                OPTIONAL { ?substance idmp-sub:hasSubstanceType ?substanceType . }
                ?substance cmns-id:isIdentifiedBy ?idNode .
                ?idNode cmns-txt:hasTextValue ?identifier .
                FILTER(?identifier = "%s")
                ?substance idmp-sub:hasSubstanceName ?nameNode .
                ?nameNode idmp-sub:hasSubstanceNameValue ?preferredName .
                ?nameNode idmp-sub:hasSubstanceNameType
                    <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-PreferredName> .
            }
            """.formatted(safe);
    }

    static String sanitize(String input) {
        if (input == null) {
            return "";
        }
        return input
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    static String validateIri(String iri) {
        if (iri == null || iri.isBlank()) {
            throw new IllegalArgumentException("IRI must not be null or blank");
        }
        if (iri.contains("<") || iri.contains(">") || iri.contains(" ")) {
            throw new IllegalArgumentException("IRI contains invalid characters: " + iri);
        }
        return iri;
    }
}
