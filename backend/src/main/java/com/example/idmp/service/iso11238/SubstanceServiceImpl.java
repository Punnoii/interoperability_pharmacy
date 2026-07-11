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

@Service
public class SubstanceServiceImpl implements SubstanceService {

    private static final Logger log = LoggerFactory.getLogger(SubstanceServiceImpl.class);
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
    public SubstanceDetail getDetails(String substanceIri) {
        String query = SubstanceSparqlTemplates.details(substanceIri);
        String body = executeSparql(query);
        JsonNode bindings = parseBindings(body);

        String substanceType = null;
        List<NameEntry> names = new ArrayList<>();
        List<IdentifierEntry> identifiers = new ArrayList<>();

        for (JsonNode row : bindings) {
            if (substanceType == null) {
                substanceType = extractLocalName(textValue(row, "substanceType"));
            }

            String nameValue = textValue(row, "nameValue");
            String nameType = textValue(row, "nameType");
            String langCode = textValue(row, "langCode");
            if (nameValue != null && !nameValue.isEmpty()) {
                NameEntry entry = new NameEntry(nameValue, extractLocalName(nameType), langCode);
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

        WikidataEnrichment wikidata = enrichFromWikidata(names);

        return new SubstanceDetail(substanceIri, substanceType, names, identifiers, wikidata);
    }

    @Override
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
            return new WikidataEnrichment(true, response.items());
        } catch (Exception e) {
            log.warn("Wikidata enrichment failed for '{}': {}", preferredName, e.getMessage());
            return new WikidataEnrichment(false, List.of());
        }
    }

    private String executeSparql(String sparql) {
        ResponseEntity<String> response = ontopClient.execute(sparql, ACCEPT_SPARQL_JSON);
        return response.getBody();
    }

    private JsonNode parseBindings(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            return root.path("results").path("bindings");
        } catch (Exception e) {
            return objectMapper.createArrayNode();
        }
    }

    private static String textValue(JsonNode row, String variable) {
        JsonNode node = row.path(variable);
        if (node.isMissingNode() || node.isNull()) {
            return null;
        }
        return node.path("value").asText(null);
    }

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
