package com.example.idmp.service.iso11238;

import java.util.List;

import com.example.idmp.web.dto.iso11238.CrossSourceResult;
import com.example.idmp.web.dto.iso11238.SubstanceDetail;
import com.example.idmp.web.dto.iso11238.SubstanceSummary;

/**
 * Business service for ISO 11238 Substance operations.
 * Queries the single SPARQL endpoint via OntopClient and returns typed DTOs.
 */
public interface SubstanceService {

    /**
     * List all substances from every data source.
     * Each entry includes IRI, preferred name, substance type, identifier, and source.
     */
    List<SubstanceSummary> listAll();

    /**
     * Search substances whose name contains the given keyword (case-insensitive).
     */
    List<SubstanceSummary> searchByName(String keyword);

    /**
     * Get full details for a single substance identified by its IRI.
     * Includes all names, identifiers, and substance type.
     */
    SubstanceDetail getDetails(String substanceIri);

    /**
     * Find substances across all data sources that share the given identifier value.
     */
    List<CrossSourceResult> crossSourceLookup(String identifier);
}
