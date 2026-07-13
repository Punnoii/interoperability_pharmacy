package com.example.idmp.service.similarity;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

// pins scopePrefixOf, turning a scope number into the right ATC code prefix
class AtcPrefixTest {

  private final ElhSimilarityService service = new ElhSimilarityService();

  // sanity: each scope level (1..4) chops the ATC code to the matching prefix length
  @ParameterizedTest(name = "scope={0} of {1}  →  ''{2}''")
  @CsvSource({
      "1, M01AE01, M",
      "2, M01AE01, M01",
      "3, M01AE01, M01A",
      "4, M01AE01, M01AE",
      "1, J01CA04, J",
      "2, J01CA04, J01",
      "3, J01CA04, J01C",
      "4, J01CA04, J01CA",
      "1, A10BA02, A",
      "2, A10BA02, A10",
      "3, A10BA02, A10B",
      "4, A10BA02, A10BA",
  })
  @DisplayName("scope maps to the expected ATC prefix length")
  void scopeMapsToAtcPrefix(int scope, String code, String expectedPrefix) {
    assertThat(service.scopePrefixOf(code, scope)).isEqualTo(expectedPrefix);
  }

  // scope 0 means no filtering, comes back as the wildcard marker
  @Test
  @DisplayName("scope 0 reports the wildcard '(all)' marker")
  void scopeZeroIsAll() {
    assertThat(service.scopePrefixOf("M01AE01", 0)).isEqualTo("(all)");
  }

  // asking past the last ATC level just gives the full 5-char prefix, no overflow
  @Test
  @DisplayName("scope above 4 is clamped to the maximum prefix length")
  void scopeAboveMaxIsClamped() {
    assertThat(service.scopePrefixOf("M01AE01", 5)).isEqualTo("M01AE");
    assertThat(service.scopePrefixOf("M01AE01", 99)).isEqualTo("M01AE");
  }

  // a code shorter than the requested prefix returns itself, not an index blowup
  @Test
  @DisplayName("short concept codes are not over-read")
  void shortConceptCodesAreSafe() {
    assertThat(service.scopePrefixOf("M", 4)).isEqualTo("M");
    assertThat(service.scopePrefixOf("M", 2)).isEqualTo("M");
    assertThat(service.scopePrefixOf("M01", 4)).isEqualTo("M01");
  }

  // null in doesn't NPE, empty string out
  @Test
  @DisplayName("null concept yields an empty prefix without throwing")
  void nullConceptIsSafe() {
    assertThat(service.scopePrefixOf(null, 2)).isEmpty();
  }

  // leading/trailing spaces get trimmed before the prefix is taken
  @Test
  @DisplayName("whitespace around the code is trimmed")
  void whitespaceIsTrimmed() {
    assertThat(service.scopePrefixOf("  M01AE01  ", 2)).isEqualTo("M01");
  }
}
