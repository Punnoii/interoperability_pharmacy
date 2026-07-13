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

// profiles a raw source table through Trino: columns, sample values, and guessed ISO mappings
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

    // catalog.schema.table -> per-column profile; identifiers go straight into SQL so they're validated hard first
    public SourceProfileResponse profile(String catalog, String schema, String table) {
        validateIdentifier(catalog, "catalog");
        validateIdentifier(schema, "schema");
        validateIdentifier(table, "table");

        List<FieldProfile> fields = new ArrayList<>();

        // SHOW COLUMNS is the cheapest way to get name+type without reading data
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
            // one extra query per column to grab a handful of real values for the heuristics
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

    // these identifiers can't be parameterized, so whitelist to plain SQL-identifier chars = no injection
    private static void validateIdentifier(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " is required");
        }
        if (!value.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("Invalid " + name + ": " + value);
        }
    }

    // double-quote for Trino and escape embedded quotes by doubling them, belt-and-braces with the validation above
    private static String quote(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    // grab up to 5 non-null values as varchar so any column type renders as a preview string
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
        // sampling is nice-to-have; a bad column shouldn't sink the whole profile
        return List.of();
    }

    return samples;
    }  

}

