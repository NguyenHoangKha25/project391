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
  FiX,
  FiZap,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/useAuth";
import { comparePapers, getPapers } from "../services/paperService";
import { getMindMapEvidence, getResearchMindMap } from "../services/researchService";
import { getKeywordSuggestions, getTopicSuggestions } from "../services/trendService";
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
const MAP_MIN_HEIGHT = 760;
const MAP_ZOOM_MIN = 60;
const MAP_ZOOM_MAX = 180;
const MAP_ZOOM_STEP = 10;
const MAP_NODE_WIDTH = 206;
const MAP_NODE_HEIGHT = 66;
const MAP_TYPE_ORDER = ["TOPIC", "KEYWORD", "JOURNAL"];
const CURRENT_YEAR = new Date().getFullYear();
const MAP_TYPE_META = {
  TOPIC: { label: "Topics", shortLabel: "T", relation: "Related topics" },
  KEYWORD: { label: "Keywords", shortLabel: "K", relation: "Related keywords" },
  JOURNAL: { label: "Journals", shortLabel: "J", relation: "Published in" },
  UNKNOWN: { label: "Evidence", shortLabel: "E", relation: "Related evidence" },
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

function getMapStatusLabel(status) {
  const normalizedStatus = String(status || "NO_DATA").toUpperCase();
  if (normalizedStatus === "EMERGING") return "Emerging";
  if (normalizedStatus === "GROWING") return "Growing";
  if (normalizedStatus === "STABLE") return "Stable";
  if (normalizedStatus === "DECLINING") return "Cooling";
  return "No trend";
}

function getMapNodeIdentity(node) {
  if (!node || node.id === null || node.id === undefined) return "";
  const type = normalizeMapType(node.type);
  const rawId = String(node.id);
  return rawId.toUpperCase().startsWith(`${type}:`) ? rawId : `${type}:${rawId}`;
}

function getMindMapEntityId(value) {
  if (value === null || value === undefined || value === "") return null;
  const rawValue = String(value).trim();
  const idPart = rawValue.includes(":") ? rawValue.slice(rawValue.lastIndexOf(":") + 1) : rawValue;
  const numericId = Number(idPart);
  return Number.isSafeInteger(numericId) && numericId > 0 ? numericId : null;
}

function getMapEdgeTargetIdentity(edge) {
  if (!edge) return "";
  const targetId = edge.targetId ?? edge.target?.id ?? edge.nodeId ?? edge.relatedNodeId;
  if (targetId === null || targetId === undefined) return "";
  const rawTargetId = String(targetId);
  if (rawTargetId.includes(":")) return rawTargetId.toUpperCase();
  const targetType = normalizeMapType(edge.targetType ?? edge.target?.type ?? edge.nodeType);
  return `${targetType}:${rawTargetId}`;
}

function normalizeAssociationScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score) || score <= 0) return 0;
  return Math.min(1, score > 1 ? score / 100 : score);
}

function normalizeMindMapEdge(rawEdge, targetNode, root, index) {
  const edge = rawEdge && typeof rawEdge === "object" ? rawEdge : {};
  const trendStatus = String(
    edge.trendStatus ?? edge.status ?? edge.growthStatus ?? targetNode?.trendStatus ?? "STABLE",
  ).toUpperCase();

  const recentSharedPaperCount = Number(
    edge.recentSharedPaperCount
      ?? edge.recentPaperCount
      ?? edge.recentCount
      ?? targetNode?.recentPaperCount
      ?? 0,
  ) || 0;
  const previousSharedPaperCount = Number(
    edge.previousSharedPaperCount
      ?? edge.previousPaperCount
      ?? edge.previousCount
      ?? targetNode?.previousPaperCount
      ?? 0,
  ) || 0;

  return {
    ...edge,
    id: edge.id ?? `${getMapNodeIdentity(root)}-${getMapNodeIdentity(targetNode)}-${index}`,
    sourceId: edge.sourceId ?? edge.source?.id ?? root?.id,
    sourceType: normalizeMapType(edge.sourceType ?? edge.source?.type ?? root?.type),
    targetId: edge.targetId ?? edge.target?.id ?? edge.nodeId ?? edge.relatedNodeId ?? targetNode?.id,
    targetType: normalizeMapType(edge.targetType ?? edge.target?.type ?? edge.nodeType ?? targetNode?.type),
    sharedPaperCount: Number(
      edge.sharedPaperCount ?? edge.sharedCount ?? edge.coOccurrenceCount ?? targetNode?.sharedPaperCount ?? edge.paperCount ?? edge.weight ?? 0,
    ) || 0,
    associationScore: normalizeAssociationScore(
      edge.associationScore ?? edge.score ?? edge.strength ?? edge.normalizedWeight ?? edge.rankScore ?? targetNode?.associationScore ?? targetNode?.rankScore ?? 0,
    ),
    rankScore: normalizeAssociationScore(edge.rankScore ?? edge.associationScore ?? edge.score ?? targetNode?.rankScore ?? targetNode?.associationScore ?? 0),
    trendStatus,
    growthRate: Number(edge.growthRate ?? edge.growthPercent ?? targetNode?.growthRate ?? 0) || 0,
    recentSharedPaperCount,
    previousSharedPaperCount,
    evidenceLevel: String(edge.evidenceLevel ?? targetNode?.evidenceLevel ?? "STRONG").toUpperCase(),
  };
}

function findEdgeForNode(edges, node) {
  const nodeKey = getMapNodeIdentity(node);
  return edges.find((edge) => {
    const targetKey = getMapEdgeTargetIdentity(edge);
    if (targetKey === nodeKey) return true;
    return String(edge.targetId) === String(node.id)
      && (!edge.targetType || normalizeMapType(edge.targetType) === normalizeMapType(node.type));
  });
}

