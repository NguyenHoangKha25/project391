import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiBarChart2,
  FiBookOpen,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiColumns,
  FiCompass,
  FiCopy,
  FiGitBranch,
  FiHash,
  FiLayers,
  FiMap,
  FiMaximize2,
  FiMinimize2,
  FiMinus,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShare2,
  FiTag,
  FiTarget,
  FiTrash2,
  FiTrendingDown,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/useAuth";
import { getAllKeywords } from "../services/keywordService";
import { comparePapers, getPapers } from "../services/paperService";
import { getResearchMindMap } from "../services/researchService";
import { getAllTopics } from "../services/topicService";
import { ROUTE_PATHS } from "../routes/routePaths";
import {
  formatNumber,
  normalizeKeyword,
  normalizePaper,
  normalizeTopic,
  toArray,
} from "../utils/apiData";
import "../styles/ResearchLabPage.css";

const MAX_COMPARISON_PAPERS = 4;
const MIN_COMPARISON_PAPERS = 2;
const COMPARATOR_PAGE_SIZE = 4;
const MAP_WIDTH = 1180;
const MAP_MIN_HEIGHT = 640;
const MAP_ZOOM_MIN = 60;
const MAP_ZOOM_MAX = 180;
const MAP_ZOOM_STEP = 10;
const MAP_NODE_WIDTH = 240;
const MAP_NODE_HEIGHT = 68;
const MAP_TYPE_ORDER = ["TOPIC", "KEYWORD", "JOURNAL", "UNKNOWN"];
const MAP_TYPE_META = {
  TOPIC: { label: "Topics", shortLabel: "T", relation: "Related topics" },
  KEYWORD: { label: "Keywords", shortLabel: "K", relation: "Related keywords" },
  JOURNAL: { label: "Journals", shortLabel: "J", relation: "Published in" },
  UNKNOWN: { label: "Evidence", shortLabel: "E", relation: "Related evidence" },
};
const RESEARCH_EVIDENCE_STANDARDS = {
  EXPLORATORY: {
    label: "Exploratory scan",
    shortLabel: "Explore",
    minimumPapers: 1,
    description: "Keep early signals visible for broad discovery.",
  },
  REVIEW: {
    label: "Literature review",
    shortLabel: "Review",
    minimumPapers: 5,
    description: "Require a usable starting set before shortlisting.",
  },
  DEFENSE: {
    label: "Proposal defense",
    shortLabel: "Defend",
    minimumPapers: 10,
    description: "Prioritize directions with stronger catalog coverage.",
  },
};

function stringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeAbstractAnalysis(value = {}) {
  const analysis = value && typeof value === "object" ? value : {};
  const objectiveHighlights = stringList(analysis.objectiveHighlights ?? analysis.objective_highlights);
  const problemHighlights = stringList(analysis.problemHighlights ?? analysis.problem_highlights);
  const methodHighlights = stringList(analysis.methodHighlights ?? analysis.method_highlights);
  const resultHighlights = stringList(analysis.resultHighlights ?? analysis.result_highlights);
  const hasHighlights = [objectiveHighlights, problemHighlights, methodHighlights, resultHighlights]
    .some((items) => items.length > 0);

  return {
    source: String(analysis.source || (hasHighlights ? "ABSTRACT_AVAILABLE" : "ABSTRACT_NOT_AVAILABLE")).toUpperCase(),
    objectiveHighlights,
    problemHighlights,
    methodHighlights,
    resultHighlights,
  };
}

function formatSimilarity(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "0%";
  return `${Math.round(Math.max(0, Math.min(1, numericValue)) * 100)}%`;
}

function normalizeComparison(response = {}) {
  const payload = response?.data ?? response;
  const papers = Array.isArray(payload.papers)
    ? payload.papers.map((item, index) => {
        const rawPaper = item?.paper ?? {};
        const normalized = normalizePaper(
          { ...rawPaper, citationsPerYear: item?.citationsPerYear },
          index,
        );

        return {
          ...normalized,
          citationsPerYear: Number(item?.citationsPerYear ?? normalized.citationsPerYear) || 0,
          journal: rawPaper.journalTitle ?? rawPaper.journalName ?? "Journal unavailable",
          topics: stringList(rawPaper.topics),
          uniqueKeywords: stringList(item?.uniqueKeywords),
          uniqueTopics: stringList(item?.uniqueTopics),
          abstractAnalysis: normalizeAbstractAnalysis(item?.abstractAnalysis),
        };
      })
    : [];

  return {
    papers,
    newestPaperId: payload.newestPaperId ?? null,
    mostCitedPaperId: payload.mostCitedPaperId ?? null,
    highestCitationsPerYearPaperId: payload.highestCitationsPerYearPaperId ?? null,
    commonKeywords: stringList(payload.commonKeywords),
    commonTopics: stringList(payload.commonTopics),
    similarities: Array.isArray(payload.similarities) ? payload.similarities : [],
  };
}

function findPaperTitle(papers, id) {
  return papers.find((paper) => String(paper.id) === String(id))?.title || "Not available";
}

