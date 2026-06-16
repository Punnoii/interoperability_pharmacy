package com.example.idmp.service.similarity;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import sim.explainer.library.SimExplainer;
import sim.explainer.library.enumeration.ImplementationMethod;

@Service
public class ElhSimilarityService {

  private static final Logger log = LoggerFactory.getLogger(ElhSimilarityService.class);
  private static final String ONTOLOGY_LOCATION = "classpath:ontology/*";
  private static final ImplementationMethod DEFAULT_METHOD = ImplementationMethod.DYNAMIC_SIM;

  private final AtomicReference<SimExplainer> explainerRef = new AtomicReference<>();
  private final AtomicReference<List<String>> conceptsRef = new AtomicReference<>(List.of());
  private final Set<String> knownConceptIndex = ConcurrentHashMap.newKeySet();

  private final Map<String, List<Neighbor>> topKCache = new ConcurrentHashMap<>();

  private final Map<String, String> conceptLabels = new ConcurrentHashMap<>();

  private static final Pattern OWL_CLASS_START = Pattern.compile(
      "^<http://purl\\.bioontology\\.org/ontology/ATC/([A-Z0-9]+)>\\s+a\\s+owl:Class");
  private static final Pattern PREF_LABEL = Pattern.compile(
      "skos:prefLabel\\s+\"+([^\"]+)\"+@en");

  private static final int[] ATC_PREFIX_LENGTHS = {1, 3, 4, 5};

  private Path ontologyDir;

  private volatile long startupEpochMs = 0L;
  private volatile long loadDurationMs = 0L;
  private volatile String lastError = null;
  private volatile long lastErrorEpochMs = 0L;
  private final java.util.concurrent.atomic.AtomicLong totalRequests =
      new java.util.concurrent.atomic.AtomicLong(0);

  public record Neighbor(String concept, BigDecimal score) {}

  @PostConstruct
  public void init() {
    try {
      ontologyDir = Files.createTempDirectory("elh-ontology-");
      copyClasspathOntologyTo(ontologyDir);

      long started = System.currentTimeMillis();
      SimExplainer explainer = new SimExplainer(ontologyDir.toString());
      List<String> concepts = explainer.retrieveConceptName();
      explainerRef.set(explainer);
      conceptsRef.set(List.copyOf(concepts));
      knownConceptIndex.addAll(concepts);

      loadConceptLabels(ontologyDir);

      loadDurationMs = System.currentTimeMillis() - started;
      startupEpochMs = System.currentTimeMillis();
      log.info("ElhSimilarityService ready: loaded {} concepts ({} labels) in {} ms from {}",
          concepts.size(), conceptLabels.size(), loadDurationMs, ontologyDir);
    } catch (Exception ex) {
      log.error("Failed to initialise ElhSimilarityService - similarity endpoints will return 503", ex);
      explainerRef.set(null);
      lastError = ex.getMessage();
      lastErrorEpochMs = System.currentTimeMillis();
    }
  }

  public Map<String, Object> metrics() {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("startupEpochMs", startupEpochMs);
    m.put("uptimeSeconds", startupEpochMs == 0 ? 0 : (System.currentTimeMillis() - startupEpochMs) / 1000);
    m.put("loadDurationMs", loadDurationMs);
    m.put("totalRequests", totalRequests.get());
    m.put("topKCacheEntries", topKCache.size());
    if (lastError != null) {
      m.put("lastError", lastError);
      m.put("lastErrorEpochMs", lastErrorEpochMs);
    }
    return m;
  }

  public void trackRequest() {
    totalRequests.incrementAndGet();
  }

  public boolean isReady() {
    return explainerRef.get() != null;
  }

  public List<String> listConcepts() {
    return conceptsRef.get();
  }

  public BigDecimal pairSimilarity(String conceptA, String conceptB) {
    SimExplainer explainer = explainerRef.get();
    if (explainer == null) {
      throw new IllegalStateException("ElhSimilarityService is not ready");
    }
    Objects.requireNonNull(conceptA, "conceptA");
    Objects.requireNonNull(conceptB, "conceptB");
    String a = conceptA.trim();
    String b = conceptB.trim();
    if (a.isEmpty() || b.isEmpty()) {
      throw new IllegalArgumentException("conceptA and conceptB must not be blank");
    }
    if (!knownConceptIndex.contains(a) || !knownConceptIndex.contains(b)) {
      return null;
    }
    return explainer.similarity(DEFAULT_METHOD, a, b);
  }

  public String defaultMethod() {
    return DEFAULT_METHOD.name();
  }

  public Map<String, Object> explain(String conceptA, String conceptB) {
    SimExplainer explainer = explainerRef.get();
    if (explainer == null) {
      throw new IllegalStateException("ElhSimilarityService is not ready");
    }
    Objects.requireNonNull(conceptA, "conceptA");
    Objects.requireNonNull(conceptB, "conceptB");
    String a = conceptA.trim();
    String b = conceptB.trim();
    if (a.isEmpty() || b.isEmpty()) {
      throw new IllegalArgumentException("conceptA and conceptB must not be blank");
    }
    if (!knownConceptIndex.contains(a) || !knownConceptIndex.contains(b)) {
      return null;
    }
    explainer.similarity(DEFAULT_METHOD, a, b);

    org.json.JSONObject json = explainer.getExplanationAsJson(a, b);
    Map<String, Object> raw = json.toMap();

    Map<String, Object> ordered = new LinkedHashMap<>();
    ordered.put("conceptA", a);
    ordered.put("conceptB", b);
    if (raw.containsKey("similarity")) ordered.put("similarity", raw.get("similarity"));
    if (raw.containsKey("forward"))    ordered.put("forward",    raw.get("forward"));
    if (raw.containsKey("backward"))   ordered.put("backward",   raw.get("backward"));
    return ordered;
  }

