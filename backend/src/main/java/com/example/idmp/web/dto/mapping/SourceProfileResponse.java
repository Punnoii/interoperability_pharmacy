package com.example.idmp.web.dto.mapping;

import java.util.List;

// profiling result for one table, catalog/schema/table coords plus its fields
public record SourceProfileResponse(
    String catalog,
    String schema,
    String table,
    List<FieldProfile> fields
) {}