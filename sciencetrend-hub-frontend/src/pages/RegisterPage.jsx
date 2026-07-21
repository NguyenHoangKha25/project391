import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiCheck, FiUser, FiMail, FiLock, FiUsers, FiTrendingUp, FiBookmark, FiAward, FiFileText } from "react-icons/fi";
import logoLogin from "../assets/images/logo-login.png";
import { ROUTE_PATHS } from "../routes/routePaths";
import { register } from "../services/authService";
import "../styles/RegisterPage.css";

const REGISTER_ROLES = [
  { value: "STUDENT", label: "Student" },
  { value: "LECTURER", label: "Lecturer" },
  { value: "RESEARCHER", label: "Researcher" },
];

function getPasswordStrength(password) {
  if (!password) return { label: "", color: "transparent" };
  if (password.length < 6) return { label: "Weak", color: "#ef4444" };
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  if (hasLetters && hasNumbers && hasSpecial) return { label: "Strong", color: "#10b981" };
  return { label: "Medium", color: "#f59e0b" };
}

function RegisterPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Register | ScienceTrend Hub";
  }, []);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const validateField = (name, value) => {
    let error = "";
    if (name === "username") {
      if (!value.trim()) {
        error = "Username is required.";
      } else if (value.trim().length < 3) {
        error = "Username must be at least 3 characters.";
      }
    } else if (name === "email") {
      if (!value.trim()) {
        error = "Email is required.";
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          error = "Invalid email format.";
        }
      }
    } else if (name === "password") {
      if (!value) {
        error = "Password is required.";
      } else if (value.length < 8) {
        error = "Password must be at least 8 characters.";
      }
    } else if (name === "confirmPassword") {
      if (!value) {
        error = "Confirm password is required.";
      } else if (value !== form.password) {
        error = "Passwords do not match.";
      }
    } else if (name === "role") {
      if (!value) {
        error = "Account type is required.";
      }
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const error = validateField(name, value);
      setFieldErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const newTouched = {};
    const newErrors = {};
    let hasError = false;

    Object.keys(form).forEach((key) => {
      newTouched[key] = true;
      const error = validateField(key, form[key]);
      newErrors[key] = error;
      if (error) hasError = true;
    });

    setTouched(newTouched);
    setFieldErrors(newErrors);

    if (hasError) return;

    try {
      setLoading(true);
      setMessage("");

      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: form.role,
      });

      setForm({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "",
      });
      setTouched({});
      setFieldErrors({});
      setMessage("Registration successful! Redirecting to login page...");
      setMessageType("success");

      setTimeout(() => {
        navigate(ROUTE_PATHS.LOGIN, {
          state: { successMessage: "Registration successful! Please sign in." },
        });
      }, 2000);
    } catch (error) {
      console.warn("Registration attempt failed:", error);
      const msg = error.message || "Registration failed. Please check your information.";
      setMessage(msg);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-wrapper">
        <div className="register-left">
          <Link to={ROUTE_PATHS.HOME} className="register-brand">
            <div className="register-logo-box">
              <img src={logoLogin} alt="ScienceTrend Hub" className="register-logo-img" />
            </div>
            <div className="register-brand-text">
              <h1>ScienceTrend Hub</h1>
              <p>Scientific Journal & Publication Analytics</p>
            </div>
          </Link>

          <div className="register-hero">
            <span className="auth-badge" style={{ display: "inline-flex", alignSelf: "flex-start", marginBottom: "8px" }}>START YOUR RESEARCH</span>
            <h2 style={{ fontSize: "28px", margin: "6px 0 6px" }}>Join ScienceTrend Hub</h2>
            <p>
              Create your workspace to explore publication analytics, track journals,
              and export structured research reports.
            </p>
          </div>

          <ul className="feature-list">
            <li className="feature-item" style={{ borderColor: "rgba(96, 165, 250, 0.25)" }}>
              <span className="feature-icon-box" style={{ background: "rgba(96, 165, 250, 0.18)", color: "#60a5fa" }}><FiTrendingUp /></span>
              <p style={{ color: "#f1f5f9", fontWeight: "650" }}>Real-time publication & citation trend tracking</p>
            </li>
            <li className="feature-item" style={{ borderColor: "rgba(52, 211, 153, 0.25)" }}>
              <span className="feature-icon-box" style={{ background: "rgba(52, 211, 153, 0.18)", color: "#34d399" }}><FiBookmark /></span>
              <p style={{ color: "#f1f5f9", fontWeight: "650" }}>Personalized paper bookmarks & journal library</p>
            </li>
            <li className="feature-item" style={{ borderColor: "rgba(251, 191, 36, 0.25)" }}>
              <span className="feature-icon-box" style={{ background: "rgba(251, 191, 36, 0.18)", color: "#fbbf24" }}><FiAward /></span>
              <p style={{ color: "#f1f5f9", fontWeight: "650" }}>Quartile rankings (Q1–Q4) & topic discovery</p>
            </li>
            <li className="feature-item" style={{ borderColor: "rgba(192, 132, 252, 0.25)" }}>
              <span className="feature-icon-box" style={{ background: "rgba(192, 132, 252, 0.18)", color: "#c084fc" }}><FiFileText /></span>
              <p style={{ color: "#f1f5f9", fontWeight: "650" }}>Exportable PDF & CSV summary analytics</p>
            </li>
          </ul>

          <div className="register-testimonial" style={{ background: "rgba(15, 23, 42, 0.6)", borderColor: "rgba(148, 163, 184, 0.2)", borderRadius: "12px", padding: "10px 14px", marginTop: "12px" }}>
            <p style={{ color: "#cbd5e1", fontStyle: "italic", fontSize: "12px", margin: "0 0 4px" }}>"Streamlines literature review and publication tracking into a single daily workflow."</p>
            <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "700" }}>— Scientific Journal & Publication Analytics Platform</span>
          </div>
        </div>

        <div className="register-right">
          <div className="register-premium-card-box">
            <div className="register-header">
              <h2>Create account</h2>
            </div>

            {message && (
              <div className={`${messageType}-msg`} role="alert">
                {message}
              </div>
            )}

            <form className="register-form" onSubmit={handleRegister} noValidate>

              <div className={`form-group ${fieldErrors.username ? "has-error" : touched.username && form.username && !fieldErrors.username ? "is-valid" : ""}`}>
                <label htmlFor="username" style={{ fontWeight: "900", fontSize: "12.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Username</label>
                <div className="input-wrap">
                  <FiUser className="input-field-icon" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="e.g. john_doe"
                    value={form.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="username"
                    style={{ fontWeight: "700", fontSize: "15px" }}
                  />
                </div>
                {fieldErrors.username && <p className="field-error">{fieldErrors.username}</p>}
              </div>

              <div className={`form-group ${fieldErrors.email ? "has-error" : touched.email && form.email && !fieldErrors.email ? "is-valid" : ""}`}>
                <label htmlFor="email" style={{ fontWeight: "900", fontSize: "12.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Email address</label>
                <div className="input-wrap">
                  <FiMail className="input-field-icon" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="email"
                    style={{ fontWeight: "700", fontSize: "15px" }}
                  />
                </div>
                {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
              </div>

              <div className={`form-group ${fieldErrors.password ? "has-error" : touched.password && form.password && !fieldErrors.password ? "is-valid" : ""}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label htmlFor="password" style={{ fontWeight: "900", fontSize: "12.5px", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Password</label>
                  {form.password && (
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--sp-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Strength: <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                    </span>
                  )}
                </div>
                <div className="input-wrap">
                  <FiLock className="input-field-icon" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    style={{ fontWeight: "700", fontSize: "15px" }}
                  />
                  <button
                    type="button"
                    className="eye-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
              </div>

              <div className={`form-group ${fieldErrors.confirmPassword ? "has-error" : touched.confirmPassword && form.confirmPassword && !fieldErrors.confirmPassword ? "is-valid" : ""}`}>
                <label htmlFor="confirmPassword" style={{ fontWeight: "900", fontSize: "12.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Confirm password</label>
                <div className="input-wrap">
                  <FiLock className="input-field-icon" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    style={{ fontWeight: "700", fontSize: "15px" }}
                  />
                  <button
                    type="button"
                    className="eye-toggle"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="field-error">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <div className={`form-group ${fieldErrors.role ? "has-error" : touched.role && form.role && !fieldErrors.role ? "is-valid" : ""}`}>
                <label htmlFor="role" style={{ fontWeight: "900", fontSize: "12.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Account type</label>
                <div className="select-wrap">
                  <FiUsers className="input-field-icon" />
                  <select
                    id="role"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    style={{ fontWeight: "700", fontSize: "15px" }}
                  >
                    <option value="">Select account type...</option>
                    {REGISTER_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.role && <p className="field-error">{fieldErrors.role}</p>}
              </div>

              <button type="submit" className="register-submit-btn" disabled={loading}>
                {loading ? (
                  <span className="register-btn-spinner" />
                ) : (
                  "Create account"
                )}
              </button>

              <p className="register-signin-redirect" style={{ fontWeight: "600" }}>
                Already have one? <Link to={ROUTE_PATHS.LOGIN} className="login-link" style={{ fontWeight: "800" }}>Sign in</Link>
              </p>
            </form>

            <p className="register-terms">
              By creating an account you agree to our{" "}
              <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
