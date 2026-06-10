package com.example.idmp.util.iso11238;

/**
 * SPARQL query templates for ISO 11238 Substance operations.
 * <p>
 * Uses IDMP ontology prefixes:
 * <ul>
 *   <li>{@code idmp-sub:} — ISO 11238 Substances</li>
 *   <li>{@code cmns-id:}  — Commons Identifiers</li>
 *   <li>{@code cmns-txt:} — Commons TextDatatype</li>
 * </ul>
 */
public final class SubstanceSparqlTemplates {

    private SubstanceSparqlTemplates() {}

    // ── Ontology prefixes ───────────────────────────────────────────────

    private static final String PREFIXES = """
        PREFIX idmp-sub: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/>
        PREFIX cmns-id:  <https://www.omg.org/spec/Commons/Identifiers/>
        PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>
        """;

    // ── Constants ────────────────────────────────────────────────────────

    /**
     * List all substances with preferred name, type, and identifier.
     */
    public static final String LIST_ALL = PREFIXES + """
        SELECT ?substance ?preferredName ?substanceType ?identifier WHERE {
            ?substance a idmp-sub:Substance .
            ?substance idmp-sub:hasSubstanceType ?substanceType .
            ?substance idmp-sub:hasSubstanceName ?nameNode .
            ?nameNode idmp-sub:hasSubstanceNameValue ?preferredName .
            ?nameNode idmp-sub:hasSubstanceNameType
                <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-PreferredName> .
            OPTIONAL {
                ?substance cmns-id:isIdentifiedBy ?idNode .
                ?idNode cmns-txt:hasTextValue ?identifier .
            }
        }
        """;

    /**
     * Count distinct substances per data source.
     */
    public static final String COUNT_PER_SOURCE = PREFIXES + """
        SELECT ?source (COUNT(DISTINCT ?substance) AS ?count) WHERE {
            ?substance a idmp-sub:Substance .
            BIND(REPLACE(STR(?substance), "^.*/substance/([a-z])/.*$", "$1") AS ?source)
        }
        GROUP BY ?source
        """;

    // ── Parameterised queries ────────────────────────────────────────────

    /**
     * Search substances whose name contains the given keyword (case-insensitive).
     *
     * @param keyword search term — will be sanitised for SPARQL string literals
     * @return SPARQL SELECT query
     */
    public static String searchByName(String keyword) {
        String safe = sanitize(keyword);
        return PREFIXES + """
            SELECT ?substance ?name ?substanceType ?identifier WHERE {
                ?substance a idmp-sub:Substance .
                ?substance idmp-sub:hasSubstanceType ?substanceType .
                ?substance idmp-sub:hasSubstanceName ?nameNode .
                ?nameNode idmp-sub:hasSubstanceNameValue ?name .
                FILTER(CONTAINS(LCASE(?name), LCASE("%s")))
                OPTIONAL {
                    ?substance cmns-id:isIdentifiedBy ?idNode .
                    ?idNode cmns-txt:hasTextValue ?identifier .
                }
            }
            """.formatted(safe);
    }

    /**
     * Get full details for a single substance: all names, identifiers, and type.
     *
     * @param substanceIri full IRI of the substance
     * @return SPARQL SELECT query
     * @throws IllegalArgumentException if the IRI contains invalid characters
     */
    public static String details(String substanceIri) {
        String safeIri = validateIri(substanceIri);
        return PREFIXES + """
            SELECT ?substanceType ?nameValue ?nameType ?langCode ?idValue WHERE {
                <%s> a idmp-sub:Substance .
                <%s> idmp-sub:hasSubstanceType ?substanceType .
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

    /**
     * Find substances across all data sources that share the given identifier value.
     *
     * @param identifier identifier value to match (e.g. a UNII code)
     * @return SPARQL SELECT query
     */
    public static String crossSource(String identifier) {
        String safe = sanitize(identifier);
        return PREFIXES + """
            SELECT ?substance ?preferredName ?substanceType ?identifier WHERE {
                ?substance a idmp-sub:Substance .
                ?substance idmp-sub:hasSubstanceType ?substanceType .
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

    // ── Input sanitisation ───────────────────────────────────────────────

    /**
     * Sanitise a value for safe inclusion inside a SPARQL string literal ({@code "..."}).
     * Escapes backslashes, double-quotes, and newline characters.
     *
     * @param input raw user input
     * @return escaped string safe for SPARQL literals
     */
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

    /**
     * Validate and return an IRI string.
     * Rejects IRIs that contain {@code <}, {@code >}, or whitespace characters
     * which could break SPARQL syntax or enable injection.
     *
     * @param iri the IRI to validate
     * @return the validated IRI (unchanged)
     * @throws IllegalArgumentException if the IRI is invalid
     */
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
