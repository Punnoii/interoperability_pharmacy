package com.example.idmp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
// trino jdbc coords for the mapping sandbox, bound from trino.* config
@ConfigurationProperties(prefix = "trino")

public class TrinoProperties {
    private String jdbcUrl = "jdbc:trino://localhost:8090";
    // user is just an identity label for trino here — no password, the sandbox is read-only
    private String user = "mapping-assistant";

    public String getJdbcUrl() {
        return jdbcUrl;
    }
    public void setJdbcUrl(String jdbcUrl) {
        this.jdbcUrl = jdbcUrl;
    }
    public String getUser() {
        return user;
    }
    public void setUser(String user) {
        this.user = user;
    }

}
