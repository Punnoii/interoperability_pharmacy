/**
 * IDMP OBDA — Business UI Logic (app.js)
 *
 * Handles substance search, results table, detail panel,
 * and Wikidata enrichment display.
 * Depends on: api.js (IdmpApi)
 */

(() => {
  "use strict";

  /* ── DOM refs ──────────────────────────────────────────── */
  const searchInput   = document.getElementById("searchInput");
  const typeFilter    = document.getElementById("typeFilter");
  const searchBtn     = document.getElementById("searchBtn");
  const statusEl      = document.getElementById("status");
  const resultsBody   = document.getElementById("resultsBody");
  const detailPanel   = document.getElementById("detailPanel");
  const detailContent = document.getElementById("detailContent");

  /* ── State ─────────────────────────────────────────────── */
  let lastResults = [];
  let selectedIri = null;

  /* ── Badge helper ──────────────────────────────────────── */
  function badgeClass(type) {
    if (!type) return "badge badge-default";
    const t = type.toLowerCase();
    if (t.includes("chemical"))    return "badge badge-chemical";
    if (t.includes("protein"))     return "badge badge-protein";
    if (t.includes("nucleic"))     return "badge badge-nucleic";
    if (t.includes("polymer"))     return "badge badge-polymer";
    if (t.includes("mixture"))     return "badge badge-mixture";
    return "badge badge-default";
  }

  function shortType(type) {
    if (!type) return "Unknown";
    // Extract last segment after / or #
    const seg = type.replace(/.*[/#]/, "");
    // Strip common prefixes like "SubstanceTypeClassifier-"
    return seg.replace(/^SubstanceTypeClassifier-/i, "");
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ── Status helper ─────────────────────────────────────── */
  function setStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = "status" + (type ? " " + type : "");
  }

  function setStatusHtml(html, type) {
    statusEl.innerHTML = html;
    statusEl.className = "status" + (type ? " " + type : "");
  }

  /* ── Search ────────────────────────────────────────────── */
  async function doSearch() {
    const keyword = searchInput.value.trim();
    const typeVal = typeFilter.value;

    // Hide detail panel on new search
    detailPanel.classList.remove("visible");
    selectedIri = null;

    if (!keyword && !typeVal) {
      // Load all substances
      setStatusHtml('<span class="spinner"></span> Loading all substances...', "");
      searchBtn.disabled = true;
      try {
        lastResults = await IdmpApi.listSubstances();
        renderResults(lastResults);
        setStatus(`Found ${lastResults.length} substance(s)`, "ok");
      } catch (err) {
        renderEmptyResults("Error loading substances");
        setStatus("Error: " + err.message, "error");
      } finally {
        searchBtn.disabled = false;
      }
      return;
    }

    if (!keyword) {
      // Type filter only — load all then filter client-side
      setStatusHtml('<span class="spinner"></span> Loading substances...', "");
      searchBtn.disabled = true;
      try {
        lastResults = await IdmpApi.listSubstances();
        const filtered = filterByType(lastResults, typeVal);
        renderResults(filtered);
        setStatus(`Found ${filtered.length} substance(s)` + (typeVal ? ` (type: ${typeVal})` : ""), "ok");
      } catch (err) {
        renderEmptyResults("Error loading substances");
        setStatus("Error: " + err.message, "error");
      } finally {
        searchBtn.disabled = false;
      }
      return;
    }

    // Search by name
    setStatusHtml('<span class="spinner"></span> Searching...', "");
    searchBtn.disabled = true;
    try {
      lastResults = await IdmpApi.searchSubstances(keyword);
      const filtered = typeVal ? filterByType(lastResults, typeVal) : lastResults;
      renderResults(filtered);
      setStatus(`Found ${filtered.length} substance(s) for "${escapeHtml(keyword)}"` + (typeVal ? ` (type: ${typeVal})` : ""), "ok");
    } catch (err) {
      renderEmptyResults("Error searching substances");
      setStatus("Error: " + err.message, "error");
    } finally {
      searchBtn.disabled = false;
    }
  }

  function filterByType(results, typeVal) {
    if (!typeVal) return results;
    return results.filter(r => shortType(r.substanceType).toLowerCase() === typeVal.toLowerCase());
  }

  /* ── Results table ─────────────────────────────────────── */
  function renderResults(results) {
    if (!results || results.length === 0) {
      renderEmptyResults("No substances found");
      return;
    }
    resultsBody.innerHTML = results.map(r => {
      const st = shortType(r.substanceType);
      return `<tr data-iri="${escapeHtml(r.iri)}">
        <td>${escapeHtml(r.preferredName || r.name || "—")}</td>
        <td><span class="${badgeClass(r.substanceType)}">${escapeHtml(st)}</span></td>
        <td>${escapeHtml(r.identifier || "—")}</td>
        <td>${escapeHtml(r.source || "—")}</td>
      </tr>`;
    }).join("");
  }

  function renderEmptyResults(msg) {
    resultsBody.innerHTML = `<tr class="empty-row"><td colspan="4">${escapeHtml(msg)}</td></tr>`;
  }

  /* ── Detail panel ──────────────────────────────────────── */
  async function showDetail(iri) {
    if (!iri) return;
    selectedIri = iri;

    // Highlight selected row
    resultsBody.querySelectorAll("tr").forEach(tr => {
      tr.classList.toggle("selected", tr.dataset.iri === iri);
    });

    detailPanel.classList.add("visible");
    detailContent.innerHTML = '<div class="status"><span class="spinner"></span> Loading details...</div>';

    try {
      const detail = await IdmpApi.getSubstanceDetails(iri);
      renderDetail(detail);
    } catch (err) {
      detailContent.innerHTML = `<div class="status error">Error: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderDetail(detail) {
    const st = shortType(detail.substanceType);
    let html = "";

    // Substance type
    html += `<div class="detail-section">
      <h3>Substance Type</h3>
      <span class="${badgeClass(detail.substanceType)}">${escapeHtml(st)}</span>
    </div>`;

    // Names
    if (detail.names && detail.names.length > 0) {
      html += `<div class="detail-section">
        <h3>Names (${detail.names.length})</h3>
        <ul class="detail-list">`;
      for (const n of detail.names) {
        const nameType = n.type ? n.type.replace(/.*[/#]/, "").replace(/^SubstanceNameClassifier-/i, "") : "—";
        html += `<li>
          <span class="detail-label">${escapeHtml(nameType)}</span>
          <span class="detail-value">${escapeHtml(n.value || "—")}${n.languageCode ? ` <span class="text-muted text-sm">[${escapeHtml(n.languageCode)}]</span>` : ""}</span>
        </li>`;
      }
      html += `</ul></div>`;
    }

    // Identifiers
    if (detail.identifiers && detail.identifiers.length > 0) {
      html += `<div class="detail-section">
        <h3>Identifiers (${detail.identifiers.length})</h3>
        <ul class="detail-list">`;
      for (const id of detail.identifiers) {
        html += `<li>
          <span class="detail-value">${escapeHtml(id.value || "—")}</span>
        </li>`;
      }
      html += `</ul></div>`;
    }

    // Wikidata enrichment
    html += renderWikidata(detail.wikidata);

    // Cross-source matching button
    const firstId = detail.identifiers && detail.identifiers.length > 0 ? detail.identifiers[0].value : null;
    if (firstId) {
      html += `<div class="detail-section">
        <h3>Cross-Source Matching</h3>
        <button class="btn-secondary" id="crossSourceBtn" data-identifier="${escapeHtml(firstId)}">
          Find in other sources (${escapeHtml(firstId)})
        </button>
        <div id="crossSourceResults"></div>
      </div>`;
    }

    // IRI
    html += `<div class="detail-section">
      <h3>IRI</h3>
      <span class="text-sm text-muted" style="word-break:break-all;">${escapeHtml(detail.iri)}</span>
    </div>`;

    detailContent.innerHTML = html;

    // Bind cross-source button
    const csBtn = document.getElementById("crossSourceBtn");
    if (csBtn) {
      csBtn.addEventListener("click", () => doCrossSource(csBtn.dataset.identifier));
    }
  }

  function renderWikidata(wikidata) {
    if (!wikidata) {
      return `<div class="detail-section">
        <h3>Wikidata Enrichment</h3>
        <span class="text-muted text-sm">Not available</span>
      </div>`;
    }

    if (!wikidata.wikidataAvailable || !wikidata.items || wikidata.items.length === 0) {
      return `<div class="detail-section">
        <h3>Wikidata Enrichment</h3>
        <span class="text-muted text-sm">${wikidata.wikidataAvailable === false ? "Wikidata service unavailable" : "No Wikidata matches found"}</span>
      </div>`;
    }

    let html = `<div class="detail-section">
      <h3>Wikidata Enrichment (${wikidata.items.length})</h3>
      <ul class="detail-list">`;
    for (const item of wikidata.items) {
      html += `<li>
        <span class="detail-label">${escapeHtml(item.qid || "")}</span>
        <span class="detail-value">
          <strong>${escapeHtml(item.label || "—")}</strong>
          ${item.description ? `<br><span class="text-muted text-sm">${escapeHtml(item.description)}</span>` : ""}
          ${item.iri ? `<br><a href="${escapeHtml(item.iri)}" target="_blank" rel="noopener" class="text-sm">View on Wikidata</a>` : ""}
        </span>
      </li>`;
    }
    html += `</ul></div>`;
    return html;
  }

  /* ── Cross-source matching ─────────────────────────────── */
  async function doCrossSource(identifier) {
    const container = document.getElementById("crossSourceResults");
    if (!container) return;
    container.innerHTML = '<div class="status"><span class="spinner"></span> Searching across sources...</div>';

    try {
      const results = await IdmpApi.crossSourceLookup(identifier);
      if (!results || results.length === 0) {
        container.innerHTML = '<span class="text-muted text-sm">No cross-source matches found</span>';
        return;
      }
      let html = '<table class="results-table" style="margin-top:8px;"><thead><tr><th>Name</th><th>Type</th><th>Source</th><th>Identifier</th></tr></thead><tbody>';
      for (const r of results) {
        const st = shortType(r.substanceType);
        html += `<tr>
          <td>${escapeHtml(r.preferredName || "—")}</td>
          <td><span class="${badgeClass(r.substanceType)}">${escapeHtml(st)}</span></td>
          <td>${escapeHtml(r.source || "—")}</td>
          <td>${escapeHtml(r.matchedIdentifier || "—")}</td>
        </tr>`;
      }
      html += "</tbody></table>";
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<span class="status error">Error: ${escapeHtml(err.message)}</span>`;
    }
  }

  /* ── Event bindings ────────────────────────────────────── */
  searchBtn.addEventListener("click", doSearch);

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });

  resultsBody.addEventListener("click", (e) => {
    const row = e.target.closest("tr[data-iri]");
    if (row) showDetail(row.dataset.iri);
  });

  // Initial load — show all substances
  renderEmptyResults("Use the search panel above to find substances, or click Search with an empty query to list all.");
})();
