import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiSearch, FiX } from "react-icons/fi";
import PaperCard from "../components/PaperCard";
import MainLayout from "../components/layout/MainLayout";
import { getPapers, searchPapers } from "../services/paperService";
import { toggleBookmark } from "../services/bookmarkService";
import { normalizePaper, toArray } from "../utils/apiData";
import "../styles/WorkspacePages.css";
import "../styles/PapersPage.css";

/* ── tiny toast hook ── */
function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  function showToast(message, type = "info") {
    clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }

  return { toast, showToast };
}

function PapersPage() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(searchQuery);
  const [inputValue, setInputValue] = useState(searchQuery);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const { toast, showToast } = useToast();

  const loadPapers = useCallback(async (keyword = "", pageNum = 0) => {
    try {
      setLoading(true);
      setErrorMessage("");

      const trimmed = keyword.trim();
      const response = trimmed
        ? await searchPapers(trimmed, { page: pageNum, size: 10 })
        : await getPapers({ page: pageNum, size: 10 });

      const items = toArray(response);
      setPapers(items.map(normalizePaper));
      setTotalPages(response?.totalPages ?? 0);
      setTotalElements(response?.totalElements ?? items.length);
      setPage(pageNum);
    } catch (error) {
      console.error("Cannot load papers", error);
      setPapers([]);
      setErrorMessage(error.message || "Couldn't load papers. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setQuery(searchQuery);
    setInputValue(searchQuery);
    loadPapers(searchQuery, 0);
  }, [loadPapers, searchQuery]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    setQuery(inputValue);
    loadPapers(inputValue, 0);
  }

  function handleClearSearch() {
    setInputValue("");
    setQuery("");
    loadPapers("", 0);
  }

  async function handleToggleSaved(id) {
    const paper = papers.find((p) => p.id === id);
    if (!paper) return;

    // Optimistic update
    setPapers((current) =>
      current.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p))
    );

    try {
      await toggleBookmark(id, paper.saved);
      showToast(
        paper.saved ? "Removed from library." : "Saved to your library.",
        paper.saved ? "info" : "success"
      );
    } catch {
      // Rollback
      setPapers((current) =>
        current.map((p) => (p.id === id ? { ...p, saved: paper.saved } : p))
      );
      showToast("Couldn't update bookmark — this feature may not be live yet.", "warning");
    }
  }

  const pageNumbers = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(0);
    if (page > 2) pageNumbers.push("...");
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
      pageNumbers.push(i);
    }
    if (page < totalPages - 3) pageNumbers.push("...");
    pageNumbers.push(totalPages - 1);
  }

  return (
    <MainLayout title="Papers" subtitle="Browse and search research papers">
      <div className="workspace-page papers-page">

        {/* Toolbar */}
        <div className="workspace-toolbar">
          <div className="workspace-toolbar-copy">
            <h2>Research papers</h2>
            <p>
              {loading
                ? "Searching…"
                : errorMessage
                  ? "Showing available results."
                  : query
                    ? `${totalElements} result${totalElements !== 1 ? "s" : ""} for "${query}"`
                    : `${totalElements} papers indexed · page ${page + 1} of ${totalPages || 1}`}
            </p>
          </div>

          <form className="papers-search-form" onSubmit={handleSearchSubmit}>
            <div className="papers-search-wrap">
              <FiSearch className="papers-search-icon" />
              <input
                type="search"
                className="workspace-search papers-search-input"
                placeholder="Search by title, author, keyword…"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              {inputValue && (
                <button
                  type="button"
                  className="papers-search-clear"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <FiX />
                </button>
              )}
            </div>
            <button type="submit" className="workspace-button primary" disabled={loading}>
              Search
            </button>
          </form>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="workspace-notice warning" style={{ marginBottom: 14 }}>
            {errorMessage}
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`papers-toast papers-toast--${toast.type}`}>
            {toast.message}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="workspace-empty" style={{ minHeight: 240 }}>
            <span className="workspace-loading-spinner" />
            Loading papers…
          </div>
        ) : papers.length === 0 ? (
          <div className="workspace-empty">
            {query
              ? `No papers found for "${query}". Try a different term.`
              : "No papers yet — run a sync to populate the database."}
          </div>
        ) : (
          <>
            <article className="workspace-panel">
              <div className="workspace-list">
                {papers.map((paper) => (
                  <PaperCard
                    key={paper.id}
                    {...paper}
                    onBookmark={() => handleToggleSaved(paper.id)}
                  />
                ))}
              </div>
            </article>

            {totalPages > 1 && (
              <div className="cm-pagination">
                <button
                  type="button"
                  className="cm-page-btn"
                  disabled={page === 0}
                  onClick={() => loadPapers(query, page - 1)}
                >
                  ← Prev
                </button>

                {pageNumbers.map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="cm-page-ellipsis">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={`cm-page-btn ${p === page ? "active" : ""}`}
                      onClick={() => loadPapers(query, p)}
                    >
                      {p + 1}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="cm-page-btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => loadPapers(query, page + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default PapersPage;
