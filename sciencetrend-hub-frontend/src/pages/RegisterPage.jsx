import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiCheck,
  FiClock,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiShield,
  FiUser,
  FiZap,
  FiBookOpen,
  FiAward,
  FiCompass,
  FiCheckCircle,
  FiStar,
  FiTrendingUp,
} from "react-icons/fi";
import logoLogin from "../assets/images/logo-login.svg";
import { ROUTE_PATHS } from "../routes/routePaths";
import { register } from "../services/authService";
import "../styles/RegisterPage.css";

const REGISTER_ROLES = [
  {
    value: "STUDENT",
    label: "Student",
    subtitle: "Undergrad & Postgrad",
    icon: FiBookOpen,
  },
  {
    value: "LECTURER",
    label: "Lecturer",
    subtitle: "Faculty & Educator",
    icon: FiAward,
  },
  {
    value: "RESEARCHER",
    label: "Researcher",
    subtitle: "Scholar & Analyst",
    icon: FiCompass,
  },
];

function getPasswordStrength(password) {
  if (!password) return { label: "", score: 0, color: "transparent" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-zA-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 1) return { label: "Weak", score: 25, color: "#ef4444" };
  if (score === 2) return { label: "Fair", score: 50, color: "#f59e0b" };
  if (score === 3) return { label: "Good", score: 75, color: "#3b82f6" };
  return { label: "Strong", score: 100, color: "#10b981" };
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
    role: "STUDENT", // Default to STUDENT for fast selection
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
        error = "Must be at least 3 characters.";
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
        error = "Must be at least 8 characters.";
      }
    } else if (name === "confirmPassword") {
      if (!value) {
        error = "Confirm required.";
      } else if (value !== form.password) {
        error = "Passwords do not match.";
      }
    } else if (name === "role") {
      if (!value) {
        error = "Please select account type.";
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

  const handleRoleSelect = (roleValue) => {
    setForm((prev) => ({ ...prev, role: roleValue }));
    setTouched((prev) => ({ ...prev, role: true }));
    setFieldErrors((prev) => ({ ...prev, role: "" }));
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
        role: "STUDENT",
      });
      setTouched({});
      setFieldErrors({});
      setMessage("Registration successful! Redirecting to sign in...");
      setMessageType("success");

      setTimeout(() => {
        navigate(ROUTE_PATHS.LOGIN, {
          state: { successMessage: "Registration successful! Please sign in with your credentials." },
        });
      }, 1800);
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
        {/* Left Branding Showcase Panel */}
        <div className="register-left">
          <div className="register-left-ambient-glow" />
          
          <Link to={ROUTE_PATHS.HOME} className="register-brand" aria-label="ScienceTrend Hub home">
            <div className="register-logo-box">
              <img src={logoLogin} alt="ScienceTrend Hub logo" className="register-logo-img" />
            </div>
            <div className="register-brand-text">
              <h1>ScienceTrend Hub</h1>
              <p>Scientific Journal & Trend Intelligence</p>
            </div>
          </Link>

          <div className="reg-left-body">
            <div className="reg-hero-box">
              <span className="reg-badge-tag">
                <FiZap /> Academic Onboarding
              </span>
              <h2 className="reg-main-title">
                Unlock Full Access to Academic Analytics
              </h2>
              <p className="reg-main-desc">
                Join thousands of researchers tracking emerging publication trends, bookmarking key literature, and exporting custom analytical reports.
              </p>
            </div>

            {/* Glassmorphic Stats & Perks Showcase */}
            <div className="reg-stats-card">
              <div className="reg-stats-header">
                <span className="reg-stats-title">RESEARCHER MEMBERSHIP</span>
                <span className="reg-stats-badge">
                  <FiStar /> Free Tier
                </span>
              </div>

              <div className="reg-stats-row">
                <div className="reg-stat-item">
                  <strong>10,000+</strong>
                  <small>Active Scholars</small>
                </div>
                <div className="reg-stat-item">
                  <strong>150+</strong>
                  <small>Disciplines</small>
                </div>
                <div className="reg-stat-item">
                  <strong>Instant</strong>
                  <small>Analytics</small>
                </div>
              </div>

              <div className="reg-checklist-container">
                <div className="reg-check-row">
                  <span className="reg-check-bullet">
                    <FiCheck />
                  </span>
                  <span>Unlimited literature bookmarks & reading lists</span>
                </div>
                <div className="reg-check-row">
                  <span className="reg-check-bullet">
                    <FiCheck />
                  </span>
                  <span>Real-time journal tracking & citation alerts</span>
                </div>
                <div className="reg-check-row">
                  <span className="reg-check-bullet">
                    <FiCheck />
                  </span>
                  <span>Export structured summary & trend matrices</span>
                </div>
              </div>
            </div>
          </div>

          <div className="reg-left-footer">
            <span className="reg-status-dot" />
            <span>Platform Ready · 45M+ Indexed Research Papers</span>
          </div>
        </div>

        {/* Right Form Card Panel */}
        <div className="register-right">
          <div className="register-premium-card-box">
            <div className="register-header">
              <span className="register-kicker">
                <FiZap /> Fast & Secure Registration
              </span>
              <h2>Create account</h2>
              <p className="register-subtitle">
                Set up your profile to start organizing and discovering research.
              </p>
              <div className="register-benefit-row" aria-label="Registration benefits">
                <span>
                  <FiShield /> Secure SSL
                </span>
                <span>
                  <FiClock /> ~1 Minute Setup
                </span>
              </div>
            </div>

            {message && (
              <div className={`register-msg-alert ${messageType}-msg`} role="alert">
                <FiCheckCircle className="msg-icon" />
                <span>{message}</span>
              </div>
            )}

            <form className="register-form" onSubmit={handleRegister} noValidate>
              {/* Grid 2 columns for Username & Email */}
              <div className="form-grid-2">
                {/* Username Field */}
                <div className={`form-group ${fieldErrors.username ? "has-error" : touched.username && form.username && !fieldErrors.username ? "is-valid" : ""}`}>
                  <div className="form-label-row">
                    <label htmlFor="username">Username</label>
                    {fieldErrors.username && <span className="field-error-text">{fieldErrors.username}</span>}
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
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className={`form-group ${fieldErrors.email ? "has-error" : touched.email && form.email && !fieldErrors.email ? "is-valid" : ""}`}>
                  <div className="form-label-row">
                    <label htmlFor="email">Email Address</label>
                    {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
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
                    />
                  </div>
                </div>
              </div>

              {/* Grid 2 columns for Password & Confirm Password */}
              <div className="form-grid-2">
                {/* Password Field */}
                <div className={`form-group ${fieldErrors.password ? "has-error" : touched.password && form.password && !fieldErrors.password ? "is-valid" : ""}`}>
                  <div className="form-label-row">
                    <label htmlFor="password">Password</label>
                    {fieldErrors.password && <span className="field-error-text">{fieldErrors.password}</span>}
                  </div>
                  <div className="input-wrap">
                    <FiLock className="input-field-icon" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 chars"
                      value={form.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete="new-password"
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

                {/* Confirm Password Field */}
                <div className={`form-group ${fieldErrors.confirmPassword ? "has-error" : touched.confirmPassword && form.confirmPassword && !fieldErrors.confirmPassword ? "is-valid" : ""}`}>
                  <div className="form-label-row">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    {fieldErrors.confirmPassword && <span className="field-error-text">{fieldErrors.confirmPassword}</span>}
                  </div>
                  <div className="input-wrap">
                    <FiLock className="input-field-icon" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete="new-password"
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
              </div>

              {/* Password Strength Indicator Bar */}
              {form.password && (
                <div className="password-strength-container">
                  <div className="strength-bar-track">
                    <div
                      className="strength-bar-fill"
                      style={{
                        width: `${passwordStrength.score}%`,
                        backgroundColor: passwordStrength.color,
                      }}
                    />
                  </div>
                  <span className="strength-text" style={{ color: passwordStrength.color }}>
                    Password Strength: <strong>{passwordStrength.label}</strong>
                  </span>
                </div>
              )}

              {/* Account Type Visual Cards Selector */}
              <div className={`form-group ${fieldErrors.role ? "has-error" : ""}`}>
                <div className="form-label-row">
                  <label>Select Account Type</label>
                  {fieldErrors.role && <span className="field-error-text">{fieldErrors.role}</span>}
                </div>

                <div className="role-cards-grid" role="radiogroup" aria-label="Account Type">
                  {REGISTER_ROLES.map((r) => {
                    const IconComp = r.icon;
                    const isSelected = form.role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        className={`role-card-item ${isSelected ? "selected" : ""}`}
                        onClick={() => handleRoleSelect(r.value)}
                        role="radio"
                        aria-checked={isSelected}
                      >
                        <div className="role-card-icon-wrap">
                          <IconComp />
                        </div>
                        <div className="role-card-info">
                          <span className="role-card-title">{r.label}</span>
                          <span className="role-card-sub">{r.subtitle}</span>
                        </div>
                        {isSelected && <FiCheck className="role-card-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" className="register-submit-btn" disabled={loading}>
                {loading ? (
                  <span className="register-btn-spinner" />
                ) : (
                  <>
                    <span>Create account</span>
                    <FiArrowRight className="register-submit-arrow" />
                  </>
                )}
              </button>

              <p className="register-trust-note">
                <FiShield /> Free account · No payment details required
              </p>

              {/* Sign In Redirect */}
              <p className="register-signin-redirect">
                Already have an account?{" "}
                <Link to={ROUTE_PATHS.LOGIN} className="login-link">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
