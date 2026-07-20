import { useState } from "react";
import { FiBookOpen, FiCheckCircle, FiMinusCircle, FiLoader } from "react-icons/fi";
import "../styles/DashboardPage.css";

function JournalCard({
  name,
  publisher,
  subject,
  quartile,
  impactFactor,
  openAccess = false,
  onUnfollow,
}) {
  const [unfollowing, setUnfollowing] = useState(false);

  async function handleUnfollow() {
    if (unfollowing || !onUnfollow) return;
    setUnfollowing(true);
    try {
      await onUnfollow();
    } catch (e) {
      setUnfollowing(false);
    }
  }

  return (
    <article className="db-journal-card" style={{ position: "relative" }}>
      <span className="db-journal-icon">
        <FiBookOpen aria-hidden="true" />
      </span>

      <div className="db-journal-content" style={{ paddingRight: onUnfollow ? "40px" : "0" }}>
        <div className="db-journal-title-row">
          <div>
            <h3>{name}</h3>
            <p>{publisher}</p>
          </div>
          {quartile && <span className="db-quartile">{quartile}</span>}
        </div>

        <div className="db-journal-meta">
          <span>{subject}</span>
          {impactFactor && <span>Impact factor {impactFactor}</span>}
          {openAccess && (
            <span className="db-open-access">
              <FiCheckCircle aria-hidden="true" /> Open access
            </span>
          )}
        </div>
      </div>

      {onUnfollow && (
        <button
          type="button"
          onClick={handleUnfollow}
          disabled={unfollowing}
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            color: "var(--st-danger, #ef4444)",
            cursor: "pointer",
            fontSize: "18px",
            padding: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Untrack journal"
        >
          {unfollowing ? <FiLoader className="is-spinning" /> : <FiMinusCircle />}
        </button>
      )}
    </article>
  );
}

export default JournalCard;
