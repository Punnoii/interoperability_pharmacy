package com.example.idmp.web.dto.mapping;

import java.util.List;

// one profiled source column, sample values plus where it might land in ISO IDMP
public record FieldProfile(
    String name,
    String type,
    List<String> samples,
    List<IsoAreaSuggestion> isoAreaSuggestions,
    List<MappingSuggestion> mappingSuggestions
) {}