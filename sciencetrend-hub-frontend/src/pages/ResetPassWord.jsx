import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/images/logo-login.png";
import { ROUTE_PATHS } from "../routes/routePaths";
import { resetPassword } from "../services/authService";
import "../styles/ResetPassWord.css";

function ResetPassWord() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(token ? "" : "Invalid or missing reset token.");
  const [messageType, setMessageType] = useState(token ? "" : "error");
  const [loading, setLoading] = useState(false);

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!token) {
      showMessage("Invalid or missing reset token.", "error");
      return;
    }

    if (!newPassword || !confirmPassword) {
      showMessage("Please fill in all password fields.", "error");
      return;
    }

    if (newPassword.length < 8) {
      showMessage("Password must be at least 8 characters long.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("Password confirmation does not match.", "error");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      await resetPassword(token, newPassword, confirmPassword);
      navigate(ROUTE_PATHS.LOGIN, {
        replace: true,
        state: { successMessage: "Password reset successfully. Please sign in." },
      });
    } catch (error) {
      showMessage(error.message || "Failed to reset password.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="reset-page">
      <div className="reset-card">
        <Link to={ROUTE_PATHS.HOME} className="auth-flow-brand">
          <img src={logo} alt="ScienceTrend Hub logo" />
          <div>
            <strong>ScienceTrend Hub</strong>
            <span>Password reset</span>
          </div>
        </Link>

        <div className="reset-header">
          <h2>Reset Password</h2>
          <p>Enter a new password for your account.</p>
        </div>

        {message && (
          <p className={`auth-flow-message ${messageType}`} role={messageType === "error" ? "alert" : "status"}>
            {message}
          </p>
        )}

        <form className="reset-form" onSubmit={handleResetPassword} noValidate>
          <label htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              setMessage("");
              setMessageType("");
            }}
            autoComplete="new-password"
          />

          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setMessage("");
              setMessageType("");
            }}
            autoComplete="new-password"
          />

          <button className="reset-btn" type="submit" disabled={loading || !token}>
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <div className="reset-login-link">
          <Link to={ROUTE_PATHS.LOGIN} className="login-link-btn">
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}

export default ResetPassWord;
