package com.example.idmp.service.iso11238;

import java.util.List;

import com.example.idmp.web.dto.iso11238.CrossSourceResult;
import com.example.idmp.web.dto.iso11238.SubstanceDetail;
import com.example.idmp.web.dto.iso11238.SubstanceSummary;

public interface SubstanceService {

    List<SubstanceSummary> listAll();

    List<SubstanceSummary> searchByName(String keyword);

    SubstanceDetail getDetails(String substanceIri);

    List<CrossSourceResult> crossSourceLookup(String identifier);
}
