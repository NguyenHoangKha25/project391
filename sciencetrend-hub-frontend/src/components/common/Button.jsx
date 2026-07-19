import "../../styles/common.css";

/**
 * Common Button component.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button label or elements
 * @param {"button" | "submit" | "reset"} [props.type="button"] - HTML button type
 * @param {"primary" | "secondary" | "ghost" | "danger"} [props.variant="primary"] - Visual style variant
 * @param {"sm" | "md" | "lg"} [props.size="md"] - Size of the button
 * @param {boolean} [props.fullWidth=false] - Whether the button spans full width
 * @param {boolean} [props.loading=false] - Show loading state
 * @param {boolean} [props.disabled=false] - Disables the button
 * @param {Function} [props.onClick] - Click handler function
 * @param {string} [props.className=""] - Additional CSS classes
 * @param {boolean} [props.ariaPressed] - Controls aria-pressed attribute for toggle state
 */
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
  ariaPressed,
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-pressed={ariaPressed}
      className={[
        "cm-btn",
        `cm-btn-${variant}`,
        `cm-btn-${size}`,
        fullWidth ? "cm-btn-full" : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}

export default Button;