package com.example.idmp.web.profile;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.idmp.service.sandbox.SandboxService;
import com.example.idmp.service.sandbox.SandboxService.Sandbox;
import com.example.idmp.web.session.SessionCookieFilter;

import jakarta.servlet.http.HttpServletRequest;

// manages the per-session persisted mapping config (the "profile") that survives sandbox restarts
// allowCredentials=false is fine — the sid rides on the (httpOnly) cookie, not a bearer we need to echo
@RestController
@RequestMapping("/api/profile")
@CrossOrigin(origins = "*", allowCredentials = "false")
public class ProfileController {

  private final SandboxService service;

  public ProfileController(SandboxService service) {
    this.service = service;
  }

  // what's saved for this session — file list plus a convenience exists/count summary
  @GetMapping("/config")
  public Map<String, Object> getConfig(HttpServletRequest req) {
    String sid = SessionCookieFilter.require(req);
    List<Map<String, Object>> files = service.describeProfile(sid);

    // LinkedHashMap so the json keys come out in this order rather than hash order
    Map<String, Object> resp = new LinkedHashMap<>();
    resp.put("sid", sid);
    resp.put("exists", !files.isEmpty());
    resp.put("fileCount", files.size());
    resp.put("files", files);
    return resp;
  }

  // wipe this session's saved profile
  @DeleteMapping("/config")
  public Map<String, Object> deleteConfig(HttpServletRequest req) {
    String sid = SessionCookieFilter.require(req);
    service.deleteProfile(sid);
    return Map.of("deleted", true);
  }

  // rehydrate a live sandbox from the saved profile — 404 if there's nothing stored yet
  @PostMapping("/config/restore")
  public Map<String, Object> restoreConfig(HttpServletRequest req) {
    String sid = SessionCookieFilter.require(req);
    try {
      Sandbox box = service.restoreFromProfile(sid);
      Map<String, Object> resp = new LinkedHashMap<>();
      resp.put("restored", true);
      resp.put("fileCount", box.files.size());
      resp.put("triples", box.model.size());
      return resp;
    } catch (IllegalStateException ex) {
      // service signals "no profile to restore" via ISE; translate that to a 404 for the client
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
    }
  }
}