  public List<Neighbor> topK(String concept, int k, int scope) {
    SimExplainer explainer = explainerRef.get();
    if (explainer == null) {
      throw new IllegalStateException("ElhSimilarityService is not ready");
    }
    Objects.requireNonNull(concept, "concept");
    String target = concept.trim();
    if (target.isEmpty()) {
      throw new IllegalArgumentException("concept must not be blank");
    }
    if (!knownConceptIndex.contains(target)) {
      return null;
    }
    if (k <= 0) {
      throw new IllegalArgumentException("k must be > 0");
    }
    int safeScope = Math.max(0, Math.min(scope, ATC_PREFIX_LENGTHS.length));

    String cacheKey = target + ":" + safeScope;
    List<Neighbor> all = topKCache.computeIfAbsent(cacheKey,
        key -> computeAllNeighbours(explainer, target, safeScope));

    return all.size() <= k ? all : all.subList(0, k);
  }

  public int cachedTopKEntries() {
    return topKCache.size();
  }

  private List<Neighbor> computeAllNeighbours(SimExplainer explainer, String target, int scope) {
    List<String> all = conceptsRef.get();
    List<String> candidates;
    if (scope == 0) {
      candidates = all;
    } else {
      String prefix = atcPrefix(target, scope);
      candidates = new ArrayList<>();
      for (String c : all) {
        if (c.startsWith(prefix)) candidates.add(c);
      }
    }
    List<Neighbor> results = new ArrayList<>(Math.max(candidates.size() - 1, 0));
    for (String c : candidates) {
      if (c.equals(target)) continue;
      BigDecimal score;
      try {
        score = explainer.similarity(DEFAULT_METHOD, target, c);
      } catch (RuntimeException ex) {
        log.debug("similarity({}, {}) failed: {}", target, c, ex.getMessage());
        continue;
      }
      if (score != null) {
        results.add(new Neighbor(c, score));
      }
    }
    results.sort(Comparator
        .comparing((Neighbor n) -> n.score, Comparator.reverseOrder())
        .thenComparing(Neighbor::concept));
    log.info("topK precompute for {} (scope={}) -> {} neighbours", target, scope, results.size());
    return List.copyOf(results);
  }

  private static String atcPrefix(String code, int scope) {
    int desired = ATC_PREFIX_LENGTHS[Math.min(scope, ATC_PREFIX_LENGTHS.length) - 1];
    return code.substring(0, Math.min(desired, code.length()));
  }

  public String scopePrefixOf(String concept, int scope) {
    if (concept == null) return "";
    int safeScope = Math.max(0, Math.min(scope, ATC_PREFIX_LENGTHS.length));
    if (safeScope == 0) return "(all)";
    return atcPrefix(concept.trim(), safeScope);
  }

  public String labelOf(String concept) {
    if (concept == null) return null;
    return conceptLabels.get(concept.trim());
  }

  private void loadConceptLabels(Path dir) throws IOException {
    try (java.util.stream.Stream<Path> stream = Files.list(dir)) {
      for (Path file : (Iterable<Path>) stream::iterator) {
        if (!Files.isRegularFile(file)) continue;
        String currentConcept = null;
        for (String line : Files.readAllLines(file)) {
          Matcher mClass = OWL_CLASS_START.matcher(line);
          if (mClass.find()) {
            currentConcept = mClass.group(1);
            continue;
          }
          if (currentConcept != null) {
            Matcher mLabel = PREF_LABEL.matcher(line);
            if (mLabel.find()) {
              conceptLabels.put(currentConcept, mLabel.group(1).trim());
              currentConcept = null;
            }
          }
        }
      }
    }
  }

  private void copyClasspathOntologyTo(Path dir) throws IOException {
    ResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
    Resource[] resources = resolver.getResources(ONTOLOGY_LOCATION);
    if (resources.length == 0) {
      throw new IOException("No ontology files found at " + ONTOLOGY_LOCATION);
    }
    for (Resource res : resources) {
      String filename = res.getFilename();
      if (filename == null || filename.isBlank()) continue;
      Path target = dir.resolve(filename);
      try (InputStream in = res.getInputStream()) {
        Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
      }
      log.debug("Copied ontology resource {} -> {}", filename, target);
    }
  }

  Path getOntologyDir() {
    return ontologyDir;
  }

  void rebind(SimExplainer explainer, List<String> concepts) {
    explainerRef.set(explainer);
    List<String> safe = concepts == null ? Collections.emptyList() : List.copyOf(concepts);
    conceptsRef.set(safe);
    knownConceptIndex.clear();
    knownConceptIndex.addAll(safe);
  }
}
