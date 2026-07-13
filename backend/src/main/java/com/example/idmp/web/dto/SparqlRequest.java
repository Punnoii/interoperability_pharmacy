package com.example.idmp.web.dto;

import jakarta.validation.constraints.NotBlank;

// body for the raw SPARQL passthrough endpoint, accept picks the response mime
public record SparqlRequest(
    @NotBlank String query,
    String accept
) {}
