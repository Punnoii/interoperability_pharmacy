package com.example.idmp.config;

import java.time.Duration;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.client.ClientHttpRequestFactories;
import org.springframework.boot.web.client.ClientHttpRequestFactorySettings;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties({
    OntopProperties.class,
    CacheConfig.class,
    TrinoProperties.class
})

public class OntopConfig {
  @Bean
  @Primary
  public RestClient restClient(RestClient.Builder builder) {
    return builder
        .requestFactory(ClientHttpRequestFactories.get(ClientHttpRequestFactorySettings.DEFAULTS
            .withConnectTimeout(Duration.ofSeconds(10))
            .withReadTimeout(Duration.ofSeconds(120))))
        .build();
  }

  @Bean
  public RestClient wikidataRestClient(RestClient.Builder builder) {
    return builder
        .requestFactory(ClientHttpRequestFactories.get(ClientHttpRequestFactorySettings.DEFAULTS
            .withConnectTimeout(Duration.ofSeconds(5))
            .withReadTimeout(Duration.ofSeconds(8))))
        .build();
  }
}
