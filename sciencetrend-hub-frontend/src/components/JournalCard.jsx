import { FiBookOpen, FiCheckCircle } from "react-icons/fi";
import "../styles/DashboardPage.css";

function JournalCard({
  name,
  publisher,
  subject,
  quartile,
  impactFactor,
  openAccess = false,
}) {
  return (
    <article className="db-journal-card">
      <span className="db-journal-icon">
        <FiBookOpen aria-hidden="true" />
      </span>

      <div className="db-journal-content">
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
    </article>
  );
}

export default JournalCard;
