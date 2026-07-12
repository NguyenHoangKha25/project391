import { useCallback, useEffect, useState } from "react";
import JournalCard from "../components/JournalCard";
import PaperCard from "../components/PaperCard";
import MainLayout from "../components/layout/MainLayout";
import { getBookmarkedPapers, removeBookmarkByPaperId } from "../services/bookmarkService";
import { getFollowedJournals, unfollowJournal } from "../services/journalService";
import { normalizeJournal, normalizePaper, toArray } from "../utils/apiData";
import "../styles/WorkspacePages.css";
import "../styles/BookmarksPage.css";

function BookmarksPage() {
  const [savedPapers, setSavedPapers] = useState([]);
  const [trackedJournals, setTrackedJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [paperResult, journalResult] = await Promise.allSettled([
        getBookmarkedPapers(),
        getFollowedJournals(),
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
        setErrorMessage("Couldn't connect to the bookmarks service. Try refreshing.");
      }
    } catch (error) {
      console.error("Cannot load bookmarks", error);
      setErrorMessage("Something went wrong. Try refreshing in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

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

  async function handleUnfollowJournal(journalId) {
    const oldJournals = trackedJournals;
    setTrackedJournals((current) => current.filter((j) => j.id !== journalId));
    try {
      await unfollowJournal(journalId);
    } catch (error) {
      console.error("Cannot unfollow journal", error);
      setTrackedJournals(oldJournals);
      setErrorMessage("Couldn't untrack that journal. Please try again.");
    }
  }

  const totalItems = savedPapers.length + trackedJournals.length;

  return (
    <MainLayout
      title="Bookmarks"
      subtitle="Manage bookmarked papers and tracked journals"
    >
      <section className="workspace-page bookmarks-page">
        <div className="workspace-toolbar">
          <div className="workspace-toolbar-copy">
            <h2>My bookmarks</h2>
            <p>
              {loading
                ? "Loading your saved items…"
                : totalItems > 0
                  ? `${totalItems} item${totalItems !== 1 ? "s" : ""} saved across papers and journals.`
                  : "Your bookmarks folder is empty — save papers from the Papers page to get started."}
            </p>
          </div>
          <button
            type="button"
            className="workspace-button"
            onClick={loadBookmarks}
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
          <div className="workspace-empty">Loading bookmarks…</div>
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
                    <JournalCard
                      key={journal.id}
                      {...journal}
                      onUnfollow={() => handleUnfollowJournal(journal.id)}
                    />
                  ))
                ) : (
                  <div className="workspace-empty">
                    No tracked journals yet. Track journals from the Search page to get updates here.
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

export default BookmarksPage;
