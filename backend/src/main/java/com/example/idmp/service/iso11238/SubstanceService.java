package com.example.idmp.service.iso11238;

import java.util.List;

import com.example.idmp.web.dto.iso11238.CrossSourceResult;
import com.example.idmp.web.dto.iso11238.SubstanceDetail;
import com.example.idmp.web.dto.iso11238.SubstanceSummary;

// read side of the ISO 11238 substance model, everything here resolves through Ontop/SPARQL
public interface SubstanceService {

    List<SubstanceSummary> listAll();

    List<SubstanceSummary> searchByName(String keyword);

    SubstanceDetail getDetails(String substanceIri);

    // find substances sharing an identifier across sources (GSRS vs FDA etc), the interoperability payoff
    List<CrossSourceResult> crossSourceLookup(String identifier);
}
