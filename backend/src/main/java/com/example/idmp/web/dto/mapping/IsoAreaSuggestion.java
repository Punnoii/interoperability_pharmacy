package com.example.idmp.web.dto.mapping;

public record IsoAreaSuggestion(
    String standard,
    String label,
    double confidence,
    String reason
) {}