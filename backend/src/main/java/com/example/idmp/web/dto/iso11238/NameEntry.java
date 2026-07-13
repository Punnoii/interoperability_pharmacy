package com.example.idmp.web.dto.iso11238;

// one name row — the text plus its type and language
public record NameEntry(String value, String type, String languageCode) {}
