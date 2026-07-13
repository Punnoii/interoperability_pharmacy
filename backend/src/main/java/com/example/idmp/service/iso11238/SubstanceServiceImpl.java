package com.example.idmp.service.iso11238;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.example.idmp.service.OntopClient;
import com.example.idmp.service.WikidataEnrichmentService;
import com.example.idmp.util.iso11238.SubstanceSparqlTemplates;
import com.example.idmp.web.dto.WikidataSearchResponse;
import com.example.idmp.web.dto.iso11238.CrossSourceResult;
import com.example.idmp.web.dto.iso11238.IdentifierEntry;
import com.example.idmp.web.dto.iso11238.NameEntry;
import com.example.idmp.web.dto.iso11238.SubstanceDetail;
import com.example.idmp.web.dto.iso11238.SubstanceSummary;
import com.example.idmp.web.dto.iso11238.WikidataEnrichment;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

// runs the templated SPARQL through Ontop, then flattens the sparql-results JSON into our DTOs
@Service
public class SubstanceServiceImpl implements SubstanceService {

    private static final Logger log = LoggerFactory.getLogger(SubstanceServiceImpl.class);
    // ask Ontop for JSON results specifically - we hand-parse this shape below
    private static final String ACCEPT_SPARQL_JSON = "application/sparql-results+json";
    private static final int WIKIDATA_RESULT_LIMIT = 5;

    private final OntopClient ontopClient;
    private final ObjectMapper objectMapper;
    private final WikidataEnrichmentService wikidataEnrichmentService;

    public SubstanceServiceImpl(OntopClient ontopClient, ObjectMapper objectMapper,
                                WikidataEnrichmentService wikidataEnrichmentService) {
        this.ontopClient = ontopClient;
        this.objectMapper = objectMapper;
        this.wikidataEnrichmentService = wikidataEnrichmentService;
    }

    @Override
    // flat list for the browse view - source is inferred from the IRI, not stored as a column
    public List<SubstanceSummary> listAll() {
        String body = executeSparql(SubstanceSparqlTemplates.LIST_ALL);
        JsonNode bindings = parseBindings(body);

        List<SubstanceSummary> results = new ArrayList<>();
        for (JsonNode row : bindings) {
            results.add(new SubstanceSummary(
                    textValue(row, "substance"),
                    textValue(row, "preferredName"),
                    extractLocalName(textValue(row, "substanceType")),
                    textValue(row, "identifier"),
                    deriveSource(textValue(row, "substance"))
            ));
        }
        return results;
    }

    @Override
    // full-text-ish search over substance names via SPARQL (distinct from the fast Trino type-ahead)
    public List<SubstanceSummary> searchByName(String keyword) {
        String query = SubstanceSparqlTemplates.searchByName(keyword);
        String body = executeSparql(query);
        JsonNode bindings = parseBindings(body);

        List<SubstanceSummary> results = new ArrayList<>();
        for (JsonNode row : bindings) {
            results.add(new SubstanceSummary(
                    textValue(row, "substance"),
                    textValue(row, "name"),
                    extractLocalName(textValue(row, "substanceType")),
                    textValue(row, "identifier"),
                    deriveSource(textValue(row, "substance"))
            ));
        }
        return results;
    }

    @Override
    // the details query cross-joins names x identifiers, so rows repeat - we fold them back into two deduped lists
    public SubstanceDetail getDetails(String substanceIri) {
        String query = SubstanceSparqlTemplates.details(substanceIri);
        String body = executeSparql(query);
        JsonNode bindings = parseBindings(body);

        String substanceType = null;
        List<NameEntry> names = new ArrayList<>();
        List<IdentifierEntry> identifiers = new ArrayList<>();

        for (JsonNode row : bindings) {
            // type is the same on every row - grab it once
            if (substanceType == null) {
                substanceType = extractLocalName(textValue(row, "substanceType"));
            }

            String nameValue = textValue(row, "nameValue");
            String nameType = textValue(row, "nameType");
            String langCode = textValue(row, "langCode");
            if (nameValue != null && !nameValue.isEmpty()) {
                NameEntry entry = new NameEntry(nameValue, extractLocalName(nameType), langCode);
                // contains() dedupe relies on the record's equals - cheap since a substance has few names
                if (!names.contains(entry)) {
                    names.add(entry);
                }
            }

            String idValue = textValue(row, "idValue");
            if (idValue != null && !idValue.isEmpty()) {
                IdentifierEntry entry = new IdentifierEntry(idValue);
                if (!identifiers.contains(entry)) {
                    identifiers.add(entry);
                }
            }
        }

        // decorate with Wikidata hits keyed off the preferred name; failure just yields an empty block
        WikidataEnrichment wikidata = enrichFromWikidata(names);

        return new SubstanceDetail(substanceIri, substanceType, names, identifiers, wikidata);
    }

