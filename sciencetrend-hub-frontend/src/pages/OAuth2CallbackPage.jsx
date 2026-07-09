import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/images/logo-login.png";
import { useAuth } from "../context/useAuth";
import { ROUTE_PATHS } from "../routes/routePaths";
import { getDefaultAuthenticatedPath, saveOAuthSessionFromQuery } from "../utils/authStorage";
import { getCurrentUser } from "../services/userService";
import "../styles/AuthStatusPage.css";

// Backend OAuth2SuccessHandler redirect về:
//   {frontendOrigin}/oauth2/callback?token=xxx
// Chỉ có token trong URL, cần gọi /api/auth/me để lấy role/username
function OAuth2CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAuthState } = useAuth();
  const [error, setError] = useState(false);

  const token =
    searchParams.get("token") ||
    searchParams.get("accessToken") ||
    searchParams.get("jwt");

  useEffect(() => {
    if (!token) {
      setError(true);
      return;
    }

    async function handleCallback() {
      try {
        // 1. Lưu token vào localStorage trước
        saveOAuthSessionFromQuery(searchParams);

        // 2. Gọi /api/auth/me để lấy thông tin user đầy đủ (bao gồm role)
        const userInfo = await getCurrentUser().catch(() => null);

        if (userInfo) {
          // Cập nhật user trong localStorage với thông tin đầy đủ từ BE
          const { normalizeRoleValue } = await import("../utils/authStorage");
          const role = normalizeRoleValue(userInfo.role || "STUDENT");
          const updatedUser = {
            userId: userInfo.userId || null,
            username: userInfo.username || "",
            email: userInfo.email || "",
            role,
            roles: [role],
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }

        // 3. Refresh context và navigate
        const nextState = refreshAuthState();
        const role = nextState?.role || (userInfo ? userInfo.role : "");
        navigate(getDefaultAuthenticatedPath(role), { replace: true });
      } catch (err) {
        console.error("Google login failed", err);
        navigate(ROUTE_PATHS.LOGIN, { replace: true });
      }
    }

    handleCallback();
  }, [token, searchParams, navigate, refreshAuthState]);

  if (error) {
    return (
      <main className="auth-status-page">
        <section className="auth-status-card">
          <img src={logo} alt="ScienceTrend Hub logo" />
          <span className="auth-status-kicker">Authentication</span>
          <h2>Google login failed</h2>
          <p>Login token from Google was not found. Please return to sign in again.</p>
          <Link to={ROUTE_PATHS.LOGIN}>Back to Login</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-status-page">
      <section className="auth-status-card">
        <img src={logo} alt="ScienceTrend Hub logo" />
        <span className="auth-status-kicker">Authentication</span>
        <h2>Logging in...</h2>
        <p>Please wait a moment while your workspace is prepared.</p>
      </section>
    </main>
  );
}

export default OAuth2CallbackPage;
