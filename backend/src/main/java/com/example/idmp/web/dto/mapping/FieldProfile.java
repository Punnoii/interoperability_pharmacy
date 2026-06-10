package com.example.idmp.web.dto.mapping;

import java.util.List;

public record FieldProfile(
    String name,
    String type,
    List<String> samples,
    List<IsoAreaSuggestion> isoAreaSuggestions,
    List<MappingSuggestion> mappingSuggestions
) {}