    @Override
    // given one identifier value, find all substances carrying it - shows the same drug across GSRS/FDA
    public List<CrossSourceResult> crossSourceLookup(String identifier) {
        String query = SubstanceSparqlTemplates.crossSource(identifier);
        String body = executeSparql(query);
        JsonNode bindings = parseBindings(body);

        List<CrossSourceResult> results = new ArrayList<>();
        for (JsonNode row : bindings) {
            results.add(new CrossSourceResult(
                    textValue(row, "substance"),
                    textValue(row, "preferredName"),
                    extractLocalName(textValue(row, "substanceType")),
                    deriveSource(textValue(row, "substance")),
                    textValue(row, "identifier")
            ));
        }
        return results;
    }

    // only the PreferredName is worth searching Wikidata with; synonyms would be too noisy
    private WikidataEnrichment enrichFromWikidata(List<NameEntry> names) {
        String preferredName = names.stream()
                .filter(n -> "PreferredName".equals(n.type()))
                .map(NameEntry::value)
                .findFirst()
                .orElse(null);

        if (preferredName == null || preferredName.isBlank()) {
            return new WikidataEnrichment(false, List.of());
        }

        try {
            WikidataSearchResponse response =
                    wikidataEnrichmentService.search(preferredName, WIKIDATA_RESULT_LIMIT);
            // flag=true means "we actually reached Wikidata", separate from whether items came back
            return new WikidataEnrichment(true, response.items());
        } catch (Exception e) {
            // third-party call - never let it break the substance page
            log.warn("Wikidata enrichment failed for '{}': {}", preferredName, e.getMessage());
            return new WikidataEnrichment(false, List.of());
        }
    }

    // single choke point so every query uses the same Accept and Ontop client
    private String executeSparql(String sparql) {
        ResponseEntity<String> response = ontopClient.execute(sparql, ACCEPT_SPARQL_JSON);
        return response.getBody();
    }

    // dig down to results.bindings; on any parse trouble hand back an empty array so callers just loop zero times
    private JsonNode parseBindings(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            return root.path("results").path("bindings");
        } catch (Exception e) {
            return objectMapper.createArrayNode();
        }
    }

    // pull ?var.value out of a sparql-results row, tolerating unbound/OPTIONAL vars (returns null)
    private static String textValue(JsonNode row, String variable) {
        JsonNode node = row.path(variable);
        if (node.isMissingNode() || node.isNull()) {
            return null;
        }
        return node.path("value").asText(null);
    }

    // turn a full IRI/typecode into a short human label - try dash first (our enum-style codes), then #, then /
    static String extractLocalName(String iri) {
        if (iri == null || iri.isEmpty()) {
            return null;
        }
        int dashIdx = iri.lastIndexOf('-');
        if (dashIdx >= 0 && dashIdx < iri.length() - 1) {
            return iri.substring(dashIdx + 1);
        }
        int hashIdx = iri.lastIndexOf('#');
        if (hashIdx >= 0 && hashIdx < iri.length() - 1) {
            return iri.substring(hashIdx + 1);
        }
        int slashIdx = iri.lastIndexOf('/');
        if (slashIdx >= 0 && slashIdx < iri.length() - 1) {
            return iri.substring(slashIdx + 1);
        }
        return iri;
    }

    // no source column exists in the graph, so we read it out of the IRI path segment
    static String deriveSource(String substanceIri) {
        if (substanceIri == null) {
            return "Unknown";
        }
        if (substanceIri.contains("/gsrs/substance/")) {
            return "GSRS";
        }
        if (substanceIri.contains("/fda/substance/")) {
            return "OpenFDA NDC";
        }
        return "Unknown";
    }
}
