package com.example.idmp.service;

import com.example.idmp.config.TrinoProperties;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;
import org.springframework.stereotype.Service;

// hands out raw JDBC connections to Trino, callers own closing them (try-with-resources)
@Service
public class TrinoClient {
  private final TrinoProperties properties;

  public TrinoClient(TrinoProperties properties) {
    this.properties = properties;
  }

  // fresh connection per call; Trino's driver only needs a user (no password in this setup)
  public Connection getConnection() throws SQLException {
    Properties connectionProperties = new Properties();
    connectionProperties.setProperty("user", properties.getUser());

    return DriverManager.getConnection(
        properties.getJdbcUrl(),
        connectionProperties
    );
  }
}