function shortTitle(title, length = 82) {
  const value = String(title || "Untitled paper");
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function splitMapLabel(label, maxLength = 26) {
  const value = String(label || "Unknown").trim();
  if (value.length <= maxLength) return [value];
  const words = value.split(/\s+/);
  const lines = [""];

  words.forEach((word) => {
    const currentIndex = lines.length - 1;
    const candidate = `${lines[currentIndex]} ${word}`.trim();
    if (candidate.length <= maxLength || !lines[currentIndex]) {
      lines[currentIndex] = candidate;
    } else if (lines.length < 2) {
      lines.push(word);
    }
  });

  const joinedLength = lines.join(" ").length;
  if (joinedLength < value.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, maxLength - 3)}…`;
  }
  return lines;
}

function normalizeMapType(type) {
  const normalizedType = String(type || "UNKNOWN").toUpperCase();
  return MAP_TYPE_META[normalizedType] ? normalizedType : "UNKNOWN";
}

function getMapNodeIdentity(node) {
  if (!node || node.id === null || node.id === undefined) return "";
  const type = normalizeMapType(node.type);
  const rawId = String(node.id);
  return rawId.toUpperCase().startsWith(`${type}:`) ? rawId : `${type}:${rawId}`;
}

function getMapLayout(nodes = [], root, edges = []) {
  const rootId = root?.id;
  const rootNodeKey = getMapNodeIdentity(root);
  const relationByTarget = new Map(
    edges.map((edge) => [String(edge.targetId), String(edge.relation || "RELATED")]),
  );

  const parentByChild = new Map(
    edges
      .filter((edge) => String(edge.sourceId) !== String(rootId))
      .map((edge) => [String(edge.targetId), String(edge.sourceId)]),
  );

  const nonRootNodes = nodes.filter((node) => getMapNodeIdentity(node) !== rootNodeKey);

  const groupedNodes = nonRootNodes.reduce((groups, node) => {
    const type = normalizeMapType(node.type);
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(node);
    return groups;
  }, new Map());

  let cursorY = 42;

  const groups = MAP_TYPE_ORDER
    .filter((type) => groupedNodes.has(type))
    .map((type) => {
      const groupNodes = groupedNodes.get(type);

      const level1 = [];
      const level2ByParent = new Map();

      groupNodes.forEach((node) => {
        const parentId = parentByChild.get(String(node.id));
        const parentExistsInGroup = parentId && groupNodes.some((p) => String(p.id) === String(parentId));
        if (parentExistsInGroup) {
          if (!level2ByParent.has(String(parentId))) level2ByParent.set(String(parentId), []);
          level2ByParent.get(String(parentId)).push(node);
        } else {
          level1.push(node);
        }
      });

      const laidOutNodes = [];
      let currentY = cursorY + 58;

      level1.forEach((node) => {
        const children = level2ByParent.get(String(node.id)) || [];
        const parentY = currentY;

        laidOutNodes.push({
          node,
          relation: relationByTarget.get(String(node.id)) || MAP_TYPE_META[type].relation,
          x: 650,
          y: parentY,
          isLevel2: false,
          parentId: null,
        });

        children.forEach((childNode, childIdx) => {
          const childY = parentY + childIdx * 78;
          laidOutNodes.push({
            node: childNode,
            relation: relationByTarget.get(String(childNode.id)) || "SUB_TOPIC",
            x: 955,
            y: childY,
            isLevel2: true,
            parentId: String(node.id),
          });
        });

        const numRows = Math.max(1, children.length);
        currentY += numRows * 78;
      });

      const placedIds = new Set(laidOutNodes.map((item) => String(item.node.id)));
      groupNodes.forEach((node) => {
        if (!placedIds.has(String(node.id))) {
          laidOutNodes.push({
            node,
            relation: relationByTarget.get(String(node.id)) || MAP_TYPE_META[type].relation,
            x: 650,
            y: currentY,
            isLevel2: false,
            parentId: null,
          });
          currentY += 78;
        }
      });

      const laneHeight = Math.max(166, currentY - cursorY + 16);
      const laneTop = cursorY;
      const hubY = laneTop + laneHeight / 2;

      cursorY += laneHeight + 20;

      return {
        type,
        meta: MAP_TYPE_META[type],
        hub: { x: 405, y: hubY },
        laneTop,
        laneHeight,
        nodes: laidOutNodes,
      };
    });

  const rawHeight = cursorY + 24;
  const height = Math.max(MAP_MIN_HEIGHT, rawHeight);
  const verticalOffset = Math.max(0, (height - rawHeight) / 2);
  if (verticalOffset > 0) {
    groups.forEach((group) => {
      group.hub.y += verticalOffset;
      group.laneTop += verticalOffset;
      group.nodes.forEach((item) => {
        item.y += verticalOffset;
      });
    });
  }

  return {
    width: MAP_WIDTH,
    height,
    root: { x: 145, y: height / 2 },
    groups,
  };
}

function TrendStatusIcon({ status }) {
  if (status === "GROWING" || status === "EMERGING") return <FiTrendingUp />;
  if (status === "DECLINING") return <FiTrendingDown />;
  return <FiActivity />;
}

function MetadataChips({ items, emptyText }) {
  if (!items.length) return <span className="research-empty-inline">{emptyText}</span>;
  return (
    <div className="research-chip-list">
      {items.map((item) => <span key={item}>{item}</span>)}
    </div>
  );
}

const ABSTRACT_HIGHLIGHT_GROUPS = [
  { key: "objectiveHighlights", label: "Objective", icon: FiTarget },
  { key: "problemHighlights", label: "Problem", icon: FiAlertCircle },
  { key: "methodHighlights", label: "Method", icon: FiCompass },
  { key: "resultHighlights", label: "Result", icon: FiCheck },
];

function AbstractAnalysisCard({ paper, index }) {
  const analysis = paper.abstractAnalysis || normalizeAbstractAnalysis();
  const isUnavailable = analysis.source === "ABSTRACT_NOT_AVAILABLE";

  return (
    <article className={`research-abstract-card tone-${index % 4}`}>
      <header>
        <div>
          <span className="research-section-kicker">Rule-based abstract highlights</span>
          <h3>{shortTitle(paper.title, 86)}</h3>
        </div>
        <span className={`research-abstract-source ${isUnavailable ? "is-unavailable" : ""}`}>
          {isUnavailable ? "Abstract not available" : "Abstract available"}
        </span>
      </header>

      {isUnavailable ? (
        <div className="research-abstract-unavailable">
          <FiAlertCircle />
          <div>
            <strong>Abstract not available</strong>
            <p>The catalog does not contain an abstract for rule-based objective, problem, method and result extraction.</p>
          </div>
        </div>
      ) : (
        <div className="research-abstract-groups">
          {ABSTRACT_HIGHLIGHT_GROUPS.map(({ key, label, icon: Icon }) => {
            const highlights = analysis[key];
            return (
              <section key={key}>
                <h4><Icon /> {label}</h4>
                {highlights.length > 0 ? (
                  <ul>{highlights.map((highlight, highlightIndex) => <li key={`${key}-${highlightIndex}`}>{highlight}</li>)}</ul>
                ) : (
                  <p>No {label.toLowerCase()} sentence was detected by the abstract rules.</p>
                )}
              </section>
            );
          })}
        </div>
      )}
      <footer>Abstract highlights are explanatory only; keyword/topic Jaccard similarity remains unchanged.</footer>
    </article>
  );
}

function PaperComparisonResults({ comparison }) {
  const pairRows = comparison.similarities.map((similarity, index) => ({
    ...similarity,
    key: `${similarity.firstPaperId}-${similarity.secondPaperId}-${index}`,
    firstTitle: findPaperTitle(comparison.papers, similarity.firstPaperId),
    secondTitle: findPaperTitle(comparison.papers, similarity.secondPaperId),
  }));

  return (
    <div className="research-results-stack">
      <section className="research-highlight-grid" aria-label="Comparison highlights">
        <article>
          <FiZap />
          <span>Newest publication</span>
          <strong>{shortTitle(findPaperTitle(comparison.papers, comparison.newestPaperId), 62)}</strong>
        </article>
        <article>
          <FiBarChart2 />
          <span>Most cited</span>
          <strong>{shortTitle(findPaperTitle(comparison.papers, comparison.mostCitedPaperId), 62)}</strong>
        </article>
        <article>
          <FiTrendingUp />
          <span>Highest citation velocity</span>
          <strong>{shortTitle(findPaperTitle(comparison.papers, comparison.highestCitationsPerYearPaperId), 62)}</strong>
        </article>
      </section>

      <section className="research-common-panel">
        <div>
          <span className="research-section-kicker">Shared evidence</span>
          <h3>Common research vocabulary</h3>
        </div>
        <div className="research-common-grid">
          <article>
            <h4><FiHash /> Common keywords</h4>
            <MetadataChips items={comparison.commonKeywords} emptyText="No keyword is shared by every selected paper." />
          </article>
          <article>
            <h4><FiTag /> Common topics</h4>
            <MetadataChips items={comparison.commonTopics} emptyText="No topic is shared by every selected paper." />
          </article>
        </div>
      </section>

      <section className="research-table-panel">
        <div className="research-panel-heading">
          <div>
            <span className="research-section-kicker">Side-by-side review</span>
            <h3>Paper evidence table</h3>
          </div>
          <span>{comparison.papers.length} papers</span>
        </div>
        <div className="research-table-scroll">
          <table className="research-comparison-table">
            <thead>
              <tr>
                <th>Paper</th>
                <th>Year</th>
                <th>Citations</th>
                <th>Citations/year</th>
                <th>Journal</th>
                <th>Authors</th>
              </tr>
            </thead>
            <tbody>
              {comparison.papers.map((paper) => (
                <tr key={paper.id}>
                  <td>
                    <Link to={ROUTE_PATHS.paperDetail(paper.id)}>{paper.title}</Link>
                  </td>
                  <td>{paper.year || "—"}</td>
                  <td>{formatNumber(paper.citationCount)}</td>
                  <td>{paper.citationsPerYear.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td>{paper.journal}</td>
                  <td>{paper.authors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="research-unique-grid">
        {comparison.papers.map((paper, index) => (
          <article key={paper.id} className={`research-unique-card tone-${index % 4}`}>
            <span>Paper {index + 1}</span>
            <h3>{shortTitle(paper.title, 72)}</h3>
            <h4>Unique keywords</h4>
            <MetadataChips items={paper.uniqueKeywords} emptyText="No unique keywords." />
            <h4>Unique topics</h4>
            <MetadataChips items={paper.uniqueTopics} emptyText="No unique topics." />
          </article>
        ))}
      </section>

      <section className="research-abstract-panel" aria-labelledby="abstract-analysis-title">
        <div className="research-panel-heading">
          <div>
            <span className="research-section-kicker">Abstract evidence</span>
            <h3 id="abstract-analysis-title">Objective, problem, method and result signals</h3>
          </div>
          <span>Rule-based · {comparison.papers.length} papers</span>
        </div>
        <div className="research-abstract-list">
          {comparison.papers.map((paper, index) => (
            <AbstractAnalysisCard key={paper.id} paper={paper} index={index} />
          ))}
        </div>
      </section>

      <section className="research-similarity-panel">
        <div className="research-panel-heading">
          <div>
            <span className="research-section-kicker">Jaccard metadata analysis</span>
            <h3>Pair similarity</h3>
          </div>
          <span>{pairRows.length} pairs</span>
        </div>
        {pairRows.length > 0 ? (
          <div className="research-similarity-list">
            {pairRows.map((pair) => (
              <article key={pair.key}>
                <div className="research-pair-titles">
                  <strong>{shortTitle(pair.firstTitle, 56)}</strong>
                  <span>compared with</span>
                  <strong>{shortTitle(pair.secondTitle, 56)}</strong>
                </div>
                <div className="research-similarity-metrics">
                  {[
                    ["Overall", pair.overallSimilarity],
                    ["Keywords", pair.keywordSimilarity],
                    ["Topics", pair.topicSimilarity],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <div><i style={{ width: formatSimilarity(value) }} /></div>
                      <strong>{formatSimilarity(value)}</strong>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="research-empty-inline">No pair similarity was returned.</div>
        )}
      </section>
    </div>
  );
}

function PaperComparator() {
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [paperOptions, setPaperOptions] = useState([]);
  const [selectedPapers, setSelectedPapers] = useState([]);
  const [searching, setSearching] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [candidatePage, setCandidatePage] = useState(0);
  const builderPanelRef = useRef(null);
  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);

  const loadPaperOptions = useCallback(async (searchTerm = "") => {
    const normalizedSearchTerm = searchTerm.trim();
    try {
      setSearching(true);
      setErrorMessage("");
      const response = await getPapers({
        ...(normalizedSearchTerm ? { search: normalizedSearchTerm } : {}),
        page: 0,
        size: 12,
        sortBy: "citationCount",
        sortDir: "desc",
      });
      setPaperOptions(
        toArray(response)
          .map(normalizePaper)
          .filter((paper) => paper.id && paper.title !== "Untitled paper"),
      );
      setAppliedQuery(normalizedSearchTerm);
      setCandidatePage(0);
    } catch (error) {
      setPaperOptions([]);
      setErrorMessage(error.message || "Could not load research papers.");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    loadPaperOptions();
  }, [loadPaperOptions]);

  function addPaper(paper) {
    if (selectedPapers.some((item) => String(item.id) === String(paper.id))) return;
    if (selectedPapers.length >= MAX_COMPARISON_PAPERS) {
      setErrorMessage("You can compare no more than four papers at once.");
      return;
    }
    setSelectedPapers((current) => [...current, paper]);
    setComparison(null);
    setErrorMessage("");
  }

  function removePaper(paperId) {
    setSelectedPapers((current) => current.filter((paper) => String(paper.id) !== String(paperId)));
    setComparison(null);
    setErrorMessage("");
  }

  function clearSelection() {
    setSelectedPapers([]);
    setComparison(null);
    setErrorMessage("");
  }

  function guideToPaperSelection() {
    const papersNeeded = MIN_COMPARISON_PAPERS - selectedPapers.length;
    setErrorMessage(
      `Add ${papersNeeded} more paper${papersNeeded > 1 ? "s" : ""} to run a valid comparison.`,
    );
    builderPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => searchInputRef.current?.focus(), 420);
  }

  async function runComparison() {
    if (selectedPapers.length < MIN_COMPARISON_PAPERS) {
      guideToPaperSelection();
      return;
    }

    try {
      setComparing(true);
      setErrorMessage("");
      const response = await comparePapers(selectedPapers.map((paper) => paper.id));
      const nextComparison = normalizeComparison(response);
      if (nextComparison.papers.length < MIN_COMPARISON_PAPERS) {
        throw new Error("The server did not return enough papers to compare.");
      }
      setComparison(nextComparison);
      window.requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (error) {
      setComparison(null);
      setErrorMessage(error.message || "Could not compare the selected papers.");
    } finally {
      setComparing(false);
    }
  }

  const availablePapers = paperOptions.filter(
    (paper) => !selectedPapers.some((selected) => String(selected.id) === String(paper.id)),
  );
  const candidatePageCount = Math.max(1, Math.ceil(availablePapers.length / COMPARATOR_PAGE_SIZE));
  const activeCandidatePage = Math.min(candidatePage, candidatePageCount - 1);
  const candidateStart = activeCandidatePage * COMPARATOR_PAGE_SIZE;
  const visibleCandidatePapers = availablePapers.slice(candidateStart, candidateStart + COMPARATOR_PAGE_SIZE);
  const papersNeeded = Math.max(0, MIN_COMPARISON_PAPERS - selectedPapers.length);
  const isReady = papersNeeded === 0;
  const selectionProgress = Math.min(
    100,
    Math.round((selectedPapers.length / MIN_COMPARISON_PAPERS) * 100),
  );

  return (
    <div className="research-comparator-shell">
      <section className="research-workflow-strip" aria-label="Paper comparison workflow">
        <div>
          <span>Comparison workflow</span>
          <h3>Build a defensible evidence set</h3>
          <p>Select publications, validate the set, then inspect similarities and differences.</p>
        </div>
        <ol>
          <li className={selectedPapers.length > 0 ? "is-complete" : "is-active"}>
            <span>{selectedPapers.length > 0 ? <FiCheck /> : "1"}</span>
            <div><strong>Discover</strong><small>Find relevant papers</small></div>
          </li>
          <li className={isReady ? "is-complete" : selectedPapers.length > 0 ? "is-active" : ""}>
            <span>{isReady ? <FiCheck /> : "2"}</span>
            <div><strong>Curate</strong><small>Select 2–4 papers</small></div>
          </li>
          <li className={comparison ? "is-complete" : isReady ? "is-active" : ""}>
            <span>{comparison ? <FiCheck /> : "3"}</span>
            <div><strong>Analyze</strong><small>Compare live evidence</small></div>
          </li>
        </ol>
      </section>

      <div className="research-tool-layout">
      <aside className="research-builder-panel" ref={builderPanelRef}>
        <div className="research-panel-heading">
          <div>
            <span className="research-section-kicker">Evidence catalog</span>
            <h3>Discover publications</h3>
          </div>
          <span>{selectedPapers.length}/4 selected</span>
        </div>

        <div className="research-panel-intro research-catalog-brief">
          <div>
            <FiSearch />
            <span>Live indexed catalog</span>
          </div>
          <p>Search the catalog and shortlist the strongest evidence for your research question.</p>
          <strong>{paperOptions.length}<small>papers scanned</small></strong>
        </div>

        <form
          className="research-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            loadPaperOptions(query);
          }}
        >
          <FiSearch />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, author or keyword"
            aria-label="Search research papers by title, author or keyword"
          />
          <button type="submit" disabled={searching}>{searching ? "Searching…" : "Search"}</button>
        </form>

        <div className="research-catalog-status" aria-live="polite">
          <span>{searching
            ? "Scanning catalog"
            : appliedQuery
              ? `${availablePapers.length} matching paper${availablePapers.length === 1 ? "" : "s"}`
              : `${availablePapers.length} catalog candidate${availablePapers.length === 1 ? "" : "s"}`}</span>
          <small>{searching
            ? "Reading indexed evidence"
            : availablePapers.length > 0
              ? appliedQuery
                ? `Showing ${candidateStart + 1}–${Math.min(candidateStart + COMPARATOR_PAGE_SIZE, availablePapers.length)} · results for “${appliedQuery}”`
                : `Showing ${candidateStart + 1}–${Math.min(candidateStart + COMPARATOR_PAGE_SIZE, availablePapers.length)} · default citation ranking`
              : appliedQuery ? `No matches for “${appliedQuery}”` : "No catalog candidates"}</small>
        </div>

        <div className="research-paper-options">
          {searching ? (
            <div className="research-mini-loading"><span className="workspace-loading-spinner" />Loading papers…</div>
          ) : visibleCandidatePapers.length > 0 ? visibleCandidatePapers.map((paper, index) => (
            <article key={paper.id}>
              <span className="research-paper-rank">{String(candidateStart + index + 1).padStart(2, "0")}</span>
              <div className="research-paper-copy">
                <h4>{paper.title}</h4>
                <p>{paper.authors} · {paper.year || "Year unavailable"}</p>
                <div className="research-paper-signals">
                  <span><FiTrendingUp />{formatNumber(paper.citationCount)} citations</span>
                  <span><FiBookOpen />{paper.journal || "Indexed publication"}</span>
                </div>
              </div>
              <button type="button" onClick={() => addPaper(paper)} disabled={selectedPapers.length >= MAX_COMPARISON_PAPERS} aria-label={`Add ${paper.title} to comparison`}>
                <FiPlus /> Shortlist
              </button>
            </article>
          )) : (
            <div className="research-empty-inline">No papers match this search. The catalog may need an Admin backfill.</div>
          )}
        </div>

        {!searching && availablePapers.length > COMPARATOR_PAGE_SIZE && (
          <nav className="research-candidate-pagination" aria-label="Candidate paper pages">
            <button type="button" onClick={() => setCandidatePage((current) => Math.max(0, current - 1))} disabled={activeCandidatePage === 0}>
              <FiChevronLeft />Previous
            </button>
            <span><strong>{activeCandidatePage + 1}</strong> / {candidatePageCount}</span>
            <button type="button" onClick={() => setCandidatePage((current) => Math.min(candidatePageCount - 1, current + 1))} disabled={activeCandidatePage >= candidatePageCount - 1}>
              Next<FiChevronRight />
            </button>
          </nav>
        )}
      </aside>

      <section className="research-selection-panel">
        <div className="research-panel-heading">
          <div>
            <span className="research-section-kicker">Evidence set</span>
            <h3>Curate your comparison</h3>
          </div>
          <span className={isReady ? "is-ready" : ""}>{isReady ? "Ready to analyze" : `${papersNeeded} more required`}</span>
        </div>

        <div className={`research-selection-progress ${isReady ? "is-ready" : ""}`}>
          <div>
            <span>{isReady ? <FiCheck /> : <FiActivity />}</span>
            <div>
              <strong>{isReady ? "Minimum evidence reached" : "Build a valid comparison"}</strong>
              <small>{isReady ? "You can add up to four papers or analyze now." : "At least two different papers are required."}</small>
            </div>
            <b>{selectedPapers.length}/{MIN_COMPARISON_PAPERS}</b>
          </div>
          <span><i style={{ width: `${selectionProgress}%` }} /></span>
        </div>

        <div className="research-analysis-lenses" aria-label="Comparison analysis lenses">
          <span><FiCompass /><small>01</small><strong>Objective</strong></span>
          <span><FiGitBranch /><small>02</small><strong>Methodology</strong></span>
          <span><FiTrendingUp /><small>03</small><strong>Results</strong></span>
        </div>

        <div className="research-selected-list">
          {selectedPapers.length > 0 ? selectedPapers.map((paper, index) => (
            <article key={paper.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{paper.title}</strong>
                <small>{paper.year || "—"} · {formatNumber(paper.citationCount)} citations</small>
              </div>
              <button type="button" onClick={() => removePaper(paper.id)} aria-label={`Remove ${paper.title}`}>
                <FiTrash2 />
              </button>
            </article>
          )) : (
            <div className="research-selection-empty">
              <div className="research-empty-slots" aria-hidden="true">
                {[1, 2, 3, 4].map((slot) => <span key={slot}>{slot}</span>)}
              </div>
              <FiBookOpen />
              <strong>Your evidence tray is empty</strong>
              <p>Shortlist at least two papers to compare their objective, methodology and contribution.</p>
            </div>
          )}
          {selectedPapers.length > 0 && selectedPapers.length < MIN_COMPARISON_PAPERS && (
            <button type="button" className="research-add-slot" onClick={guideToPaperSelection}>
              <FiPlus />
              <span><strong>Add one more paper</strong><small>Choose another publication from the catalog</small></span>
            </button>
          )}
        </div>

        {errorMessage && <div className="workspace-notice warning" role="alert">{errorMessage}</div>}

        {selectedPapers.length > 0 && (
          <button type="button" className="research-clear-selection" onClick={clearSelection}>
            <FiTrash2 /> Clear comparison set
          </button>
        )}

        <button
          type="button"
          className="research-run-button"
          onClick={runComparison}
          disabled={comparing}
        >
          {comparing
            ? <><FiRefreshCw className="is-spinning" />Analyzing papers…</>
            : isReady
              ? <><FiZap />Run evidence comparison</>
              : <><FiPlus />Complete comparison set</>}
        </button>
      </section>
      </div>

      <div className="research-tool-results" ref={resultsRef}>
        {comparison ? (
          <PaperComparisonResults comparison={comparison} />
        ) : (
          <section className={`research-tool-empty ${isReady ? "is-ready" : ""}`}>
            <div className="research-empty-visual">
              <FiBarChart2 />
              <span>{selectedPapers.length}/{MIN_COMPARISON_PAPERS}</span>
            </div>
            <span className="research-section-kicker">Analysis preview</span>
            <h3>{isReady ? "Your evidence set is ready" : selectedPapers.length === 1 ? "One more paper unlocks the analysis" : "Start with two research papers"}</h3>
            <p>{isReady
              ? "Run the comparison to reveal citation leaders, shared vocabulary, unique evidence and pair similarity."
              : "The lab compares only real catalog metadata and will guide you through every required step."}</p>
            <div className="research-output-preview">
              <span><FiTrendingUp />Citation velocity</span>
              <span><FiHash />Shared vocabulary</span>
              <span><FiLayers />Pair similarity</span>
            </div>
            <button type="button" onClick={isReady ? runComparison : guideToPaperSelection}>
              {isReady ? <><FiZap />Analyze selected papers</> : <><FiSearch />Choose {papersNeeded || MIN_COMPARISON_PAPERS} paper{papersNeeded === 1 ? "" : "s"}</>}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function MindMapGraph({ data, selectedNode, onSelectNode }) {
  const rootId = data?.root?.id;
  const rootNodeKey = getMapNodeIdentity(data?.root);
  const selectedNodeKey = getMapNodeIdentity(selectedNode);
  const nodes = useMemo(() => (Array.isArray(data?.nodes) ? data.nodes : []), [data?.nodes]);
  const edges = useMemo(() => (Array.isArray(data?.edges) ? data.edges : []), [data?.edges]);
  const layout = useMemo(() => getMapLayout(nodes, data?.root, edges), [nodes, data?.root, edges]);
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState("structure");
  const [isFocusMode, setIsFocusMode] = useState(false);
  const canvasRef = useRef(null);
  const scrollSnapshotRef = useRef(null);
  const restoreFrameRef = useRef([]);
  const rootType = normalizeMapType(data?.root?.type);
  const rootLines = splitMapLabel(data?.root?.label, 24);
  const baseViewBoxY = -110;
  const baseViewBoxHeight = layout.height + 220;
  const fitZoomRatio = 100 / zoom;
  const fitViewBoxWidth = layout.width * fitZoomRatio;
  const fitViewBoxHeight = baseViewBoxHeight * fitZoomRatio;
  const zoomInProgress = Math.max(0, zoom - 100) / (MAP_ZOOM_MAX - 100);
  const fitViewBoxCenterX = layout.width / 2 - zoomInProgress * 180;
  const fitViewBoxCenterY = baseViewBoxY + baseViewBoxHeight / 2;
  const fitViewBoxX = fitViewBoxCenterX - fitViewBoxWidth / 2;
  const fitViewBoxY = fitViewBoxCenterY - fitViewBoxHeight / 2;
  const mapViewBox = isFocusMode
    ? `0 ${baseViewBoxY} ${layout.width} ${baseViewBoxHeight}`
    : `${fitViewBoxX} ${fitViewBoxY} ${fitViewBoxWidth} ${fitViewBoxHeight}`;

  useEffect(() => {
    setZoom(100);
  }, [rootId]);

  useEffect(() => {
    if (!isFocusMode) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsFocusMode(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isFocusMode]);

  const captureScrollSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    const scrollContainers = [];
    let currentElement = canvas;

    while (currentElement) {
      const canScroll = currentElement === canvas
        || currentElement.scrollHeight > currentElement.clientHeight
        || currentElement.scrollWidth > currentElement.clientWidth;
      if (canScroll) {
        scrollContainers.push({
          element: currentElement,
          left: currentElement.scrollLeft,
          top: currentElement.scrollTop,
        });
      }
      currentElement = currentElement.parentElement;
    }

    return {
      scrollContainers,
      windowLeft: window.scrollX || window.pageXOffset || 0,
      windowTop: window.scrollY || window.pageYOffset || 0,
    };
  }, []);

  const restoreScrollSnapshot = useCallback((snapshot) => {
    if (!snapshot) return;

    snapshot.scrollContainers.forEach(({ element, left, top }) => {
      if (!element?.isConnected) return;
      element.scrollLeft = left;
      element.scrollTop = top;
    });
    window.scrollTo(snapshot.windowLeft, snapshot.windowTop);
  }, []);

  const scheduleScrollRestore = useCallback((snapshot) => {
    restoreFrameRef.current.forEach((frameId) => window.cancelAnimationFrame(frameId));
    restoreFrameRef.current = [];
    restoreScrollSnapshot(snapshot);

    const firstFrame = window.requestAnimationFrame(() => {
      restoreScrollSnapshot(snapshot);
      const secondFrame = window.requestAnimationFrame(() => {
        restoreScrollSnapshot(snapshot);
        if (scrollSnapshotRef.current === snapshot) scrollSnapshotRef.current = null;
        restoreFrameRef.current = [];
      });
      restoreFrameRef.current = [secondFrame];
    });
    restoreFrameRef.current = [firstFrame];
  }, [restoreScrollSnapshot]);

  useLayoutEffect(() => {
    if (scrollSnapshotRef.current) {
      scheduleScrollRestore(scrollSnapshotRef.current);
    }
  }, [selectedNodeKey, scheduleScrollRestore]);

  useEffect(() => () => {
    restoreFrameRef.current.forEach((frameId) => window.cancelAnimationFrame(frameId));
  }, []);

  function curvePath(sourceX, sourceY, targetX, targetY) {
    const bendX = sourceX + (targetX - sourceX) * 0.52;
    return `M ${sourceX} ${sourceY} C ${bendX} ${sourceY}, ${bendX} ${targetY}, ${targetX} ${targetY}`;
  }

  const bindNoFocusRef = useCallback((el) => {
    if (el && !el._noFocusBound) {
      el._noFocusBound = true;
      const handler = (e) => {
        if (e && typeof e.preventDefault === "function" && e.cancelable) {
          e.preventDefault();
        }
      };
      el.addEventListener("mousedown", handler, { capture: true });
      el.addEventListener("pointerdown", handler, { capture: true });
      el.addEventListener("touchstart", handler, { capture: true });
    }
  }, []);

  function selectNodeFromKeyboard(event, node) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    scrollSnapshotRef.current = captureScrollSnapshot();
    selectMapNode(event, node);
  }

  function selectMapNode(event, node) {
    if (event) {
      if (typeof event.preventDefault === "function") event.preventDefault();
      if (typeof event.stopPropagation === "function") event.stopPropagation();
      if (event.nativeEvent && typeof event.nativeEvent.preventDefault === "function") {
        event.nativeEvent.preventDefault();
      }
    }

    const snapshot = scrollSnapshotRef.current || captureScrollSnapshot();
    scrollSnapshotRef.current = snapshot;

    if (event?.currentTarget && typeof event.currentTarget.blur === "function") {
      event.currentTarget.blur();
    } else if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }

    onSelectNode(node);
    scheduleScrollRestore(snapshot);
  }

  function preventPointerFocus(event) {
    if (event) {
      scrollSnapshotRef.current = captureScrollSnapshot();
      if (typeof event.preventDefault === "function") event.preventDefault();
      if (typeof event.stopPropagation === "function") event.stopPropagation();
    }
  }

  return (
    <div className={`research-map-explorer view-${viewMode} ${isFocusMode ? "is-focus-mode" : "is-fit-mode"}`}>
      <header className="research-map-toolbar">
        <div>
          <span className={`research-map-toolbar-mark type-${rootType.toLowerCase()}`}>
            {MAP_TYPE_META[rootType].shortLabel}
          </span>
          <div>
            <small>Research opportunity map</small>
            <strong>{data.root?.label || "Research root"}</strong>
          </div>
        </div>
        <div className="research-map-toolbar-meta">
          <span><b>{Math.max(0, nodes.length - 1)}</b> evidence signals</span>
          <span><b>{edges.length}</b> catalog relations</span>
        </div>
        <div className="research-map-view-switch" aria-label="Mind map display mode">
          <button type="button" className={viewMode === "structure" ? "active" : ""} onClick={() => setViewMode("structure")}>
            <FiLayers />Structure
          </button>
          <button type="button" className={viewMode === "momentum" ? "active" : ""} onClick={() => setViewMode("momentum")}>
            <FiTrendingUp />Momentum
          </button>
        </div>
        <div className="research-map-zoom" aria-label="Mind map zoom controls">
          <button
            type="button"
            onClick={() => setZoom((current) => Math.max(MAP_ZOOM_MIN, current - MAP_ZOOM_STEP))}
            disabled={zoom <= MAP_ZOOM_MIN}
            aria-label="Zoom out"
            title="Zoom out"
          >
            <FiMinus />
          </button>
          <button
            type="button"
            className="research-map-zoom-value"
            onClick={() => setZoom(100)}
            aria-label={`Reset zoom to 100 percent. Current zoom ${zoom} percent`}
            title="Reset zoom"
          >
            {zoom}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((current) => Math.min(MAP_ZOOM_MAX, current + MAP_ZOOM_STEP))}
            disabled={zoom >= MAP_ZOOM_MAX}
            aria-label="Zoom in"
            title="Zoom in"
          >
            <FiPlus />
          </button>
          <button type="button" onClick={() => setIsFocusMode((current) => !current)} aria-label={isFocusMode ? "Exit focus mode" : "Open focus mode"}>
            {isFocusMode ? <FiMinimize2 /> : <FiMaximize2 />}
          </button>
        </div>
      </header>

      <div className="research-map-decision-bar">
        <FiCompass />
        <div><small>Decision question</small><strong>{data.question}</strong></div>
        <span>{data.intentLabel}</span>
      </div>

      <div className="research-map-canvas" ref={canvasRef}>
        <svg
          viewBox={mapViewBox}
          style={isFocusMode
            ? { width: `${zoom}%`, minWidth: `${Math.round(760 * zoom / 100)}px` }
            : { width: "100%", minWidth: 0, height: "100%" }}
          role="img"
          aria-label={`Research mind map for ${data.root?.label || "selected root"}`}
        >
          <defs>
            <linearGradient id="research-root-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5365f5" />
              <stop offset="58%" stopColor="#4350c9" />
              <stop offset="100%" stopColor="#2088aa" />
            </linearGradient>
            <pattern id="research-map-dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.15" fill="#7182b5" fillOpacity="0.14" />
            </pattern>
            <filter id="research-map-node-shadow" x="-30%" y="-40%" width="160%" height="180%">
              <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#26355f" floodOpacity="0.13" />
            </filter>
            {MAP_TYPE_ORDER.map((type) => (
              <marker key={type} id={`research-arrow-${type.toLowerCase()}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className={`research-map-marker type-${type.toLowerCase()}`} />
              </marker>
            ))}
          </defs>

          <rect x="0" y="-110" width={layout.width} height={layout.height + 220} fill="url(#research-map-dot-grid)" />

          <g className="research-map-lanes" aria-hidden="true">
            {layout.groups.map((group) => (
              <rect
                key={group.type}
                className={`research-map-lane type-${group.type.toLowerCase()}`}
                x="520"
                y={group.laneTop + 8}
                width="520"
                height={group.laneHeight - 16}
                rx="25"
              />
            ))}
          </g>

          <g className="research-map-branches" aria-hidden="true">
            {layout.groups.map((group) => {
              const typeClass = group.type.toLowerCase();
              return (
                <g key={group.type} className={`type-${typeClass}`}>
                  <path
                    className="research-map-primary-branch"
                    d={curvePath(layout.root.x + 116, layout.root.y, group.hub.x - 66, group.hub.y)}
                  />
                  {group.nodes.map((item) => {
                    if (item.isLevel2 && item.parentId) {
                      const parentNode = group.nodes.find((n) => String(n.node.id) === String(item.parentId));
                      if (parentNode) {
                        return (
                          <path
                            key={item.node.id}
                            className="research-map-secondary-branch level-2"
                            d={curvePath(parentNode.x + MAP_NODE_WIDTH / 2, parentNode.y, item.x - MAP_NODE_WIDTH / 2 - 6, item.y)}
                            markerEnd={`url(#research-arrow-${typeClass})`}
                          />
                        );
                      }
                    }
                    return (
                      <path
                        key={item.node.id}
                        className="research-map-secondary-branch"
                        d={curvePath(group.hub.x + 66, group.hub.y, item.x - MAP_NODE_WIDTH / 2 - 6, item.y)}
                        markerEnd={`url(#research-arrow-${typeClass})`}
                      />
                    );
                  })}
                </g>
              );
            })}
          </g>

          <g className="research-map-hubs">
            {layout.groups.map((group) => (
              <g key={group.type} className={`research-map-hub type-${group.type.toLowerCase()}`} transform={`translate(${group.hub.x} ${group.hub.y})`}>
                <rect x="-66" y="-28" width="132" height="56" rx="18" />
                <text className="research-map-hub-title" textAnchor="middle" y="-4">{group.meta.label}</text>
                <text className="research-map-hub-count" textAnchor="middle" y="13">{group.nodes.length} connections</text>
              </g>
            ))}
          </g>

          <g
            ref={bindNoFocusRef}
            className={`research-map-root type-${rootType.toLowerCase()} trend-${String(data?.root?.trendStatus || "no_data").toLowerCase()} ${selectedNodeKey === rootNodeKey ? "is-selected" : ""}`}
            transform={`translate(${layout.root.x} ${layout.root.y})`}
            data-node-key={rootNodeKey}
            onPointerDown={preventPointerFocus}
            onMouseDown={preventPointerFocus}
            onClick={(event) => selectMapNode(event, data?.root)}
            onKeyDown={(event) => selectNodeFromKeyboard(event, data?.root)}
            role="button"
            tabIndex="0"
            aria-pressed={selectedNodeKey === rootNodeKey}
          >
            <circle className="research-map-root-orbit" r="76" />
            <rect x="-116" y="-54" width="232" height="108" rx="27" fill="url(#research-root-gradient)" filter="url(#research-map-node-shadow)" />
            <text className="research-map-root-kicker" textAnchor="middle" y="-29">RESEARCH ROOT</text>
            <text className="research-map-root-label" textAnchor="middle" y={rootLines.length > 1 ? -8 : 0}>
              {rootLines.map((line, index) => <tspan key={`${line}-${index}`} x="0" dy={index === 0 ? 0 : 17}>{line}</tspan>)}
            </text>
            <text className="research-map-root-count" textAnchor="middle" y="37">{Number(data?.root?.paperCount) > 0 ? `${formatNumber(data.root.paperCount)} direct papers` : "No direct papers"}</text>
            <title>{data?.root?.label} · Research root · {data?.root?.trendStatus}</title>
          </g>

          <g className="research-map-nodes">
            {layout.groups.flatMap((group) => group.nodes.map((item) => {
              const node = item.node;
              const type = normalizeMapType(node.type);
              const typeClass = type.toLowerCase();
              const statusClass = String(node.trendStatus || "no_data").toLowerCase();
              const lines = splitMapLabel(node.label, 26);
              const nodeKey = getMapNodeIdentity(node);
              const isSelected = selectedNodeKey === nodeKey;
              const labelStartX = -MAP_NODE_WIDTH / 2 + 58;
              const badgeCX = -MAP_NODE_WIDTH / 2 + 30;

              return (
                <g
                  key={nodeKey}
                  ref={bindNoFocusRef}
                  className={`research-map-node type-${typeClass} trend-${statusClass} ${isSelected ? "is-selected" : ""}`}
                  transform={`translate(${item.x} ${item.y})`}
                  data-node-key={nodeKey}
                  onPointerDown={preventPointerFocus}
                  onMouseDown={preventPointerFocus}
                  onClick={(event) => selectMapNode(event, node)}
                  onKeyDown={(event) => selectNodeFromKeyboard(event, node)}
                  role="button"
                  tabIndex="0"
                  aria-pressed={isSelected}
                >
                  <rect className="research-map-node-card" x={-MAP_NODE_WIDTH / 2} y={-MAP_NODE_HEIGHT / 2} width={MAP_NODE_WIDTH} height={MAP_NODE_HEIGHT} rx="17" filter="url(#research-map-node-shadow)" />
                  <rect className="research-map-node-accent" x={-MAP_NODE_WIDTH / 2} y="-22" width="5" height="44" rx="3" />
                  <circle className="research-map-node-badge" cx={badgeCX} cy="0" r="16" />
                  <text className="research-map-node-code" textAnchor="middle" x={badgeCX} y="4">{MAP_TYPE_META[type].shortLabel}</text>
                  <text className="research-map-node-label" textAnchor="start" x={labelStartX} y={lines.length > 1 ? -12 : -3}>
                    {lines.map((line, index) => <tspan key={`${line}-${index}`} x={labelStartX} dy={index === 0 ? 0 : 15}>{line}</tspan>)}
                  </text>
                  <text className="research-map-node-count" textAnchor="start" x={labelStartX} y={lines.length > 1 ? 21 : 16}>{formatNumber(node.paperCount)} papers</text>
                  <circle className="research-map-node-status" cx={MAP_NODE_WIDTH / 2 - 14} cy="-18" r="5" />
                  <title>{node.label} · {MAP_TYPE_META[type].label} · {String(node.trendStatus || "NO_DATA").replaceAll("_", " ")} · {formatNumber(node.paperCount)} papers</title>
                </g>
              );
            }))}
          </g>
        </svg>
      </div>

      <footer className="research-map-legend">
        <div>
          {layout.groups.map((group) => (
            <span key={group.type} className={`type-${group.type.toLowerCase()}`}><i />{group.meta.label}</span>
          ))}
        </div>
        <div className="research-map-status-legend">
          <span className="is-growing"><i />Growing</span>
          <span className="is-stable"><i />Stable</span>
          <span className="is-declining"><i />Declining</span>
        </div>
        <small>Catalog-derived signals · Select a node to inspect the evidence and limitation</small>
      </footer>
    </div>
  );
}

