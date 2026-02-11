package com.example.idmp.util;

public final class SparqlTemplates {
  private SparqlTemplates() {}

  public static String entityDetails(String iri, int limit) {
    return """
SELECT ?p ?o WHERE {
  <%s> ?p ?o .
}
LIMIT %d
""".formatted(iri, limit);
  }

  public static String navigate(String iri, String predicate, boolean incoming, int limit) {
    if (incoming) {
      return """
SELECT ?source WHERE {
  ?source <%s> <%s> .
}
LIMIT %d
""".formatted(predicate, iri, limit);
    }
    return """
SELECT ?target WHERE {
  <%s> <%s> ?target .
}
LIMIT %d
""".formatted(iri, predicate, limit);
  }
}
