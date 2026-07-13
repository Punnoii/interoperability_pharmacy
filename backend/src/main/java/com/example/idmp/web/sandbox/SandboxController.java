package com.example.idmp.web.sandbox;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.example.idmp.service.sandbox.SandboxService;
import com.example.idmp.service.sandbox.SandboxService.Sandbox;
import com.example.idmp.service.sandbox.SandboxService.SandboxFile;
import com.example.idmp.web.session.SessionCookieFilter;

import jakarta.servlet.http.HttpServletRequest;

// per-session scratch VKG: upload your own ontology/mapping/data and query it in isolation
// allowCredentials=false, session is tracked by the httpOnly sid cookie, no cross-origin creds needed
@RestController
@RequestMapping("/api/sandbox")
@CrossOrigin(origins = "*", allowCredentials = "false")
public class SandboxController {

  private final SandboxService service;

  public SandboxController(SandboxService service) {
    this.service = service;
  }

  // accept the five known file slots (all optional) and (re)build this session's sandbox from them
  @PostMapping("/upload")
  public Map<String, Object> upload(
      HttpServletRequest req,
      @RequestParam(value = "ontology",   required = false) MultipartFile ontology,
      @RequestParam(value = "database",   required = false) MultipartFile database,
      @RequestParam(value = "mapping",    required = false) MultipartFile mapping,
      @RequestParam(value = "properties", required = false) MultipartFile properties,
      @RequestParam(value = "catalog",    required = false) MultipartFile catalog) {

    // fixed slot order so the service always knows which upload is which
    Map<String, MultipartFile> slots = new LinkedHashMap<>();
    slots.put("ontology", ontology);
    slots.put("database", database);
    slots.put("mapping", mapping);
    slots.put("properties", properties);
    slots.put("catalog", catalog);

    // everything's optional individually, but an upload with zero files is a client mistake
    boolean any = slots.values().stream().anyMatch(f -> f != null && !f.isEmpty());
    if (!any) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one file required");
    }

    String sid = SessionCookieFilter.require(req);
    Sandbox box = service.upload(sid, slots);
    return describe(box);
  }

  // what's loaded for this session; distinct {empty:true} shape when nothing's been uploaded yet
  @GetMapping("/status")
  public Map<String, Object> status(HttpServletRequest req) {
    String sid = SessionCookieFilter.require(req);
    Sandbox box = service.get(sid);
    if (box == null) {
      Map<String, Object> empty = new LinkedHashMap<>();
      empty.put("empty", true);
      return empty;
    }
    return describe(box);
  }

  // tear down this session's sandbox (frees the in-memory model)
  @DeleteMapping
  public Map<String, Object> clear(HttpServletRequest req) {
    String sid = SessionCookieFilter.require(req);
    service.clear(sid);
    return Map.of("cleared", true);
  }

  // run SPARQL against the session's own sandbox rather than the shared Ontop endpoint
  @PostMapping(value = "/query", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<String> query(HttpServletRequest req, @RequestBody Map<String, String> body) {
    String sid = SessionCookieFilter.require(req);
    String sparql = body.get("sparql");
    if (sparql == null || sparql.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Field 'sparql' is required");
    }
    String accept = body.getOrDefault("accept", "application/sparql-results+json");
    try {
      String result = service.querySparql(sid, sparql, accept);
      return ResponseEntity.ok().contentType(MediaType.parseMediaType(accept)).body(result);
    } catch (IllegalStateException ex) {
      // no sandbox loaded yet, 409 tells the UI to prompt for an upload first
      throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage());
    } catch (Exception ex) {
      // otherwise assume it's a bad query and bounce it back as a 400
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query error: " + ex.getMessage());
    }
  }

  // persist the current sandbox as the session's durable profile (see ProfileController to restore)
  @PostMapping("/save")
  public Map<String, Object> save(HttpServletRequest req) {
    String sid = SessionCookieFilter.require(req);
    var dir = service.saveAsProfile(sid);
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("saved", true);
    out.put("path", dir.toString());
    out.put("files", service.describeProfile(sid));
    return out;
  }

  // shared response shape for upload/status, sid, counts, and per-slot file metadata
  private Map<String, Object> describe(Sandbox box) {
    Map<String, Object> resp = new LinkedHashMap<>();
    resp.put("sid", box.sid);
    resp.put("fileCount", box.files.size());
    resp.put("createdAt", box.createdAt.toEpochMilli());
    resp.put("triples", box.model.size());

    Map<String, Object> files = new LinkedHashMap<>();
    for (SandboxFile f : box.files.values()) {
      files.put(f.slot, Map.of("filename", f.filename, "size", f.size()));
    }
    resp.put("files", files);
    return resp;
  }

  // turn spring's oversized-multipart error into a clean 413 with the configured limit
  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<Map<String, Object>> tooLarge(MaxUploadSizeExceededException ex) {
    return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of(
        "error", "File too large",
        "limit", ex.getMaxUploadSize()));
  }
}
