package com.example.idmp.web.dto.mapping;

import java.util.List;

public record SourceProfileResponse(
    String catalog,
    String schema,
    String table,
    List<FieldProfile> fields
) {}