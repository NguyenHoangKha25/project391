import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FiEye, FiEyeOff, FiUser, FiLock, FiLayers, FiBookOpen, FiPieChart } from "react-icons/fi";
import logo from "../assets/images/logo-login.png";
import { ROUTE_PATHS } from "../routes/routePaths";
import { useAuth } from "../context/useAuth";
import { login } from "../services/authService";
import { getDefaultAuthenticatedPath } from "../utils/authStorage";
import "../styles/LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    location.state?.successMessage || "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

      const session = loginUser(response, { username: username.trim() });
      navigate(getDefaultAuthenticatedPath(session.user.role), { replace: true });
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
        {/* ── Left branding panel ── */}
        <div className="auth-left">
          <Link to={ROUTE_PATHS.HOME} className="auth-brand" aria-label="ScienceTrend Hub home">
            <span className="auth-logo-box">
              <img src={logo} alt="ScienceTrend Hub logo" className="auth-logo-img" />
            </span>
            <div className="auth-brand-text">
              <h1 style={{ color: "#ffffff", fontWeight: "900" }}>ScienceTrend Hub</h1>
              <p style={{ color: "#bdf2f8", fontWeight: "600", opacity: 0.95 }}>Scientific Journal Publication Tracking</p>
            </div>
          </Link>

          <div className="auth-left-premium-content">
            <div className="auth-premium-hero">
              <span className="auth-badge">Research Dashboard</span>
              <h2 style={{
                fontFamily: "var(--font-display)",
                background: "linear-gradient(135deg, #ffc067 0%, #f97316 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
                fontSize: "44px",
                fontWeight: "950",
                letterSpacing: "-0.05em",
                margin: "18px 0 12px"
              }}>Welcome!</h2>
              <p style={{ color: "#ffffff", fontWeight: "600", fontSize: "16px", lineHeight: "1.7", opacity: 0.95 }}>
                Explore scientific trends, manage papers, and track journals instantly.
              </p>

              <div className="auth-premium-features-row">
                <div className="auth-premium-feature-tag tag-blue">
                  <FiLayers />
                  <span>Dashboard</span>
                </div>
                <div className="auth-premium-feature-tag tag-green">
                  <FiBookOpen />
                  <span>Bookmarks</span>
                </div>
                <div className="auth-premium-feature-tag tag-yellow">
                  <FiPieChart />
                  <span>Reports</span>
                </div>
              </div>
            </div>

            <div className="auth-premium-preview-card" aria-label="Interactive trends snippet">
              <div className="mockup-search-box">
                <FiUser style={{ marginRight: "10px", color: "rgba(255, 255, 255, 0.6)", fontSize: "16px" }} />
                <span style={{ color: "rgba(255, 255, 255, 0.8)", fontWeight: "600" }}>Search 12,000+ scientific papers...</span>
              </div>

              <div className="mockup-paper-card">
                <div className="mockup-paper-header">
                  <span className="mockup-badge badge-q1">Q1 Journal</span>
                  <span className="mockup-badge badge-citation">9.4k Citations</span>
                </div>
                <h4 style={{ color: "#ffffff", fontWeight: "850" }}>Deep Learning in Neural Networks</h4>
                <p style={{ color: "rgba(255, 255, 255, 0.75)", fontWeight: "600" }}>J. Schmidhuber • AI Review</p>
              </div>

              <div className="mockup-trend-stats">
                <div className="mockup-trend-row">
                  <span className="topic-dot topic-blue" />
                  <p style={{ color: "#ffffff", fontWeight: "600" }}>Computer Vision</p>
                  <strong style={{ color: "#7debf6", fontWeight: "800" }}>+32%</strong>
                </div>
                <div className="mockup-trend-row">
                  <span className="topic-dot topic-green" />
                  <p style={{ color: "#ffffff", fontWeight: "600" }}>Bioinformatics</p>
                  <strong style={{ color: "#59d795", fontWeight: "800" }}>+18%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-premium-card-box" style={{ position: "relative" }}>
            {/* Top Border Gradient Line - Perfect mathematical overlay covering the top border */}
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
                color: "#082733",
                fontSize: "38px",
                fontWeight: "950",
                letterSpacing: "-0.04em",
                margin: 0,
                display: "block"
              }}>Sign in</h2>
              <p style={{ color: "#475569", fontSize: "15px", fontWeight: "600", marginTop: "6px", lineHeight: "1.5" }}>
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
                <label htmlFor="username" style={{ color: "#0f172a", fontWeight: "900", fontSize: "12.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Username</label>
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
                    style={{ color: "#082733", fontWeight: "700", fontSize: "15px" }}
                  />
                </div>
              </div>

              <div className="auth-form-group">
                <label htmlFor="password" style={{ color: "#0f172a", fontWeight: "900", fontSize: "12.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Password</label>
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
                    style={{ color: "#082733", fontWeight: "700", fontSize: "15px" }}
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
                <label className="auth-remember" style={{ color: "#334155", fontWeight: "600" }}>
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

            <p className="auth-register-text" style={{ color: "#475569", fontWeight: "600" }}>
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
