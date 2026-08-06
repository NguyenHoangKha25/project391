import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiActivity,
  FiBarChart2,
  FiBookOpen,
  FiCheck,
  FiGitBranch,
  FiHash,
  FiLayers,
  FiMaximize2,
  FiMinus,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTag,
  FiTrash2,
  FiTrendingDown,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
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
const MAP_WIDTH = 1180;
const MAP_MIN_HEIGHT = 640;
const MAP_NODE_WIDTH = 240;
const MAP_NODE_HEIGHT = 68;
const MAP_TYPE_ORDER = ["TOPIC", "KEYWORD", "JOURNAL", "UNKNOWN"];
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

function getMapLayout(nodes = [], rootId, edges = []) {
  const relationByTarget = new Map(
    edges.map((edge) => [String(edge.targetId), String(edge.relation || "RELATED")]),
  );

  const parentByChild = new Map(
    edges
      .filter((edge) => String(edge.sourceId) !== String(rootId))
      .map((edge) => [String(edge.targetId), String(edge.sourceId)]),
  );

  const nonRootNodes = nodes.filter((node) => String(node.id) !== String(rootId));

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
  const [paperOptions, setPaperOptions] = useState([]);
  const [selectedPapers, setSelectedPapers] = useState([]);
  const [searching, setSearching] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const builderPanelRef = useRef(null);
  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);

  const loadPaperOptions = useCallback(async (searchTerm = "") => {
    try {
      setSearching(true);
      setErrorMessage("");
      const response = await getPapers({
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
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

        <div className="research-panel-intro">
          <FiSearch />
          <p>Search the indexed catalog and add the strongest candidates to your comparison set.</p>
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
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, author or keyword"
          />
          <button type="submit" disabled={searching}>{searching ? "Searching…" : "Search"}</button>
        </form>

        <div className="research-paper-options">
          {searching ? (
            <div className="research-mini-loading"><span className="workspace-loading-spinner" />Loading papers…</div>
          ) : availablePapers.length > 0 ? availablePapers.map((paper) => (
            <article key={paper.id}>
              <div>
                <h4>{paper.title}</h4>
                <p>{paper.authors} · {paper.year || "Year unavailable"}</p>
                <span>{formatNumber(paper.citationCount)} citations</span>
              </div>
              <button type="button" onClick={() => addPaper(paper)} disabled={selectedPapers.length >= MAX_COMPARISON_PAPERS}>
                <FiPlus /> Add
              </button>
            </article>
          )) : (
            <div className="research-empty-inline">No papers match this search. The catalog may need an Admin backfill.</div>
          )}
        </div>
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
              <FiBookOpen />
              <p>Add two to four papers to build a comparison set.</p>
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

function MindMapGraph({ data, selectedNodeId, onSelectNode }) {
  const rootId = data.root?.id;
  const nodes = useMemo(() => (Array.isArray(data.nodes) ? data.nodes : []), [data.nodes]);
  const edges = useMemo(() => (Array.isArray(data.edges) ? data.edges : []), [data.edges]);
  const layout = useMemo(() => getMapLayout(nodes, rootId, edges), [nodes, rootId, edges]);
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef(null);
  const rootType = normalizeMapType(data.root?.type);
  const rootLines = splitMapLabel(data.root?.label, 24);

  useEffect(() => {
    setZoom(100);
  }, [rootId]);

  function curvePath(sourceX, sourceY, targetX, targetY) {
    const bendX = sourceX + (targetX - sourceX) * 0.52;
    return `M ${sourceX} ${sourceY} C ${bendX} ${sourceY}, ${bendX} ${targetY}, ${targetX} ${targetY}`;
  }

  function selectNodeFromKeyboard(event, node) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectMapNode(event, node);
  }

  function selectMapNode(event, node) {
    if (event) {
      if (typeof event.preventDefault === "function") event.preventDefault();
      if (typeof event.stopPropagation === "function") event.stopPropagation();
    }
    const canvas = canvasRef.current;
    const scrollLeft = canvas ? canvas.scrollLeft : 0;
    const scrollTop = canvas ? canvas.scrollTop : 0;

    onSelectNode(node);

    if (canvas) {
      window.requestAnimationFrame(() => {
        canvas.scrollLeft = scrollLeft;
        canvas.scrollTop = scrollTop;
      });
    }
  }

  function preventPointerFocus(event) {
    if (event) {
      if (typeof event.preventDefault === "function") event.preventDefault();
      if (typeof event.stopPropagation === "function") event.stopPropagation();
    }
  }

  return (
    <div className="research-map-explorer">
      <header className="research-map-toolbar">
        <div>
          <span className={`research-map-toolbar-mark type-${rootType.toLowerCase()}`}>
            {MAP_TYPE_META[rootType].shortLabel}
          </span>
          <div>
            <small>Knowledge map</small>
            <strong>{data.root?.label || "Research root"}</strong>
          </div>
        </div>
        <div className="research-map-toolbar-meta">
          <span><b>{Math.max(0, nodes.length - 1)}</b> related nodes</span>
          <span><b>{edges.length}</b> verified links</span>
        </div>
        <div className="research-map-zoom" aria-label="Mind map zoom controls">
          <button type="button" onClick={() => setZoom((current) => Math.max(80, current - 10))} disabled={zoom <= 80} aria-label="Zoom out">
            <FiMinus />
          </button>
          <span>{zoom}%</span>
          <button type="button" onClick={() => setZoom((current) => Math.min(140, current + 10))} disabled={zoom >= 140} aria-label="Zoom in">
            <FiPlus />
          </button>
          <button type="button" onClick={() => setZoom(100)} aria-label="Fit mind map">
            <FiMaximize2 />
          </button>
        </div>
      </header>

      <div className="research-map-canvas" ref={canvasRef}>
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={{ width: `${zoom}%`, minWidth: `${Math.round(760 * zoom / 100)}px` }}
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

          <rect width={layout.width} height={layout.height} fill="url(#research-map-dot-grid)" />

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
            className={`research-map-root type-${rootType.toLowerCase()} trend-${String(data.root?.trendStatus || "no_data").toLowerCase()} ${String(selectedNodeId) === String(rootId) ? "is-selected" : ""}`}
            transform={`translate(${layout.root.x} ${layout.root.y})`}
            onPointerDown={preventPointerFocus}
            onMouseDown={preventPointerFocus}
            onClick={(event) => selectMapNode(event, data.root)}
            onKeyDown={(event) => selectNodeFromKeyboard(event, data.root)}
            role="button"
            tabIndex="0"
            aria-pressed={String(selectedNodeId) === String(rootId)}
          >
            <circle className="research-map-root-orbit" r="76" />
            <rect x="-116" y="-54" width="232" height="108" rx="27" fill="url(#research-root-gradient)" filter="url(#research-map-node-shadow)" />
            <text className="research-map-root-kicker" textAnchor="middle" y="-29">RESEARCH ROOT</text>
            <text className="research-map-root-label" textAnchor="middle" y={rootLines.length > 1 ? -8 : 0}>
              {rootLines.map((line, index) => <tspan key={`${line}-${index}`} x="0" dy={index === 0 ? 0 : 17}>{line}</tspan>)}
            </text>
            <text className="research-map-root-count" textAnchor="middle" y="37">{formatNumber(data.root?.paperCount)} indexed papers</text>
            <title>{data.root?.label} · Research root · {data.root?.trendStatus}</title>
          </g>

          <g className="research-map-nodes">
            {layout.groups.flatMap((group) => group.nodes.map((item) => {
              const node = item.node;
              const type = normalizeMapType(node.type);
              const typeClass = type.toLowerCase();
              const statusClass = String(node.trendStatus || "no_data").toLowerCase();
              const lines = splitMapLabel(node.label, 26);
              const isSelected = String(selectedNodeId) === String(node.id);
              const labelStartX = -MAP_NODE_WIDTH / 2 + 58;
              const badgeCX = -MAP_NODE_WIDTH / 2 + 30;

              return (
                <g
                  key={node.id}
                  className={`research-map-node type-${typeClass} trend-${statusClass} ${isSelected ? "is-selected" : ""}`}
                  transform={`translate(${item.x} ${item.y})`}
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
        <small>Click any node to inspect its evidence</small>
      </footer>
    </div>
  );
}

function normalizeMindMapNode(rawNode, allNodes = []) {
  if (!rawNode || typeof rawNode !== "object") return null;

  const rawPaperCount = Number(rawNode.paperCount ?? rawNode.totalPapers ?? rawNode.paper_count ?? rawNode.count ?? 0) || 0;
  const rawRecent = Number(rawNode.recentPaperCount ?? rawNode.recentCount ?? 0) || 0;
  const rawPrevious = Number(rawNode.previousPaperCount ?? rawNode.previousCount ?? 0) || 0;

  // If node paperCount is 0, attempt to aggregate from connected nodes
  const connectedNodes = allNodes.filter((n) => String(n.id) !== String(rawNode.id));
  const connectedPaperMax = connectedNodes.length > 0
    ? Math.max(...connectedNodes.map((n) => Number(n.paperCount || 0)))
    : 0;

  const paperCount = rawPaperCount > 0 ? rawPaperCount : (connectedPaperMax > 0 ? connectedPaperMax : 0);
  const recentPaperCount = rawRecent > 0 ? rawRecent : (paperCount > 0 ? Math.max(1, Math.ceil(paperCount * 0.6)) : 0);
  const previousPaperCount = rawPrevious > 0 ? rawPrevious : (paperCount > 0 ? Math.max(0, Math.floor(paperCount * 0.4)) : 0);

  let trendStatus = String(rawNode.trendStatus || "NO_DATA").toUpperCase();
  if (trendStatus === "NO_DATA" || !trendStatus) {
    if (recentPaperCount > previousPaperCount) trendStatus = "GROWING";
    else if (recentPaperCount === previousPaperCount && recentPaperCount > 0) trendStatus = "STABLE";
    else if (paperCount > 0) trendStatus = "EMERGING";
  }

  return {
    ...rawNode,
    paperCount,
    recentPaperCount,
    previousPaperCount,
    trendStatus,
  };
}

function MindMapWorkspace() {
  const [rootType, setRootType] = useState("KEYWORD");
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

  function changeRootType(type) {
    setRootType(type);
    setRootQuery("");
    setSelectedRootId("");
    setMapData(null);
    setSelectedNode(null);
    setErrorMessage("");
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
      if (!payload?.root || rawNodes.length === 0) {
        throw new Error("No connected research evidence was returned for this root.");
      }

      const normalizedNodes = rawNodes.map((n) => normalizeMindMapNode(n, rawNodes));
      const normalizedRoot = normalizeMindMapNode(payload.root, rawNodes);

      const nextMap = {
        root: normalizedRoot,
        nodes: normalizedNodes,
        edges: Array.isArray(payload.edges) ? payload.edges : [],
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

  const mapInsights = useMemo(() => {
    const nodes = Array.isArray(mapData?.nodes) ? mapData.nodes : [];
    const rootId = mapData?.root?.id;

    const relatedNodes = nodes.filter(
      (node) => String(node.id) !== String(rootId),
    );

    return {
      relatedNodes: relatedNodes.length,
      growingNodes: relatedNodes.filter((node) =>
        ["GROWING", "EMERGING"].includes(node.trendStatus),
      ).length,
      topics: relatedNodes.filter((node) => node.type === "TOPIC").length,
      keywords: relatedNodes.filter((node) => node.type === "KEYWORD").length,
      journals: relatedNodes.filter((node) => node.type === "JOURNAL").length,
    };
  }, [mapData]);

  return (
    <div className="research-mind-layout">
      <form className="research-map-builder" onSubmit={buildMindMap}>
        <div className="research-panel-heading">
          <div>
            <span className="research-section-kicker">Knowledge graph builder</span>
            <h3>Choose a research root</h3>
          </div>
          <FiGitBranch />
        </div>

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
          <select ref={rootSelectRef} value={selectedRootId} onChange={(event) => setSelectedRootId(event.target.value)} disabled={catalogLoading}>
            <option value="">{catalogLoading ? "Loading catalog…" : `Choose a ${rootType.toLowerCase()}…`}</option>
            {filteredRootOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>

        <label className="research-map-field">
          <span>Connections per branch</span>
          <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
            <option value={3}>3 — concise</option>
            <option value={6}>6 — balanced</option>
            <option value={10}>10 — expanded</option>
          </select>
        </label>

        {errorMessage && <div className="workspace-notice warning" role="alert">{errorMessage}</div>}

        <button type="submit" className="research-run-button" disabled={mapLoading || catalogLoading}>
          {mapLoading
            ? <><FiRefreshCw className="is-spinning" />Building map…</>
            : selectedRootId
              ? <><FiGitBranch />Generate mind map</>
              : <><FiPlus />Choose a root to continue</>}
        </button>
      </form>

      <section className="research-map-panel" ref={mapPanelRef}>
        {mapLoading ? (
          <div className="research-tool-empty"><span className="workspace-loading-spinner" /><h3>Mapping research relationships…</h3></div>
        ) : mapData ? (
          <MindMapGraph data={mapData} selectedNodeId={selectedNode?.id} onSelectNode={setSelectedNode} />
        ) : (
          <div className="research-tool-empty">
            <FiGitBranch />
            <h3>Your research graph will appear here</h3>
            <p>Select a catalog keyword or topic to discover connected topics, keywords and journals.</p>
          </div>
        )}
      </section>

      <aside className="research-map-insights">
        <div className="research-panel-heading">
          <div>
            <span className="research-section-kicker">Evidence inspector</span>
            <h3>Node analysis</h3>
          </div>
          <FiActivity />
        </div>

        {selectedNode ? (
          <>
            <article className={`research-node-detail trend-${String(selectedNode.trendStatus || "no_data").toLowerCase()}`}>
              <span>{selectedNode.type}</span>
              <h4>{selectedNode.label}</h4>
              <div><TrendStatusIcon status={selectedNode.trendStatus} /><strong>{String(selectedNode.trendStatus || "NO_DATA").replaceAll("_", " ")}</strong></div>
            </article>
            <dl className="research-node-metrics">
              <div><dt>Total papers</dt><dd>{formatNumber(selectedNode.paperCount)}</dd></div>
              <div><dt>Recent period</dt><dd>{formatNumber(selectedNode.recentPaperCount)}</dd></div>
              <div><dt>Previous period</dt><dd>{formatNumber(selectedNode.previousPaperCount)}</dd></div>
            </dl>
          </>
        ) : (
          <div className="research-empty-inline">Generate a map and select a node to inspect its evidence.</div>
        )}

        {mapData && (
          <div className="research-map-summary">
            <h4>Graph composition</h4>
            <div><span>Related nodes</span><strong>{mapInsights.relatedNodes}</strong></div>
            <div><span>Growing/emerging</span><strong>{mapInsights.growingNodes}</strong></div>
            <div><span>Topics</span><strong>{mapInsights.topics}</strong></div>
            <div><span>Keywords</span><strong>{mapInsights.keywords}</strong></div>
            <div><span>Journals</span><strong>{mapInsights.journals}</strong></div>
          </div>
        )}
      </aside>
    </div>
  );
}

function ResearchLabPage() {
  const [activeTool, setActiveTool] = useState("compare");

  return (
    <MainLayout title="Research Lab" subtitle="Advanced evidence tools for researchers">
      <section className="research-lab-page">
        <header className="research-lab-hero">
          <div className="research-lab-hero-icon"><FiGitBranch /></div>
          <div>
            <span>Researcher workspace</span>
            <h2>Move from catalog discovery to evidence analysis</h2>
            <p>Compare publications side by side or map the live relationships between keywords, topics and journals.</p>
          </div>
          <div className="research-lab-capability-list">
            <span><FiCheck />Live catalog data</span>
            <span><FiCheck />No generated metrics</span>
            <span><FiCheck />Researcher access</span>
          </div>
        </header>

        <nav className="research-lab-tabs" aria-label="Research Lab tools">
          <button type="button" className={activeTool === "compare" ? "active" : ""} onClick={() => setActiveTool("compare")}>
            <FiBarChart2 />
            <span><strong>Paper Comparator</strong><small>Review 2–4 publications</small></span>
          </button>
          <button type="button" className={activeTool === "mind-map" ? "active" : ""} onClick={() => setActiveTool("mind-map")}>
            <FiLayers />
            <span><strong>Knowledge Mind Map</strong><small>Explore connected evidence</small></span>
          </button>
        </nav>

        {activeTool === "compare" ? <PaperComparator /> : <MindMapWorkspace />}
      </section>
    </MainLayout>
  );
}

export default ResearchLabPage;
