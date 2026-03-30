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
        // LinkedHashMap with accessOrder=true gives LRU behavior;
        // removeEldestEntry enforces the max size.
        this.cache = Collections.synchronizedMap(
                new LinkedHashMap<>(16, 0.75f, true) {
                    @Override
                    protected boolean removeEldestEntry(Map.Entry<String, CacheEntry> eldest) {
                        return size() > maxEntries;
                    }
                }
        );
    }

    /**
     * Returns the cached result if present and not expired.
     */
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

    /**
     * Stores a result in the cache. LRU eviction happens automatically
     * when the cache exceeds maxEntries.
     */
    public void put(String queryHash, String result) {
        cache.put(queryHash, new CacheEntry(result, Instant.now()));
    }

    /**
     * Clears the entire cache.
     */
    public void clearAll() {
        cache.clear();
    }

    /**
     * Returns the current number of entries in the cache (including potentially expired ones).
     */
    public int size() {
        return cache.size();
    }

    /**
     * Computes a SHA-256 hash of the SPARQL query + accept header to use as cache key.
     */
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
            // SHA-256 is guaranteed to be available in every JVM
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
