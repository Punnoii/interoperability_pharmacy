package com.example.idmp.service.mapping;

import com.example.idmp.service.TrinoClient;
import com.example.idmp.web.dto.mapping.FieldProfile;
import com.example.idmp.web.dto.mapping.SourceProfileResponse;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class SourceProfileService {
    private final TrinoClient trinoClient;
    private final MappingSuggestionService mappingSuggestionService;

    public SourceProfileService(
        TrinoClient trinoClient,
        MappingSuggestionService mappingSuggestionService
    ) {
    this.trinoClient = trinoClient;
    this.mappingSuggestionService = mappingSuggestionService;
    }

    public SourceProfileResponse profile(String catalog, String schema, String table) {
        validateIdentifier(catalog, "catalog");
        validateIdentifier(schema, "schema");
        validateIdentifier(table, "table");

        List<FieldProfile> fields = new ArrayList<>();

        String sql = "SHOW COLUMNS FROM "
            + quote(catalog) + "."
            + quote(schema) + "."
            + quote(table);

    try (
        Connection connection = trinoClient.getConnection();
        Statement statement = connection.createStatement();
        ResultSet resultSet = statement.executeQuery(sql)
    ) {
        while (resultSet.next()) {
            String columnName = resultSet.getString("Column");
            String columnType = resultSet.getString("Type");
            List<String> samples = sampleValues(connection, catalog, schema, table, columnName);

            fields.add(new FieldProfile(
                columnName,
                columnType,
                samples,
                mappingSuggestionService.suggestIsoAreas(table, columnName, columnType, samples),
                mappingSuggestionService.suggestMappings(table, columnName, columnType, samples)
            ));
        }
    } catch (Exception ex) {
        throw new IllegalStateException("Failed to profile source table", ex);
    }

        return new SourceProfileResponse(catalog, schema, table, fields);
    }

    private static void validateIdentifier(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " is required");
        }
        if (!value.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("Invalid " + name + ": " + value);
        }
    }

    private static String quote(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    private List<String> sampleValues(
        Connection connection,
        String catalog,
        String schema,
        String table,
        String column
    ) {
    String sql = "SELECT CAST(" + quote(column) + " AS varchar) AS sample "
        + "FROM " + quote(catalog) + "." + quote(schema) + "." + quote(table) + " "
        + "WHERE " + quote(column) + " IS NOT NULL "
        + "LIMIT 5";

    List<String> samples = new ArrayList<>();

    try (
        Statement statement = connection.createStatement();
        ResultSet resultSet = statement.executeQuery(sql)
    ) {
        while (resultSet.next()) {
        String value = resultSet.getString("sample");
        if (value != null && !value.isBlank()) {
            samples.add(value);
        }
        }
    } catch (Exception ex) {
        return List.of();
    }

    return samples;
    }  

}

