import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/images/logo-login.png";
import { ROUTE_PATHS } from "../routes/routePaths";
import { forgotPassword } from "../services/authService";
import "../styles/ForgotPassWordPage.css";

function ForgotPassWordPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();

    if (!identifier.trim()) {
      showMessage("Please enter your username or email.", "error");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      await forgotPassword(identifier.trim());
      showMessage("Password reset link has been sent to your email.", "success");
    } catch (error) {
      showMessage(error.message || "Failed to send reset email.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="forgot-page">
      <div className="forgot-card">
        <Link to={ROUTE_PATHS.HOME} className="auth-flow-brand">
          <img src={logo} alt="ScienceTrend Hub logo" />
          <div>
            <strong>ScienceTrend Hub</strong>
            <span>Account recovery</span>
          </div>
        </Link>

        <div className="forgot-header">
          <h2>Forgot Password</h2>
          <p>Enter your email to receive the password reset link.</p>
        </div>

        {message && (
          <p className={`auth-flow-message ${messageType}`} role={messageType === "error" ? "alert" : "status"}>
            {message}
          </p>
        )}

        <form onSubmit={handleForgotPassword} noValidate>
          <label htmlFor="identifier">Username or Email</label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            placeholder="Enter your username or email"
            value={identifier}
            onChange={(event) => {
              setIdentifier(event.target.value);
              setMessage("");
              setMessageType("");
            }}
            autoComplete="username"
          />

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div className="back-login">
          <Link to={ROUTE_PATHS.LOGIN} className="back-login-link">
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}

export default ForgotPassWordPage;
