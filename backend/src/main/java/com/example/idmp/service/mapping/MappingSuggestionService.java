package com.example.idmp.service.mapping;

import com.example.idmp.web.dto.mapping.IsoAreaSuggestion;
import com.example.idmp.web.dto.mapping.MappingSuggestion;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

// dumb-but-useful keyword heuristics that guess which ISO IDMP area/mapping a source column belongs to
@Service
public class MappingSuggestionService {

  // returns every ISO area whose keyword set the column name hits - scores are hand-tuned confidence hints for the UI
  public List<IsoAreaSuggestion> suggestIsoAreas(
      String table,
      String column,
      String type,
      List<String> samples
  ) {
    String columnText = normalize(column);
    List<IsoAreaSuggestion> suggestions = new ArrayList<>();

    if (containsAny(columnText, "unii", "substance_class", "formula", "smiles", "molecular")) {
      suggestions.add(new IsoAreaSuggestion(
          "ISO 11238",
          "Substances",
          0.95,
          "Field/table text suggests substance identity, structure, or substance code data"
      ));
    }

    if (containsAny(columnText, "product_ndc", "package_ndc", "ndc", "labeler", "product", "package")) {
      suggestions.add(new IsoAreaSuggestion(
          "ISO 11615",
          "Medicinal Products",
          0.85,
          "Field/table text suggests medicinal product or package identification"
      ));
    }

    if (containsAny(columnText, "dosage", "dose_form", "route")) {
      suggestions.add(new IsoAreaSuggestion(
          "ISO 11239",
          "Dose Forms and Routes",
          0.85,
          "Field/table text suggests dose form or route of administration"
      ));
    }

    if (containsAny(columnText, "strength", "unit", "numerator", "denominator", "quantity")) {
      suggestions.add(new IsoAreaSuggestion(
          "ISO 11240",
          "Units of Measurement",
          0.85,
          "Field/table text suggests strength, quantity, or unit information"
      ));
    }

    return suggestions;
  }

  // one step more specific than areas - proposes a concrete target field + the RDF triple pattern to emit
  public List<MappingSuggestion> suggestMappings(
      String table,
      String column,
      String type,
      List<String> samples
  ) {
    String columnText = normalize(column);
    List<MappingSuggestion> suggestions = new ArrayList<>();

    if (containsAny(columnText, "unii", "approvalid")) {
      suggestions.add(new MappingSuggestion(
          "substance_identifier",
          "Substance Identifier",
          "ISO 11238",
          0.95,
          "Column name or sample values suggest a UNII/substance identifier",
          ":substance/{value} cmns-id:isIdentifiedBy :identifier/{value} ."
      ));
    }

    if (containsAny(columnText, "name", "display_name", "standard_name")) {
      suggestions.add(new MappingSuggestion(
          "substance_name",
          "Substance Name",
          "ISO 11238",
          0.85,
          "Column name suggests a human-readable substance name",
          ":substance/{id} idmp-sub:hasSubstanceName :substance-name/{id} ."
      ));
    }

    if (containsAny(columnText, "product_ndc")) {
      suggestions.add(new MappingSuggestion(
          "medicinal_product_identifier",
          "Medicinal Product Identifier",
          "ISO 11615",
          0.90,
          "Column name suggests an NDC product identifier",
          ":product/{id} cmns-id:isIdentifiedBy :mpid/{product_ndc} ."
      ));
    }

    if (containsAny(columnText, "package_ndc")) {
      suggestions.add(new MappingSuggestion(
          "package_identifier",
          "Package Identifier",
          "ISO 11615",
          0.90,
          "Column name suggests an NDC package identifier",
          ":package/{id} cmns-id:isIdentifiedBy :pcid/{package_ndc} ."
      ));
    }

    if (containsAny(columnText, "smiles", "formula", "molecular_weight")) {
      suggestions.add(new MappingSuggestion(
          "substance_structure_attribute",
          "Substance Structure Attribute",
          "ISO 11238",
          0.75,
          "Column name suggests chemical structure or molecular property data",
          ":substance/{id} idmp-sub:hasSubstanceStructureInformation :structure/{id} ."
      ));
    }

    return suggestions;
  }

  // lowercase with ROOT locale so matching is stable regardless of server locale (dodges the Turkish-i trap)
  private static String normalize(String value) {
    return value == null ? "" : value.toLowerCase(Locale.ROOT);
  }

  private static boolean containsAny(String text, String... needles) {
    for (String needle : needles) {
      if (text.contains(needle)) {
        return true;
      }
    }
    return false;
  }
}
