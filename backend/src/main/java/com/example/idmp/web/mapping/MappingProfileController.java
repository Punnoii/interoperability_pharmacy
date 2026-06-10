package com.example.idmp.web.mapping;

import com.example.idmp.service.mapping.SourceProfileService;
import com.example.idmp.web.dto.mapping.SourceProfileResponse;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mapping")
@CrossOrigin(origins = "*")
public class MappingProfileController {
  private final SourceProfileService sourceProfileService;

  public MappingProfileController(SourceProfileService sourceProfileService) {
    this.sourceProfileService = sourceProfileService;
  }

  @GetMapping("/profile")
  public SourceProfileResponse profile(
      @RequestParam("catalog") String catalog,
      @RequestParam("schema") String schema,
      @RequestParam("table") String table
  ) {
    return sourceProfileService.profile(catalog, schema, table);
  }
}