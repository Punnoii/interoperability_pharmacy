package com.example.idmp.web;

import com.example.idmp.service.SparqlCacheService;

import java.util.Map;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cache")
@CrossOrigin(origins = "*")
public class CacheController {

    private final SparqlCacheService cacheService;

    public CacheController(SparqlCacheService cacheService) {
        this.cacheService = cacheService;
    }

    @DeleteMapping("/clear")
    public Map<String, Boolean> clearCache() {
        cacheService.clearAll();
        return Map.of("cleared", true);
    }
}
