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
