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

@RestController
@RequestMapping("/api/profile")
@CrossOrigin(origins = "*", allowCredentials = "false")
public class ProfileController {

  private final SandboxService service;

  public ProfileController(SandboxService service) {
    this.service = service;
  }

  @GetMapping("/config")
  public Map<String, Object> getConfig(HttpServletRequest req) {
    String sid = SessionCookieFilter.require(req);
    List<Map<String, Object>> files = service.describeProfile(sid);

    Map<String, Object> resp = new LinkedHashMap<>();
    resp.put("sid", sid);
    resp.put("exists", !files.isEmpty());
    resp.put("fileCount", files.size());
    resp.put("files", files);
    return resp;
  }

  @DeleteMapping("/config")
  public Map<String, Object> deleteConfig(HttpServletRequest req) {
    String sid = SessionCookieFilter.require(req);
    service.deleteProfile(sid);
    return Map.of("deleted", true);
  }

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
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
    }
  }
}
