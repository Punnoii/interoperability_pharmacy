package com.example.idmp.web.dto.iso11238;

import com.example.idmp.web.dto.WikidataSearchItem;
import java.util.List;

public record WikidataEnrichment(boolean wikidataAvailable, List<WikidataSearchItem> items) {}
