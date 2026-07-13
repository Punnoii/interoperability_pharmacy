package com.example.idmp.service.iso11238;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.example.idmp.config.CacheConfig;
import com.example.idmp.service.TrinoClient;
import com.example.idmp.web.dto.iso11238.SubstanceQuickHit;

// type-ahead box: goes straight to the Postgres lookup table via Trino instead of SPARQL, since it has to be fast
@Service
public class SubstanceQuickSearchService {

  private static final Logger log = LoggerFactory.getLogger(SubstanceQuickSearchService.class);

  // Trino gives us the gsrs_uuid; we rebuild the same substance IRI Ontop mints so the detail page links up
  private static final String SUBSTANCE_IRI_PREFIX = "http://example.com/idmp-demo/gsrs/substance/";

  // name_key is a pre-uppercased/normalized column; ORDER BY length puts exact-ish (shortest) matches first
  private static final String SQL = """
      SELECT l.name_key, l.gsrs_uuid, s.unii
      FROM postgres.gsrs.substance_name_lookup l
      JOIN postgres.gsrs.substance s ON s.gsrs_uuid = l.gsrs_uuid
      WHERE l.name_key LIKE ? ESCAPE '\\'
      ORDER BY length(l.name_key), l.name_key
      LIMIT ?
      """;

  private final TrinoClient trinoClient;

  public SubstanceQuickSearchService(TrinoClient trinoClient) {
    this.trinoClient = trinoClient;
  }

  // cache on upper-cased keyword so "asp" and "ASP" share an entry
  @Cacheable(value = CacheConfig.SUBSTANCE_QUICK_SEARCH, key = "#keyword.toUpperCase() + ':' + #limit")
  public List<SubstanceQuickHit> search(String keyword, int limit) {
    String trimmed = keyword == null ? "" : keyword.trim();
    // single char is too noisy to be worth a round trip
    if (trimmed.length() < 2) {
      return List.of();
    }
    int safeLimit = Math.max(1, Math.min(limit, 25));

    // two-pass: prefix matches first (better relevance); only widen to substring if we're short
    List<SubstanceQuickHit> prefix = runQuery(escapeLike(trimmed.toUpperCase()) + "%", safeLimit);
    if (prefix.size() >= safeLimit) {
      return prefix;
    }

    List<SubstanceQuickHit> merged = new ArrayList<>(prefix);
    for (SubstanceQuickHit hit : runQuery("%" + escapeLike(trimmed.toUpperCase()) + "%", safeLimit)) {
      if (merged.size() >= safeLimit) {
        break;
      }
      // dedupe by IRI - the substring pass re-finds the prefix hits
      if (merged.stream().noneMatch(existing -> existing.iri().equals(hit.iri()))) {
        merged.add(hit);
      }
    }
    return merged;
  }

  // one LIKE pass; caller supplies the already-escaped pattern (prefix% or %substring%)
  private List<SubstanceQuickHit> runQuery(String pattern, int limit) {
    List<SubstanceQuickHit> hits = new ArrayList<>();
    try (Connection connection = trinoClient.getConnection();
         PreparedStatement statement = connection.prepareStatement(SQL)) {
      statement.setString(1, pattern);
      statement.setInt(2, limit);
      try (ResultSet rs = statement.executeQuery()) {
        while (rs.next()) {
          String name = rs.getString("name_key");
          String gsrsUuid = rs.getString("gsrs_uuid");
          String unii = rs.getString("unii");
          hits.add(new SubstanceQuickHit(SUBSTANCE_IRI_PREFIX + gsrsUuid, name, unii));
        }
      }
    } catch (Exception e) {
      // type-ahead should degrade to "no results" rather than throw at the user
      log.warn("Quick substance search failed for pattern '{}': {}", pattern, e.toString());
      return List.of();
    }
    return hits;
  }

  // neutralize LIKE wildcards in user input so a typed % or _ matches literally (SQL uses ESCAPE '\')
  private static String escapeLike(String value) {
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
