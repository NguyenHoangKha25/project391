import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiCheck, FiUser, FiMail, FiLock, FiUsers } from "react-icons/fi";
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
  if (!password) return { label: "", color: "transparent" };
  if (password.length < 6) return { label: "Weak", color: "#ef4444" };
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  if (hasLetters && hasNumbers && hasSpecial) return { label: "Strong", color: "#10b981" };
  return { label: "Medium", color: "#f59e0b" };
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

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const validateField = (name, value) => {
    let error = "";
    if (name === "username") {
      if (!value.trim()) {
        error = "Tài khoản là bắt buộc.";
      } else if (value.trim().length < 3) {
        error = "Tài khoản phải từ 3 ký tự trở lên.";
      }
    } else if (name === "email") {
      if (!value.trim()) {
        error = "Email là bắt buộc.";
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          error = "Định dạng email không hợp lệ.";
        }
      }
    } else if (name === "password") {
      if (!value) {
        error = "Mật khẩu là bắt buộc.";
      } else if (value.length < 8) {
        error = "Mật khẩu phải từ 8 ký tự trở lên.";
      }
    } else if (name === "confirmPassword") {
      if (!value) {
        error = "Xác nhận mật khẩu là bắt buộc.";
      } else if (value !== form.password) {
        error = "Mật khẩu xác nhận không khớp.";
      }
    } else if (name === "role") {
      if (!value) {
        error = "Loại tài khoản là bắt buộc.";
      }
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const error = validateField(name, value);
      setFieldErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const newTouched = {};
    const newErrors = {};
    let hasError = false;

    Object.keys(form).forEach((key) => {
      newTouched[key] = true;
      const error = validateField(key, form[key]);
      newErrors[key] = error;
      if (error) hasError = true;
    });

    setTouched(newTouched);
    setFieldErrors(newErrors);

    if (hasError) return;

    try {
      setLoading(true);
      setMessage("");

      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      setForm({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "",
      });
      setTouched({});
      setFieldErrors({});
      setMessage("Đăng ký thành công! Đang chuyển hướng sang trang đăng nhập...");
      setMessageType("success");

      setTimeout(() => {
        navigate(ROUTE_PATHS.LOGIN, {
          state: { successMessage: "Đăng ký tài khoản thành công! Vui lòng đăng nhập." },
        });
      }, 2000);
    } catch (error) {
      console.error("Registration error details:", error);
      const msg = error.response?.data?.message || "Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.";
      setMessage(msg);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-wrapper">
        <div className="register-left">
          <Link to={ROUTE_PATHS.HOME} className="register-brand">
            <div className="register-logo-box">
              <img src={logoLogin} alt="ScienceTrend Hub" className="register-logo-img" />
            </div>
            <div className="register-brand-text">
              <h1>ScienceTrend Hub</h1>
              <p>Scientific Journal Publication Tracking</p>
            </div>
          </Link>

          <div className="register-hero">
            <h2>Start your research journey</h2>
            <p>
              One account to search papers, track journals, follow emerging topics,
              and keep everything organised in your own workspace.
            </p>
          </div>

          <ul className="feature-list">
            <li className="feature-item">
              <span className="feature-icon-box"><FiCheck /></span>
              <p>Track publication trends</p>
            </li>
            <li className="feature-item">
              <span className="feature-icon-box"><FiCheck /></span>
              <p>Save and annotate papers</p>
            </li>
            <li className="feature-item">
              <span className="feature-icon-box"><FiCheck /></span>
              <p>Explore journals and topics</p>
            </li>
            <li className="feature-item">
              <span className="feature-icon-box"><FiCheck /></span>
              <p>Download research reports</p>
            </li>
          </ul>

          <div className="register-testimonial">
            <p>"ScienceTrend Hub changed how I keep up with new research — it's now part of my weekly workflow."</p>
            <span>— Research student, FPT University</span>
          </div>
        </div>

        <div className="register-right">
          <div className="register-premium-card-box" style={{ position: "relative" }}>
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

            <div className="register-header">
              <h2 style={{
                fontFamily: "var(--font-display)",
                color: "#082733",
                fontSize: "38px",
                fontWeight: "950",
                letterSpacing: "-0.04em",
                margin: 0,
                display: "block"
              }}>Create account</h2>
            </div>

            {message && (
              <div className={`${messageType}-msg`} role="alert">
                {message}
              </div>
            )}

            <form className="register-form" onSubmit={handleRegister} noValidate>

              <div className={`form-group ${fieldErrors.username ? "has-error" : touched.username && form.username && !fieldErrors.username ? "is-valid" : ""}`}>
                <label htmlFor="username" style={{ color: "#0f172a", fontWeight: "900", fontSize: "12.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Username</label>
                <div className="input-wrap">
                  <FiUser className="input-field-icon" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="e.g. john_doe"
                    value={form.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="username"
                    style={{ color: "#082733", fontWeight: "700", fontSize: "15px" }}
                  />
                </div>
                {fieldErrors.username && <p className="field-error">{fieldErrors.username}</p>}
              </div>

              <div className={`form-group ${fieldErrors.email ? "has-error" : touched.email && form.email && !fieldErrors.email ? "is-valid" : ""}`}>
                <label htmlFor="email" style={{ color: "#0f172a", fontWeight: "900", fontSize: "12.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Email address</label>
                <div className="input-wrap">
                  <FiMail className="input-field-icon" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="email"
                    style={{ color: "#082733", fontWeight: "700", fontSize: "15px" }}
                  />
                </div>
                {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
              </div>

              <div className={`form-group ${fieldErrors.password ? "has-error" : touched.password && form.password && !fieldErrors.password ? "is-valid" : ""}`}>
                <label htmlFor="password" style={{ color: "#0f172a", fontWeight: "900", fontSize: "12.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Password</label>
                <div className="input-wrap">
                  <FiLock className="input-field-icon" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    style={{ color: "#082733", fontWeight: "700", fontSize: "15px" }}
                  />
                  <button
                    type="button"
                    className="eye-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}

                {form.password && (
                  <div className="password-strength-text" style={{ marginTop: 6, fontSize: "12px", fontWeight: 650 }}>
                    Password strength: <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                  </div>
                )}
              </div>

              <div className={`form-group ${fieldErrors.confirmPassword ? "has-error" : touched.confirmPassword && form.confirmPassword && !fieldErrors.confirmPassword ? "is-valid" : ""}`}>
                <label htmlFor="confirmPassword" style={{ color: "#0f172a", fontWeight: "900", fontSize: "12.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Confirm password</label>
                <div className="input-wrap">
                  <FiLock className="input-field-icon" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    style={{ color: "#082733", fontWeight: "700", fontSize: "15px" }}
                  />
                  <button
                    type="button"
                    className="eye-toggle"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                  >
                    {showConfirm ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="field-error">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <div className={`form-group ${fieldErrors.role ? "has-error" : touched.role && form.role && !fieldErrors.role ? "is-valid" : ""}`}>
                <label htmlFor="role" style={{ color: "#0f172a", fontWeight: "900", fontSize: "12.5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Account type</label>
                <div className="select-wrap">
                  <FiUsers className="input-field-icon" />
                  <select
                    id="role"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    style={{ color: "#082733", fontWeight: "700", fontSize: "15px" }}
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

              <button type="submit" className="register-submit-btn" disabled={loading}>
                {loading ? (
                  <span className="register-btn-spinner" />
                ) : (
                  "Create account"
                )}
              </button>

              <p className="register-signin-redirect" style={{ color: "#475569", fontWeight: "600" }}>
                Already have one? <Link to={ROUTE_PATHS.LOGIN} className="login-link" style={{ fontWeight: "800" }}>Sign in</Link>
              </p>
            </form>

            <p className="register-terms">
              By creating an account you agree to our{" "}
              <span>Terms of Service</span> and <span>Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
