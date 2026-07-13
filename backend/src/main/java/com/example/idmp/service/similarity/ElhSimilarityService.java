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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;

import com.example.idmp.config.CacheConfig;

import jakarta.annotation.PostConstruct;
import sim.explainer.library.SimExplainer;
import sim.explainer.library.enumeration.ImplementationMethod;

// wraps the SimExplainer ELH-similarity engine over the ATC ontology, loads once at startup, serves concept comparisons
@Service
public class ElhSimilarityService {

  private static final Logger log = LoggerFactory.getLogger(ElhSimilarityService.class);
  private static final String ONTOLOGY_LOCATION = "classpath:ontology/*";
  private static final ImplementationMethod DEFAULT_METHOD = ImplementationMethod.DYNAMIC_SIM;

  // explainer + concept list are swapped atomically so requests never see a half-loaded engine (see rebind/init)
  private final AtomicReference<SimExplainer> explainerRef = new AtomicReference<>();
  private final AtomicReference<List<String>> conceptsRef = new AtomicReference<>(List.of());
  // set copy of the concept list for O(1) "do we know this code" checks
  private final Set<String> knownConceptIndex = ConcurrentHashMap.newKeySet();

  // self-inject so topK's call to cachedNeighbours goes through the proxy and hits @Cacheable
  @Autowired
  @Lazy
  private ElhSimilarityService self;

  private final Map<String, String> conceptLabels = new ConcurrentHashMap<>();

  // scrape ATC code + English prefLabel straight from the ontology text; the "+ turns tolerate one or more quotes around the label
  private static final Pattern OWL_CLASS_START = Pattern.compile(
      "^<http://purl\\.bioontology\\.org/ontology/ATC/([A-Z0-9]+)>\\s+a\\s+owl:Class");
  private static final Pattern PREF_LABEL = Pattern.compile(
      "skos:prefLabel\\s+\"+([^\"]+)\"+@en");

  // ATC hierarchy level, code-prefix length (1=anatomical group ... 5=chemical substance); scope indexes into this
  private static final int[] ATC_PREFIX_LENGTHS = {1, 3, 4, 5};

  private Path ontologyDir;

  // volatile status fields for the /metrics endpoint, written from init, read from any thread
  private volatile long startupEpochMs = 0L;
  private volatile long loadDurationMs = 0L;
  private volatile String lastError = null;
  private volatile long lastErrorEpochMs = 0L;
  private final java.util.concurrent.atomic.AtomicLong totalRequests =
      new java.util.concurrent.atomic.AtomicLong(0);

  // one neighbour = a concept and how similar it scored to the query concept
  public record Neighbor(String concept, BigDecimal score) {}

