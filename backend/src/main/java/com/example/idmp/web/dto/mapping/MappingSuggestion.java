package com.example.idmp.web.dto.mapping;

public record MappingSuggestion(
    String templateId,
    String label,
    String isoStandard,
    double confidence,
    String reason,
    String example
) {}