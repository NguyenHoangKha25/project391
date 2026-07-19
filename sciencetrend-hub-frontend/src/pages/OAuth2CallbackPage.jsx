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
  const [errorMsg, setErrorMsg] = useState("");

  const token =
    searchParams.get("token") ||
    searchParams.get("accessToken") ||
    searchParams.get("jwt");

  useEffect(() => {
    if (!token) {
      setErrorMsg("Google authentication token not found. Please try again.");
      return;
    }

    async function handleCallback() {
      try {
        // 1. Lưu token vào localStorage trước
        saveOAuthSessionFromQuery(searchParams);

        // 2. Gọi /api/auth/me để lấy thông tin user đầy đủ (bao gồm role)
        const userInfo = await getCurrentUser();

        if (!userInfo) {
          throw new Error("Could not retrieve profile information from the server.");
        }

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

        // 3. Refresh context và navigate
        const nextState = refreshAuthState();
        const nextRole = nextState?.role || userInfo.role;
        navigate(getDefaultAuthenticatedPath(nextRole), { replace: true });
      } catch (err) {
        console.error("Google login callback failed", err);
        setErrorMsg(err.message || "An unexpected error occurred during Google sign-in.");
      }
    }

    handleCallback();
  }, [token, searchParams, navigate, refreshAuthState]);

  if (errorMsg) {
    return (
      <main className="auth-status-page">
        <section className="auth-status-card">
          <img src={logo} alt="ScienceTrend Hub logo" />
          <span className="auth-status-kicker" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>Authentication Error</span>
          <h2>Google login failed</h2>
          <p>{errorMsg}</p>
          <Link to={ROUTE_PATHS.LOGIN} style={{ display: "inline-flex", marginTop: "16px" }}>Back to Login</Link>
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
