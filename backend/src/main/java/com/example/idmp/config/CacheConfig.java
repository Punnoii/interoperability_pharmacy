package com.example.idmp.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
@ConfigurationProperties(prefix = "sparql.cache")
public class CacheConfig {

    public static final String SPARQL_RESULTS = "sparqlResults";
    public static final String ELH_TOPK = "elhTopK";

    private Duration ttl = Duration.ofMinutes(5);
    private int maxEntries = 100;

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager mgr = new CaffeineCacheManager(SPARQL_RESULTS, ELH_TOPK);
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