function normalizeMindMapNode(rawNode) {
  if (!rawNode || typeof rawNode !== "object") return null;

  const paperCount = Number(rawNode.paperCount ?? rawNode.totalPapers ?? rawNode.paper_count ?? rawNode.count ?? 0) || 0;
  const recentPaperCount = Number(rawNode.recentPaperCount ?? rawNode.recentCount ?? 0) || 0;
  const previousPaperCount = Number(rawNode.previousPaperCount ?? rawNode.previousCount ?? 0) || 0;
  let trendStatus = rawNode.trendStatus ? String(rawNode.trendStatus).toUpperCase() : "";

  if (!trendStatus) {
    if (recentPaperCount > previousPaperCount && recentPaperCount > 0) trendStatus = "GROWING";
    else if (recentPaperCount === previousPaperCount && recentPaperCount > 0) trendStatus = "STABLE";
    else if (recentPaperCount < previousPaperCount) trendStatus = "DECLINING";
    else trendStatus = "NO_DATA";
  }

  return {
    ...rawNode,
    paperCount,
    recentPaperCount,
    previousPaperCount,
    trendStatus,
  };
}

function assessMindMapNode(node) {
  const paperCount = Number(node?.paperCount) || 0;
  const recent = Number(node?.recentPaperCount) || 0;
  const previous = Number(node?.previousPaperCount) || 0;
  const delta = recent - previous;
  const percent = previous > 0 ? Math.round((delta / previous) * 100) : null;
  const status = String(node?.trendStatus || "NO_DATA").toUpperCase();

  const evidence = paperCount === 0
    ? { key: "none", label: "No direct evidence", detail: "No directly linked paper is indexed for this node." }
    : paperCount < 5
      ? { key: "thin", label: "Thin evidence", detail: `Only ${paperCount} directly linked paper${paperCount === 1 ? "" : "s"}; validate before acting.` }
      : paperCount < 20
        ? { key: "moderate", label: "Moderate evidence", detail: `${paperCount} directly linked papers provide a usable starting set.` }
        : { key: "strong", label: "Strong catalog coverage", detail: `${formatNumber(paperCount)} directly linked papers support this signal.` };

  let signal = {
    key: "insufficient",
    label: "Insufficient evidence",
    reason: "The catalog does not contain enough time-window evidence to interpret momentum.",
    priority: 0,
  };

  if (status === "EMERGING" && recent > 0) {
    signal = {
      key: "emerging",
      label: "New activity signal",
      reason: `${formatNumber(recent)} paper${recent === 1 ? "" : "s"} appeared in the recent 5-year window after no activity in the previous window.`,
      priority: 5,
    };
  } else if (status === "GROWING") {
    signal = {
      key: "growing",
      label: "Momentum building",
      reason: `Recent output increased by ${formatNumber(Math.max(0, delta))} paper${Math.abs(delta) === 1 ? "" : "s"}${percent === null ? "" : ` (${percent > 0 ? "+" : ""}${percent}%)`} versus the previous 5-year window.`,
      priority: 4,
    };
  } else if (status === "STABLE") {
    signal = {
      key: "stable",
      label: "Established activity",
      reason: "Publication activity is stable across the two 5-year evidence windows.",
      priority: 3,
    };
  } else if (status === "DECLINING") {
    signal = {
      key: "declining",
      label: "Cooling activity",
      reason: `Recent output decreased by ${formatNumber(Math.abs(delta))} paper${Math.abs(delta) === 1 ? "" : "s"}${percent === null ? "" : ` (${percent}%)`} versus the previous window.`,
      priority: 1,
    };
  }

  return { evidence, signal, delta, percent };
}