  // one-time load at boot; SimExplainer wants a directory of files, so we stage the classpath ontology to temp first
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
      // swallow so the app still boots; explainerRef stays null and isReady() gates the endpoints to 503
      log.error("Failed to initialise ElhSimilarityService - similarity endpoints will return 503", ex);
      explainerRef.set(null);
      lastError = ex.getMessage();
      lastErrorEpochMs = System.currentTimeMillis();
    }
  }

  // health/telemetry snapshot for the ops endpoint; lastError only surfaces if init actually failed
  public Map<String, Object> metrics() {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("startupEpochMs", startupEpochMs);
    m.put("uptimeSeconds", startupEpochMs == 0 ? 0 : (System.currentTimeMillis() - startupEpochMs) / 1000);
    m.put("loadDurationMs", loadDurationMs);
    m.put("totalRequests", totalRequests.get());
    if (lastError != null) {
      m.put("lastError", lastError);
      m.put("lastErrorEpochMs", lastErrorEpochMs);
    }
    return m;
  }

  // controllers bump this per call so metrics can report usage
  public void trackRequest() {
    totalRequests.incrementAndGet();
  }

  // null explainer = init failed or hasn't finished; controllers use this to return 503
  public boolean isReady() {
    return explainerRef.get() != null;
  }

  public List<String> listConcepts() {
    return conceptsRef.get();
  }

  // similarity of two specific concepts; null (not an exception) if either code is unknown so callers can 404 cleanly
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

  // same as pairSimilarity but returns SimExplainer's forward/backward breakdown for the "why" view
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
    // must run similarity() first, getExplanationAsJson reads state it leaves behind
    explainer.similarity(DEFAULT_METHOD, a, b);

    org.json.JSONObject json = explainer.getExplanationAsJson(a, b);
    Map<String, Object> raw = json.toMap();

    // rebuild in a fixed key order so the JSON response is stable/readable rather than hash-ordered
    Map<String, Object> ordered = new LinkedHashMap<>();
    ordered.put("conceptA", a);
    ordered.put("conceptB", b);
    if (raw.containsKey("similarity")) ordered.put("similarity", raw.get("similarity"));
    if (raw.containsKey("forward"))    ordered.put("forward",    raw.get("forward"));
    if (raw.containsKey("backward"))   ordered.put("backward",   raw.get("backward"));
    return ordered;
  }

  // top-k neighbours of a concept, restricted to an ATC subtree by scope; null if the concept is unknown
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

    // cache the full sorted neighbour list per (concept,scope) and just slice k off the top, k doesn't affect the compute
    List<Neighbor> all = self.cachedNeighbours(target, safeScope);

    return all.size() <= k ? all : all.subList(0, k);
  }

  // cache key deliberately omits k so different k values reuse the same precomputed list
  @Cacheable(value = CacheConfig.ELH_TOPK, key = "#concept + ':' + #scope")
  public List<Neighbor> cachedNeighbours(String concept, int scope) {
    return computeAllNeighbours(explainerRef.get(), concept, scope);
  }

  // the expensive bit: score target against every candidate in scope, then sort desc (ties broken by code for stable output)
  private List<Neighbor> computeAllNeighbours(SimExplainer explainer, String target, int scope) {
    List<String> all = conceptsRef.get();
    List<String> candidates;
    // scope 0 means compare against the whole ontology; otherwise only siblings sharing the ATC prefix
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
        // one bad pair shouldn't nuke the whole neighbour set, skip it and keep going
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

  // chop an ATC code to the prefix for a given level; Math.min guards codes shorter than the target length
  private static String atcPrefix(String code, int scope) {
    int desired = ATC_PREFIX_LENGTHS[Math.min(scope, ATC_PREFIX_LENGTHS.length) - 1];
    return code.substring(0, Math.min(desired, code.length()));
  }

  // human-readable version of the scope for the UI, "(all)" for scope 0, otherwise the actual prefix
  public String scopePrefixOf(String concept, int scope) {
    if (concept == null) return "";
    int safeScope = Math.max(0, Math.min(scope, ATC_PREFIX_LENGTHS.length));
    if (safeScope == 0) return "(all)";
    return atcPrefix(concept.trim(), safeScope);
  }

  // ATC code, English label, or null if we never scraped one
  public String labelOf(String concept) {
    if (concept == null) return null;
    return conceptLabels.get(concept.trim());
  }

  // scrape labels by hand rather than reparsing with an RDF lib, a class line sets the current code, the next prefLabel line fills it
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
              // reset so a stray later prefLabel doesn't get misattributed to this concept
              currentConcept = null;
            }
          }
        }
      }
    }
  }

  // SimExplainer reads from a real directory, so copy the packaged ontology out of the jar onto disk first
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

  // package-private hook for tests to inspect the staged dir
  Path getOntologyDir() {
    return ontologyDir;
  }

  // package-private hot-swap of the engine (tests use it to inject a stub); mirrors what init sets up
  void rebind(SimExplainer explainer, List<String> concepts) {
    explainerRef.set(explainer);
    List<String> safe = concepts == null ? Collections.emptyList() : List.copyOf(concepts);
    conceptsRef.set(safe);
    knownConceptIndex.clear();
    knownConceptIndex.addAll(safe);
  }
}
