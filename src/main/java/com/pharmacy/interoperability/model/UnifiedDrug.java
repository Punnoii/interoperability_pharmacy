package com.pharmacy.interoperability.model;

public class UnifiedDrug {
    private String source;
    private String originalId;
    private String brandName;
    private String activeIngredient;
    private Double strengthMg;
    private String dosageForm;
    private String route;
    private String manufacturer;
    private String country;

    private String ontologyUri;

    public UnifiedDrug() {
    }

    public UnifiedDrug(String source, String originalId, String brandName, String activeIngredient,
            Double strengthMg, String dosageForm, String route,
            String manufacturer, String country, String ontologyUri) {
        this.source = source;
        this.originalId = originalId;
        this.brandName = brandName;
        this.activeIngredient = activeIngredient;
        this.strengthMg = strengthMg;
        this.dosageForm = dosageForm;
        this.route = route;
        this.manufacturer = manufacturer;
        this.country = country;
        this.ontologyUri = ontologyUri;
    }

    // Getters and Setters

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getOriginalId() {
        return originalId;
    }

    public void setOriginalId(String originalId) {
        this.originalId = originalId;
    }

    public String getBrandName() {
        return brandName;
    }

    public void setBrandName(String brandName) {
        this.brandName = brandName;
    }

    public String getActiveIngredient() {
        return activeIngredient;
    }

    public void setActiveIngredient(String activeIngredient) {
        this.activeIngredient = activeIngredient;
    }

    public Double getStrengthMg() {
        return strengthMg;
    }

    public void setStrengthMg(Double strengthMg) {
        this.strengthMg = strengthMg;
    }

    public String getDosageForm() {
        return dosageForm;
    }

    public void setDosageForm(String dosageForm) {
        this.dosageForm = dosageForm;
    }

    public String getRoute() {
        return route;
    }

    public void setRoute(String route) {
        this.route = route;
    }

    public String getManufacturer() {
        return manufacturer;
    }

    public void setManufacturer(String manufacturer) {
        this.manufacturer = manufacturer;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getOntologyUri() {
        return ontologyUri;
    }

    public void setOntologyUri(String ontologyUri) {
        this.ontologyUri = ontologyUri;
    }
}
