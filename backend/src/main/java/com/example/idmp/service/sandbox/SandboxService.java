package com.example.idmp.service.sandbox;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.apache.jena.query.Dataset;
import org.apache.jena.query.DatasetFactory;
import org.apache.jena.query.Query;
import org.apache.jena.query.QueryExecution;
import org.apache.jena.query.QueryExecutionFactory;
import org.apache.jena.query.QueryFactory;
import org.apache.jena.query.ResultSet;
import org.apache.jena.query.ResultSetFormatter;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.riot.Lang;
import org.apache.jena.riot.RDFDataMgr;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

// per-session scratch space: users upload their own ontology/data, query it in-memory with Jena, optionally persist to disk
@Service
public class SandboxService {

  private static final Logger log = LoggerFactory.getLogger(SandboxService.class);
  // idle sandboxes get swept after 30 min so uploaded data doesn't linger in memory forever
  private static final Duration TTL = Duration.ofMinutes(30);
  // saved profiles live under ~/.rxvkg/profiles/<sid> so they survive restarts
  private static final Path PROFILE_ROOT = Paths.get(
      System.getProperty("user.home"), ".rxvkg", "profiles");

  // live sandboxes keyed by session id; concurrent because uploads and the cleanup task race
  private final Map<String, Sandbox> bySid = new ConcurrentHashMap<>();

  // ingest the uploaded slots; only the "ontology" slot gets parsed into the queryable Jena model, the rest are just stored
  public Sandbox upload(String sid, Map<String, MultipartFile> slots) {
    Sandbox box = new Sandbox(sid);

    for (Map.Entry<String, MultipartFile> e : slots.entrySet()) {
      MultipartFile f = e.getValue();
      if (f == null || f.isEmpty()) continue;
      String slot = e.getKey();
      String name = safeName(f.getOriginalFilename(), slot);
      byte[] bytes;
      try {
        // slurp into memory - sandbox files are small demo uploads, not bulk data
        bytes = f.getBytes();
      } catch (IOException ex) {
        throw new RuntimeException("Failed to read " + slot + ": " + ex.getMessage(), ex);
      }
      box.files.put(slot, new SandboxFile(slot, name, bytes));

      if ("ontology".equals(slot)) {
        loadIntoModel(box.model, bytes, name);
      }
    }

    bySid.put(sid, box);
    log.info("Sandbox [{}] uploaded {} files, {} triples", sid, box.files.size(), box.model.size());
    return box;
  }

  // touch on every read so an actively used sandbox keeps resetting its TTL
  public Sandbox get(String sid) {
    Sandbox box = bySid.get(sid);
    if (box != null) box.touch();
    return box;
  }

  // drop the in-memory sandbox; saved profiles on disk are untouched
  public void clear(String sid) {
    bySid.remove(sid);
  }

  // run arbitrary SPARQL against the session's model, formatting the result to match the query form + Accept
  public String querySparql(String sid, String sparql, String accept) {
    Sandbox box = get(sid);
    if (box == null) {
      throw new IllegalStateException("No sandbox - upload files first");
    }
    if (box.model.isEmpty()) {
      throw new IllegalStateException("Sandbox has no ontology to query");
    }

    Query query = QueryFactory.create(sparql);
    Dataset ds = DatasetFactory.create(box.model);

    // branch on query type - SELECT/ASK go to results JSON(/XML), CONSTRUCT/DESCRIBE come back as Turtle graphs
    try (QueryExecution exec = QueryExecutionFactory.create(query, ds)) {
      if (query.isSelectType()) {
        ResultSet rs = exec.execSelect();
        if (accept != null && accept.contains("xml")) {
          return ResultSetFormatter.asXMLString(rs);
        }
        // serialize straight to JSON — must NOT probe with asText() first, it drains the single-pass ResultSet and JSON would come back empty
        return formatJson(rs);
      }
      if (query.isAskType()) {
        // hand-build the tiny ASK envelope rather than pull in a formatter for a single boolean
        boolean ans = exec.execAsk();
        return "{\"head\":{},\"boolean\":" + ans + "}";
      }
      if (query.isConstructType()) {
        Model out = exec.execConstruct();
        return modelToTurtle(out);
      }
      if (query.isDescribeType()) {
        Model out = exec.execDescribe();
        return modelToTurtle(out);
      }
      throw new IllegalArgumentException("Unsupported query type");
    }
  }

  // Jena writes JSON to a stream, so buffer it and hand back the string
  private String formatJson(ResultSet rs) {
    java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
    ResultSetFormatter.outputAsJSON(baos, rs);
    return baos.toString();
  }

  private String modelToTurtle(Model m) {
    java.io.StringWriter w = new java.io.StringWriter();
    RDFDataMgr.write(w, m, Lang.TURTLE);
    return w.toString();
  }

  // persist the current session's uploaded files to disk under the sid; wipes any prior save first so it's a clean overwrite
  public Path saveAsProfile(String sid) {
    Sandbox box = get(sid);
    if (box == null || box.files.isEmpty()) {
      throw new IllegalStateException("Nothing to save - upload files first");
    }

    Path dir = PROFILE_ROOT.resolve(sid);
    try {
      if (Files.isDirectory(dir)) deleteRecursively(dir);
      Files.createDirectories(dir);
      for (SandboxFile f : box.files.values()) {
        // encode the slot into the filename (slot_original) so restore can recover which slot each file belonged to
        Path target = dir.resolve(f.slot + "_" + f.filename);
        Files.copy(new ByteArrayInputStream(f.bytes), target, StandardCopyOption.REPLACE_EXISTING);
      }
    } catch (IOException ex) {
      throw new RuntimeException("Failed to save profile: " + ex.getMessage(), ex);
    }
    log.info("Profile [{}] saved: {} files", sid, box.files.size());
    return dir;
  }

