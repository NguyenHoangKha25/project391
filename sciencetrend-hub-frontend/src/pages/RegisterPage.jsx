import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiUser, FiMail, FiLock, FiUsers, FiTrendingUp, FiBookmark, FiAward, FiFileText, FiBarChart2, FiBookOpen, FiSearch } from "react-icons/fi";
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
          <Link to={ROUTE_PATHS.HOME} className="register-brand" aria-label="ScienceTrend Hub home">
            <span className="register-logo-box">
              <img src={logoLogin} alt="ScienceTrend Hub logo" className="register-logo-img" />
            </span>
            <div className="register-brand-text">
              <h1>ScienceTrend Hub</h1>
              <p>Scientific Journal & Publication Analytics</p>
            </div>
          </Link>

          <div className="auth-left-premium-content">
            <div className="auth-premium-hero">
              <span className="auth-badge reg-badge">✦ MEMBER ONBOARDING</span>
              <h2 className="reg-title">Unlock Full Academic Workspace</h2>
              <p>
                Join thousands of researchers tracking emerging topics, bookmarking top journals, and exporting custom analytics.
              </p>
            </div>

            {/* Glassmorphic Member Access Preview Card */}
            <div className="auth-widget-preview-card reg-preview-card">
              <div className="auth-widget-header">
                <div className="auth-widget-title-group">
                  <span className="auth-widget-dot dot-amber"></span>
                  <span className="auth-widget-title">RESEARCHER MEMBERSHIP</span>
                </div>
                <span className="auth-widget-badge badge-amber">✨ Free Account</span>
              </div>

              {/* Stat Counters Row */}
              <div className="auth-widget-stats-grid">
                <div className="auth-widget-stat-card">
                  <span className="stat-num">10,000+</span>
                  <span className="stat-label">Active Users</span>
                </div>
                <div className="auth-widget-stat-card">
                  <span className="stat-num">150+</span>
                  <span className="stat-label">Disciplines</span>
                </div>
                <div className="auth-widget-stat-card">
                  <span className="stat-num">Instant</span>
                  <span className="stat-label">Workspace</span>
                </div>
              </div>

              {/* Feature Checklist Box for Registration */}
              <div className="reg-checklist-box">
                <div className="reg-check-item">
                  <span className="reg-check-icon"><FiCheck /></span>
                  <span>Unlimited paper bookmarks & reading lists</span>
                </div>
                <div className="reg-check-item">
                  <span className="reg-check-icon"><FiCheck /></span>
                  <span>Follow journals & receive publication updates</span>
                </div>
                <div className="reg-check-item">
                  <span className="reg-check-icon"><FiCheck /></span>
                  <span>Export structured summary & growth reports</span>
                </div>
              </div>
            </div>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label htmlFor="username" style={{ fontWeight: "900", fontSize: "11.5px", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Username</label>
                  {fieldErrors.username && <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: "700" }}>{fieldErrors.username}</span>}
                </div>
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
                    style={{ fontWeight: "700", fontSize: "14px" }}
                  />
                </div>
              </div>

              <div className={`form-group ${fieldErrors.email ? "has-error" : touched.email && form.email && !fieldErrors.email ? "is-valid" : ""}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label htmlFor="email" style={{ fontWeight: "900", fontSize: "11.5px", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Email address</label>
                  {fieldErrors.email && <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: "700" }}>{fieldErrors.email}</span>}
                </div>
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
                    style={{ fontWeight: "700", fontSize: "14px" }}
                  />
                </div>
              </div>

              <div className={`form-group ${fieldErrors.password ? "has-error" : touched.password && form.password && !fieldErrors.password ? "is-valid" : ""}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label htmlFor="password" style={{ fontWeight: "900", fontSize: "11.5px", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Password</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {fieldErrors.password ? (
                      <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: "700" }}>{fieldErrors.password}</span>
                    ) : form.password ? (
                      <span style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--sp-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Strength: <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                      </span>
                    ) : null}
                  </div>
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
                    style={{ fontWeight: "700", fontSize: "14px" }}
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
              </div>

              <div className={`form-group ${fieldErrors.confirmPassword ? "has-error" : touched.confirmPassword && form.confirmPassword && !fieldErrors.confirmPassword ? "is-valid" : ""}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label htmlFor="confirmPassword" style={{ fontWeight: "900", fontSize: "11.5px", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Confirm password</label>
                  {fieldErrors.confirmPassword && <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: "700" }}>{fieldErrors.confirmPassword}</span>}
                </div>
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
                    style={{ fontWeight: "700", fontSize: "14px" }}
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
              </div>

              <div className={`form-group ${fieldErrors.role ? "has-error" : touched.role && form.role && !fieldErrors.role ? "is-valid" : ""}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label htmlFor="role" style={{ fontWeight: "900", fontSize: "11.5px", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Account type</label>
                  {fieldErrors.role && <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: "700" }}>{fieldErrors.role}</span>}
                </div>
                <div className="select-wrap">
                  <FiUsers className="input-field-icon" />
                  <select
                    id="role"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    style={{ fontWeight: "700", fontSize: "14px" }}
                  >
                    <option value="">Select account type...</option>
                    {REGISTER_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
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
