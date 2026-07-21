import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiSearch, FiX, FiFilter, FiChevronDown } from "react-icons/fi";
import PaperCard from "../components/PaperCard";
import MainLayout from "../components/layout/MainLayout";
import { getPapers } from "../services/paperService";
import { toggleBookmark } from "../services/bookmarkService";
import { getAllTopics } from "../services/topicService";
import { getAllKeywords } from "../services/keywordService";
import { normalizePaper, toArray, formatNumber } from "../utils/apiData";
import { useAuth } from "../context/useAuth";
import { ROUTE_PATHS } from "../routes/routePaths";
import "../styles/WorkspacePages.css";
import "../styles/PapersPage.css";

/* ── Toast Hook ── */
function useToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function showToast(message, type = "info") {
    setToast({ message, type });
  }

  return { toast, showToast };
}

function PapersPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";

  // Dynamic filter states
  const [searchVal, setSearchVal] = useState(searchQuery);
  const [keywordInput, setKeywordInput] = useState(searchParams.get("keyword") || "");
  const [authorInput, setAuthorInput] = useState(searchParams.get("author") || "");
  const [journalInput, setJournalInput] = useState(searchParams.get("journal") || "");
  const [topicInput, setTopicInput] = useState(searchParams.get("topic") || "all");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [sortBy, setSortBy] = useState("citationCount");
  const [resultsPerPage, setResultsPerPage] = useState(10);

  // Lists for dropdown options
  const [availableTopics, setAvailableTopics] = useState([]);
  const [availableKeywords, setAvailableKeywords] = useState([]);

  // Data states
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const { toast, showToast } = useToast();

  // Load available keywords and topics for filters
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const [topicsRes, keywordsRes] = await Promise.allSettled([
          getAllTopics(),
          getAllKeywords(),
        ]);
        if (topicsRes.status === "fulfilled") {
          setAvailableTopics(toArray(topicsRes.value));
        }
        if (keywordsRes.status === "fulfilled") {
          setAvailableKeywords(toArray(keywordsRes.value));
        }
      } catch (err) {
        // Suppress verbose metadata errors in production logs
        console.warn("Metadata options unavailable", err);
      }
    }
    fetchMetadata();
  }, []);

  // Fetch papers from backend based on dynamic active filters
  const loadPapers = useCallback(async (pageNum = 0, currentSearchQuery = searchVal) => {
    try {
      setLoading(true);
      setErrorMessage("");

      const params = {
        page: pageNum,
        size: resultsPerPage,
        sortBy: sortBy,
        sortDir: "desc",
      };

      if (currentSearchQuery.trim()) params.search = currentSearchQuery.trim();
      if (keywordInput.trim()) params.keyword = keywordInput.trim();
      if (authorInput.trim()) params.author = authorInput.trim();
      if (journalInput.trim()) params.journal = journalInput.trim();
      if (topicInput && topicInput !== "all") params.topic = topicInput;
      if (yearFrom) params.yearFrom = parseInt(yearFrom);
      if (yearTo) params.yearTo = parseInt(yearTo);

      const response = await getPapers(params);
      const items = toArray(response);

      setPapers(
        items.map((p, idx) => ({
          ...normalizePaper(p, idx),
          rank: pageNum * resultsPerPage + idx + 1,
        }))
      );
      setTotalPages(response?.totalPages ?? 0);
      setTotalElements(response?.totalElements ?? items.length);
      setPage(pageNum);
    } catch (error) {
      // Gracefully capture query errors and warn
      console.warn("Papers query load failed", error);
      setPapers([]);
      setErrorMessage(error.message || "Couldn't load papers. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [keywordInput, authorInput, journalInput, topicInput, yearFrom, yearTo, sortBy, resultsPerPage, searchVal]);

  // Trigger search on mount and whenever general searchQuery from URL changes
  useEffect(() => {
    setSearchVal(searchQuery);
    loadPapers(0, searchQuery);
  // The URL query is the trigger; adding loadPapers would also refetch on every filter keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Handle advanced filter submit
  function handleFilterSubmit(e) {
    e.preventDefault();
    loadPapers(0);
  }

  // Reset all advanced filters
  function handleResetFilters() {
    setKeywordInput("");
    setAuthorInput("");
    setJournalInput("");
    setTopicInput("all");
    setYearFrom("");
    setYearTo("");
    setSortBy("citationCount");
    setResultsPerPage(10);
    setSearchVal("");
    setSearchParams({}); // Clear query parameter from URL as well
    
    // Trigger load with empty filters
    setTimeout(() => {
      loadPapers(0, "");
    }, 50);
  }

  // Clear single active filter chip
  function clearFilter(type) {
    if (type === "search") {
      setSearchVal("");
      setSearchParams({});
      loadPapers(0, "");
    } else if (type === "keyword") {
      setKeywordInput("");
      setTimeout(() => loadPapers(0), 50);
    } else if (type === "author") {
      setAuthorInput("");
      setTimeout(() => loadPapers(0), 50);
    } else if (type === "journal") {
      setJournalInput("");
      setTimeout(() => loadPapers(0), 50);
    } else if (type === "topic") {
      setTopicInput("all");
      setTimeout(() => loadPapers(0), 50);
    } else if (type === "year") {
      setYearFrom("");
      setYearTo("");
      setTimeout(() => loadPapers(0), 50);
    } else if (type === "sort") {
      setSortBy("year");
      setTimeout(() => loadPapers(0), 50);
    }
  }

  async function handleToggleSaved(id) {
    if (!isLoggedIn) {
      navigate(ROUTE_PATHS.LOGIN, { state: { from: ROUTE_PATHS.PAPERS } });
      return;
    }
    const paper = papers.find((p) => p.id === id);
    if (!paper) return;

    // Optimistic UI update
    setPapers((current) =>
      current.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p))
    );

    try {
      await toggleBookmark(id, paper.saved);
      showToast(
        paper.saved ? "Removed from bookmarks." : "Saved to your bookmarks.",
        paper.saved ? "info" : "success"
      );
    } catch {
      // Rollback
      setPapers((current) =>
        current.map((p) => (p.id === id ? { ...p, saved: paper.saved } : p))
      );
      showToast("Couldn't update bookmark. Please try again.", "warning");
    }
  }

  // Pagination page numbers list calculation
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

  // Determine active filter chips
  const activeChips = [];
  if (searchVal) activeChips.push({ type: "search", label: `Search: "${searchVal}"` });
  if (keywordInput) activeChips.push({ type: "keyword", label: `Keyword: "${keywordInput}"` });
  if (authorInput) activeChips.push({ type: "author", label: `Author: "${authorInput}"` });
  if (journalInput) activeChips.push({ type: "journal", label: `Journal: "${journalInput}"` });
  if (topicInput && topicInput !== "all") {
    const topicObj = availableTopics.find(t => String(t.id) === String(topicInput) || t.name === topicInput);
    activeChips.push({ type: "topic", label: `Topic: "${topicObj ? topicObj.name : topicInput}"` });
  }
  if (yearFrom || yearTo) {
    activeChips.push({ type: "year", label: `Year: ${yearFrom || "Min"} - ${yearTo || "Max"}` });
  }
  if (sortBy !== "year") {
    const sortLabel = sortBy === "citationCount" ? "Most Cited" : sortBy === "title" ? "Title" : sortBy;
    activeChips.push({ type: "sort", label: `Sort: ${sortLabel}` });
  }

  // Years options list
  const currentYear = new Date().getFullYear() + 1;
  const yearsList = [];
  for (let y = currentYear; y >= 2000; y--) {
    yearsList.push(y);
  }

  return (
    <MainLayout title="Search Papers" subtitle="Discover and explore scientific research papers">
      <div className="search-papers-container">
        
        {/* Main Grid layout containing advanced filters and results columns */}
        <div className="search-papers-grid">
          
          {/* Left Column: Advanced Filters form */}
          <aside className="filters-sidebar-panel">
            <div className="filters-panel-header">
              <h3>
                <FiFilter />
                <span>Advanced Filters</span>
              </h3>
              <button type="button" className="filters-reset-btn" onClick={handleResetFilters}>
                Reset
              </button>
            </div>

            <form onSubmit={handleFilterSubmit} className="filters-form-element">
              
              {/* Keyword Filter */}
              <div className="filter-form-group">
                <label htmlFor="keyword-filter">Keyword</label>
                <div className="filter-input-wrapper">
                  <input
                    id="keyword-filter"
                    type="text"
                    list="paper-keyword-options"
                    placeholder="Search keywords..."
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                  />
                  <datalist id="paper-keyword-options">
                    {availableKeywords.map((keyword, index) => (
                      <option key={keyword.keywordId ?? keyword.id ?? index} value={keyword.name ?? keyword.keyword ?? String(keyword)} />
                    ))}
                  </datalist>
                  <FiSearch />
                </div>
              </div>

              {/* Author Filter */}
              <div className="filter-form-group">
                <label htmlFor="author-filter">Author</label>
                <div className="filter-input-wrapper">
                  <input
                    id="author-filter"
                    type="text"
                    placeholder="Search authors..."
                    value={authorInput}
                    onChange={(e) => setAuthorInput(e.target.value)}
                  />
                  <FiSearch />
                </div>
              </div>

              {/* Journal Filter */}
              <div className="filter-form-group">
                <label htmlFor="journal-filter">Journal</label>
                <div className="filter-input-wrapper">
                  <input
                    id="journal-filter"
                    type="text"
                    placeholder="Search journals..."
                    value={journalInput}
                    onChange={(e) => setJournalInput(e.target.value)}
                  />
                  <FiSearch />
                </div>
              </div>

              {/* Topic Select */}
              <div className="filter-form-group">
                <label htmlFor="topic-filter">Topic</label>
                <div className="filter-select-wrapper">
                  <select
                    id="topic-filter"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                  >
                    <option value="all">Select topics...</option>
                    {availableTopics.map((t) => (
                      <option key={t.id} value={t.name || t.id}>
                        {t.name}
                      </option>
                    ))}
                    {availableTopics.length === 0 && (
                      <>
                        <option value="Artificial Intelligence">Artificial Intelligence</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Bioinformatics">Bioinformatics</option>
                      </>
                    )}
                  </select>
                  <FiChevronDown />
                </div>
              </div>

              {/* Year Range */}
              <div className="filter-form-group">
                <label>Year Range</label>
                <div className="filter-year-range-row">
                  <div className="filter-select-wrapper">
                    <select value={yearFrom} onChange={(e) => setYearFrom(e.target.value)}>
                      <option value="">Min</option>
                      {yearsList.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown />
                  </div>
                  <span className="year-separator">to</span>
                  <div className="filter-select-wrapper">
                    <select value={yearTo} onChange={(e) => setYearTo(e.target.value)}>
                      <option value="">Max</option>
                      {yearsList.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown />
                  </div>
                </div>
              </div>

              {/* Sort By Option */}
              <div className="filter-form-group">
                <label htmlFor="sort-filter">Sort By</label>
                <div className="filter-select-wrapper">
                  <select
                    id="sort-filter"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="citationCount">Most Cited</option>
                    <option value="year">Publication Year</option>
                    <option value="title">Alphabetical Title</option>
                  </select>
                  <FiChevronDown />
                </div>
              </div>

              {/* Results Per Page */}
              <div className="filter-form-group">
                <label htmlFor="size-filter">Results Per Page</label>
                <div className="filter-select-wrapper">
                  <select
                    id="size-filter"
                    value={resultsPerPage}
                    onChange={(e) => setResultsPerPage(parseInt(e.target.value))}
                  >
                    <option value={10}>10 results</option>
                    <option value={25}>25 results</option>
                    <option value={50}>50 results</option>
                  </select>
                  <FiChevronDown />
                </div>
              </div>

              <button type="submit" className="filters-submit-btn-premium">
                Apply Filters
              </button>
            </form>
          </aside>

          {/* Right Column: Search Results and Active Chips */}
          <section className="results-list-section">
            
            {/* Active chips row */}
            <div className="results-chips-toolbar">
              <div className="chips-list-container">
                {activeChips.length > 0 && <span className="chips-label-prefix">Active Filters:</span>}
                {activeChips.map((chip, idx) => (
                  <div key={idx} className="filter-active-chip">
                    <span>{chip.label}</span>
                    <button type="button" onClick={() => clearFilter(chip.type)}>
                      <FiX />
                    </button>
                  </div>
                ))}
                {activeChips.length > 0 && (
                  <button type="button" className="chips-clear-all-link" onClick={handleResetFilters}>
                    Clear all
                  </button>
                )}
              </div>

              <div className="results-toolbar-actions">
                <span className="results-found-count">
                  {loading ? "Searching..." : `${formatNumber(totalElements)} results found`}
                </span>
              </div>
            </div>

            {/* Error notifications */}
            {errorMessage && (
              <div className="workspace-notice warning" style={{ marginBottom: 16 }}>
                {errorMessage}
              </div>
            )}

            {/* Toast overlay */}
            {toast && (
              <div className={`papers-toast papers-toast--${toast.type}`}>
                {toast.message}
              </div>
            )}

            {/* Results block */}
            {loading ? (
              <div className="search-papers-list">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="rich-paper-card skeleton-card" style={{ pointerEvents: "none", opacity: 0.7 }}>
                    <div className="rich-paper-rank-section">
                      <div className="skeleton-line" style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#f0eae1" }} />
                      <div className="skeleton-line" style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#e1d8cb", marginTop: "12px" }} />
                    </div>
                    <div className="rich-paper-details" style={{ flex: 1 }}>
                      <div className="skeleton-line" style={{ width: "80%", height: "20px", background: "#e1d8cb", borderRadius: "4px", marginBottom: "12px" }} />
                      <div className="skeleton-line" style={{ width: "50%", height: "14px", background: "#f0eae1", borderRadius: "4px", marginBottom: "16px" }} />
                      <div className="skeleton-line" style={{ width: "95%", height: "40px", background: "#f5f1ea", borderRadius: "4px", marginBottom: "16px" }} />
                      <div style={{ display: "flex", gap: "8px" }}>
                        <div className="skeleton-line" style={{ width: "60px", height: "22px", background: "#f0eae1", borderRadius: "12px" }} />
                        <div className="skeleton-line" style={{ width: "70px", height: "22px", background: "#f0eae1", borderRadius: "12px" }} />
                      </div>
                    </div>
                    <div className="rich-paper-stats-section" style={{ width: "120px", borderLeft: "1px solid rgba(230, 222, 211, 0.8)", paddingLeft: "16px" }}>
                      <div className="skeleton-line" style={{ width: "50px", height: "12px", background: "#f0eae1", borderRadius: "3px", marginBottom: "8px" }} />
                      <div className="skeleton-line" style={{ width: "45px", height: "28px", background: "#e1d8cb", borderRadius: "4px", marginBottom: "12px" }} />
                      <div className="skeleton-line" style={{ width: "80px", height: "28px", background: "#e1d8cb", borderRadius: "6px" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : papers.length === 0 ? (
              <div className="workspace-empty" style={{ minHeight: 340 }}>
                No research papers match your current filters. Try relaxing your year range or keyword search.
              </div>
            ) : (
              <div className="search-papers-list">
                {papers.map((paper) => (
                  <PaperCard
                    key={paper.id}
                    {...paper}
                    variant="rich"
                    onBookmark={() => handleToggleSaved(paper.id)}
                    detailPath={ROUTE_PATHS.paperDetail(paper.id)}
                  />
                ))}
              </div>
            )}

            {/* Pagination controls */}
            {!loading && totalPages > 1 && (
              <div className="cm-pagination" style={{ marginTop: 24 }}>
                <button
                  type="button"
                  className="cm-page-btn"
                  disabled={page === 0}
                  onClick={() => loadPapers(page - 1)}
                >
                  Previous
                </button>

                {pageNumbers.map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="cm-page-ellipsis">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={`cm-page-btn ${p === page ? "active" : ""}`}
                      onClick={() => loadPapers(p)}
                    >
                      {p + 1}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="cm-page-btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => loadPapers(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </section>

        </div>
      </div>
    </MainLayout>
  );
}

export default PapersPage;
