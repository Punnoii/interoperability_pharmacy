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

@Service
public class SubstanceQuickSearchService {

  private static final Logger log = LoggerFactory.getLogger(SubstanceQuickSearchService.class);

  private static final String SUBSTANCE_IRI_PREFIX = "http://example.com/idmp-demo/gsrs/substance/";

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

  @Cacheable(value = CacheConfig.SUBSTANCE_QUICK_SEARCH, key = "#keyword.toUpperCase() + ':' + #limit")
  public List<SubstanceQuickHit> search(String keyword, int limit) {
    String trimmed = keyword == null ? "" : keyword.trim();
    if (trimmed.length() < 2) {
      return List.of();
    }
    int safeLimit = Math.max(1, Math.min(limit, 25));

    List<SubstanceQuickHit> prefix = runQuery(escapeLike(trimmed.toUpperCase()) + "%", safeLimit);
    if (prefix.size() >= safeLimit) {
      return prefix;
    }

    List<SubstanceQuickHit> merged = new ArrayList<>(prefix);
    for (SubstanceQuickHit hit : runQuery("%" + escapeLike(trimmed.toUpperCase()) + "%", safeLimit)) {
      if (merged.size() >= safeLimit) {
        break;
      }
      if (merged.stream().noneMatch(existing -> existing.iri().equals(hit.iri()))) {
        merged.add(hit);
      }
    }
    return merged;
  }

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
      log.warn("Quick substance search failed for pattern '{}': {}", pattern, e.toString());
      return List.of();
    }
    return hits;
  }

  private static String escapeLike(String value) {
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
