import "../../styles/common.css";

/**
 * Common Pagination component with sliding window page numbers.
 * 
 * @param {Object} props - Component props
 * @param {number} [props.currentPage=1] - Currently active page
 * @param {number} [props.totalPages=1] - Total page count
 * @param {Function} props.onPageChange - Handler function on page transition
 */
function Pagination({ currentPage = 1, totalPages = 1, onPageChange }) {
  if (totalPages <= 1) return null;

  // Generate the range of pages to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push("...");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("...");
      }

      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="cm-pagination">
      <button
        type="button"
        className="cm-page-btn"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Go to previous page"
      >
        Prev
      </button>

      {pages.map((page, index) => {
        if (page === "...") {
          return (
            <span key={`ellipsis-${index}`} className="cm-page-ellipsis" style={{ padding: "0 8px", display: "inline-flex", alignItems: "center" }}>
              ...
            </span>
          );
        }
        return (
          <button
            type="button"
            key={page}
            className={["cm-page-btn", page === currentPage ? "active" : ""].filter(Boolean).join(" ")}
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </button>
        );
      })}

      <button
        type="button"
        className="cm-page-btn"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Go to next page"
      >
        Next
      </button>
    </div>
  );
}

export default Pagination;