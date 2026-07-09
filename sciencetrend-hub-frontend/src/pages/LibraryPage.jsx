import { useCallback, useEffect, useState } from "react";
import JournalCard from "../components/JournalCard";
import PaperCard from "../components/PaperCard";
import MainLayout from "../components/layout/MainLayout";
import { getBookmarkedPapers, removeBookmarkByPaperId } from "../services/bookmarkService";
import { getJournals } from "../services/journalService";
import { normalizeJournal, normalizePaper, toArray } from "../utils/apiData";
import "../styles/WorkspacePages.css";
import "../styles/LibraryPage.css";

function LibraryPage() {
  const [savedPapers, setSavedPapers] = useState([]);
  const [trackedJournals, setTrackedJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadLibrary = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [paperResult, journalResult] = await Promise.allSettled([
        getBookmarkedPapers(),
        getJournals({ tracked: true }),
      ]);

      setSavedPapers(
        paperResult.status === "fulfilled"
          ? toArray(paperResult.value, ["papers", "bookmarks"]).map(normalizePaper)
          : []
      );

      setTrackedJournals(
        journalResult.status === "fulfilled"
          ? toArray(journalResult.value, ["journals", "trackedJournals"]).map(normalizeJournal)
          : []
      );

      // Only block the whole page when both fail simultaneously
      if (paperResult.status === "rejected" && journalResult.status === "rejected") {
        setErrorMessage("Couldn't connect to the library service. Try refreshing.");
      }
    } catch (error) {
      console.error("Cannot load library", error);
      setErrorMessage("Something went wrong. Try refreshing in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  async function handleRemoveSavedPaper(paperId) {
    const oldPapers = savedPapers;
    setSavedPapers((current) => current.filter((paper) => paper.id !== paperId));
    try {
      await removeBookmarkByPaperId(paperId);
    } catch (error) {
      console.error("Cannot remove saved paper", error);
      setSavedPapers(oldPapers);
      setErrorMessage("Couldn't remove that paper. Please try again.");
    }
  }

  const totalItems = savedPapers.length + trackedJournals.length;

  return (
    <MainLayout
      title="Library"
      subtitle="Manage saved papers and tracked journals"
    >
      <section className="workspace-page library-page">
        <div className="workspace-toolbar">
          <div className="workspace-toolbar-copy">
            <h2>My library</h2>
            <p>
              {loading
                ? "Loading your saved items…"
                : totalItems > 0
                  ? `${totalItems} item${totalItems !== 1 ? "s" : ""} saved across papers and journals.`
                  : "Your library is empty — save papers from the Papers page to get started."}
            </p>
          </div>
          <button
            type="button"
            className="workspace-button"
            onClick={loadLibrary}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {!loading && errorMessage && (
          <div className="workspace-notice warning" style={{ marginBottom: 14 }}>
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="workspace-empty">Loading library…</div>
        ) : (
          <div className="workspace-grid">
            <article className="workspace-panel">
              <div className="workspace-panel-header">
                <h2>Saved papers</h2>
                <span>{savedPapers.length} item{savedPapers.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="workspace-list">
                {savedPapers.length > 0 ? (
                  savedPapers.map((paper) => (
                    <PaperCard
                      key={paper.id}
                      {...paper}
                      saved
                      onBookmark={() => handleRemoveSavedPaper(paper.id)}
                    />
                  ))
                ) : (
                  <div className="workspace-empty">
                    Nothing saved yet. Bookmark papers from the Papers page and they'll show up here.
                  </div>
                )}
              </div>
            </article>

            <article className="workspace-panel">
              <div className="workspace-panel-header">
                <h2>Tracked journals</h2>
                <span>{trackedJournals.length} journal{trackedJournals.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="workspace-list">
                {trackedJournals.length > 0 ? (
                  trackedJournals.map((journal) => (
                    <JournalCard key={journal.id} {...journal} />
                  ))
                ) : (
                  <div className="workspace-empty">
                    No tracked journals yet. This feature is being rolled out — check back soon.
                  </div>
                )}
              </div>
            </article>
          </div>
        )}
      </section>
    </MainLayout>
  );
}

export default LibraryPage;
