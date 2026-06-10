package com.example.idmp.service;

import com.example.idmp.config.CacheConfig;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class SparqlCacheService {

    private final Map<String, CacheEntry> cache;
    private final Duration ttl;
    private final int maxEntries;

    record CacheEntry(String result, Instant createdAt) {
        boolean isExpired(Duration ttl) {
            return Instant.now().isAfter(createdAt.plus(ttl));
        }
    }

    public SparqlCacheService(CacheConfig config) {
        this.ttl = config.getTtl();
        this.maxEntries = config.getMaxEntries();
        this.cache = Collections.synchronizedMap(
                new LinkedHashMap<>(16, 0.75f, true) {
                    @Override
                    protected boolean removeEldestEntry(Map.Entry<String, CacheEntry> eldest) {
                        return size() > maxEntries;
                    }
                }
        );
    }

    
    public Optional<String> get(String queryHash) {
        CacheEntry entry = cache.get(queryHash);
        if (entry == null) {
            return Optional.empty();
        }
        if (entry.isExpired(ttl)) {
            cache.remove(queryHash);
            return Optional.empty();
        }
        return Optional.of(entry.result());
    }

    
    public void put(String queryHash, String result) {
        cache.put(queryHash, new CacheEntry(result, Instant.now()));
    }

    
    public void clearAll() {
        cache.clear();
    }

    
    public int size() {
        return cache.size();
    }

    
    public static String computeHash(String query, String accept) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String raw = query + "|" + (accept == null ? "" : accept);
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