function getMindMapIntentLabel(intent) {
  if (intent === "EVIDENCE") return "Validate evidence strength";
  if (intent === "ADJACENCY") return "Discover adjacent fields";
  return "Find emerging directions";
}

function MindMapWorkspace() {
  const [rootType, setRootType] = useState("KEYWORD");
  const [researchQuestion, setResearchQuestion] = useState("");
  const [researchIntent, setResearchIntent] = useState("MOMENTUM");
  const [evidenceStandardKey, setEvidenceStandardKey] = useState("REVIEW");
  const [decisionContext, setDecisionContext] = useState("");
  const [briefCopied, setBriefCopied] = useState(false);
  const [isQuestionEditing, setIsQuestionEditing] = useState(true);
  const [inspectorView, setInspectorView] = useState("decision");
  const [keywords, setKeywords] = useState([]);
  const [topics, setTopics] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [rootQuery, setRootQuery] = useState("");
  const [selectedRootId, setSelectedRootId] = useState("");
  const [limit, setLimit] = useState(6);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapData, setMapData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const rootSelectRef = useRef(null);
  const mapPanelRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    Promise.allSettled([
      getAllKeywords({ page: 0, size: 500 }),
      getAllTopics(),
    ]).then(([keywordResult, topicResult]) => {
      if (cancelled) return;
      const nextKeywords = keywordResult.status === "fulfilled"
        ? toArray(keywordResult.value, ["keywords"])
            .map(normalizeKeyword)
            .filter((item) => Number.isFinite(Number(item.id)) && item.name !== "Untitled keyword")
        : [];
      const nextTopics = topicResult.status === "fulfilled"
        ? toArray(topicResult.value, ["topics"])
            .map(normalizeTopic)
            .filter((item) => Number.isFinite(Number(item.id)) && item.name !== "Untitled topic")
        : [];
      setKeywords(nextKeywords);
      setTopics(nextTopics);
      if (keywordResult.status === "rejected" && topicResult.status === "rejected") {
        setErrorMessage("Could not load keyword and topic catalogs.");
      }
    }).finally(() => {
      if (!cancelled) setCatalogLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const rootOptions = rootType === "KEYWORD" ? keywords : topics;
  const filteredRootOptions = useMemo(() => {
    const normalizedQuery = rootQuery.trim().toLocaleLowerCase();
    return rootOptions
      .filter((item) => !normalizedQuery || item.name.toLocaleLowerCase().includes(normalizedQuery))
      .slice(0, 100);
  }, [rootOptions, rootQuery]);
  const selectedRoot = useMemo(
    () => rootOptions.find((item) => String(item.id) === String(selectedRootId)) ?? null,
    [rootOptions, selectedRootId],
  );
  const suggestedRoots = useMemo(() => rootOptions.slice(0, 4), [rootOptions]);
  const evidenceStandard = RESEARCH_EVIDENCE_STANDARDS[evidenceStandardKey];

  // Auto-select top search match when filtering options
  useEffect(() => {
    if (rootQuery.trim() && filteredRootOptions.length > 0) {
      const exists = filteredRootOptions.some((item) => String(item.id) === String(selectedRootId));
      if (!exists) {
        setSelectedRootId(String(filteredRootOptions[0].id));
        setMapData(null);
        setSelectedNode(null);
      }
    }
  }, [rootQuery, filteredRootOptions, selectedRootId]);

  function changeRootType(type) {
    setRootType(type);
    setRootQuery("");
    setSelectedRootId("");
    setMapData(null);
    setSelectedNode(null);
    setErrorMessage("");
  }

  function selectResearchRoot(rootId) {
    setSelectedRootId(rootId);
    setMapData(null);
    setSelectedNode(null);
    setErrorMessage("");
    setInspectorView("decision");
  }

  function changeResearchIntent(intent) {
    setResearchIntent(intent);
    setMapData(null);
    setSelectedNode(null);
    setErrorMessage("");
    setInspectorView("decision");
  }

  async function buildMindMap(event) {
    event.preventDefault();
    if (!selectedRootId) {
      setErrorMessage(`Select a ${rootType.toLowerCase()} root first.`);
      rootSelectRef.current?.focus();
      return;
    }

    try {
      setMapLoading(true);
      setErrorMessage("");
      const response = await getResearchMindMap({
        type: rootType,
        id: Number(selectedRootId),
        limit: Number(limit),
      });
      const payload = response?.data ?? response;
      const rawNodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
      if (!payload?.root) {
        throw new Error("No research root was returned for this item.");
      }

      const normalizedNodes = rawNodes.map((n) => normalizeMindMapNode(n));
      const normalizedRoot = normalizeMindMapNode(payload.root);
      const framedQuestion = researchQuestion.trim()
        || `Where are the strongest evidence-backed directions around ${normalizedRoot.label}?`;

      const nextMap = {
        root: normalizedRoot,
        nodes: normalizedNodes,
        edges: Array.isArray(payload?.edges) ? payload.edges : [],
        question: framedQuestion,
        intent: researchIntent,
        intentLabel: getMindMapIntentLabel(researchIntent),
      };
      setMapData(nextMap);
      setSelectedNode(normalizedRoot);
      setIsQuestionEditing(false);
      setInspectorView("decision");
      window.requestAnimationFrame(() => {
        mapPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } catch (error) {
      setMapData(null);
      setSelectedNode(null);
      setErrorMessage(error.message || "Could not build the research mind map.");
    } finally {
      setMapLoading(false);
    }
  }

  const mapInsights = useMemo(() => {
    const nodes = Array.isArray(mapData?.nodes) ? mapData.nodes : [];
    const rootId = mapData?.root?.id;

    const relatedNodes = nodes.filter(
      (node) => String(node.id) !== String(rootId),
    );

    const assessedNodes = relatedNodes.map((node) => ({ node, assessment: assessMindMapNode(node) }));
    const rankedNodes = [...assessedNodes]
      .filter(({ node }) => node.type !== "JOURNAL" && Number(node.paperCount || 0) >= evidenceStandard.minimumPapers)
      .sort((first, second) => {
        if (researchIntent === "EVIDENCE") {
          return Number(second.node.paperCount || 0) - Number(first.node.paperCount || 0);
        }
        if (researchIntent === "ADJACENCY") {
          const firstTypeWeight = first.node.type === "TOPIC" ? 2 : 1;
          const secondTypeWeight = second.node.type === "TOPIC" ? 2 : 1;
          return secondTypeWeight - firstTypeWeight
            || Number(second.node.paperCount || 0) - Number(first.node.paperCount || 0);
        }
        return second.assessment.signal.priority - first.assessment.signal.priority
          || Number(second.node.recentPaperCount || 0) - Number(first.node.recentPaperCount || 0)
          || Number(second.node.paperCount || 0) - Number(first.node.paperCount || 0);
      });
    const evidencedNodes = assessedNodes.filter(({ assessment }) => assessment.evidence.key !== "none").length;
    const qualifyingNodes = assessedNodes.filter(({ node }) => Number(node.paperCount || 0) >= evidenceStandard.minimumPapers).length;

    return {
      relatedNodes: relatedNodes.length,
      growingNodes: relatedNodes.filter((node) =>
        ["GROWING", "EMERGING"].includes(node.trendStatus),
      ).length,
      topics: relatedNodes.filter((node) => node.type === "TOPIC").length,
      keywords: relatedNodes.filter((node) => node.type === "KEYWORD").length,
      journals: relatedNodes.filter((node) => node.type === "JOURNAL").length,
      evidencedNodes,
      qualifyingNodes,
      candidates: rankedNodes.slice(0, 3),
    };
  }, [evidenceStandard.minimumPapers, mapData, researchIntent]);

  const selectedNodeAssessment = useMemo(
    () => selectedNode ? assessMindMapNode(selectedNode) : null,
    [selectedNode],
  );

  const mapIntegrity = useMemo(() => {
    if (!mapData?.root) return null;
    const rootAssessment = assessMindMapNode(mapData.root);
    if (rootAssessment.evidence.key === "none") {
      return {
        level: "warning",
        title: "Root evidence is missing",
        message: "Related catalog nodes may still exist, but they do not prove a research gap or opportunity for this root.",
      };
    }
    if (mapInsights.qualifyingNodes === 0) {
      return {
        level: "warning",
        title: `No signal meets the ${evidenceStandard.shortLabel.toLowerCase()} standard`,
        message: `This shortlist requires at least ${evidenceStandard.minimumPapers} directly linked papers per direction. Broaden the landscape or switch to an exploratory scan.`,
      };
    }
    if (mapInsights.evidencedNodes < Math.max(2, Math.ceil(mapInsights.relatedNodes / 2))) {
      return {
        level: "warning",
        title: "Landscape coverage is thin",
        message: "Treat the map as a discovery lead and validate it against the supporting paper set.",
      };
    }
    return {
      level: "ready",
      title: "Catalog evidence available",
      message: "Signals are grounded in direct paper counts and two backend 5-year publication windows.",
    };
  }, [evidenceStandard, mapData, mapInsights.evidencedNodes, mapInsights.qualifyingNodes, mapInsights.relatedNodes]);

  const selectedNodeExplorePath = useMemo(() => {
    if (!selectedNode?.label) return ROUTE_PATHS.PAPERS;
    const type = normalizeMapType(selectedNode.type);
    const parameter = type === "TOPIC" ? "topic" : type === "JOURNAL" ? "journal" : "keyword";
    return `${ROUTE_PATHS.PAPERS}?${parameter}=${encodeURIComponent(selectedNode.label)}`;
  }, [selectedNode]);

  function chooseSuggestedRoot(root) {
    setRootQuery("");
    selectResearchRoot(String(root.id));
    window.requestAnimationFrame(() => rootSelectRef.current?.focus());
  }

  function inspectOpportunityNode(node) {
    setSelectedNode(node);
    setInspectorView("decision");
  }

  useEffect(() => {
    setBriefCopied(false);
  }, [decisionContext, evidenceStandardKey, mapData]);

  async function copyDecisionBrief() {
    if (!mapData) return;
    const candidateLines = mapInsights.candidates.length > 0
      ? mapInsights.candidates.map(({ node, assessment }, index) =>
          `${index + 1}. ${node.label} — ${assessment.signal.label}; ${formatNumber(node.paperCount)} direct papers.`,
        )
      : ["No direction currently meets the selected evidence standard."];
    const brief = [
      "RESEARCH DECISION BRIEF",
      `Question: ${mapData.question}`,
      `Evidence root: ${mapData.root?.label || "Not available"}`,
      decisionContext.trim() ? `Decision context: ${decisionContext.trim()}` : null,
      `Decision goal: ${mapData.intentLabel}`,
      `Evidence standard: ${evidenceStandard.label} (minimum ${evidenceStandard.minimumPapers} direct papers per shortlisted direction)`,
      `Catalog coverage: ${mapInsights.evidencedNodes}/${mapInsights.relatedNodes} related signals have direct evidence; ${mapInsights.qualifyingNodes} meet the selected standard.`,
      "",
      "SHORTLIST",
      ...candidateLines,
      "",
      "Caution: These are catalog-derived signals, not verified novelty or research-gap claims. Validate every direction against its supporting paper set.",
    ].filter((line) => line !== null).join("\n");

    try {
      await navigator.clipboard.writeText(brief);
      setBriefCopied(true);
    } catch {
      setErrorMessage("Could not copy the decision brief. Check clipboard permission and try again.");
    }
  }

  return (
    <div className="research-mind-shell">
      <section className="research-mind-brief research-mind-command" aria-label="Research opportunity workflow">
        <div className="research-mind-brief-icon"><FiMap /></div>
        <div>
          <span className="research-section-kicker">Research opportunity workspace</span>
          <h3>Turn a research question into an evidence-backed next move</h3>
          <p>Frame the decision, inspect catalog momentum and leave with a defensible paper-reading path.</p>
        </div>
        <div className="research-mind-progress" aria-label="Mind map progress">
          <span className={selectedRoot ? "is-complete" : "is-active"}><b>01</b>Frame</span>
          <i />
          <span className={mapData ? "is-complete" : selectedRoot ? "is-active" : ""}><b>02</b>Analyze</span>
          <i />
          <span className={selectedNode && mapData ? "is-active" : ""}><b>03</b>Decide</span>
        </div>
      </section>

      <div className="research-mind-layout">
      <form className="research-map-builder" onSubmit={buildMindMap}>
        <div className="research-panel-heading">
          <div>
            <span className="research-section-kicker">Research framing</span>
            <h3>Define the decision</h3>
          </div>
          <span className="research-panel-step">01</span>
        </div>

        <p className="research-builder-intro">Tell the workspace what decision you are trying to make, then anchor it to one indexed concept.</p>

        {mapData && !isQuestionEditing ? (
          <div className="research-question-summary">
            <div><small>Research question</small><strong>{mapData.question}</strong></div>
            <button type="button" onClick={() => setIsQuestionEditing(true)}>Edit</button>
          </div>
        ) : (
          <label className="research-map-field research-question-field">
            <span>Research question</span>
            <textarea
              value={researchQuestion}
              onChange={(event) => setResearchQuestion(event.target.value)}
              placeholder="Example: Which directions show new activity and enough evidence to investigate?"
              rows="2"
            />
            <small>{researchQuestion.trim() ? "Attached to the next evidence map." : "Optional — a default question will be framed from the selected root."}</small>
          </label>
        )}

        <fieldset className="research-evidence-standard">
          <legend>Evidence standard</legend>
          <div className="research-evidence-standard-options">
            {Object.entries(RESEARCH_EVIDENCE_STANDARDS).map(([key, standard]) => (
              <button
                key={key}
                type="button"
                className={evidenceStandardKey === key ? "active" : ""}
                onClick={() => setEvidenceStandardKey(key)}
                aria-pressed={evidenceStandardKey === key}
              >
                <strong>{standard.shortLabel}</strong>
                <small>≥{standard.minimumPapers} papers</small>
              </button>
            ))}
          </div>
          <p>{evidenceStandard.description} This controls the shortlist, not the backend data.</p>
        </fieldset>

        <label className="research-map-field research-decision-context">
          <span>Decision context <small>optional</small></span>
          <input
            value={decisionContext}
            onChange={(event) => setDecisionContext(event.target.value)}
            placeholder="Population, setting, institution or thesis context"
          />
        </label>

        <label className="research-map-field">
          <span>Decision goal</span>
          <select value={researchIntent} onChange={(event) => changeResearchIntent(event.target.value)}>
            <option value="MOMENTUM">Find emerging directions</option>
            <option value="EVIDENCE">Validate evidence strength</option>
            <option value="ADJACENCY">Discover adjacent fields</option>
          </select>
        </label>

        <div className="research-root-type-switch">
          <button type="button" className={rootType === "KEYWORD" ? "active" : ""} onClick={() => changeRootType("KEYWORD")}>
            <FiHash />Keyword root
          </button>
          <button type="button" className={rootType === "TOPIC" ? "active" : ""} onClick={() => changeRootType("TOPIC")}>
            <FiTag />Topic root
          </button>
        </div>

        <label className="research-map-field">
          <span>Filter catalog</span>
          <div><FiSearch /><input value={rootQuery} onChange={(event) => setRootQuery(event.target.value)} placeholder={`Filter ${rootType.toLowerCase()} options`} /></div>
        </label>

        <label className="research-map-field">
          <span>Select root</span>
          <select ref={rootSelectRef} value={selectedRootId} onChange={(event) => selectResearchRoot(event.target.value)} disabled={catalogLoading}>
            <option value="">{catalogLoading ? "Loading catalog…" : `Choose a ${rootType.toLowerCase()}…`}</option>
            {filteredRootOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>

        <div className={`research-root-preview ${selectedRoot ? "has-selection" : ""}`}>
          <span>{selectedRoot ? (rootType === "KEYWORD" ? <FiHash /> : <FiTag />) : <FiSearch />}</span>
          <div>
            <small>{selectedRoot ? "Research root selected" : "Waiting for a research root"}</small>
            <strong>{selectedRoot?.name || "Choose a catalog concept above"}</strong>
            <p>{selectedRoot
              ? Number(selectedRoot.paperCount) > 0
                ? `${formatNumber(selectedRoot.paperCount)} linked papers reported by the catalog list`
                : "No paper count is reported here; the map API will verify direct evidence."
              : "Search by keyword or topic to anchor the graph in real evidence."}</p>
          </div>
        </div>

        <label className="research-map-field">
          <span>Landscape breadth</span>
          <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
            <option value={3}>Focused — 3 signals per branch</option>
            <option value={6}>Balanced — 6 signals per branch</option>
            <option value={10}>Expanded — 10 signals per branch</option>
          </select>
        </label>

        <div className="research-evidence-window">
          <FiActivity />
          <div><small>Backend evidence window</small><strong>Recent 5 years vs previous 5 years</strong></div>
        </div>

        {errorMessage && <div className="workspace-notice warning" role="alert">{errorMessage}</div>}

        <button type="submit" className="research-run-button" disabled={mapLoading || catalogLoading}>
          {mapLoading
            ? <><FiRefreshCw className="is-spinning" />Building map…</>
            : selectedRootId
              ? <><FiGitBranch />Analyze research landscape</>
              : <><FiPlus />Choose a root to continue</>}
        </button>
        <small className="research-builder-footnote"><FiCheck />No generated metrics — every signal comes from indexed paper counts</small>
      </form>

      <section className="research-map-panel" ref={mapPanelRef}>
        {mapLoading ? (
          <div className="research-tool-empty"><span className="workspace-loading-spinner" /><h3>Mapping research relationships…</h3></div>
        ) : mapData ? (
          <MindMapGraph data={mapData} selectedNode={selectedNode} onSelectNode={setSelectedNode} />
        ) : (
          <div className="research-map-empty-shell">
            <header className="research-map-empty-toolbar">
              <div><span><FiCompass /></span><div><small>Decision-support canvas</small><strong>Opportunity preview</strong></div></div>
              <span className={selectedRoot ? "is-ready" : ""}>{selectedRoot ? "Question framed" : "Waiting for scope"}</span>
            </header>
            <div className="research-tool-empty research-map-empty-state">
            <div className="research-map-preview-network" aria-hidden="true">
              <i className="preview-link link-one" /><i className="preview-link link-two" /><i className="preview-link link-three" /><i className="preview-link link-four" /><i className="preview-link link-five" />
              <span className="preview-root"><FiGitBranch /><b>{selectedRoot?.name || "Research idea"}</b><small>Evidence root</small></span>
              <span className="preview-node preview-topic"><FiTag /><b>Topics</b><small>Related fields</small></span>
              <span className="preview-node preview-keyword"><FiHash /><b>Keywords</b><small>Shared concepts</small></span>
              <span className="preview-node preview-journal"><FiBookOpen /><b>Journals</b><small>Publication context</small></span>
              <span className="preview-node preview-signal"><FiTrendingUp /><b>Momentum</b><small>Growth signals</small></span>
            </div>
            <span className="research-section-kicker">From discovery to a next move</span>
            <h3>{selectedRoot ? `Ready to assess directions around “${selectedRoot.name}”` : "Do not browse another graph. Frame a decision."}</h3>
            <p>{selectedRoot
              ? "Analyze the network to separate momentum, established evidence and signals that are still too thin to trust."
              : "Start with a research question and an indexed concept. The workspace will turn catalog relationships into an evidence-reading path."}</p>
            <div className="research-map-empty-outcomes">
              <span><FiActivity />Evidence strength</span>
              <span><FiTrendingUp />5-year momentum</span>
              <span><FiBookOpen />Supporting papers</span>
            </div>
            {!selectedRoot && suggestedRoots.length > 0 && (
              <div className="research-map-starters">
                <small>Quick starts</small>
                <div>{suggestedRoots.map((root) => <button key={root.id} type="button" onClick={() => chooseSuggestedRoot(root)}>{root.name}</button>)}</div>
              </div>
            )}
            <button type="button" onClick={() => selectedRootId ? rootSelectRef.current?.form?.requestSubmit() : rootSelectRef.current?.focus()}>
              {selectedRootId ? <><FiGitBranch />Analyze this research landscape</> : <><FiSearch />Define the research scope</>}
            </button>
            </div>
          </div>
        )}
      </section>

      <aside className="research-map-insights">
        <div className="research-panel-heading">
          <div>
            <span className="research-section-kicker">Decision brief</span>
            <h3>What should I do next?</h3>
          </div>
          <span className="research-panel-step">03</span>
        </div>

        {mapData && (
          <div className="research-inspector-tabs" aria-label="Decision brief views">
            <button type="button" className={inspectorView === "decision" ? "active" : ""} onClick={() => setInspectorView("decision")}>Decision</button>
            <button type="button" className={inspectorView === "shortlist" ? "active" : ""} onClick={() => setInspectorView("shortlist")}>Shortlist</button>
            <button type="button" className={inspectorView === "coverage" ? "active" : ""} onClick={() => setInspectorView("coverage")}>Coverage</button>
          </div>
        )}

        {mapData && (
          <div className="research-protocol-readiness">
            <div>
              <small>Evidence protocol</small>
              <strong>{evidenceStandard.label}</strong>
            </div>
            <span>{mapInsights.qualifyingNodes}/{mapInsights.relatedNodes} meet ≥{evidenceStandard.minimumPapers}</span>
          </div>
        )}

        {inspectorView === "decision" && (
          <div className="research-inspector-view">
            {selectedNode ? (
              <>
                <article className={`research-node-detail trend-${String(selectedNode.trendStatus || "no_data").toLowerCase()}`}>
                  <div className="research-node-detail-type">
                    <i>{normalizeMapType(selectedNode.type) === "TOPIC" ? <FiTag /> : normalizeMapType(selectedNode.type) === "JOURNAL" ? <FiBookOpen /> : <FiHash />}</i>
                    <span>{selectedNode.type}</span>
                  </div>
                  <h4>{selectedNode.label}</h4>
                  <div className="research-node-trend"><TrendStatusIcon status={selectedNode.trendStatus} /><strong>{selectedNodeAssessment?.signal.label}</strong></div>
                </article>
                <div className={`research-signal-explanation is-${selectedNodeAssessment?.signal.key || "insufficient"}`}>
                  <small>What the catalog supports</small>
                  <strong>{selectedNodeAssessment?.signal.label}</strong>
                  <p>{selectedNodeAssessment?.signal.reason}</p>
                </div>
                <dl className="research-node-metrics research-node-metrics-compact">
                  <div><dt>Direct</dt><dd>{formatNumber(selectedNode.paperCount)}</dd></div>
                  <div><dt>Recent</dt><dd>{formatNumber(selectedNode.recentPaperCount)}</dd></div>
                  <div><dt>Previous</dt><dd>{formatNumber(selectedNode.previousPaperCount)}</dd></div>
                </dl>
                <div className={`research-evidence-strength is-${selectedNodeAssessment?.evidence.key || "none"}`}>
                  <div><small>Evidence strength</small><strong>{selectedNodeAssessment?.evidence.label}</strong></div>
                  <p>{selectedNodeAssessment?.evidence.detail}</p>
                </div>
                <Link className="research-inspector-action" to={selectedNodeExplorePath}>Open supporting papers <FiArrowRight /></Link>
                <p className="research-signal-disclaimer"><FiActivity />Catalog signal only — not a verified novelty or research-gap claim.</p>
              </>
            ) : (
              <div className="research-inspector-empty">
                <FiActivity />
                <strong>Select a signal to test whether it is worth pursuing</strong>
                <p>The decision brief separates evidence from interpretation.</p>
              </div>
            )}
          </div>
        )}

        {inspectorView === "shortlist" && mapData && (
          <div className="research-inspector-view research-opportunity-shortlist is-tab-view">
            <div><small>Signal shortlist</small><strong>{mapData.intentLabel}</strong></div>
            {mapInsights.candidates.length > 0 ? (
              <ol>
                {mapInsights.candidates.map(({ node, assessment }, index) => (
                  <li key={getMapNodeIdentity(node)}>
                    <button type="button" onClick={() => inspectOpportunityNode(node)}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div><strong>{node.label}</strong><small>{assessment.signal.label} · {formatNumber(node.paperCount)} papers</small></div>
                      <FiArrowRight />
                    </button>
                  </li>
                ))}
              </ol>
            ) : <div className="research-empty-inline">No direction meets the {evidenceStandard.label.toLowerCase()} standard. Try an exploratory scan or broaden the landscape.</div>}
          </div>
        )}

        {inspectorView === "coverage" && mapData && (
          <div className="research-inspector-view">
            {mapIntegrity && (
              <div className={`research-integrity-banner is-${mapIntegrity.level}`}>
                {mapIntegrity.level === "ready" ? <FiCheck /> : <FiActivity />}
                <div><strong>{mapIntegrity.title}</strong><p>{mapIntegrity.message}</p></div>
              </div>
            )}
            <div className="research-map-summary research-landscape-summary">
              <h4>Landscape coverage</h4>
              <div><span>Signals with evidence</span><strong>{mapInsights.evidencedNodes}/{mapInsights.relatedNodes}</strong></div>
              <div><span>Meet {evidenceStandard.shortLabel.toLowerCase()} standard</span><strong>{mapInsights.qualifyingNodes}</strong></div>
              <div><span>Growing or new activity</span><strong>{mapInsights.growingNodes}</strong></div>
              <div><span>Topics / keywords</span><strong>{mapInsights.topics} / {mapInsights.keywords}</strong></div>
              <div><span>Journal contexts</span><strong>{mapInsights.journals}</strong></div>
            </div>
            <p className="research-signal-disclaimer"><FiActivity />Coverage describes this catalog only and must be validated against the paper set.</p>
          </div>
        )}
        {mapData && (
          <button type="button" className={`research-copy-brief ${briefCopied ? "is-copied" : ""}`} onClick={copyDecisionBrief}>
            {briefCopied ? <FiCheck /> : <FiCopy />}
            {briefCopied ? "Decision brief copied" : "Copy defensible brief"}
          </button>
        )}
      </aside>
      </div>
    </div>
  );
}

function ResearchLabPage() {
  const { role, user } = useAuth();
  const normalizedRole = String(role || user?.role || "LECTURER").toUpperCase();
  const canComparePapers = ["RESEARCHER", "ADMIN"].includes(normalizedRole);
  const mindMapAccess = canComparePapers ? "Full" : "Basic";
  const [activeTool, setActiveTool] = useState(() => (canComparePapers ? "compare" : "mind-map"));

  useEffect(() => {
    if (!canComparePapers && activeTool !== "mind-map") setActiveTool("mind-map");
  }, [activeTool, canComparePapers]);

  return (
    <MainLayout title="Research Lab" subtitle={canComparePapers ? "Advanced evidence tools for researchers" : "Basic evidence mapping for lecturers"}>
      <section className={`research-lab-page research-lab-v2 ${canComparePapers ? "is-full-access" : "is-basic-access"}`}>
        <header className="research-lab-hero">
          <div className="research-lab-hero-copy">
            <span className="research-lab-hero-icon"><FiGitBranch /></span>
            <div>
              <span>Research intelligence workspace</span>
              <h2>{canComparePapers ? "Turn evidence into a clearer research direction." : "Map the evidence around a research concept."}</h2>
              <p>{canComparePapers
                ? "Compare a focused paper set or map the relationships around a concept, then move from catalog signals to your next defensible research decision."
                : "Start from a catalog keyword or topic, trace its strongest relationships and use the map to plan a focused reading path."}</p>
            </div>
          </div>
          <aside className="research-lab-hero-briefing">
            <div className="research-lab-briefing-label">
              <span><FiCompass /></span>
              <div>
                <small>Research direction</small>
                <b>Plan the next evidence move</b>
              </div>
            </div>
            <h3>What should I examine next?</h3>
            <p>{canComparePapers
              ? "Use live catalog evidence to narrow a question, compare influential work and expose adjacent concepts."
              : "Use live catalog evidence to expose adjacent concepts and decide where to read next."}</p>
            <div className="research-lab-briefing-outcomes">
              <div><FiBarChart2 /><span><b>Compare evidence</b><small>Review 2–4 papers side by side</small></span></div>
              <div><FiMap /><span><b>Trace relationships</b><small>Connect topics, keywords and journals</small></span></div>
              <div><FiCheck /><span><b>Stay catalog-grounded</b><small>No generated or invented metrics</small></span></div>
            </div>
          </aside>
          <div className="research-lab-hero-orbit" aria-hidden="true"><i /><i /><i /><span /></div>
        </header>

        <nav className={`research-lab-tabs ${canComparePapers ? "" : "is-single-tool"}`} aria-label="Research Lab tools">
          {canComparePapers && <button type="button" className={activeTool === "compare" ? "active" : ""} onClick={() => setActiveTool("compare")}>
            <span className="research-lab-tab-index">01</span>
            <span className="research-lab-tab-icon"><FiColumns /></span>
            <span className="research-lab-tab-copy">
              <small>Evidence synthesis</small>
              <strong>Compare selected papers</strong>
              <p>Contrast citations, shared vocabulary and pair similarity across 2–4 publications.</p>
            </span>
            <span className="research-lab-tab-action">Open comparator <FiArrowRight /></span>
          </button>}
          <button type="button" className={activeTool === "mind-map" ? "active" : ""} onClick={() => setActiveTool("mind-map")}>
            <span className="research-lab-tab-index">{canComparePapers ? "02" : "01"}</span>
            <span className="research-lab-tab-icon"><FiShare2 /></span>
            <span className="research-lab-tab-copy">
              <small>Landscape discovery · {mindMapAccess}</small>
              <strong>Map a research concept</strong>
              <p>Reveal connected topics, keywords, journals and their publication momentum.</p>
            </span>
            <span className="research-lab-tab-action">Open mind map <FiArrowRight /></span>
          </button>
        </nav>

        {canComparePapers && activeTool === "compare" ? <PaperComparator /> : <MindMapWorkspace />}
      </section>
    </MainLayout>
  );
}

export default ResearchLabPage;
