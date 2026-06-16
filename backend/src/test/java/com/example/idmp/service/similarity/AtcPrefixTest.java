package com.example.idmp.service.similarity;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class AtcPrefixTest {

  private final ElhSimilarityService service = new ElhSimilarityService();

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

  @Test
  @DisplayName("scope 0 reports the wildcard '(all)' marker")
  void scopeZeroIsAll() {
    assertThat(service.scopePrefixOf("M01AE01", 0)).isEqualTo("(all)");
  }

  @Test
  @DisplayName("scope above 4 is clamped to the maximum prefix length")
  void scopeAboveMaxIsClamped() {
    assertThat(service.scopePrefixOf("M01AE01", 5)).isEqualTo("M01AE");
    assertThat(service.scopePrefixOf("M01AE01", 99)).isEqualTo("M01AE");
  }

  @Test
  @DisplayName("short concept codes are not over-read")
  void shortConceptCodesAreSafe() {
    assertThat(service.scopePrefixOf("M", 4)).isEqualTo("M");
    assertThat(service.scopePrefixOf("M", 2)).isEqualTo("M");
    assertThat(service.scopePrefixOf("M01", 4)).isEqualTo("M01");
  }

  @Test
  @DisplayName("null concept yields an empty prefix without throwing")
  void nullConceptIsSafe() {
    assertThat(service.scopePrefixOf(null, 2)).isEmpty();
  }

  @Test
  @DisplayName("whitespace around the code is trimmed")
  void whitespaceIsTrimmed() {
    assertThat(service.scopePrefixOf("  M01AE01  ", 2)).isEqualTo("M01");
  }
}
