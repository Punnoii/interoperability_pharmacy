package com.example.idmp.web.dto;

import jakarta.validation.constraints.NotBlank;

public record SparqlRequest(
    @NotBlank String query,
    String accept
) {}
