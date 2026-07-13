package com.example.idmp.web.dto.mapping;

// candidate template a field could map onto, ranked by confidence
public record MappingSuggestion(
    String templateId,
    String label,
    String isoStandard,
    double confidence,
    String reason,
    String example
) {}