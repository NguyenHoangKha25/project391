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
              <h1>ScienceTrend Hub</h1>
              <p>Scientific Journal & Publication Analytics</p>
            </div>
          </Link>

          <div className="auth-left-premium-content">
            <div className="auth-premium-hero">
              <span className="auth-badge">RESEARCH INTELLIGENCE PLATFORM</span>
              <h2>Accelerate Your Research Discovery</h2>
              <p>
                Streamlined journal analytics, citation tracking, and trend forecasting for modern academic researchers.
              </p>
            </div>

            {/* Glassmorphic Live Analytics Preview Widget (Human-crafted SaaS style) */}
            <div className="auth-widget-preview-card">
              <div className="auth-widget-header">
                <div className="auth-widget-title-group">
                  <span className="auth-widget-dot"></span>
                  <span className="auth-widget-title">LIVE PLATFORM METRICS</span>
                </div>
                <span className="auth-widget-badge">🟢 Real-Time Sync</span>
              </div>

              {/* Stat Counters Row */}
              <div className="auth-widget-stats-grid">
                <div className="auth-widget-stat-card">
                  <span className="stat-num">12,200+</span>
                  <span className="stat-label">Publications</span>
                </div>
                <div className="auth-widget-stat-card">
                  <span className="stat-num">4,850+</span>
                  <span className="stat-label">Top Journals</span>
                </div>
                <div className="auth-widget-stat-card">
                  <span className="stat-num">98.4%</span>
                  <span className="stat-label">Accuracy Rate</span>
                </div>
              </div>

              {/* Mini Trend Graph Graphic Box */}
              <div className="auth-widget-trend-box">
                <div className="auth-widget-trend-info">
                  <div className="auth-widget-trend-label">
                    <FiTrendingUp className="trend-icon" />
                    <span>Machine Learning Trends</span>
                  </div>
                  <span className="trend-growth-badge">+340% Growth</span>
                </div>
                
                {/* SVG Glowing Curve Preview */}
                <div className="auth-widget-svg-wrap">
                  <svg viewBox="0 0 340 50" className="auth-widget-svg">
                    <defs>
                      <linearGradient id="loginSvgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0,45 C 50,40 80,35 120,25 C 160,15 200,30 250,12 C 290,2 320,10 340,4"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 0,45 C 50,40 80,35 120,25 C 160,15 200,30 250,12 C 290,2 320,10 340,4 L 340,50 L 0,50 Z"
                      fill="url(#loginSvgGrad)"
                    />
                    <circle cx="250" cy="12" r="3.5" fill="#10b981" />
                    <circle cx="340" cy="4" r="4.5" fill="#34d399" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-premium-card-box" style={{ position: "relative" }}>
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
