import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiCheck } from "react-icons/fi";
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
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Too weak", color: "#c0372a" };
  if (score === 2) return { score: 2, label: "Weak", color: "#d97706" };
  if (score === 3) return { score: 3, label: "Fair", color: "#ca8a04" };
  if (score === 4) return { score: 4, label: "Good", color: "#16a34a" };
  return { score: 5, label: "Strong", color: "#0d9488" };
}

function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });

  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(
    () => getPasswordStrength(form.password),
    [form.password]
  );

  const fieldErrors = useMemo(() => {
    const errors = {};
    if (touched.username && !form.username.trim()) errors.username = "Username is required.";
    if (touched.email) {
      if (!form.email.trim()) errors.email = "Email is required.";
      else if (!form.email.includes("@")) errors.email = "Enter a valid email address.";
    }
    if (touched.password) {
      if (!form.password) errors.password = "Password is required.";
      else if (form.password.length < 8) errors.password = "Password must be at least 8 characters.";
    }
    if (touched.confirmPassword && form.confirmPassword && form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords don't match.";
    }
    if (touched.role && !form.role) {
      errors.role = "Account type is required.";
    }
    return errors;
  }, [form, touched]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setMessage("");
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  function getRegisterErrorMessage(error) {
    const raw = (error?.message || "").toLowerCase();
    if (raw.includes("email")) return "That email is already in use.";
    if (raw.includes("username")) return "That username is already taken.";
    return error?.message || "Registration failed. Check your info and try again.";
  }

  async function handleRegister(event) {
    event.preventDefault();

    // Mark all fields as touched to show errors
    setTouched({ username: true, email: true, password: true, confirmPassword: true, role: true });

    if (!form.username.trim() || !form.email.trim() || !form.password || !form.confirmPassword) {
      setMessage("Please fill in all fields.");
      setMessageType("error");
      return;
    }
    if (!form.email.includes("@")) {
      setMessage("Enter a valid email address.");
      setMessageType("error");
      return;
    }
    if (form.password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      setMessageType("error");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setMessage("Passwords don't match.");
      setMessageType("error");
      return;
    }
    if (!form.role) {
      setMessage("Choose an account type to continue.");
      setMessageType("error");
      return;
    }

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

      navigate(ROUTE_PATHS.LOGIN, {
        state: { successMessage: "Account created — you can sign in now." },
      });
    } catch (error) {
      setMessage(getRegisterErrorMessage(error));
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">
      <div className="register-wrapper">

        {/* ── Left branding panel ── */}
        <div className="register-left">
          <Link to={ROUTE_PATHS.HOME} className="brand-box">
            <img src={logoLogin} alt="ScienceTrend Hub" className="brand-logo-img" />
            <div>
              <h2>ScienceTrend Hub</h2>
              <p>Scientific Journal Publication Tracking</p>
            </div>
          </Link>

          <h1>Start your research journey</h1>

          <p className="register-desc">
            One account to search papers, track journals, follow emerging topics,
            and keep everything organised in your own workspace.
          </p>

          <ul className="feature-list">
            <li className="feature-item"><FiCheck /> Track publication trends</li>
            <li className="feature-item"><FiCheck /> Save and annotate papers</li>
            <li className="feature-item"><FiCheck /> Explore journals and topics</li>
            <li className="feature-item"><FiCheck /> Download research reports</li>
          </ul>

          <div className="register-testimonial">
            <p>"ScienceTrend Hub changed how I keep up with new research — it's now part of my weekly workflow."</p>
            <span>— Research student, FPT University</span>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="register-card">
          <div className="register-header">
            <h2>Create account</h2>
          </div>

          {message && (
            <div className={`register-message ${messageType}`} role="alert">
              {message}
            </div>
          )}

          <form className="register-form" onSubmit={handleRegister} noValidate>

            {/* Username */}
            <div className={`form-group ${fieldErrors.username ? "has-error" : touched.username && form.username ? "is-valid" : ""}`}>
              <label htmlFor="username">Username</label>
              <div className="input-wrap">
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
                {touched.username && form.username && !fieldErrors.username && (
                  <span className="input-valid-icon"><FiCheck /></span>
                )}
              </div>
              {fieldErrors.username && <p className="field-error">{fieldErrors.username}</p>}
            </div>

            {/* Email */}
            <div className={`form-group ${fieldErrors.email ? "has-error" : touched.email && form.email.includes("@") ? "is-valid" : ""}`}>
              <label htmlFor="email">Email address</label>
              <div className="input-wrap">
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
                {touched.email && form.email.includes("@") && !fieldErrors.email && (
                  <span className="input-valid-icon"><FiCheck /></span>
                )}
              </div>
              {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div className={`form-group ${fieldErrors.password ? "has-error" : touched.password && form.password.length >= 8 ? "is-valid" : ""}`}>
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}

              {/* Strength indicator */}
              {form.password && (
                <div className="password-strength-text" style={{ marginTop: 6, fontSize: "12px", fontWeight: 650 }}>
                  Password strength: <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className={`form-group ${fieldErrors.confirmPassword ? "has-error" : touched.confirmPassword && form.confirmPassword && form.password === form.confirmPassword ? "is-valid" : ""}`}>
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="input-wrap">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-toggle-btn"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="field-error">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Role selector — clean select dropdown */}
            <div className={`form-group ${fieldErrors.role ? "has-error" : touched.role && form.role ? "is-valid" : ""}`}>
              <label htmlFor="role">Account type</label>
              <div className="select-wrap">
                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
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

            <button type="submit" className="register-btn" disabled={loading}>
              {loading ? (
                <span className="register-btn-spinner" />
              ) : (
                "Create account"
              )}
            </button>

            <p className="register-signin-redirect">
              Already have one? <Link to={ROUTE_PATHS.LOGIN} className="login-link">Sign in</Link>
            </p>
          </form>

          <p className="register-terms">
            By creating an account you agree to our{" "}
            <span>Terms of Service</span> and <span>Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
