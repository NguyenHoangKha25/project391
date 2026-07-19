import { useEffect } from "react";
import "../../styles/common.css";

/**
 * Common Modal component.
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Controls visibility
 * @param {string} props.title - Title text
 * @param {React.ReactNode} props.children - Main modal content
 * @param {React.ReactNode} [props.footer] - Optional footer content
 * @param {Function} props.onClose - Function called to close modal
 * @param {"left" | "right"} [props.closeButtonPosition="right"] - Close button alignment in header
 */
function Modal({ 
  isOpen, 
  title, 
  children, 
  footer, 
  onClose,
  closeButtonPosition = "right"
}) {
  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="cm-modal-overlay" onClick={onClose}>
      <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
        <div 
          className="cm-modal-header"
          style={{ flexDirection: closeButtonPosition === "left" ? "row-reverse" : "row" }}
        >
          <h3>{title}</h3>

          <button 
            type="button" 
            className="cm-modal-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="cm-modal-body">{children}</div>

        {footer && <div className="cm-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;