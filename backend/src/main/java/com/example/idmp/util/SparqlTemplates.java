package com.example.idmp.util;

// generic SPARQL string builders for the raw entity browser (the iso11238 ones live elsewhere)
public final class SparqlTemplates {
  // static-only holder, don't instantiate
  private SparqlTemplates() {}

  // dump every predicate/object hanging off one IRI - the "show me this node" query
  public static String entityDetails(String iri, int limit) {
    return """
SELECT ?p ?o WHERE {
  <%s> ?p ?o .
}
LIMIT %d
""".formatted(iri, limit);
  }

  // follow one edge in either direction - incoming flips subject/object so you can walk backward
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
