package com.example.idmp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

@Configuration
public class OpenApiConfig {

  // swagger-ui landing metadata; the endpoint list here is hand-maintained, not auto-generated
  @Bean
  public OpenAPI rxvkgOpenAPI() {
    return new OpenAPI().info(new Info()
        .title("RxVKG Similarity API")
        .version("1.0")
        .description("""
            REST API for the RxVKG thesis project — wraps the JSimELHExplainer
            (ELH Description-Logic similarity) library over the WHO ATC ontology.

            Main endpoints:
            • POST /api/similarity/elh/pair         — pair similarity between two ATC concepts
            • POST /api/similarity/elh/topk         — top-K most similar concepts
            • GET  /api/similarity/elh/explain      — explanation tree (forward + backward mappings)
            • POST /api/similarity/elh/expand-sparql — annotation-based SPARQL query expansion
            • GET  /api/similarity/elh/concepts     — list of all known ATC concepts
            • GET  /api/similarity/elh/health       — service readiness + metrics
            """));
  }
}
