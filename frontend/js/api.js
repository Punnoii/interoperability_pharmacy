/**
 * IDMP OBDA — API Client Module
 *
 * Provides functions to call the Spring Boot backend REST endpoints.
 * Uses vanilla fetch API — no framework dependencies.
 */

const IdmpApi = (() => {
  /** Base URL of the backend. Override via IdmpApi.baseUrl if needed. */
  let _baseUrl = "http://localhost:8082";

  /**
   * Internal helper — sends a request and returns parsed JSON.
   * Throws an Error with a meaningful message on non-OK responses.
   */
  async function _fetchJson(path, options = {}) {
    const url = `${_baseUrl}${path}`;
    let response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      throw new Error(`Network error: unable to reach ${url} — ${err.message}`);
    }

    if (!response.ok) {
      let detail = "";
      try {
        const body = await response.text();
        detail = body ? ` — ${body}` : "";
      } catch (_) {
        /* ignore parse errors */
      }
      throw new Error(`HTTP ${response.status} ${response.statusText}${detail}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    // Some endpoints may return plain text; wrap it so callers always get an object
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (_) {
      return text;
    }
  }

  return {
    /** Get or set the backend base URL (no trailing slash). */
    get baseUrl() {
      return _baseUrl;
    },
    set baseUrl(url) {
      _baseUrl = url.replace(/\/+$/, "");
    },

    /**
     * List all substances.
     * @returns {Promise<Array>} List of SubstanceSummary objects.
     */
    async listSubstances() {
      return _fetchJson("/api/substances");
    },

    /**
     * Search substances by name (case-insensitive contains).
     * @param {string} name — keyword to search for.
     * @returns {Promise<Array>} Matching SubstanceSummary objects.
     */
    async searchSubstances(name) {
      if (!name || !name.trim()) {
        throw new Error("Search name must not be empty");
      }
      const encoded = encodeURIComponent(name.trim());
      return _fetchJson(`/api/substances/search?name=${encoded}`);
    },

    /**
     * Get full details for a single substance.
     * @param {string} iri — the substance IRI.
     * @returns {Promise<Object>} SubstanceDetail object.
     */
    async getSubstanceDetails(iri) {
      if (!iri || !iri.trim()) {
        throw new Error("Substance IRI must not be empty");
      }
      const encoded = encodeURIComponent(iri.trim());
      return _fetchJson(`/api/substances/details?iri=${encoded}`);
    },

    /**
     * Cross-source lookup — find substances sharing the given identifier.
     * @param {string} identifier — identifier value (e.g. UNII code).
     * @returns {Promise<Array>} List of CrossSourceResult objects.
     */
    async crossSourceLookup(identifier) {
      if (!identifier || !identifier.trim()) {
        throw new Error("Identifier must not be empty");
      }
      const encoded = encodeURIComponent(identifier.trim());
      return _fetchJson(`/api/substances/cross-source?identifier=${encoded}`);
    },

    /**
     * Execute a raw SPARQL query via the backend proxy.
     * @param {string} query — SPARQL query string.
     * @param {string} [accept="application/sparql-results+json"] — desired response format.
     * @returns {Promise<Object|string>} Parsed response.
     */
    async executeSparql(query, accept = "application/sparql-results+json") {
      if (!query || !query.trim()) {
        throw new Error("SPARQL query must not be empty");
      }
      const url = `${_baseUrl}/api/sparql`;
      let response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim(), accept }),
        });
      } catch (err) {
        throw new Error(`Network error: unable to reach ${url} — ${err.message}`);
      }

      if (!response.ok) {
        let detail = "";
        try {
          detail = ` — ${await response.text()}`;
        } catch (_) {
          /* ignore */
        }
        throw new Error(`HTTP ${response.status} ${response.statusText}${detail}`);
      }

      const ct = response.headers.get("content-type") || "";
      if (ct.includes("json")) {
        return response.json();
      }
      return response.text();
    },
  };
})();
