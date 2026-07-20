import { useId } from "react";
import "../../styles/common.css";

/**
 * Common Input component with validation and accessibility support.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.label] - Input label text
 * @param {string} props.name - Input name and identifier
 * @param {string} [props.type="text"] - HTML input type (text, email, password, etc.)
 * @param {string|number} props.value - Input value
 * @param {Function} props.onChange - Change event handler function
 * @param {string} [props.placeholder=""] - Input placeholder text
 * @param {string} [props.error=""] - Validation error message
 * @param {boolean} [props.disabled=false] - Disables the input field
 * @param {string} [props.className=""] - Additional wrapper CSS classes
 */
function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder = "",
  error = "",
  disabled = false,
  className = "",
  ...props
}) {
  const generatedId = useId();
  const inputId = name || generatedId;

  return (
    <div className={["cm-input-group", className].filter(Boolean).join(" ")}>
      {label && (
        <label className="cm-input-label" htmlFor={inputId}>
          {label}
          {props.required && (
            <span 
              className="cm-input-required-star" 
              style={{ color: "var(--st-danger, #ef4444)", marginLeft: "4px" }}
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>
      )}

      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={["cm-input", error ? "cm-input-danger" : ""].filter(Boolean).join(" ")}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={[
          error ? `${inputId}-error` : null,
          props["aria-describedby"] ? props["aria-describedby"] : null
        ].filter(Boolean).join(" ") || undefined}
        {...props}
      />

      {error && (
        <p className="cm-input-error" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default Input;