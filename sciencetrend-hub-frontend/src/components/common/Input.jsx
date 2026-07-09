import "../../styles/common.css";

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
  return (
    <div className={`cm-input-group ${className}`}>
      {label && (
        <label className="cm-input-label" htmlFor={name}>
          {label}
        </label>
      )}

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`cm-input ${error ? "cm-input-danger" : ""}`}
        {...props}
      />

      {error && <p className="cm-input-error">{error}</p>}
    </div>
  );
}

export default Input;