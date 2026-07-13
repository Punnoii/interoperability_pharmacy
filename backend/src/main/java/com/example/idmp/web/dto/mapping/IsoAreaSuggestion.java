package com.example.idmp.web.dto.mapping;

// guess at which ISO IDMP area a field belongs to, with a confidence + why
public record IsoAreaSuggestion(
    String standard,
    String label,
    double confidence,
    String reason
) {}