function getMapLayout(nodes = [], root, lanes = []) {
  const rootNodeKey = getMapNodeIdentity(root);
  const nonRootNodes = nodes.filter((node) => getMapNodeIdentity(node) !== rootNodeKey);
  const groupedNodes = nonRootNodes.reduce((groups, node) => {
    const type = normalizeMapType(node.type);
    if (!MAP_TYPE_ORDER.includes(type)) return groups;
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(node);
    return groups;
  }, new Map());

  const laneLeft = 338;
  const laneWidth = MAP_WIDTH - laneLeft - 24;
  const laneHeight = 222;
  const laneGap = 18;
  const laneTop = 28;
  const nodeColumns = [laneLeft + 190, laneLeft + 430, laneLeft + 670];
  const laneByType = new Map(
    (Array.isArray(lanes) ? lanes : [])
      .filter((lane) => MAP_TYPE_ORDER.includes(normalizeMapType(lane?.type)))
      .map((lane) => [normalizeMapType(lane.type), lane]),
  );
  const renderedTypes = MAP_TYPE_ORDER.filter((type) => (groupedNodes.get(type) || []).length > 0);
  const groups = renderedTypes.map((type, groupIndex) => {
    const groupTop = laneTop + groupIndex * (laneHeight + laneGap);
    const groupNodes = (groupedNodes.get(type) || []).slice(0, 5);
    return {
      type,
      meta: MAP_TYPE_META[type],
      laneTop: groupTop,
      laneHeight,
      laneLeft,
      laneWidth,
      lane: laneByType.get(type) || null,
      nodes: groupNodes.map((node, nodeIndex) => ({
        node,
        x: nodeColumns[nodeIndex % 3],
        y: groupTop + (nodeIndex < 3 ? 70 : 152),
      })),
    };
  });
  const renderedLaneCount = Math.max(1, groups.length);
  const height = laneTop * 2 + laneHeight * renderedLaneCount + laneGap * Math.max(0, renderedLaneCount - 1);

  return {
    width: MAP_WIDTH,
    height: Math.max(MAP_MIN_HEIGHT, height),
    root: { x: 166, y: height / 2 },
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
  const [paperSuggestions, setPaperSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedPapers, setSelectedPapers] = useState([]);
  const [searching, setSearching] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [candidatePage, setCandidatePage] = useState(0);
  const builderPanelRef = useRef(null);
  const searchShellRef = useRef(null);
  const searchInputRef = useRef(null);
  const suggestionRequestRef = useRef(0);
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

  useEffect(() => {
    function closeSuggestions(event) {
      if (!searchShellRef.current?.contains(event.target)) setSuggestionsOpen(false);
    }
    document.addEventListener("pointerdown", closeSuggestions);
    return () => document.removeEventListener("pointerdown", closeSuggestions);
  }, []);

  useEffect(() => {
    const normalizedSearchTerm = query.trim();
    if (!suggestionsOpen || normalizedSearchTerm.length < 2) {
      setSuggestionsLoading(false);
      setPaperSuggestions([]);
      return undefined;
    }

    const requestId = suggestionRequestRef.current + 1;
    suggestionRequestRef.current = requestId;
    setSuggestionsLoading(true);
    const timerId = window.setTimeout(async () => {
      try {
        const response = await getPapers({
          search: normalizedSearchTerm,
          page: 0,
          size: 6,
          sortBy: "citationCount",
          sortDir: "desc",
        });
        if (suggestionRequestRef.current !== requestId) return;
        setPaperSuggestions(
          toArray(response)
            .map(normalizePaper)
            .filter((paper) => paper.id && paper.title !== "Untitled paper")
            .slice(0, 6),
        );
      } catch {
        if (suggestionRequestRef.current === requestId) setPaperSuggestions([]);
      } finally {
        if (suggestionRequestRef.current === requestId) setSuggestionsLoading(false);
      }
    }, 320);

    return () => window.clearTimeout(timerId);
  }, [query, suggestionsOpen]);

  async function choosePaperSuggestion(paper) {
    setQuery(paper.title);
    setSuggestionsOpen(false);
    await loadPaperOptions(paper.title);
  }

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
  const visibleSuggestions = query.trim().length >= 2
    ? paperSuggestions
    : paperOptions.slice(0, 6);

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

        <div className="research-search-shell" ref={searchShellRef}>
          <form
            className="research-search-form"
            onSubmit={(event) => {
              event.preventDefault();
              setSuggestionsOpen(false);
              loadPaperOptions(query);
            }}
          >
            <FiSearch />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onFocus={() => setSuggestionsOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setSuggestionsOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSuggestionsOpen(false);
              }}
              placeholder="Search title, author or keyword"
              aria-label="Search research papers by title, author or keyword"
              aria-autocomplete="list"
              aria-controls="research-paper-suggestions"
              aria-expanded={suggestionsOpen}
            />
            <button type="submit" disabled={searching}>{searching ? "Searching…" : "Search"}</button>
          </form>

          {suggestionsOpen && (
            <div className="research-paper-suggestions" id="research-paper-suggestions" role="listbox" aria-label="Suggested research papers">
              <header>
                <span>{query.trim().length >= 2 ? "Catalog suggestions" : "Top cited papers"}</span>
                <small>{suggestionsLoading ? "Finding matches…" : "Select to search"}</small>
              </header>
              {suggestionsLoading ? (
                <div className="research-suggestion-loading"><span className="workspace-loading-spinner" />Searching indexed papers…</div>
              ) : visibleSuggestions.length > 0 ? (
                <div className="research-suggestion-list">
                  {visibleSuggestions.map((paper) => (
                    <button key={paper.id} type="button" role="option" aria-selected="false" onClick={() => choosePaperSuggestion(paper)}>
                      <span><FiBookOpen /></span>
                      <div>
                        <strong>{paper.title}</strong>
                        <small>{paper.authors || "Unknown author"}{paper.year ? ` · ${paper.year}` : ""}</small>
                      </div>
                      <b>{formatNumber(paper.citationCount)} cites</b>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="research-suggestion-empty">No paper suggestions yet. Press Enter to search the full catalog.</div>
              )}
              <footer><FiSearch /> Press Enter anytime to search all matching papers</footer>
            </div>
          )}
        </div>

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

// Kept temporarily while the weighted one-hop renderer below replaces the old hierarchical canvas.
// eslint-disable-next-line no-unused-vars
function LegacyMindMapGraph({ data, selectedNode, onSelectNode }) {
  const rootId = data?.root?.id;
  const rootNodeKey = getMapNodeIdentity(data?.root);
  const selectedNodeKey = getMapNodeIdentity(selectedNode);
  const nodes = useMemo(() => (Array.isArray(data.nodes) ? data.nodes : []), [data.nodes]);
  const edges = useMemo(() => (Array.isArray(data.edges) ? data.edges : []), [data.edges]);
  const layout = useMemo(() => getMapLayout(nodes, data.root, edges), [nodes, data.root, edges]);
  const prioritySignals = useMemo(() => nodes
    .filter((node) => getMapNodeIdentity(node) !== rootNodeKey)
    .map((node) => ({ node, assessment: assessMindMapNode(node) }))
    .sort((first, second) => second.assessment.signal.priority - first.assessment.signal.priority
      || Number(second.node.paperCount || 0) - Number(first.node.paperCount || 0))
    .slice(0, 3), [nodes, rootNodeKey]);
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState("structure");
  const [isFocusMode, setIsFocusMode] = useState(false);
  const canvasRef = useRef(null);
  const scrollSnapshotRef = useRef(null);
  const restoreFrameRef = useRef([]);
  const rootType = normalizeMapType(data?.root?.type);
  const rootLines = splitMapLabel(data?.root?.label, 24);
  const baseViewBoxY = -18;
  const baseViewBoxHeight = layout.height + 62;
  const fitZoomRatio = 100 / zoom;
  const fitViewBoxWidth = layout.width * fitZoomRatio;
  const fitViewBoxHeight = baseViewBoxHeight * fitZoomRatio;
  const fitViewBoxCenterX = layout.width / 2;
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
    if (Math.abs(targetY - sourceY) > Math.abs(targetX - sourceX)) {
      const bendY = sourceY + (targetY - sourceY) * 0.52;
      return `M ${sourceX} ${sourceY} C ${sourceX} ${bendY}, ${targetX} ${bendY}, ${targetX} ${targetY}`;
    }
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

      {prioritySignals.length > 0 && (
        <div className="research-map-signal-strip" aria-label="Priority research signals">
          <div className="research-map-signal-strip-label">
            <FiZap />
            <div><small>Priority signals</small><strong>Jump to evidence</strong></div>
          </div>
          <div className="research-map-signal-list">
            {prioritySignals.map(({ node, assessment }, index) => {
              const nodeKey = getMapNodeIdentity(node);
              const type = normalizeMapType(node.type).toLowerCase();
              return (
                <button
                  key={nodeKey}
                  type="button"
                  className={`type-${type} ${selectedNodeKey === nodeKey ? "is-active" : ""}`}
                  onClick={(event) => selectMapNode(event, node)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><strong>{node.label}</strong><small>{assessment.signal.label} · {formatNumber(node.paperCount)} papers</small></div>
                  <FiArrowRight />
                </button>
              );
            })}
          </div>
        </div>
      )}

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

          <rect x="0" y={baseViewBoxY} width={layout.width} height={baseViewBoxHeight} fill="url(#research-map-dot-grid)" />

          <g className="research-map-lanes" aria-hidden="true">
            {layout.groups.map((group) => (
              <rect
                key={group.type}
                className={`research-map-lane type-${group.type.toLowerCase()}`}
                x={group.laneLeft}
                y={group.laneTop + 8}
                width={group.laneWidth}
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
                    d={curvePath(layout.root.x, layout.root.y + 54, group.hub.x, group.hub.y - 28)}
                  />
                  {group.nodes.map((item) => {
                    if (item.isLevel2 && item.parentId) {
                      const parentNode = group.nodes.find((n) => String(n.node.id) === String(item.parentId));
                      if (parentNode) {
                        return (
                          <path
                            key={item.node.id}
                            className="research-map-secondary-branch level-2"
                            d={curvePath(parentNode.x, parentNode.y + MAP_NODE_HEIGHT / 2, item.x, item.y - MAP_NODE_HEIGHT / 2 - 6)}
                            markerEnd={`url(#research-arrow-${typeClass})`}
                          />
                        );
                      }
                    }
                    return (
                      <path
                        key={item.node.id}
                        className="research-map-secondary-branch"
                        d={curvePath(group.hub.x, group.hub.y + 28, item.x, item.y - MAP_NODE_HEIGHT / 2 - 6)}
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
              const statusLabel = getMapStatusLabel(node.trendStatus);
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
                  <text className="research-map-node-status-label" textAnchor="end" x={MAP_NODE_WIDTH / 2 - 25} y="20">{statusLabel}</text>
                  <circle className="research-map-node-status" cx={MAP_NODE_WIDTH / 2 - 14} cy="17" r="5" />
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

function MindMapGraph({ data, selectedNode, onSelectNode, onExploreAsRoot }) {
  const rootNodeKey = getMapNodeIdentity(data?.root);
  const selectedNodeKey = getMapNodeIdentity(selectedNode);
  const nodes = useMemo(() => (Array.isArray(data?.nodes) ? data.nodes : []), [data]);
  const edges = useMemo(() => (Array.isArray(data?.edges) ? data.edges : []), [data]);
  const layout = useMemo(() => getMapLayout(nodes, data?.root, data?.lanes), [data?.lanes, data?.root, nodes]);
  const [zoom, setZoom] = useState(100);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [evidencePapers, setEvidencePapers] = useState([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const evidenceRequestRef = useRef(0);
  const rootType = normalizeMapType(data?.root?.type);
  const rootLines = splitMapLabel(data?.root?.label, 25);
  const unavailableLanes = useMemo(() => (Array.isArray(data?.lanes) ? data.lanes : [])
    .filter((lane) => Number(lane?.displayedCount) === 0), [data?.lanes]);
  const visibleLaneCount = layout.groups.length;
  const fitZoomRatio = 100 / zoom;
  const viewBoxWidth = layout.width * fitZoomRatio;
  const viewBoxHeight = layout.height * fitZoomRatio;
  const viewBoxX = (layout.width - viewBoxWidth) / 2;
  const viewBoxY = (layout.height - viewBoxHeight) / 2;
  const mapViewBox = isFocusMode
    ? `0 0 ${layout.width} ${layout.height}`
    : `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`;

  const renderedEdges = useMemo(() => layout.groups.flatMap((group) => group.nodes.map((item, index) => {
    const edge = findEdgeForNode(edges, item.node)
      || normalizeMindMapEdge({}, item.node, data?.root, `${group.type}-${index}`);
    return { ...item, group, edge };
  })), [data?.root, edges, layout.groups]);

  useEffect(() => {
    evidenceRequestRef.current += 1;
    setZoom(100);
    setSelectedEdge(null);
    setEvidencePapers([]);
  }, [data?.root?.id, data?.root?.type]);

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

  function edgePath(targetX, targetY) {
    const sourceX = layout.root.x + 136;
    const sourceY = layout.root.y;
    const destinationX = targetX - MAP_NODE_WIDTH / 2 - 6;
    const bendX = sourceX + (destinationX - sourceX) * 0.52;
    return `M ${sourceX} ${sourceY} C ${bendX} ${sourceY}, ${bendX} ${targetY}, ${destinationX} ${targetY}`;
  }

  function getEdgeStyle(edge) {
    const associationScore = normalizeAssociationScore(edge.associationScore || edge.rankScore);
    return {
      strokeWidth: 1.8 + associationScore * 5.8,
      opacity: 0.42 + associationScore * 0.58,
    };
  }

  function getEvidenceCatalogPath(edge, node) {
    const params = new URLSearchParams();
    const filters = [data?.root, node];
    const usedTypes = new Set();
    filters.forEach((item) => {
      const type = normalizeMapType(item?.type);
      if (!item?.label || usedTypes.has(type)) return;
      usedTypes.add(type);
      if (type === "TOPIC") params.set("topic", item.label);
      else if (type === "JOURNAL") params.set("journal", item.label);
      else if (type === "KEYWORD") params.set("keyword", item.label);
    });
    if (!params.toString() && node?.label) params.set("search", node.label);
    return `${ROUTE_PATHS.PAPERS}?${params.toString()}`;
  }

  async function openEdgeEvidence(edge, node) {
    const requestId = evidenceRequestRef.current + 1;
    evidenceRequestRef.current = requestId;
    const nextSelection = { edge, node, catalogPath: getEvidenceCatalogPath(edge, node) };
    setSelectedEdge(nextSelection);
    setEvidenceError("");
    setEvidencePapers([]);

    try {
      setEvidenceLoading(true);
      const response = await getMindMapEvidence({
        rootType: normalizeMapType(data?.root?.type),
        rootId: getMindMapEntityId(data?.root?.id),
        targetType: normalizeMapType(node?.type),
        targetId: getMindMapEntityId(node?.id),
        page: 0,
        size: 5,
      });
      if (evidenceRequestRef.current !== requestId) return;
      const hydratedPapers = toArray(response?.data ?? response, ["evidencePapers", "papers", "content", "items"])
        .map((paper, index) => ({
          ...normalizePaper(paper, index),
          journal: paper.journalTitle ?? paper.journalName ?? paper.journal?.name ?? "Journal unavailable",
        }));
      setEvidencePapers(hydratedPapers.slice(0, 5));
    } catch (error) {
      if (evidenceRequestRef.current !== requestId) return;
      setEvidencePapers([]);
      setEvidenceError(error.message || "The evidence paper records could not be loaded.");
    } finally {
      if (evidenceRequestRef.current === requestId) setEvidenceLoading(false);
    }
  }

  function chooseNode(event, node) {
    event?.preventDefault();
    event?.stopPropagation();
    onSelectNode(node);
    if (getMapNodeIdentity(node) === rootNodeKey) {
      evidenceRequestRef.current += 1;
      setSelectedEdge(null);
      return;
    }
    const nodeEdge = findEdgeForNode(edges, node)
      || normalizeMindMapEdge(node?.edge || node?.association || node, node, data?.root, "selected-node");
    openEdgeEvidence(nodeEdge, node);
  }

  function handleNodeKeyDown(event, node) {
    if (event.key !== "Enter" && event.key !== " ") return;
    chooseNode(event, node);
  }

  function handleEdgeKeyDown(event, edge, node) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openEdgeEvidence(edge, node);
  }

  return (
    <div className={`research-map-explorer research-weighted-map ${isFocusMode ? "is-focus-mode" : "is-fit-mode"}`}>
      <header className="research-map-toolbar">
        <div>
          <span className={`research-map-toolbar-mark type-${rootType.toLowerCase()}`}>
            {MAP_TYPE_META[rootType].shortLabel}
          </span>
          <div>
            <small>Weighted evidence map</small>
            <strong>{data?.root?.label || "Research root"}</strong>
          </div>
        </div>
        <div className="research-map-toolbar-meta">
          <span><b>{data?.fromYear}-{data?.toYear}</b> analysis period</span>
          <span><b>{renderedEdges.length}</b> ranked associations</span>
          <span><b>{visibleLaneCount}</b> evidence lane{visibleLaneCount === 1 ? "" : "s"}</span>
        </div>
        <div className="research-map-zoom" aria-label="Mind map zoom controls">
          <button type="button" onClick={() => setZoom((current) => Math.max(MAP_ZOOM_MIN, current - MAP_ZOOM_STEP))} disabled={zoom <= MAP_ZOOM_MIN} aria-label="Zoom out"><FiMinus /></button>
          <button type="button" className="research-map-zoom-value" onClick={() => setZoom(100)} aria-label={`Reset zoom. Current zoom ${zoom} percent`}>{zoom}%</button>
          <button type="button" onClick={() => setZoom((current) => Math.min(MAP_ZOOM_MAX, current + MAP_ZOOM_STEP))} disabled={zoom >= MAP_ZOOM_MAX} aria-label="Zoom in"><FiPlus /></button>
          <button type="button" onClick={() => setIsFocusMode((current) => !current)} aria-label={isFocusMode ? "Exit focus mode" : "Open focus mode"}>{isFocusMode ? <FiMinimize2 /> : <FiMaximize2 />}</button>
        </div>
      </header>

      <div className="research-map-decision-bar research-map-model-bar">
        <FiShare2 />
        <div><small>Evidence model</small><strong>One-hop associations ranked by shared papers, strength and publication momentum</strong></div>
        <span>{data?.fromYear}-{data?.toYear} · click an edge for papers</span>
      </div>

      {unavailableLanes.length > 0 && (
        <div className="research-map-lane-notices" aria-label="Unavailable evidence lanes">
          {unavailableLanes.map((lane) => {
            const type = normalizeMapType(lane.type);
            return (
              <div key={type} className={`type-${type.toLowerCase()}`}>
                <strong>{lane.label || MAP_TYPE_META[type].label}</strong>
                <span>{lane.message || "No evidence relationships were returned for this lane."}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="research-map-canvas">
        <svg
          viewBox={mapViewBox}
          style={isFocusMode ? { width: `${zoom}%`, minWidth: `${Math.round(860 * zoom / 100)}px` } : { width: "100%", minWidth: 0, height: "100%" }}
          role="img"
          aria-label={`Weighted evidence map for ${data?.root?.label || "selected root"}`}
        >
          <defs>
            <linearGradient id="research-weighted-root-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4f5cf2" />
              <stop offset="54%" stopColor="#3846ba" />
              <stop offset="100%" stopColor="#0e91aa" />
            </linearGradient>
            <pattern id="research-weighted-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.05" fill="#7182b5" fillOpacity="0.12" />
            </pattern>
            <filter id="research-weighted-shadow" x="-35%" y="-50%" width="170%" height="200%">
              <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#26355f" floodOpacity="0.14" />
            </filter>
          </defs>

          <rect width={layout.width} height={layout.height} fill="url(#research-weighted-grid)" />

          <g className="research-map-lanes">
            {layout.groups.map((group) => (
              <g key={group.type} className={`research-weighted-lane type-${group.type.toLowerCase()}`}>
                <rect className="research-map-lane" x={group.laneLeft} y={group.laneTop} width={group.laneWidth} height={group.laneHeight} rx="26" />
                <text className="research-weighted-lane-index" x={group.laneLeft + 22} y={group.laneTop + 31}>{String(MAP_TYPE_ORDER.indexOf(group.type) + 1).padStart(2, "0")}</text>
                <text className="research-weighted-lane-title" x={group.laneLeft + 54} y={group.laneTop + 30}>{group.meta.label}</text>
                <text className="research-weighted-lane-count" textAnchor="end" x={group.laneLeft + group.laneWidth - 20} y={group.laneTop + 30}>{group.nodes.length} ranked nodes</text>
                {String(group.lane?.evidenceLevel || "").toUpperCase() === "LIMITED" && (
                  <text className="research-weighted-lane-empty is-limited" x={group.laneLeft + 54} y={group.laneTop + 50}>Limited evidence: 1–2 shared papers</text>
                )}
              </g>
            ))}
          </g>

          <g className="research-weighted-edges">
            {renderedEdges.map(({ node, x, y, edge }) => {
              const status = String(edge.trendStatus || node.trendStatus || "STABLE").toLowerCase();
              const style = getEdgeStyle(edge);
              const edgeKey = `${edge.id}-${getMapNodeIdentity(node)}`;
              const isSelected = selectedEdge?.edge?.id === edge.id && getMapNodeIdentity(selectedEdge?.node) === getMapNodeIdentity(node);
              return (
                <g
                  key={edgeKey}
                  className={`research-weighted-edge trend-${status} evidence-${String(edge.evidenceLevel || "strong").toLowerCase()} ${isSelected ? "is-selected" : ""}`}
                  onClick={() => openEdgeEvidence(edge, node)}
                  onKeyDown={(event) => handleEdgeKeyDown(event, edge, node)}
                  role="button"
                  tabIndex="0"
                  aria-label={`Open ${edge.sharedPaperCount} shared evidence papers between ${data?.root?.label} and ${node.label}`}
                >
                  <path className="research-weighted-edge-hit" d={edgePath(x, y)} />
                  <path className="research-weighted-edge-line" d={edgePath(x, y)} style={style} />
                  <title>
                    {`${formatNumber(edge.sharedPaperCount)} shared papers · recent ${formatNumber(edge.recentSharedPaperCount)} vs previous ${formatNumber(edge.previousSharedPaperCount)} · growth ${edge.growthRate > 0 ? "+" : ""}${edge.growthRate}% · association ${Math.round(normalizeAssociationScore(edge.associationScore || edge.rankScore) * 100)}%${edge.evidenceLevel === "LIMITED" ? " · Limited evidence" : ""}`}
                  </title>
                  <g className="research-weighted-edge-badge" transform={`translate(${x - MAP_NODE_WIDTH / 2 - 31} ${y})`}>
                    <rect x="-25" y="-11" width="50" height="22" rx="11" />
                    <text textAnchor="middle" y="4">{formatNumber(edge.sharedPaperCount)}</text>
                  </g>
                </g>
              );
            })}
          </g>

          <g
            className={`research-map-root research-weighted-root type-${rootType.toLowerCase()} ${selectedNodeKey === rootNodeKey ? "is-selected" : ""}`}
            transform={`translate(${layout.root.x} ${layout.root.y})`}
            onClick={(event) => chooseNode(event, data?.root)}
            onKeyDown={(event) => handleNodeKeyDown(event, data?.root)}
            role="button"
            tabIndex="0"
            aria-pressed={selectedNodeKey === rootNodeKey}
          >
            <circle className="research-map-root-orbit" r="104" />
            <rect x="-136" y="-69" width="272" height="138" rx="31" fill="url(#research-weighted-root-gradient)" filter="url(#research-weighted-shadow)" />
            <text className="research-map-root-kicker" textAnchor="middle" y="-39">RESEARCH ROOT</text>
            <text className="research-map-root-label" textAnchor="middle" y={rootLines.length > 1 ? -11 : 0}>
              {rootLines.map((line, index) => <tspan key={`${line}-${index}`} x="0" dy={index === 0 ? 0 : 20}>{line}</tspan>)}
            </text>
            <text className="research-map-root-count" textAnchor="middle" y="45">{Number(data?.root?.catalogPaperCount) > 0 ? `${formatNumber(data.root.catalogPaperCount)} catalog papers` : "Catalog size unavailable"}</text>
          </g>

          <g className="research-map-nodes">
            {renderedEdges.map(({ node, x, y, edge }) => {
              const type = normalizeMapType(node.type);
              const nodeKey = getMapNodeIdentity(node);
              const lines = splitMapLabel(node.label, 22);
              const isSelected = selectedNodeKey === nodeKey;
              const associationPercent = Math.round(normalizeAssociationScore(edge.associationScore) * 100);
              return (
                <g
                  key={nodeKey}
                  className={`research-map-node research-weighted-node type-${type.toLowerCase()} trend-${String(edge.trendStatus || node.trendStatus || "stable").toLowerCase()} evidence-${String(edge.evidenceLevel || "strong").toLowerCase()} ${isSelected ? "is-selected" : ""}`}
                  transform={`translate(${x} ${y})`}
                  onClick={(event) => chooseNode(event, node)}
                  onKeyDown={(event) => handleNodeKeyDown(event, node)}
                  role="button"
                  tabIndex="0"
                  aria-pressed={isSelected}
                >
                  <rect className="research-map-node-card" x={-MAP_NODE_WIDTH / 2} y={-MAP_NODE_HEIGHT / 2} width={MAP_NODE_WIDTH} height={MAP_NODE_HEIGHT} rx="17" filter="url(#research-weighted-shadow)" />
                  <rect className="research-map-node-accent" x={-MAP_NODE_WIDTH / 2} y="-22" width="5" height="44" rx="3" />
                  <circle className="research-map-node-badge" cx={-MAP_NODE_WIDTH / 2 + 29} cy="0" r="15" />
                  <text className="research-map-node-code" textAnchor="middle" x={-MAP_NODE_WIDTH / 2 + 29} y="4">{MAP_TYPE_META[type].shortLabel}</text>
                  <text className="research-map-node-label" x={-MAP_NODE_WIDTH / 2 + 52} y={lines.length > 1 ? -12 : -4}>
                    {lines.map((line, index) => <tspan key={`${line}-${index}`} x={-MAP_NODE_WIDTH / 2 + 52} dy={index === 0 ? 0 : 14}>{line}</tspan>)}
                  </text>
                  <text className="research-map-node-count" x={-MAP_NODE_WIDTH / 2 + 52} y={lines.length > 1 ? 22 : 17}>{formatNumber(edge.sharedPaperCount)} shared · {formatNumber(node.catalogPaperCount)} catalog</text>
                  <circle className="research-map-node-status" cx={MAP_NODE_WIDTH / 2 - 13} cy={-MAP_NODE_HEIGHT / 2 + 13} r="5" />
                  {edge.evidenceLevel === "LIMITED" && (
                    <g className="research-map-node-evidence-badge" transform={`translate(${MAP_NODE_WIDTH / 2 - 67} ${-MAP_NODE_HEIGHT / 2 - 8})`}>
                      <rect width="68" height="18" rx="9" />
                      <text x="34" y="12" textAnchor="middle">LIMITED</text>
                    </g>
                  )}
                  <title>{node.label} · {formatNumber(edge.sharedPaperCount)} shared · {formatNumber(node.catalogPaperCount)} catalog · {associationPercent}% association · {getMapStatusLabel(edge.trendStatus)}{edge.evidenceLevel === "LIMITED" ? " · Limited evidence: 1–2 shared papers" : ""}</title>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {selectedNode && selectedNodeKey !== rootNodeKey && !selectedEdge && (
        <div className="research-map-node-quick-action">
          <div>
            <small>Selected node</small>
            <strong>{selectedNode.label}</strong>
          </div>
          <button type="button" onClick={() => onExploreAsRoot(selectedNode)}>
            <FiGitBranch />Explore as root
          </button>
        </div>
      )}

      {selectedEdge && (
        <aside className="research-edge-evidence-panel" aria-label="Edge evidence papers">
          <header>
            <div><small>Edge evidence</small><strong>{data?.root?.label} ↔ {selectedEdge.node.label}</strong></div>
            <button type="button" onClick={() => setSelectedEdge(null)} aria-label="Close evidence panel"><FiX /></button>
          </header>
          <div className="research-edge-evidence-metrics">
            <div><small>Shared papers</small><strong>{formatNumber(selectedEdge.edge.sharedPaperCount)}</strong></div>
            <div><small>Association</small><strong>{Math.round(normalizeAssociationScore(selectedEdge.edge.associationScore) * 100)}%</strong></div>
            <div><small>Trend</small><strong>{getMapStatusLabel(selectedEdge.edge.trendStatus)}</strong></div>
            <div><small>Recent period</small><strong>{formatNumber(selectedEdge.edge.recentSharedPaperCount)}</strong></div>
            <div><small>Previous period</small><strong>{formatNumber(selectedEdge.edge.previousSharedPaperCount)}</strong></div>
            <div><small>Growth rate</small><strong>{selectedEdge.edge.growthRate > 0 ? "+" : ""}{selectedEdge.edge.growthRate}%</strong></div>
          </div>
          {selectedEdge.edge.evidenceLevel === "LIMITED" && (
            <div className="research-edge-evidence-level is-limited">
              <FiAlertCircle />
              <span><strong>Limited evidence:</strong> 1–2 shared papers. Verify the supporting papers before using this relationship.</span>
            </div>
          )}
          {evidenceLoading ? (
            <div className="research-edge-evidence-empty"><span className="workspace-loading-spinner" /><p>Loading evidence papers…</p></div>
          ) : evidencePapers.length > 0 ? (
            <ol className="research-edge-paper-list">
              {evidencePapers.map((paper) => (
                <li key={paper.id || paper.title}>
                  <span><FiBookOpen /></span>
                  <div>
                    <strong>{shortTitle(paper.title, 72)}</strong>
                    <small>{paper.authors}</small>
                    <small>{paper.year || "Year unavailable"} · {paper.journal} · {formatNumber(paper.citationCount || 0)} citations</small>
                    <small>{paper.doi ? `DOI: ${paper.doi}` : "DOI unavailable"}</small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="research-edge-evidence-empty">
              <FiActivity />
              <strong>{evidenceError || "No evidence papers were returned for this relationship"}</strong>
              <p>The association metrics remain visible, but this intersection currently has no paper records on the requested evidence page.</p>
            </div>
          )}
          <button type="button" className="research-edge-explore-root" onClick={() => onExploreAsRoot(selectedEdge.node)}>
            <FiGitBranch />Explore as root
          </button>
          <Link className="research-inspector-action" to={selectedEdge.catalogPath}>Open filtered paper set <FiArrowRight /></Link>
        </aside>
      )}

      <footer className="research-map-legend research-weighted-legend">
        <div className="research-map-status-legend">
          <span className="is-growing"><i />Growing</span>
          <span className="is-emerging"><i />Emerging</span>
          <span className="is-stable"><i />Stable</span>
          <span className="is-declining"><i />Declining</span>
        </div>
        <small>Thicker = stronger association/rank score · color = trend status · select a node or edge for papers</small>
      </footer>
    </div>
  );
}

function normalizeMindMapNode(rawNode) {
  if (!rawNode || typeof rawNode !== "object") return null;

  const paperCount = Number(rawNode.paperCount ?? rawNode.totalPapers ?? rawNode.paper_count ?? rawNode.count ?? 0) || 0;
  const catalogPaperCount = Number(
    rawNode.catalogPaperCount ?? rawNode.totalCatalogPaperCount ?? rawNode.catalogCount ?? rawNode.totalPapers ?? paperCount,
  ) || 0;
  const sharedPaperCount = Number(
    rawNode.sharedPaperCount ?? rawNode.sharedCount ?? rawNode.coOccurrenceCount ?? paperCount,
  ) || 0;
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
    catalogPaperCount,
    sharedPaperCount,
    recentPaperCount,
    previousPaperCount,
    growthRate: Number(rawNode.growthRate ?? rawNode.growthPercent ?? 0) || 0,
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

function MindMapWorkspace() {
  const [rootType, setRootType] = useState("KEYWORD");
  const [rootSuggestions, setRootSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [rootQuery, setRootQuery] = useState("");
  const [selectedRootId, setSelectedRootId] = useState("");
  const [exploredRoot, setExploredRoot] = useState(null);
  const [limit, setLimit] = useState(5);
  const [fromYear, setFromYear] = useState(CURRENT_YEAR - 4);
  const [toYear, setToYear] = useState(CURRENT_YEAR);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapData, setMapData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const rootSelectRef = useRef(null);
  const mapPanelRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const query = rootQuery.trim();
    if (query.length < 2 || rootType === "JOURNAL") return undefined;
    if (selectedRootId && exploredRoot && query === String(exploredRoot.name || "").trim()) return undefined;

    const timeoutId = window.setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        const response = rootType === "KEYWORD"
          ? await getKeywordSuggestions(query, 0, 10)
          : await getTopicSuggestions(query, 0, 10);
        if (cancelled) return;
        const nextSuggestions = toArray(response?.data ?? response, ["suggestions", "keywords", "topics", "content", "items"])
          .map((item, index) => {
            const normalized = rootType === "KEYWORD" ? normalizeKeyword(item, index) : normalizeTopic(item, index);
            const rawCatalogCount = item?.catalogPaperCount
              ?? item?.totalCatalogPaperCount
              ?? item?.paperCount
              ?? item?.totalPapers
              ?? item?.worksCount
              ?? item?.count;
            return {
              ...normalized,
              catalogPaperCount: rawCatalogCount === undefined || rawCatalogCount === null
                ? null
                : Number(rawCatalogCount) || 0,
            };
          })
          .filter((item) => Number.isFinite(Number(item.id)) && !item.name.startsWith("Untitled"))
          .slice(0, 10);
        setRootSuggestions(nextSuggestions);
        setSuggestionsOpen(true);
      } catch (error) {
        if (!cancelled) {
          setRootSuggestions([]);
          setErrorMessage(error.message || "Could not load catalog suggestions.");
        }
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [exploredRoot, rootQuery, rootType, selectedRootId]);

  const selectedRoot = useMemo(() => {
    const catalogRoot = rootSuggestions.find((item) => String(item.id) === String(selectedRootId));
    if (catalogRoot) return catalogRoot;
    if (String(exploredRoot?.id) === String(selectedRootId)) return exploredRoot;
    return null;
  }, [exploredRoot, rootSuggestions, selectedRootId]);

  function changeRootType(type) {
    setRootType(type);
    setExploredRoot(null);
    setRootSuggestions([]);
    setSuggestionsOpen(false);
    setRootQuery("");
    setSelectedRootId("");
    setMapData(null);
    setSelectedNode(null);
    setErrorMessage("");
  }

  function selectResearchRoot(root) {
    setExploredRoot(root);
    setSelectedRootId(String(root.id));
    setRootQuery(root.name);
    setSuggestionsOpen(false);
    setMapData(null);
    setSelectedNode(null);
    setErrorMessage("");
  }

  async function loadMindMap(nextRootType, nextRootId) {
    try {
      setMapLoading(true);
      setErrorMessage("");
      const response = await getResearchMindMap({
        type: nextRootType,
        id: getMindMapEntityId(nextRootId),
        limit: Number(limit),
        fromYear: Number(fromYear),
        toYear: Number(toYear),
      });
      const payload = response?.data ?? response;
      const laneNodes = [
        ...(Array.isArray(payload?.topics) ? payload.topics.map((node) => ({ ...node, type: node.type || "TOPIC" })) : []),
        ...(Array.isArray(payload?.keywords) ? payload.keywords.map((node) => ({ ...node, type: node.type || "KEYWORD" })) : []),
        ...(Array.isArray(payload?.journals) ? payload.journals.map((node) => ({ ...node, type: node.type || "JOURNAL" })) : []),
      ];
      const rawNodes = Array.isArray(payload?.nodes) ? payload.nodes : laneNodes;
      if (!payload?.root) {
        throw new Error("No research root was returned for this item.");
      }

      const normalizedNodes = rawNodes.map((node) => normalizeMindMapNode(node)).filter(Boolean);
      const normalizedRoot = normalizeMindMapNode(payload.root);
      const rawEdges = Array.isArray(payload?.edges)
        ? payload.edges
        : Array.isArray(payload?.associations)
          ? payload.associations
          : Array.isArray(payload?.relationships)
            ? payload.relationships
            : [];
      const normalizedEdges = normalizedNodes
        .filter((node) => getMapNodeIdentity(node) !== getMapNodeIdentity(normalizedRoot))
        .map((node, index) => {
          const matchingEdge = findEdgeForNode(rawEdges, node);
          return normalizeMindMapEdge(matchingEdge || node.association || node.edge || node, node, normalizedRoot, index);
        });

      const nextMap = {
        root: normalizedRoot,
        nodes: normalizedNodes,
        edges: normalizedEdges,
        fromYear: Number(payload?.fromYear ?? fromYear),
        toYear: Number(payload?.toYear ?? toYear),
        previousFromYear: Number(payload?.previousFromYear) || null,
        previousToYear: Number(payload?.previousToYear) || null,
        lanes: (Array.isArray(payload?.lanes) ? payload.lanes : [])
          .map((lane) => ({
            ...lane,
            type: normalizeMapType(lane?.type),
            label: lane?.label || MAP_TYPE_META[normalizeMapType(lane?.type)].label,
            candidateCount: Number(lane?.candidateCount) || 0,
            strongCandidateCount: Number(lane?.strongCandidateCount) || 0,
            limitedCandidateCount: Number(lane?.limitedCandidateCount) || 0,
            displayedCount: Number(lane?.displayedCount) || 0,
            evidenceLevel: String(lane?.evidenceLevel || "NO_DATA").toUpperCase(),
            message: String(lane?.message || "").trim(),
          }))
          .filter((lane) => MAP_TYPE_ORDER.includes(lane.type)),
        minStrongSharedPapers: Number(payload?.minStrongSharedPapers) || 3,
      };
      setMapData(nextMap);
      setSelectedNode(normalizedRoot);
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

  async function buildMindMap(event) {
    event.preventDefault();
    if (!selectedRootId) {
      setErrorMessage(`Select a ${rootType.toLowerCase()} root first.`);
      rootSelectRef.current?.focus();
      return;
    }
    if (!Number.isInteger(Number(fromYear)) || !Number.isInteger(Number(toYear)) || Number(fromYear) > Number(toYear)) {
      setErrorMessage("Choose a valid analysis period where From year is not after To year.");
      return;
    }
    await loadMindMap(rootType, selectedRootId);
  }

  async function exploreNodeAsRoot(node) {
    const nextType = normalizeMapType(node?.type);
    if (!node?.id || !MAP_TYPE_ORDER.includes(nextType)) return;
    const nextRoot = {
      id: node.id,
      name: node.label,
      label: node.label,
      paperCount: node.catalogPaperCount,
      catalogPaperCount: node.catalogPaperCount,
      type: nextType,
    };
    setRootType(nextType);
    setExploredRoot(nextRoot);
    setSelectedRootId(String(node.id));
    setRootQuery("");
    setMapData(null);
    setSelectedNode(null);
    await loadMindMap(nextType, node.id);
  }

  const relatedNodeCount = useMemo(() => {
    const rootIdentity = getMapNodeIdentity(mapData?.root);
    return (mapData?.nodes || []).filter((node) => getMapNodeIdentity(node) !== rootIdentity).length;
  }, [mapData]);

  const selectedNodeEdge = useMemo(
    () => selectedNode && mapData ? findEdgeForNode(mapData.edges || [], selectedNode) : null,
    [mapData, selectedNode],
  );

  function handleRootQueryChange(value) {
    setRootQuery(value);
    setExploredRoot(null);
    setSelectedRootId("");
    setMapData(null);
    setSelectedNode(null);
    setErrorMessage("");
    if (value.trim().length < 2) {
      setRootSuggestions([]);
      setSuggestionsOpen(false);
    }
  }

  return (
    <div className="research-mind-shell">
      <section className="research-mind-brief research-mind-command" aria-label="Research opportunity workflow">
        <div className="research-mind-brief-icon"><FiMap /></div>
        <div>
          <span className="research-section-kicker">Research opportunity workspace</span>
          <h3>Turn one research concept into a weighted evidence landscape</h3>
          <p>Inspect shared papers, association strength and publication momentum without a noisy multi-level graph.</p>
        </div>
        <div className="research-mind-progress" aria-label="Mind map progress">
          <span className={selectedRoot ? "is-complete" : "is-active"}><b>01</b>Select</span>
          <i />
          <span className={mapData ? "is-complete" : selectedRoot ? "is-active" : ""}><b>02</b>Map</span>
          <i />
          <span className={selectedNode && mapData ? "is-active" : ""}><b>03</b>Evidence</span>
        </div>
      </section>

      <div className="research-mind-layout">
      <form className="research-map-builder" onSubmit={buildMindMap}>
        <div className="research-panel-heading">
          <div>
            <span className="research-section-kicker">Evidence scope</span>
            <h3>Choose the research root</h3>
          </div>
          <span className="research-panel-step">01</span>
        </div>

        <p className="research-builder-intro">Anchor the map to one indexed concept. Every lane will stay one hop from this root.</p>

        <div className="research-root-type-switch">
          <button type="button" className={rootType === "KEYWORD" ? "active" : ""} onClick={() => changeRootType("KEYWORD")}>
            <FiHash />Keyword root
          </button>
          <button type="button" className={rootType === "TOPIC" ? "active" : ""} onClick={() => changeRootType("TOPIC")}>
            <FiTag />Topic root
          </button>
          {rootType === "JOURNAL" && (
            <button type="button" className="active" aria-label="Current journal root">
              <FiBookOpen />Journal root
            </button>
          )}
        </div>

        <div className="research-root-autocomplete">
          <label className="research-map-field">
            <span>Search and select a {rootType.toLowerCase()}</span>
            <div>
              <FiSearch />
              <input
                ref={rootSelectRef}
                value={rootQuery}
                onChange={(event) => handleRootQueryChange(event.target.value)}
                onFocus={() => rootSuggestions.length > 0 && setSuggestionsOpen(true)}
                placeholder={`Type at least 2 characters to find a ${rootType.toLowerCase()}`}
                autoComplete="off"
              />
              {suggestionsLoading && <span className="workspace-loading-spinner" aria-label="Loading suggestions" />}
            </div>
          </label>
          {suggestionsOpen && (
            <div className="research-root-suggestions" role="listbox" aria-label={`${rootType.toLowerCase()} suggestions`}>
              {rootSuggestions.length > 0 ? rootSuggestions.map((option) => (
                <button key={`${rootType}-${option.id}`} type="button" role="option" onClick={() => selectResearchRoot(option)}>
                  <span>{rootType === "KEYWORD" ? <FiHash /> : <FiTag />}</span>
                  <div>
                    <strong>{option.name}</strong>
                    <small>{option.catalogPaperCount === null
                      ? "Catalog count shown after analysis"
                      : `${formatNumber(option.catalogPaperCount)} catalog papers`}</small>
                  </div>
                  <FiArrowRight />
                </button>
              )) : !suggestionsLoading && (
                <div className="research-root-suggestions-empty">No matching catalog item found.</div>
              )}
            </div>
          )}
          {rootQuery.trim().length > 0 && rootQuery.trim().length < 2 && (
            <small className="research-root-search-hint">Enter at least 2 characters to search the live catalog.</small>
          )}
        </div>

        <div className={`research-root-preview ${selectedRoot ? "has-selection" : ""}`}>
          <span>{selectedRoot ? (rootType === "KEYWORD" ? <FiHash /> : rootType === "JOURNAL" ? <FiBookOpen /> : <FiTag />) : <FiSearch />}</span>
          <div>
            <small>{selectedRoot ? "Research root selected" : "Waiting for a research root"}</small>
            <strong>{selectedRoot?.name || "Choose a catalog concept above"}</strong>
            <p>{selectedRoot
              ? selectedRoot.catalogPaperCount !== null
                ? `${formatNumber(selectedRoot.catalogPaperCount)} papers in the catalog`
                : "The map API will return the catalog size after analysis."
              : "Search by keyword or topic to anchor the graph in real evidence."}</p>
          </div>
        </div>

        <label className="research-map-field">
          <span>Landscape breadth</span>
          <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
            <option value={3}>Focused — top 3 nodes per lane</option>
            <option value={4}>Balanced — top 4 nodes per lane</option>
            <option value={5}>Expanded — top 5 nodes per lane</option>
          </select>
        </label>

        <div className="research-map-year-range">
          <label>
            <span>From year</span>
            <input type="number" min="1900" max={CURRENT_YEAR} value={fromYear} onChange={(event) => setFromYear(event.target.value)} />
          </label>
          <span>to</span>
          <label>
            <span>To year</span>
            <input type="number" min="1900" max={CURRENT_YEAR} value={toYear} onChange={(event) => setToYear(event.target.value)} />
          </label>
        </div>

        {errorMessage && <div className="workspace-notice warning" role="alert">{errorMessage}</div>}

        <button type="submit" className="research-run-button" disabled={mapLoading || !selectedRootId}>
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
          <MindMapGraph data={mapData} selectedNode={selectedNode} onSelectNode={setSelectedNode} onExploreAsRoot={exploreNodeAsRoot} />
        ) : (
          <div className="research-map-empty-shell">
            <header className="research-map-empty-toolbar">
              <div><span><FiCompass /></span><div><small>Decision-support canvas</small><strong>Opportunity preview</strong></div></div>
              <span className={selectedRoot ? "is-ready" : ""}>{selectedRoot ? "Root selected" : "Waiting for scope"}</span>
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
            <span className="research-section-kicker">Verifiable relationship map</span>
            <h3>{selectedRoot ? `Ready to assess directions around “${selectedRoot.name}”` : "Choose one indexed evidence root."}</h3>
            <p>{selectedRoot
              ? `Build three weighted lanes using catalog evidence from ${fromYear} to ${toYear}.`
              : "Start with a keyword or topic. Every returned association can be verified against its shared papers."}</p>
            <div className="research-map-empty-outcomes">
              <span><FiShare2 />Shared paper count</span>
              <span><FiTrendingUp />Association & trend</span>
              <span><FiBookOpen />Evidence papers</span>
            </div>
            <button type="button" onClick={() => selectedRootId ? rootSelectRef.current?.form?.requestSubmit() : rootSelectRef.current?.focus()}>
              {selectedRootId ? <><FiGitBranch />Analyze this research landscape</> : <><FiSearch />Define the research scope</>}
            </button>
            </div>
          </div>
        )}
      </section>

      <aside className="research-map-insights research-map-facts">
        <div className="research-panel-heading">
          <div>
            <span className="research-section-kicker">Verified API metrics</span>
            <h3>Relationship evidence</h3>
          </div>
          <span className="research-panel-step">03</span>
        </div>

        {mapData ? (
          <div className="research-map-facts-body">
            <div className="research-map-period-card">
              <small>Analysis period</small>
              <strong>{mapData.fromYear}-{mapData.toYear}</strong>
              <span>Returned by the Mind Map API</span>
            </div>
            <article className="research-map-root-fact">
              <span>{normalizeMapType(mapData.root?.type) === "TOPIC" ? <FiTag /> : <FiHash />}</span>
              <div><small>Research root</small><strong>{mapData.root?.label}</strong></div>
            </article>
            <dl className="research-node-metrics research-map-api-summary">
              <div><dt>Root catalog</dt><dd>{formatNumber(mapData.root?.catalogPaperCount)}</dd></div>
              <div><dt>Related nodes</dt><dd>{formatNumber(relatedNodeCount)}</dd></div>
              <div><dt>Evidence lanes</dt><dd>3</dd></div>
            </dl>

            {selectedNode && getMapNodeIdentity(selectedNode) !== getMapNodeIdentity(mapData.root) && selectedNodeEdge ? (
              <div className="research-map-selected-fact">
                <div className="research-node-detail-type">
                  <i>{normalizeMapType(selectedNode.type) === "TOPIC" ? <FiTag /> : normalizeMapType(selectedNode.type) === "JOURNAL" ? <FiBookOpen /> : <FiHash />}</i>
                  <span>{normalizeMapType(selectedNode.type)}</span>
                </div>
                <h4>{selectedNode.label}</h4>
                <span className={`research-map-status-pill trend-${String(selectedNodeEdge.trendStatus || "STABLE").toLowerCase()}`}>
                  <TrendStatusIcon status={selectedNodeEdge.trendStatus} />{getMapStatusLabel(selectedNodeEdge.trendStatus)}
                </span>
                <dl className="research-node-metrics research-map-api-detail">
                  <div><dt>Shared papers</dt><dd>{formatNumber(selectedNodeEdge.sharedPaperCount)}</dd></div>
                  <div><dt>Catalog papers</dt><dd>{formatNumber(selectedNode.catalogPaperCount)}</dd></div>
                  <div><dt>Recent shared</dt><dd>{formatNumber(selectedNodeEdge.recentSharedPaperCount)}</dd></div>
                  <div><dt>Previous shared</dt><dd>{formatNumber(selectedNodeEdge.previousSharedPaperCount)}</dd></div>
                  <div><dt>Growth</dt><dd>{Number(selectedNodeEdge.growthRate) > 0 ? "+" : ""}{Number(selectedNodeEdge.growthRate || 0).toFixed(1)}%</dd></div>
                  <div><dt>Association</dt><dd>{Math.round(normalizeAssociationScore(selectedNodeEdge.associationScore || selectedNodeEdge.rankScore) * 100)}%</dd></div>
                </dl>
                <button type="button" className="research-inspector-action" onClick={() => exploreNodeAsRoot(selectedNode)}>
                  Explore as root <FiArrowRight />
                </button>
              </div>
            ) : (
              <div className="research-inspector-empty">
                <FiShare2 />
                <strong>Select a child node or edge</strong>
                <p>The Evidence papers panel will load the publications that connect it to the root.</p>
              </div>
            )}
            <p className="research-signal-disclaimer"><FiActivity />Only backend-provided catalog, association and trend metrics are shown.</p>
          </div>
        ) : (
          <div className="research-inspector-empty">
            <FiActivity />
            <strong>No analysis loaded</strong>
            <p>Choose a real catalog root and year range to inspect verifiable relationship metrics.</p>
          </div>
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
  const mindMapAccess = "Full";
  const [activeTool, setActiveTool] = useState("compare");

  if (!canComparePapers) return null;

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

        {canComparePapers ? (
          activeTool === "compare" ? <PaperComparator /> : <MindMapWorkspace />
        ) : (
          <div className="workspace-empty" style={{ padding: "60px 20px", textAlign: "center" }}>
            <FiGitBranch style={{ fontSize: "40px", color: "#6366f1", marginBottom: "16px" }} />
            <h3>Mind Map & Research Comparator</h3>
            <p style={{ maxWidth: "480px", margin: "8px auto 20px", color: "#64748b" }}>
              Interactive Mind Maps and multi-paper evidence comparison are reserved for Researcher and Admin roles.
            </p>
            <Link to={ROUTE_PATHS.PAPERS} className="workspace-button primary">
              Browse Catalog Papers
            </Link>
          </div>
        )}
      </section>
    </MainLayout>
  );
}

export default ResearchLabPage;
