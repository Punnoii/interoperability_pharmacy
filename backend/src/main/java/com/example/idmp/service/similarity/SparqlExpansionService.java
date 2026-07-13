package com.example.idmp.service.similarity;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.idmp.service.similarity.ElhSimilarityService.Neighbor;

// lets users write a magic "# @expand:" comment in their SPARQL and rewrites it into a VALUES block of similar ATC codes
@Service
public class SparqlExpansionService {

  private static final Logger log = LoggerFactory.getLogger(SparqlExpansionService.class);

  // matches the annotation shape:  # @expand:?var=CODE:k=N[:scope=N][:iri=prefix:][:minScore=x]
  // groups 4/5/6 are optional; iri prefix must end in ':' so it reads as a real SPARQL prefixed name
  private static final Pattern EXPAND_PATTERN = Pattern.compile(
      "#\\s*@expand\\s*:\\s*(\\?\\w+)" +
      "\\s*=\\s*([A-Z0-9]+)" +
      "\\s*:\\s*k\\s*=\\s*(\\d+)" +
      "(?:\\s*:\\s*scope\\s*=\\s*(\\d+))?" +
      "(?:\\s*:\\s*iri\\s*=\\s*([A-Za-z][\\w-]*:))?" +
      "(?:\\s*:\\s*minScore\\s*=\\s*([\\d.]+))?",
      Pattern.CASE_INSENSITIVE);

  // used to find where the VALUES block should be spliced in
  private static final Pattern WHERE_OPEN = Pattern.compile(
      "WHERE\\s*\\{", Pattern.CASE_INSENSITIVE);

  private final ElhSimilarityService similarityService;

  public SparqlExpansionService(ElhSimilarityService similarityService) {
    this.similarityService = similarityService;
  }

  // scans for every @expand annotation, resolves neighbours, and returns both the rewritten query and what it did
  public ExpansionResult expand(String sparql) {
    if (sparql == null || sparql.isBlank()) {
      throw new IllegalArgumentException("sparql must not be blank");
    }

    Matcher m = EXPAND_PATTERN.matcher(sparql);
    List<ExpansionEntry> entries = new ArrayList<>();
    StringBuilder valuesBlock = new StringBuilder();

    while (m.find()) {
      String var = m.group(1);
      String seed = m.group(2).toUpperCase();
      int k = Integer.parseInt(m.group(3));
      // scope defaults to 2 (ATC therapeutic subgroup) when the annotation omits it
      int scope = m.group(4) != null ? Integer.parseInt(m.group(4)) : 2;
      String iriPrefix = m.group(5);
      BigDecimal minScore = m.group(6) != null ? new BigDecimal(m.group(6)) : null;

      List<Neighbor> topK;
      try {
        topK = similarityService.topK(seed, k, scope);
      } catch (RuntimeException ex) {
        // engine hiccup on one annotation, log and leave that annotation untouched rather than failing the request
        log.warn("topK({}, {}, {}) failed: {}", seed, k, scope, ex.getMessage());
        continue;
      }
      if (topK == null) {
        // seed isn't a known ATC code, skip so we don't emit a VALUES block with garbage
        log.warn("Unknown concept '{}' - skipping expansion annotation for variable {}", seed, var);
        continue;
      }

      List<Neighbor> filtered = topK;
      if (minScore != null) {
        filtered = new ArrayList<>();
        for (Neighbor n : topK) {
          if (n.score().compareTo(minScore) >= 0) filtered.add(n);
        }
      }

      // always include the seed itself (score 1.0) so the expanded query still matches the original concept
      List<String> concepts = new ArrayList<>(filtered.size() + 1);
      concepts.add(seed);
      List<NeighborDto> nbrDtos = new ArrayList<>(filtered.size() + 1);
      nbrDtos.add(new NeighborDto(seed, similarityService.labelOf(seed), BigDecimal.ONE));
      for (Neighbor n : filtered) {
        concepts.add(n.concept());
        nbrDtos.add(new NeighborDto(n.concept(), similarityService.labelOf(n.concept()), n.score()));
      }

      String values = buildValuesClause(var, concepts, iriPrefix);
      valuesBlock.append("  ").append(values).append("\n");

      entries.add(new ExpansionEntry(var, seed, k, scope, iriPrefix, minScore,
          Collections.unmodifiableList(nbrDtos)));
    }

    // if nothing matched (or everything got skipped), hand back the query untouched
    String expandedSparql = entries.isEmpty()
        ? sparql
        : injectValuesIntoWhere(sparql, valuesBlock.toString());

    return new ExpansionResult(sparql, expandedSparql, entries);
  }

  // render the codes as a SPARQL VALUES clause, prefixed IRIs when an iri= prefix was given, otherwise plain string literals
  private static String buildValuesClause(String var, List<String> concepts, String iriPrefix) {
    StringBuilder sb = new StringBuilder();
    sb.append("VALUES ").append(var).append(" { ");
    boolean first = true;
    for (String c : concepts) {
      if (!first) sb.append(' ');
      if (iriPrefix != null) {
        sb.append(iriPrefix).append(c);
      } else {
        sb.append('"').append(c).append('"');
      }
      first = false;
    }
    sb.append(" }");
    return sb.toString();
  }

  // drop the VALUES block right after the first WHERE { so the bindings are in scope for the pattern
  private static String injectValuesIntoWhere(String sparql, String valuesBlock) {
    Matcher m = WHERE_OPEN.matcher(sparql);
    if (!m.find()) {
      // no WHERE to inject into (ASK/odd query), append it so the caller can still see what we'd have added
      return sparql + "\n# (no WHERE { found; expansion appended)\n" + valuesBlock;
    }
    int insertAt = m.end();
    return sparql.substring(0, insertAt) + "\n" + valuesBlock + sparql.substring(insertAt);
  }

  // API-facing neighbour: adds the human label the raw Neighbor doesn't carry
  public record NeighborDto(String concept, String label, BigDecimal score) {}

  // one resolved annotation, echoes back the parsed params plus the neighbours we found, for the UI to explain the rewrite
  public record ExpansionEntry(
      String variable,
      String seedConcept,
      int k,
      int scope,
      String iriPrefix,
      BigDecimal minScore,
      List<NeighborDto> neighbours
  ) {}

  // before/after pair plus the per-annotation breakdown returned to the client
  public record ExpansionResult(
      String originalSparql,
      String expandedSparql,
      List<ExpansionEntry> expansions
  ) {}
}
