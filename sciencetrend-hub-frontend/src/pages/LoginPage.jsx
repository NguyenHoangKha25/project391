import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FiEye, FiEyeOff, FiUser, FiLock, FiBarChart2, FiBookOpen, FiFileText, FiSearch, FiBookmark, FiTrendingUp } from "react-icons/fi";
import logo from "../assets/images/logo-login.png";
import { ROUTE_PATHS } from "../routes/routePaths";
import { useAuth } from "../context/useAuth";
import { login } from "../services/authService";
import { getCurrentUser } from "../services/userService";
import { getDefaultAuthenticatedPath } from "../utils/authStorage";
import "../styles/LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser, updateCurrentUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    location.state?.successMessage || "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = "Sign in | ScienceTrend Hub";
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setErrorMessage("Vui lòng nhập đầy đủ tài khoản và mật khẩu.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await login({
        username: username.trim(),
        password,
      });

      loginUser(response, { username: username.trim() });
      try {
        const currentUser = await getCurrentUser();
        updateCurrentUser(currentUser);
      } catch {
        // The login response remains a valid fallback if /auth/me is unavailable.
      }
      navigate(getDefaultAuthenticatedPath(), { replace: true });
    } catch (error) {
      console.error("Login failed", error);
      setErrorMessage(error.message || "Invalid username or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGmailLogin = () => {
    const authUrl =
      import.meta.env.VITE_GOOGLE_AUTH_URL ||
      "http://localhost:8080/api/oauth2/authorization/google";

    const frontendOrigin = window.location.origin;

    const googleLoginUrl = new URL(authUrl);
    googleLoginUrl.searchParams.set("redirect_origin", frontendOrigin);

    window.location.href = googleLoginUrl.toString();
  };

  return (
    <main className="auth-page">
      <div className="auth-bg-blur auth-bg-blur-left"></div>
      <div className="auth-bg-blur auth-bg-blur-right"></div>

      <section className="auth-layout">
        <div className="auth-left">
          <Link to={ROUTE_PATHS.HOME} className="auth-brand" aria-label="ScienceTrend Hub home">
            <span className="auth-logo-box">
              <img src={logo} alt="ScienceTrend Hub logo" className="auth-logo-img" />
            </span>
            <div className="auth-brand-text">
              <h1 style={{ fontWeight: "900" }}>ScienceTrend Hub</h1>
              <p style={{ fontWeight: "600", opacity: 0.95 }}>Scientific Journal & Publication Analytics</p>
            </div>
          </Link>

          <div className="auth-left-premium-content">
            <div className="auth-premium-hero">
              <span className="auth-badge">RESEARCH INTELLIGENCE PLATFORM</span>
              <h2 style={{
                fontFamily: "var(--font-display)",
                fontSize: "30px",
                fontWeight: "900",
                letterSpacing: "-0.04em",
                margin: "8px 0 6px"
              }}>Journal & Trend Analytics</h2>
              <p style={{ fontWeight: "600", fontSize: "13.5px", lineHeight: "1.45", opacity: 0.95 }}>
                Access real-time analytics across top journals, research topics, and publication metrics in one unified workspace.
              </p>

              <div className="auth-premium-features-row" style={{ marginTop: "10px" }}>
                <div className="auth-premium-feature-tag tag-blue">
                  <span className="auth-tag-icon auth-tag-icon-blue"><FiBarChart2 /></span>
                  <span>Analytics</span>
                </div>
                <div className="auth-premium-feature-tag tag-green">
                  <span className="auth-tag-icon auth-tag-icon-green"><FiBookOpen /></span>
                  <span>Journals</span>
                </div>
                <div className="auth-premium-feature-tag tag-yellow">
                  <span className="auth-tag-icon auth-tag-icon-amber"><FiFileText /></span>
                  <span>Reports</span>
                </div>
              </div>
            </div>

            <div className="auth-premium-preview-card" aria-label="Platform Highlights" style={{ background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(148, 163, 184, 0.25)", borderRadius: "14px", padding: "12px 14px", marginTop: "8px" }}>
              <div style={{ padding: "0 0 6px", borderBottom: "1px solid rgba(148, 163, 184, 0.2)", marginBottom: "8px" }}>
                <span style={{ fontSize: "10.5px", letterSpacing: "0.08em", fontWeight: "850", color: "#60a5fa", textTransform: "uppercase" }}>PLATFORM HIGHLIGHTS</span>
              </div>

              <div className="auth-highlight-list">
                <div className="auth-highlight-item">
                  <span className="auth-highlight-icon auth-highlight-icon-blue"><FiSearch /></span>
                  <div className="auth-highlight-copy">
                    <h5 style={{ color: "#ffffff", fontWeight: "750", margin: "0 0 1px", fontSize: "12.5px" }}>Multi-Source Discovery</h5>
                    <p style={{ color: "#cbd5e1", fontSize: "11px", margin: 0, lineHeight: "1.3" }}>Cross-reference papers, authors, citations, and journal quartiles (Q1–Q4).</p>
                  </div>
                </div>

                <div className="auth-highlight-item">
                  <span className="auth-highlight-icon auth-highlight-icon-green"><FiBookmark /></span>
                  <div className="auth-highlight-copy">
                    <h5 style={{ color: "#ffffff", fontWeight: "750", margin: "0 0 1px", fontSize: "12.5px" }}>Research Library</h5>
                    <p style={{ color: "#cbd5e1", fontSize: "11px", margin: 0, lineHeight: "1.3" }}>Bookmark key publications, follow journals, and track emerging topics.</p>
                  </div>
                </div>

                <div className="auth-highlight-item">
                  <span className="auth-highlight-icon auth-highlight-icon-amber"><FiTrendingUp /></span>
                  <div className="auth-highlight-copy">
                    <h5 style={{ color: "#ffffff", fontWeight: "750", margin: "0 0 1px", fontSize: "12.5px" }}>Trend & Summary Reports</h5>
                    <p style={{ color: "#cbd5e1", fontSize: "11px", margin: 0, lineHeight: "1.3" }}>Visualize annual growth curves and export structured summary reports.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-premium-card-box" style={{ position: "relative" }}>
            <div style={{
              position: "absolute",
              top: "-1px",
              left: "-1px",
              right: "-1px",
              height: "30px",
              backgroundImage: "linear-gradient(90deg, var(--st-primary), var(--st-accent))",
              backgroundSize: "100% 6px",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "top left",
              borderRadius: "30px 30px 0 0",
              zIndex: 5,
              pointerEvents: "none"
            }} />

            <div className="auth-card-header">
              <h2 style={{
                fontFamily: "var(--font-display)",
                fontSize: "38px",
                fontWeight: "950",
                letterSpacing: "-0.04em",
                margin: 0,
                display: "block"
              }}>Sign in</h2>
              <p style={{ fontSize: "15px", fontWeight: "600", marginTop: "6px", lineHeight: "1.5" }}>
                Enter your username and password to continue.
              </p>
              {successMessage && (
                <p className="auth-success-message" role="status">
                  {successMessage}
                </p>
              )}
              {errorMessage && (
                <p className="auth-error-message" role="alert">
                  {errorMessage}
                </p>
              )}
            </div>

            <form className="auth-form" onSubmit={handleLogin} noValidate>
              <div className="auth-form-group">
                <label htmlFor="username" style={{ fontWeight: "900", fontSize: "12.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Username</label>
                <div className="auth-input-wrapper">
                  <FiUser className="auth-input-icon" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    style={{ fontWeight: "700", fontSize: "15px" }}
                  />
                </div>
              </div>

              <div className="auth-form-group">
                <label htmlFor="password" style={{ fontWeight: "900", fontSize: "12.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Password</label>
                <div className="auth-input-wrapper">
                  <FiLock className="auth-input-icon" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    style={{ fontWeight: "700", fontSize: "15px" }}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((c) => !c)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="auth-options">
                <label className="auth-remember" style={{ fontWeight: "600" }}>
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <Link to={ROUTE_PATHS.FORGOT_PASSWORD} style={{ fontWeight: "750" }}>Forgot password?</Link>
              </div>

              <button
                type="submit"
                className="auth-login-btn"
                disabled={isSubmitting}
                style={{ fontSize: "15px", fontWeight: "850", height: "52px" }}
              >
                {isSubmitting ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="auth-google-btn"
              onClick={handleGmailLogin}
              style={{ fontSize: "15px", fontWeight: "750", height: "52px" }}
            >
              <FcGoogle className="auth-google-icon" />
              <span>Continue with Google</span>
            </button>

            <p className="auth-register-text" style={{ fontWeight: "600" }}>
              Do not have an account?{" "}
              <Link to={ROUTE_PATHS.REGISTER} style={{ fontWeight: "800" }}>Create account</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
