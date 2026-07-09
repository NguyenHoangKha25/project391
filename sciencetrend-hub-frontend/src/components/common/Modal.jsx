import "../../styles/common.css";

function Modal({ isOpen, title, children, footer, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal">
        <div className="cm-modal-header">
          <h3>{title}</h3>

          <button type="button" className="cm-modal-close" onClick={onClose}>
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