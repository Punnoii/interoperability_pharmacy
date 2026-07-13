package com.example.idmp.web.similarity;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.idmp.service.similarity.ElhSimilarityService;
import com.example.idmp.service.similarity.ElhSimilarityService.Neighbor;
import com.example.idmp.service.similarity.SparqlExpansionService;
import com.example.idmp.web.dto.similarity.ExpandSparqlRequest;
import com.example.idmp.web.dto.similarity.PairSimilarityRequest;
import com.example.idmp.web.dto.similarity.PairSimilarityResponse;
import com.example.idmp.web.dto.similarity.TopKRequest;
import com.example.idmp.web.dto.similarity.TopKResponse;

import jakarta.validation.Valid;

// ELH description-logic similarity over the ATC ontology — the thesis's headline feature
@RestController
@RequestMapping("/api/similarity/elh")
@CrossOrigin(origins = "*")
public class ElhSimilarityController {

  private static final String ONTOLOGY_NAME = "ATC (WHO Anatomical Therapeutic Chemical)";

  private final ElhSimilarityService service;
  private final SparqlExpansionService expansionService;

  public ElhSimilarityController(ElhSimilarityService service,
                                 SparqlExpansionService expansionService) {
    this.service = service;
    this.expansionService = expansionService;
  }

  // similarity between two named concepts; null score means a concept isn't in the ontology (404, not 500)
  @PostMapping("/pair")
  public PairSimilarityResponse pair(@Valid @RequestBody PairSimilarityRequest req) {
    service.trackRequest();
    // the explainer loads lazily at startup; bail with 503 until it's warm
    if (!service.isReady()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "ELH similarity service is not initialised");
    }
    BigDecimal score;
    try {
      score = service.pairSimilarity(req.getConceptA(), req.getConceptB());
    } catch (IllegalArgumentException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
    } catch (RuntimeException ex) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
          "Failed to compute similarity: " + ex.getMessage(), ex);
    }
    if (score == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND,
          "One or both concepts are not present in the ontology");
    }
    return new PairSimilarityResponse(
        req.getConceptA().trim(),
        req.getConceptB().trim(),
        score,
        service.defaultMethod(),
        ONTOLOGY_NAME);
  }

  // top-K nearest concepts to a query concept; scope narrows the candidate set (e.g. same ATC branch)
  @PostMapping("/topk")
  public TopKResponse topK(@Valid @RequestBody TopKRequest req) {
    service.trackRequest();
    if (!service.isReady()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "ELH similarity service is not initialised");
    }
    // time the compute so the response can report how long ranking took
    long started = System.currentTimeMillis();
    List<Neighbor> all;
    try {
      all = service.topK(req.getConcept(), req.getK(), req.getScope());
    } catch (IllegalArgumentException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
    } catch (RuntimeException ex) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
          "Failed to compute top-K: " + ex.getMessage(), ex);
    }
    if (all == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND,
          "Concept '" + req.getConcept() + "' is not present in the ontology");
    }

    String prefix = service.scopePrefixOf(req.getConcept(), req.getScope());

    // decorate each neighbour with a human label for the UI before shipping it out
    List<TopKResponse.Neighbor> dtos = all.stream()
        .map(n -> new TopKResponse.Neighbor(n.concept(), service.labelOf(n.concept()), n.score()))
        .toList();

    return new TopKResponse(
        req.getConcept().trim(),
        req.getK(),
        req.getScope(),
        prefix,
        service.defaultMethod(),
        ONTOLOGY_NAME,
        System.currentTimeMillis() - started,
        dtos);
  }

  // rewrite a SPARQL query to pull in similar concepts via similarity annotations — query expansion
  @PostMapping("/expand-sparql")
  public SparqlExpansionService.ExpansionResult expandSparql(@Valid @RequestBody ExpandSparqlRequest req) {
    service.trackRequest();
    if (!service.isReady()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "ELH similarity service is not initialised");
    }
    try {
      return expansionService.expand(req.getSparql());
    } catch (IllegalArgumentException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
    } catch (RuntimeException ex) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
          "Failed to expand SPARQL: " + ex.getMessage(), ex);
    }
  }

  // why two concepts scored the way they did — the forward/backward mapping tree behind the number
  @GetMapping("/explain")
  public Map<String, Object> explain(
      @RequestParam("a") String a,
      @RequestParam("b") String b) {
    service.trackRequest();
    if (!service.isReady()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "ELH similarity service is not initialised");
    }
    Map<String, Object> result;
    try {
      result = service.explain(a, b);
    } catch (IllegalArgumentException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
    } catch (RuntimeException ex) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
          "Failed to compute explanation: " + ex.getMessage(), ex);
    }
    if (result == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND,
          "One or both concepts are not present in the ontology");
    }
    return result;
  }

  // every concept the explainer knows — feeds the frontend's autocomplete/picker
  @GetMapping("/concepts")
  public Map<String, Object> listConcepts() {
    List<String> concepts = service.listConcepts();
    return Map.of(
        "ontology", ONTOLOGY_NAME,
        "count", concepts.size(),
        "concepts", concepts);
  }

  // readiness + request/timing metrics; doesn't gate on isReady so you can poll it while warming up
  @GetMapping("/health")
  public Map<String, Object> health() {
    Map<String, Object> body = new java.util.LinkedHashMap<>();
    body.put("ready", service.isReady());
    body.put("ontology", ONTOLOGY_NAME);
    body.put("method", service.defaultMethod());
    body.put("concepts", service.listConcepts().size());
    body.putAll(service.metrics());
    return body;
  }
}
