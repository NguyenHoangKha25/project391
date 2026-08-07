import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import {
  FiArrowLeft,
  FiArrowRight,
  FiBookmark,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiGitBranch,
  FiLock,
  FiSearch,
  FiUser,
} from "react-icons/fi";
import logo from "../assets/images/logo-login.svg";
import { ROUTE_PATHS } from "../routes/routePaths";
import { useAuth } from "../context/useAuth";
import { login, warmAuthService } from "../services/authService";
import { getCurrentUser } from "../services/userService";
import { getDefaultAuthenticatedPath } from "../utils/authStorage";
import { getSafeInternalPath, storePostLoginRedirect } from "../utils/postLoginRedirect";
import "../styles/LoginPage.css";

const WORKSPACE_STEPS = [
  {
    icon: FiSearch,
    step: "01",
    title: "Discover",
    description: "Search indexed papers and follow the strongest evidence.",
  },
  {
    icon: FiBookmark,
    step: "02",
    title: "Organize",
    description: "Keep papers, keywords, topics and journals within reach.",
  },
  {
    icon: FiGitBranch,
    step: "03",
    title: "Analyze",
    description: "Move into comparison, mind maps and research reports.",
  },
];

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
  const accessMessage = location.state?.accessMessage || "";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = "Sign in | ScienceTrend Hub";
    warmAuthService();
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setErrorMessage("Please enter both your username and password.");
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
      const requestedPath = getSafeInternalPath(location.state?.from);
      navigate(requestedPath || getDefaultAuthenticatedPath(), { replace: true });
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
    storePostLoginRedirect(location.state?.from);

    const googleLoginUrl = new URL(authUrl);
    googleLoginUrl.searchParams.set("redirect_origin", frontendOrigin);

    window.location.href = googleLoginUrl.toString();
  };

  return (
    <main className="login-page-v2">
      <section className="login-shell" aria-label="ScienceTrend Hub sign in">
        <div className="login-story-panel">
          <div className="login-story-orbit login-story-orbit-one" aria-hidden="true" />
          <div className="login-story-orbit login-story-orbit-two" aria-hidden="true" />

          <Link to={ROUTE_PATHS.HOME} className="login-brand" aria-label="ScienceTrend Hub home">
            <span className="login-brand-logo">
              <img src={logo} alt="" />
            </span>
            <span className="login-brand-copy">
              <strong>ScienceTrend Hub</strong>
              <small>Research intelligence workspace</small>
            </span>
          </Link>

          <div className="login-story-copy">
            <span className="login-eyebrow">
              <span className="login-live-dot" aria-hidden="true" />
              Built for the next research decision
            </span>
            <h1>Return to the evidence, not the noise.</h1>
            <p>
              Pick up your reading trail, monitor the fields that matter and turn
              catalog signals into a defensible next move.
            </p>
          </div>

          <div className="login-workflow" aria-label="Research workspace capabilities">
            <div className="login-workflow-heading">
              <span>Your research flow</span>
              <span className="login-workflow-status"><FiCheck /> Ready</span>
            </div>
            <div className="login-workflow-list">
              {WORKSPACE_STEPS.map(({ icon: Icon, step, title, description }) => (
                <div className="login-workflow-item" key={title}>
                  <span className="login-workflow-icon"><Icon aria-hidden="true" /></span>
                  <span className="login-workflow-text">
                    <span><small>{step}</small>{title}</span>
                    <p>{description}</p>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="login-story-footnote">
            Your saved library and followed research signals are waiting in one workspace.
          </p>
        </div>

        <div className="login-form-panel">
          <Link to={ROUTE_PATHS.HOME} className="login-mobile-brand" aria-label="ScienceTrend Hub home">
            <img src={logo} alt="" />
            <strong>ScienceTrend Hub</strong>
          </Link>

          <div className="login-form-wrap">
            <div className="login-form-kicker">Welcome back</div>
            <header className="login-form-header">
              <h2>Continue your research</h2>
              <p>Sign in to reopen your saved evidence and personalized workspace.</p>
            </header>

            {successMessage && (
              <p className="login-feedback login-feedback-success" role="status">
                <FiCheck aria-hidden="true" /> {successMessage}
              </p>
            )}
            {accessMessage && (
              <p className="login-feedback login-feedback-access" role="status">
                <FiLock aria-hidden="true" /> {accessMessage}
              </p>
            )}
            {errorMessage && (
              <p className="login-feedback login-feedback-error" role="alert">
                {errorMessage}
              </p>
            )}

            <form className="login-form" onSubmit={handleLogin} noValidate>
              <div className="login-field">
                <label htmlFor="username">Username</label>
                <div className="login-input-wrap">
                  <FiUser aria-hidden="true" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                  />
                </div>
              </div>

              <div className="login-field">
                <div className="login-field-label-row">
                  <label htmlFor="password">Password</label>
                  <Link to={ROUTE_PATHS.FORGOT_PASSWORD}>Forgot password?</Link>
                </div>
                <div className="login-input-wrap">
                  <FiLock aria-hidden="true" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-primary-action" disabled={isSubmitting}>
                <span>{isSubmitting ? "Signing in..." : "Enter workspace"}</span>
                {!isSubmitting && <FiArrowRight aria-hidden="true" />}
              </button>
            </form>

            <div className="login-divider"><span>or continue with</span></div>

            <button type="button" className="login-google-action" onClick={handleGmailLogin}>
              <FcGoogle aria-hidden="true" />
              <span>Google</span>
            </button>

            <div className="login-register-callout">
              <span>
                <small>New to ScienceTrend?</small>
                Create a workspace for your research.
              </span>
              <Link to={ROUTE_PATHS.REGISTER}>Create account <FiArrowRight aria-hidden="true" /></Link>
            </div>

            <Link to={ROUTE_PATHS.HOME} className="login-back-link">
              <FiArrowLeft aria-hidden="true" /> Browse the public catalog
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
