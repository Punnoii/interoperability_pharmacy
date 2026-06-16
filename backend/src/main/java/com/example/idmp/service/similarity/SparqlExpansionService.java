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

@Service
public class SparqlExpansionService {

  private static final Logger log = LoggerFactory.getLogger(SparqlExpansionService.class);

  private static final Pattern EXPAND_PATTERN = Pattern.compile(
      "#\\s*@expand\\s*:\\s*(\\?\\w+)" +
      "\\s*=\\s*([A-Z0-9]+)" +
      "\\s*:\\s*k\\s*=\\s*(\\d+)" +
      "(?:\\s*:\\s*scope\\s*=\\s*(\\d+))?" +
      "(?:\\s*:\\s*iri\\s*=\\s*([A-Za-z][\\w-]*:))?" +
      "(?:\\s*:\\s*minScore\\s*=\\s*([\\d.]+))?",
      Pattern.CASE_INSENSITIVE);

  private static final Pattern WHERE_OPEN = Pattern.compile(
      "WHERE\\s*\\{", Pattern.CASE_INSENSITIVE);

  private final ElhSimilarityService similarityService;

  public SparqlExpansionService(ElhSimilarityService similarityService) {
    this.similarityService = similarityService;
  }

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
      int scope = m.group(4) != null ? Integer.parseInt(m.group(4)) : 2;
      String iriPrefix = m.group(5);
      BigDecimal minScore = m.group(6) != null ? new BigDecimal(m.group(6)) : null;

      List<Neighbor> topK;
      try {
        topK = similarityService.topK(seed, k, scope);
      } catch (RuntimeException ex) {
        log.warn("topK({}, {}, {}) failed: {}", seed, k, scope, ex.getMessage());
        continue;
      }
      if (topK == null) {
        log.warn("Unknown concept '{}' — skipping expansion annotation for variable {}", seed, var);
        continue;
      }

      List<Neighbor> filtered = topK;
      if (minScore != null) {
        filtered = new ArrayList<>();
        for (Neighbor n : topK) {
          if (n.score().compareTo(minScore) >= 0) filtered.add(n);
        }
      }

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

    String expandedSparql = entries.isEmpty()
        ? sparql
        : injectValuesIntoWhere(sparql, valuesBlock.toString());

    return new ExpansionResult(sparql, expandedSparql, entries);
  }

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

  private static String injectValuesIntoWhere(String sparql, String valuesBlock) {
    Matcher m = WHERE_OPEN.matcher(sparql);
    if (!m.find()) {
      return sparql + "\n# (no WHERE { found; expansion appended)\n" + valuesBlock;
    }
    int insertAt = m.end();
    return sparql.substring(0, insertAt) + "\n" + valuesBlock + sparql.substring(insertAt);
  }

  public record NeighborDto(String concept, String label, BigDecimal score) {}

  public record ExpansionEntry(
      String variable,
      String seedConcept,
      int k,
      int scope,
      String iriPrefix,
      BigDecimal minScore,
      List<NeighborDto> neighbours
  ) {}

  public record ExpansionResult(
      String originalSparql,
      String expandedSparql,
      List<ExpansionEntry> expansions
  ) {}
}
