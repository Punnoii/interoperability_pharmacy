package com.example.idmp.web.dto.iso11238;

import com.example.idmp.web.dto.WikidataSearchItem;
import java.util.List;

// Wikidata block hung off a substance detail — flag says whether the lookup actually ran
public record WikidataEnrichment(boolean wikidataAvailable, List<WikidataSearchItem> items) {}
