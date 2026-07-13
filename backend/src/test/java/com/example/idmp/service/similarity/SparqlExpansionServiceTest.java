package com.example.idmp.service.similarity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import com.example.idmp.service.similarity.ElhSimilarityService.Neighbor;
import com.example.idmp.service.similarity.SparqlExpansionService.ExpansionEntry;
import com.example.idmp.service.similarity.SparqlExpansionService.ExpansionResult;

// covers the @expand rewriter, parsing annotations and splicing VALUES clauses in
class SparqlExpansionServiceTest {

  private ElhSimilarityService similarityService;
  private SparqlExpansionService expander;

  @BeforeEach
  void setUp() {
    similarityService = Mockito.mock(ElhSimilarityService.class);
    expander = new SparqlExpansionService(similarityService);
  }

  // null/empty/whitespace-only all throw rather than sneak through
  @Test
  @DisplayName("blank input is rejected")
  void blankInputRejected() {
    assertThatThrownBy(() -> expander.expand(""))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> expander.expand("   \n  "))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> expander.expand(null))
        .isInstanceOf(IllegalArgumentException.class);
  }

  // no @expand comment, query passes through byte-for-byte, no expansions
  @Test
  @DisplayName("query with no annotation is returned unchanged")
  void noAnnotationPassthrough() {
    String input = "SELECT ?drug WHERE { ?drug a :Drug . }";
    ExpansionResult result = expander.expand(input);
    assertThat(result.originalSparql()).isEqualTo(input);
    assertThat(result.expandedSparql()).isEqualTo(input);
    assertThat(result.expansions()).isEmpty();
  }

  // the seed itself leads the list at score 1.0, then the neighbours, inside WHERE
  @Test
  @DisplayName("single annotation produces a VALUES clause with seed + neighbours")
  void singleAnnotationProducesValuesClause() {
    when(similarityService.topK(eq("M01AE01"), eq(3), eq(2)))
        .thenReturn(List.of(
            new Neighbor("M01AE02", bd("0.833")),
            new Neighbor("M01AE03", bd("0.833")),
            new Neighbor("M01AB01", bd("0.667"))));

    String input = "# @expand:?atc=M01AE01:k=3:scope=2\n"
        + "SELECT ?drug ?atc WHERE { ?drug :hasATC ?atc . }";

    ExpansionResult result = expander.expand(input);

    assertThat(result.expansions()).hasSize(1);
    ExpansionEntry entry = result.expansions().get(0);
    assertThat(entry.variable()).isEqualTo("?atc");
    assertThat(entry.seedConcept()).isEqualTo("M01AE01");
    assertThat(entry.k()).isEqualTo(3);
    assertThat(entry.scope()).isEqualTo(2);
    assertThat(entry.neighbours()).hasSize(4);
    assertThat(entry.neighbours().get(0).concept()).isEqualTo("M01AE01");
    assertThat(entry.neighbours().get(0).score()).isEqualByComparingTo(BigDecimal.ONE);

    assertThat(result.expandedSparql())
        .contains("VALUES ?atc { \"M01AE01\" \"M01AE02\" \"M01AE03\" \"M01AB01\" }");
    int wherePos = result.expandedSparql().indexOf("WHERE {");
    int valuesPos = result.expandedSparql().indexOf("VALUES");
    assertThat(valuesPos).isGreaterThan(wherePos);
  }

  // iri=atc: option renders atc:CODE tokens instead of quoted literals
  @Test
  @DisplayName("IRI prefix option emits prefixed IRIs instead of string literals")
  void iriPrefixOption() {
    when(similarityService.topK(eq("M01AE01"), eq(2), eq(2)))
        .thenReturn(List.of(
            new Neighbor("M01AE02", bd("0.833")),
            new Neighbor("M01AE03", bd("0.833"))));

    String input = "# @expand:?atc=M01AE01:k=2:scope=2:iri=atc:\n"
        + "PREFIX atc: <http://example.org/atc/>\n"
        + "SELECT ?drug ?atc WHERE { ?drug :hasATC ?atc . }";

    ExpansionResult result = expander.expand(input);

    assertThat(result.expandedSparql())
        .contains("VALUES ?atc { atc:M01AE01 atc:M01AE02 atc:M01AE03 }");
    assertThat(result.expansions().get(0).iriPrefix()).isEqualTo("atc:");
  }

  // minScore=0.6 drops anything below the threshold; seed stays regardless
  @Test
  @DisplayName("minScore option filters out low-scoring neighbours")
  void minScoreFiltersLowScores() {
    when(similarityService.topK(eq("M01AE01"), eq(5), eq(2)))
        .thenReturn(List.of(
            new Neighbor("M01AE02", bd("0.833")),
            new Neighbor("M01AB01", bd("0.667")),
            new Neighbor("M01CB01", bd("0.500")),
            new Neighbor("N02BE01", bd("0.167"))));

    String input = "# @expand:?atc=M01AE01:k=5:scope=2:minScore=0.6\n"
        + "SELECT ?drug ?atc WHERE { ?drug :hasATC ?atc . }";

    ExpansionResult result = expander.expand(input);
    ExpansionEntry entry = result.expansions().get(0);

    assertThat(entry.neighbours()).hasSize(3);
    assertThat(entry.neighbours())
        .extracting(SparqlExpansionService.NeighborDto::concept)
        .containsExactly("M01AE01", "M01AE02", "M01AB01");
  }

  // two @expand lines, two VALUES clauses, both variables handled in order
  @Test
  @DisplayName("multiple annotations in one query are all processed")
  void multipleAnnotations() {
    when(similarityService.topK(eq("M01AE01"), anyInt(), anyInt()))
        .thenReturn(List.of(new Neighbor("M01AE02", bd("0.833"))));
    when(similarityService.topK(eq("J01CA04"), anyInt(), anyInt()))
        .thenReturn(List.of(new Neighbor("J01CA01", bd("0.833"))));

    String input = "# @expand:?nsaid=M01AE01:k=1:scope=2\n"
        + "# @expand:?antibiotic=J01CA04:k=1:scope=2\n"
        + "SELECT ?drug WHERE { ?drug :hasATC ?nsaid . ?drug :hasATC ?antibiotic . }";

    ExpansionResult result = expander.expand(input);

    assertThat(result.expansions()).hasSize(2);
    assertThat(result.expansions().get(0).variable()).isEqualTo("?nsaid");
    assertThat(result.expansions().get(1).variable()).isEqualTo("?antibiotic");
    assertThat(result.expandedSparql())
        .contains("VALUES ?nsaid")
        .contains("VALUES ?antibiotic");
  }

  // topK returns null (seed not in the graph), annotation dropped, query untouched
  @Test
  @DisplayName("unknown concept causes the annotation to be skipped silently")
  void unknownConceptIsSkipped() {
    when(similarityService.topK(eq("ZZZZ99"), anyInt(), anyInt())).thenReturn(null);

    String input = "# @expand:?atc=ZZZZ99:k=5:scope=2\n"
        + "SELECT ?drug WHERE { ?drug :hasATC ?atc . }";

    ExpansionResult result = expander.expand(input);

    assertThat(result.expansions()).isEmpty();
    assertThat(result.expandedSparql()).isEqualTo(input);
  }

  // leaving scope off the annotation falls back to level 2
  @Test
  @DisplayName("scope defaults to 2 when omitted")
  void scopeDefaultsToTwo() {
    when(similarityService.topK(eq("M01AE01"), eq(5), eq(2)))
        .thenReturn(List.of(new Neighbor("M01AE02", bd("0.833"))));

    String input = "# @expand:?atc=M01AE01:k=5\nSELECT * WHERE { ?s ?p ?o }";

    ExpansionResult result = expander.expand(input);

    assertThat(result.expansions()).hasSize(1);
    assertThat(result.expansions().get(0).scope()).isEqualTo(2);
  }

  // no WHERE { to splice into, append VALUES at the end with a warning comment
  @Test
  @DisplayName("query without WHERE clause appends VALUES at the end (defensive fallback)")
  void noWhereFallback() {
    when(similarityService.topK(any(), anyInt(), anyInt()))
        .thenReturn(List.of(new Neighbor("M01AE02", bd("0.833"))));

    String input = "# @expand:?atc=M01AE01:k=1:scope=2\nASK { ?s :foo ?o }";

    ExpansionResult result = expander.expand(input);
    assertThat(result.expandedSparql()).contains("# (no WHERE { found");
    assertThat(result.expandedSparql()).contains("VALUES ?atc");
  }

  private static BigDecimal bd(String s) { return new BigDecimal(s); }
}
