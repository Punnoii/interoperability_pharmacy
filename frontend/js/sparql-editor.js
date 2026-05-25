/**
 * IDMP OBDA — SPARQL Editor Logic
 *
 * Handles the SPARQL editor page: query execution, sample queries,
 * and result display. Uses IdmpApi.executeSparql() from api.js.
 */
(() => {
  const queryInput = document.getElementById("query");
  const acceptInput = document.getElementById("accept");
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("result");
  const runBtn = document.getElementById("runBtn");
  const rdfSampleBtn = document.getElementById("rdfSampleBtn");
  const selectSampleBtn = document.getElementById("selectSampleBtn");

  const RDF_SAMPLE_QUERY = `CONSTRUCT {
  ?s ?p ?o .
}
WHERE {
  ?s ?p ?o .
}
LIMIT 50`;

  const SELECT_SAMPLE_QUERY = `SELECT ?s ?p ?o
WHERE {
  ?s ?p ?o .
}
LIMIT 25`;

  // Load default query
  queryInput.value = RDF_SAMPLE_QUERY;

  rdfSampleBtn.addEventListener("click", () => {
    queryInput.value = RDF_SAMPLE_QUERY;
    if (acceptInput.value.startsWith("application/sparql-results")) {
      acceptInput.value = "text/turtle";
    }
  });

  selectSampleBtn.addEventListener("click", () => {
    queryInput.value = SELECT_SAMPLE_QUERY;
    if (!(acceptInput.value.includes("sparql-results") || acceptInput.value === "text/csv")) {
      acceptInput.value = "application/sparql-results+json";
    }
  });

  runBtn.addEventListener("click", runQuery);

  async function runQuery() {
    const query = queryInput.value.trim();
    if (!query) {
      renderStatus("Query is empty", true);
      resultEl.textContent = "";
      return;
    }

    renderStatus('<span class="spinner"></span> Running query\u2026', false);
    runBtn.disabled = true;

    try {
      const data = await IdmpApi.executeSparql(query, acceptInput.value);
      const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      renderStatus("Query completed", false, true);
      resultEl.textContent = text;
    } catch (error) {
      renderStatus(error.message, true);
      resultEl.textContent = "";
    } finally {
      runBtn.disabled = false;
    }
  }

  function renderStatus(message, isError, isSuccess) {
    statusEl.innerHTML = message;
    statusEl.classList.remove("error", "ok");
    if (isError) {
      statusEl.classList.add("error");
    } else if (isSuccess) {
      statusEl.classList.add("ok");
    }
  }
})();
