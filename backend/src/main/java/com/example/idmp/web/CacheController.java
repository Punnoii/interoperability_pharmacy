package com.example.idmp.web;

import java.util.Map;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// tiny admin surface for flushing the caffeine caches — handy when the underlying data changes mid-demo
@RestController
@RequestMapping("/api/cache")
@CrossOrigin(origins = "*")
public class CacheController {

    private final CacheManager cacheManager;

    public CacheController(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    // nukes every cache we know about, not one by one — no selective eviction on purpose
    @DeleteMapping("/clear")
    public Map<String, Boolean> clearCache() {
        cacheManager.getCacheNames().forEach(name -> {
            Cache cache = cacheManager.getCache(name);
            if (cache != null) cache.clear();
        });
        return Map.of("cleared", true);
    }
}
