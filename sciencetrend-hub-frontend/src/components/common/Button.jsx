import "../../styles/common.css";

function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  onClick,
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        "cm-btn",
        `cm-btn-${variant}`,
        `cm-btn-${size}`,
        fullWidth ? "cm-btn-full" : "",
        className,
      ].join(" ")}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}

export default Button;