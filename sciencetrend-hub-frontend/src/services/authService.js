import { apiRequest } from "./api";

// POST /api/auth/login  → { username, password }
export function login({ username, password }) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: { username, password },
    auth: false,
  });
}

// POST /api/auth/register → { username, email, password, confirmPassword, role }
export function register({ username, email, password, confirmPassword, role }) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: { username, email, password, confirmPassword, role },
    auth: false,
  });
}

// POST /api/auth/forgot-password → { identifier }   ← KHÔNG phải "email"!
// Backend ForgotPasswordRequest dùng field "identifier" (có thể là username hoặc email)
export function forgotPassword(identifier) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: { identifier },
    auth: false,
  });
}

// POST /api/auth/reset-password → { token, newPassword, confirmPassword }
export function resetPassword(token, newPassword, confirmPassword) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: { token, newPassword, confirmPassword },
    auth: false,
  });
}

// POST /api/auth/refresh-token → { refreshToken }
export function refreshToken(refreshTokenValue) {
  return apiRequest("/auth/refresh-token", {
    method: "POST",
    body: { refreshToken: refreshTokenValue },
    auth: false,
  });
}

// POST /api/auth/logout → { refreshToken }
export function logoutFromServer(refreshTokenValue) {
  if (!refreshTokenValue) return Promise.resolve();
  return apiRequest("/auth/logout", {
    method: "POST",
    body: { refreshToken: refreshTokenValue },
  });
}
