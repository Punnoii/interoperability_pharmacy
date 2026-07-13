package com.example.idmp.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

// caffeine-backed caching for the pricier read paths; tunable via sparql.cache.* props
@Configuration
@ConfigurationProperties(prefix = "sparql.cache")
public class CacheConfig {

    // cache names, referenced by @Cacheable on the services so the strings stay in one place
    public static final String SPARQL_RESULTS = "sparqlResults";
    public static final String ELH_TOPK = "elhTopK";
    public static final String SUBSTANCE_QUICK_SEARCH = "substanceQuickSearch";

    private Duration ttl = Duration.ofMinutes(5);
    private int maxEntries = 100;

    // one caffeine spec shared across all three caches, expire-after-write, not access
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager mgr = new CaffeineCacheManager(SPARQL_RESULTS, ELH_TOPK, SUBSTANCE_QUICK_SEARCH);
        mgr.setCaffeine(Caffeine.newBuilder()
                .maximumSize(maxEntries)
                .expireAfterWrite(ttl));
        return mgr;
    }

    public Duration getTtl() {
        return ttl;
    }

    public void setTtl(Duration ttl) {
        this.ttl = ttl;
    }

    public int getMaxEntries() {
        return maxEntries;
    }

    public void setMaxEntries(int maxEntries) {
        this.maxEntries = maxEntries;
    }
}
