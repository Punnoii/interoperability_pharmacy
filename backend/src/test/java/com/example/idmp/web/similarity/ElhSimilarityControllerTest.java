package com.example.idmp.web.similarity;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.example.idmp.service.similarity.ElhSimilarityService;
import com.example.idmp.service.similarity.ElhSimilarityService.Neighbor;
import com.example.idmp.service.similarity.SparqlExpansionService;

// MockMvc slice over the ELH similarity endpoints, status codes + JSON shapes
@WebMvcTest(ElhSimilarityController.class)
class ElhSimilarityControllerTest {

  @Autowired private MockMvc mvc;
  @MockBean private ElhSimilarityService service;
  @MockBean private SparqlExpansionService expansionService;

  // happy path, score + echoed concepts + method come back as JSON
  @Test
  @DisplayName("POST /pair returns 200 with score on success")
  void pairSuccess() throws Exception {
    when(service.isReady()).thenReturn(true);
    when(service.pairSimilarity("M01AE01", "M01AE02")).thenReturn(new BigDecimal("0.83333"));
    when(service.defaultMethod()).thenReturn("DYNAMIC_SIM");

    mvc.perform(post("/api/similarity/elh/pair")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"conceptA\":\"M01AE01\",\"conceptB\":\"M01AE02\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.score").value(0.83333))
        .andExpect(jsonPath("$.conceptA").value("M01AE01"))
        .andExpect(jsonPath("$.conceptB").value("M01AE02"))
        .andExpect(jsonPath("$.methodUsed").value("DYNAMIC_SIM"));
  }

  // graph still loading, 503 rather than a half-answer
  @Test
  @DisplayName("POST /pair returns 503 when service is not ready")
  void pairUnavailableWhenNotReady() throws Exception {
    when(service.isReady()).thenReturn(false);

    mvc.perform(post("/api/similarity/elh/pair")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"conceptA\":\"M01AE01\",\"conceptB\":\"M01AE02\"}"))
        .andExpect(status().isServiceUnavailable());
  }

  // service returns null for an unknown code, 404
  @Test
  @DisplayName("POST /pair returns 404 when concept is unknown")
  void pairNotFoundWhenServiceReturnsNull() throws Exception {
    when(service.isReady()).thenReturn(true);
    when(service.pairSimilarity(anyString(), anyString())).thenReturn(null);

    mvc.perform(post("/api/similarity/elh/pair")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"conceptA\":\"ZZZ999\",\"conceptB\":\"M01AE02\"}"))
        .andExpect(status().isNotFound());
  }

  // IllegalArgumentException from the service maps to 400
  @Test
  @DisplayName("POST /pair returns 400 when the service rejects the input")
  void pairBadRequestOnIllegalArgument() throws Exception {
    when(service.isReady()).thenReturn(true);
    when(service.pairSimilarity(anyString(), anyString()))
        .thenThrow(new IllegalArgumentException("invalid concept code"));

    mvc.perform(post("/api/similarity/elh/pair")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"conceptA\":\"X\",\"conceptB\":\"M01AE02\"}"))
        .andExpect(status().isBadRequest());
  }

  // /topk echoes the seed + scope prefix and lists neighbours in rank order
  @Test
  @DisplayName("POST /topk returns ranked list with scope prefix")
  void topkSuccess() throws Exception {
    when(service.isReady()).thenReturn(true);
    when(service.topK(eq("M01AE01"), eq(2), eq(2))).thenReturn(List.of(
        new Neighbor("M01AE02", new BigDecimal("0.833")),
        new Neighbor("M01AE03", new BigDecimal("0.833"))));
    when(service.defaultMethod()).thenReturn("DYNAMIC_SIM");
    when(service.scopePrefixOf("M01AE01", 2)).thenReturn("M01");

    mvc.perform(post("/api/similarity/elh/topk")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"concept\":\"M01AE01\",\"k\":2,\"scope\":2}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.concept").value("M01AE01"))
        .andExpect(jsonPath("$.scopePrefix").value("M01"))
        .andExpect(jsonPath("$.results[0].concept").value("M01AE02"))
        .andExpect(jsonPath("$.results[1].concept").value("M01AE03"));
  }

  // /health exposes the ready flag, method, and the metrics map flattened
  @Test
  @DisplayName("GET /health surfaces readiness + metrics")
  void healthSurfacesMetrics() throws Exception {
    when(service.isReady()).thenReturn(true);
    when(service.listConcepts()).thenReturn(List.of("M01AE01", "M01AE02"));
    when(service.defaultMethod()).thenReturn("DYNAMIC_SIM");
    when(service.metrics()).thenReturn(java.util.Map.of(
        "uptimeSeconds", 42L,
        "loadDurationMs", 2818L,
        "totalRequests", 5L));

    mvc.perform(get("/api/similarity/elh/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ready").value(true))
        .andExpect(jsonPath("$.method").value("DYNAMIC_SIM"))
        .andExpect(jsonPath("$.uptimeSeconds").value(42))
        .andExpect(jsonPath("$.totalRequests").value(5));
  }
  
  // /concepts returns both the count and the full list, kept in sync
  @Test
  @DisplayName("GET /concepts returns count and full concept list")
  void conceptsListed() throws Exception {
    when(service.listConcepts()).thenReturn(List.of("M01AE01", "M01AE02", "J01CA04"));

    mvc.perform(get("/api/similarity/elh/concepts"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.count").value(3))
        .andExpect(jsonPath("$.concepts.length()").value(3));
  }
}
