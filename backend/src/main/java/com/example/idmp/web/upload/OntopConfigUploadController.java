package com.example.idmp.web.upload;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.example.idmp.service.OntopClient;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = "*")
public class OntopConfigUploadController {

  private static final Logger log = LoggerFactory.getLogger(OntopConfigUploadController.class);
  private static final Path STAGING_DIR = Paths.get(
      System.getProperty("user.home"), ".rxvkg", "uploads", "ontop-config");

  private final OntopClient ontopClient;

  public OntopConfigUploadController(OntopClient ontopClient) {
    this.ontopClient = ontopClient;
  }

  @PostMapping("/ontop-config")
  public Map<String, Object> upload(
      @RequestParam(value = "ontology",   required = false) MultipartFile ontology,
      @RequestParam(value = "database",   required = false) MultipartFile database,
      @RequestParam(value = "mapping",    required = false) MultipartFile mapping,
      @RequestParam(value = "properties", required = false) MultipartFile properties,
      @RequestParam(value = "catalog",    required = false) MultipartFile catalog) {

    Map<String, MultipartFile> slots = new LinkedHashMap<>();
    slots.put("ontology",   ontology);
    slots.put("database",   database);
    slots.put("mapping",    mapping);
    slots.put("properties", properties);
    slots.put("catalog",    catalog);

    boolean any = slots.values().stream().anyMatch(f -> f != null && !f.isEmpty());
    if (!any) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
          "At least one file must be provided");
    }

    String stamp = String.valueOf(Instant.now().toEpochMilli());
    Path destDir = STAGING_DIR.resolve(stamp);
    try {
      Files.createDirectories(destDir);
    } catch (IOException ex) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
          "Failed to create staging directory: " + ex.getMessage(), ex);
    }

    Map<String, Object> saved = new LinkedHashMap<>();
    int count = 0;
    for (Map.Entry<String, MultipartFile> e : slots.entrySet()) {
      MultipartFile file = e.getValue();
      if (file == null || file.isEmpty()) continue;
      String original = file.getOriginalFilename();
      String safeName = original == null || original.isBlank()
          ? e.getKey()
          : Paths.get(original).getFileName().toString();
      Path target = destDir.resolve(e.getKey() + "_" + safeName);
      try {
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        saved.put(e.getKey(), Map.of(
            "filename", safeName,
            "size", file.getSize(),
            "path", target.toString()));
        count++;
      } catch (IOException ex) {
        log.warn("Failed to save {}: {}", e.getKey(), ex.getMessage());
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
            "Failed to save " + e.getKey() + ": " + ex.getMessage(), ex);
      }
    }

    log.info("Ontop config upload: {} files saved to {}", count, destDir);

    Map<String, Object> resp = new LinkedHashMap<>();
    resp.put("message", "Saved " + count + " file" + (count == 1 ? "" : "s") + " to staging");
    resp.put("stagingId", stamp);
    resp.put("stagingDir", destDir.toString());
    resp.put("files", saved);
    return resp;
  }

  @GetMapping("/ontop-config/{stagingId}")
  public Map<String, Object> describe(@PathVariable String stagingId) {
    Path dir = resolveStaging(stagingId);
    Map<String, Object> files = new LinkedHashMap<>();
    try (var stream = Files.list(dir)) {
      stream.forEach(p -> {
        try {
          files.put(p.getFileName().toString(), Map.of(
              "size", Files.size(p),
              "path", p.toString()));
        } catch (IOException ignore) {}
      });
    } catch (IOException ex) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
          "Failed to read staging directory: " + ex.getMessage(), ex);
    }
    Map<String, Object> resp = new LinkedHashMap<>();
    resp.put("stagingId", stagingId);
    resp.put("stagingDir", dir.toString());
    resp.put("files", files);
    return resp;
  }

  @PostMapping(value = "/ontop-config/{stagingId}/query", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<String> queryStaged(
      @PathVariable String stagingId,
      @RequestBody Map<String, String> body) {

    Path dir = resolveStaging(stagingId);
    String sparql = body.get("sparql");
    if (sparql == null || sparql.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Field 'sparql' is required");
    }
    String accept = body.getOrDefault("accept", "application/sparql-results+json");

    log.info("Executing SPARQL against staged config {} ({} chars)", stagingId, sparql.length());

    ResponseEntity<String> upstream = ontopClient.execute(sparql, accept);
    return ResponseEntity.status(upstream.getStatusCode())
        .header("X-Staging-Id", stagingId)
        .header("X-Staging-Dir", dir.toString())
        .contentType(upstream.getHeaders().getContentType() != null
            ? upstream.getHeaders().getContentType()
            : MediaType.parseMediaType(accept))
        .body(upstream.getBody());
  }

  @GetMapping("/ontop-config")
  public Map<String, Object> list() {
    List<Map<String, Object>> items = new ArrayList<>();
    if (Files.isDirectory(STAGING_DIR)) {
      try (var stream = Files.list(STAGING_DIR)) {
        stream.filter(Files::isDirectory)
            .sorted((a, b) -> b.getFileName().toString().compareTo(a.getFileName().toString()))
            .forEach(p -> {
              String id = p.getFileName().toString();
              long fileCount = 0;
              try (var inner = Files.list(p)) {
                fileCount = inner.count();
              } catch (IOException ignore) {}
              Map<String, Object> item = new LinkedHashMap<>();
              item.put("stagingId", id);
              item.put("fileCount", fileCount);
              try {
                item.put("createdAtMs", Long.parseLong(id));
              } catch (NumberFormatException ignore) {}
              items.add(item);
            });
      } catch (IOException ex) {
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
            "Failed to list staging: " + ex.getMessage(), ex);
      }
    }
    Map<String, Object> resp = new LinkedHashMap<>();
    resp.put("count", items.size());
    resp.put("items", items);
    return resp;
  }

  private Path resolveStaging(String stagingId) {
    if (stagingId == null || stagingId.isBlank() || !stagingId.matches("[0-9]+")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid stagingId");
    }
    Path dir = STAGING_DIR.resolve(stagingId);
    if (!Files.isDirectory(dir)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Staging not found: " + stagingId);
    }
    return dir;
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<Map<String, Object>> handleTooLarge(MaxUploadSizeExceededException ex) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("error", "File too large");
    body.put("message", "One or more files exceeded the multipart limit. "
        + "Adjust spring.servlet.multipart.max-file-size / max-request-size in application.yml.");
    body.put("limit", ex.getMaxUploadSize());
    return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(body);
  }
}