  // lightweight listing of a saved profile's files for the UI - name/size/mtime, no contents read
  public List<Map<String, Object>> describeProfile(String sid) {
    Path dir = PROFILE_ROOT.resolve(sid);
    if (!Files.isDirectory(dir)) return List.of();

    List<Map<String, Object>> out = new ArrayList<>();
    try (var stream = Files.list(dir)) {
      stream.sorted().forEach(p -> {
        try {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("filename", p.getFileName().toString());
          m.put("size", Files.size(p));
          m.put("modifiedAt", Files.getLastModifiedTime(p).toMillis());
          out.add(m);
        } catch (IOException ignore) {}
      });
    } catch (IOException ex) {
      throw new RuntimeException("Failed to list profile: " + ex.getMessage(), ex);
    }
    return out;
  }

  // remove a saved profile from disk; no-op if it was never saved
  public void deleteProfile(String sid) {
    Path dir = PROFILE_ROOT.resolve(sid);
    if (Files.isDirectory(dir)) {
      try {
        deleteRecursively(dir);
        log.info("Profile [{}] deleted", sid);
      } catch (IOException ex) {
        throw new RuntimeException("Failed to delete profile: " + ex.getMessage(), ex);
      }
    }
  }

  // rebuild an in-memory sandbox from a saved profile, undoing the slot_original filename encoding from saveAsProfile
  public Sandbox restoreFromProfile(String sid) {
    Path dir = PROFILE_ROOT.resolve(sid);
    if (!Files.isDirectory(dir)) {
      throw new IllegalStateException("No saved profile to restore");
    }

    Sandbox box = new Sandbox(sid);
    try (var stream = Files.list(dir)) {
      stream.forEach(p -> {
        String fname = p.getFileName().toString();
        // split on the first underscore: everything before is the slot, after is the original filename
        int us = fname.indexOf('_');
        if (us < 0) return;
        String slot = fname.substring(0, us);
        String original = fname.substring(us + 1);
        try {
          byte[] bytes = Files.readAllBytes(p);
          box.files.put(slot, new SandboxFile(slot, original, bytes));
          if ("ontology".equals(slot)) loadIntoModel(box.model, bytes, original);
        } catch (IOException ignore) {}
      });
    } catch (IOException ex) {
      throw new RuntimeException("Failed to restore: " + ex.getMessage(), ex);
    }

    bySid.put(sid, box);
    log.info("Sandbox [{}] restored from profile: {} files", sid, box.files.size());
    return box;
  }

  // periodic sweep of idle sandboxes; runs every 5 min (needs @EnableScheduling on the app)
  @Scheduled(fixedDelay = 5 * 60 * 1000)
  void cleanup() {
    Instant cutoff = Instant.now().minus(TTL);
    int before = bySid.size();
    bySid.values().removeIf(b -> b.lastUsed.isBefore(cutoff));
    int after = bySid.size();
    if (before != after) {
      log.info("Sandbox cleanup: {} -> {} (removed {})", before, after, before - after);
    }
  }

  // parse RDF into the model; a bad file is warned-and-swallowed so one broken upload doesn't abort the whole session
  private void loadIntoModel(Model model, byte[] bytes, String filename) {
    Lang lang = guessLang(filename);
    try {
      RDFDataMgr.read(model, new ByteArrayInputStream(bytes), lang);
    } catch (Exception ex) {
      log.warn("Failed to parse ontology {}: {}", filename, ex.getMessage());
    }
  }

  // pick the RDF syntax off the extension; default to Turtle when it's anything we don't recognize
  private Lang guessLang(String filename) {
    String low = filename.toLowerCase();
    if (low.endsWith(".ttl")) return Lang.TURTLE;
    if (low.endsWith(".owl")) return Lang.RDFXML;
    if (low.endsWith(".rdf")) return Lang.RDFXML;
    if (low.endsWith(".xml")) return Lang.RDFXML;
    if (low.endsWith(".nt")) return Lang.NTRIPLES;
    if (low.endsWith(".jsonld")) return Lang.JSONLD;
    return Lang.TURTLE;
  }

  // strip any path off the uploaded name (no directory traversal) and fall back to the slot name if it's blank
  private String safeName(String original, String fallback) {
    if (original == null || original.isBlank()) return fallback;
    return Paths.get(original).getFileName().toString();
  }

  // depth-first delete: sort by path depth descending so children go before their parent dir
  private void deleteRecursively(Path root) throws IOException {
    if (!Files.exists(root)) return;
    try (var stream = Files.walk(root)) {
      stream.sorted((a, b) -> b.getNameCount() - a.getNameCount())
          .forEach(p -> {
            try { Files.deleteIfExists(p); } catch (IOException ignore) {}
          });
    }
  }

  // one session's state: the raw files (LinkedHashMap to keep upload order) plus the parsed Jena model and TTL bookkeeping
  public static class Sandbox {
    public final String sid;
    public final Map<String, SandboxFile> files = new LinkedHashMap<>();
    public final Model model = ModelFactory.createDefaultModel();
    public final Instant createdAt = Instant.now();
    public Instant lastUsed = Instant.now();

    Sandbox(String sid) {
      this.sid = sid;
    }

    // bump last-used so the cleanup sweep leaves active sandboxes alone
    void touch() {
      this.lastUsed = Instant.now();
    }
  }

  // one uploaded file held in memory - slot is its role (ontology/data/...), bytes are the raw content
  public static class SandboxFile {
    public final String slot;
    public final String filename;
    public final byte[] bytes;

    SandboxFile(String slot, String filename, byte[] bytes) {
      this.slot = slot;
      this.filename = filename;
      this.bytes = bytes;
    }

    public long size() { return bytes.length; }
  }
}
