package com.pharmacy.semantic;

import com.pharmacy.Application;
import com.pharmacy.interoperability.model.UnifiedDrug;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = Application.class)
public class SemanticSearchServiceTest {

    @Autowired
    private SemanticSearchService service;

    @Test
    public void testSearchTylenol_ShouldReturnMappedObject() {
        // Warning: This test depends on semantic_output.rdf being present in the
        // working directory
        // or successfully loaded by the service.

        List<UnifiedDrug> results = service.search("Tylenol");

        assertFalse(results.isEmpty(), "Should return results for Tylenol");

        UnifiedDrug drug = results.get(0);
        System.out.println("Found drug: " + drug.getBrandName());
        System.out.println("Substance: " + drug.getActiveIngredient());
        System.out.println("Strength: " + drug.getStrengthMg());
        System.out.println("Form: " + drug.getDosageForm());

        assertEquals("Tylenol", drug.getBrandName());
        // Verify substance (might be "Acetaminophen" or "Substance_Acetaminophen"
        // depending on mapping)
        assertTrue(drug.getActiveIngredient().contains("Acetaminophen"));

        // Verify strength (500)
        assertEquals(500.0, drug.getStrengthMg(), 0.1);

        // Verify Manufacturer
        assertEquals("J&J", drug.getManufacturer());

        // Verify Source is "semantic"
        assertEquals("semantic", drug.getSource());
    }

    @Test
    public void testSearchAdvil_ShouldReturnIbuprofen() {
        List<UnifiedDrug> results = service.search("Advil");
        assertFalse(results.isEmpty());
        UnifiedDrug drug = results.get(0);

        assertEquals("Advil", drug.getBrandName());
        assertTrue(drug.getActiveIngredient().contains("Ibuprofen"));
        assertEquals(200.0, drug.getStrengthMg(), 0.1);
    }
}
