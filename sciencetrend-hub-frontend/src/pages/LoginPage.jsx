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
      setErrorMessage("Sai tài khoản hoặc mật khẩu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGmailLogin = () => {
    const backendUrl = (
      import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:8080"
    ).replace(/\/$/, "");

    const frontendOrigin = window.location.origin;

    const googleLoginUrl = new URL(`${backendUrl}/oauth2/authorization/google`);
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
              <p>Scientific Journal Publication Tracking</p>
            </div>
          </Link>

          <div className="auth-left-content">
            <div className="auth-hero">
              <span className="auth-badge">Research Dashboard</span>
              <h2>Welcome!</h2>
              <p>Explore scientific trends, manage papers, and track journals instantly.</p>
            </div>

            <div className="auth-preview-card" aria-label="Interactive trends snippet">
              <div className="preview-header">
                <div>
                  <h3>Publication Trends</h3>
                  <p>2020 – 2026</p>
                </div>
              </div>

              <div className="preview-chart" aria-hidden="true">
                <span className="preview-bar bar-1" />
                <span className="preview-bar bar-2" />
                <span className="preview-bar bar-3" />
                <span className="preview-bar bar-4" />
                <span className="preview-bar bar-5" />
                <span className="preview-bar bar-6" />
              </div>

              <div className="preview-topics" aria-label="Highlighted research areas">
                <div className="preview-topic-row">
                  <span className="topic-dot topic-blue" />
                  <p>Artificial Intelligence</p>
                  <strong>32%</strong>
                </div>
                <div className="preview-topic-row">
                  <span className="topic-dot topic-green" />
                  <p>Machine Learning</p>
                  <strong>28%</strong>
                </div>
                <div className="preview-topic-row">
                  <span className="topic-dot topic-yellow" />
                  <p>Cybersecurity</p>
                  <strong>21%</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-stats">
            <div className="auth-stat-card">
              <div className="auth-stat-icon-wrapper">
                <FiLayers />
              </div>
              <h3>Dashboard</h3>
              <p>Publication overview</p>
            </div>
            <div className="auth-stat-card">
              <div className="auth-stat-icon-wrapper">
                <FiBookOpen />
              </div>
              <h3>Library</h3>
              <p>Saved papers</p>
            </div>
            <div className="auth-stat-card">
              <div className="auth-stat-icon-wrapper">
                <FiPieChart />
              </div>
              <h3>Reports</h3>
              <p>Research summaries</p>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-card">
            <div className="auth-card-header">
              <h2>Sign in</h2>
              <p>Enter your username and password to continue.</p>
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
                <label htmlFor="username">Username</label>
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
                  />
                </div>
              </div>

              <div className="auth-form-group">
                <label htmlFor="password">Password</label>
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
                <label className="auth-remember">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <Link to={ROUTE_PATHS.FORGOT_PASSWORD}>Forgot password?</Link>
              </div>

              <button
                type="submit"
                className="auth-login-btn"
                disabled={isSubmitting}
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
            >
              <FcGoogle className="auth-google-icon" />
              <span>Continue with Google</span>
            </button>

            <p className="auth-register-text">
              Do not have an account?{" "}
              <Link to={ROUTE_PATHS.REGISTER}>Create account</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
