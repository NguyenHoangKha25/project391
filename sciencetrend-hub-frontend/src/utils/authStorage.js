import { unwrapResponse } from "./apiData";

// Backend trả về field "token" (không phải accessToken)
// AuthResponse: { token, refreshToken, user: { userId, username, email, role } }
const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";
const ADMIN_ROLE = "ADMIN";
const DEFAULT_MEMBER_ROLE = "MEMBER";

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function normalizeRoleValue(value) {
  if (value === undefined || value === null || value === "") return "";

  if (typeof value === "string") {
    return value
      .trim()
      .replace(/^ROLE_/i, "")
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase();
  }

  if (typeof value === "object") {
    return normalizeRoleValue(
      value.role || value.name || value.authority || value.code || value.value,
    );
  }

  return normalizeRoleValue(String(value));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || "";
}

export function readStoredUser() {
  return safeJsonParse(localStorage.getItem(USER_KEY) || "{}", {}) || {};
}

export function getStoredRole() {
  const user = readStoredUser();
  return normalizeRoleValue(user.role) || DEFAULT_MEMBER_ROLE;
}

export function getStoredRoles() {
  const role = getStoredRole();
  return role ? [role] : [DEFAULT_MEMBER_ROLE];
}

export function hasRole(role) {
  const targetRole = normalizeRoleValue(role);
  return targetRole === getStoredRole();
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function isAdmin() {
  return getStoredRole() === ADMIN_ROLE;
}

export function getDefaultAuthenticatedPath() {
  return "/dashboard";
}

// Backend AuthResponse: { token, refreshToken, user: { userId, username, email, role } }
export function saveAuthSession(response, fallbackUser = {}) {
  const data = unwrapResponse(response) || {};

  // BE trả đúng field "token"
  const token = data.token || "";

  if (!token) {
    throw new Error("Login response does not contain token");
  }

  const refreshToken = data.refreshToken || "";

  // BE trả user object với { userId, username, email, role }
  const responseUser = data.user || {};

  const role = normalizeRoleValue(
    responseUser.role || fallbackUser.role || DEFAULT_MEMBER_ROLE,
  );

  const user = {
    userId: responseUser.userId || null,
    username: responseUser.username || fallbackUser.username || "",
    email: responseUser.email || fallbackUser.email || "",
    role,
    roles: [role],
  };

  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  return { token, refreshToken, user, role, roles: user.roles };
}

// OAuth2 callback: BE redirect về /oauth2/callback?token=xxx
// Chỉ có token, username/email/role phải lấy từ /api/auth/me sau
export function saveOAuthSessionFromQuery(searchParams) {
  const token =
    searchParams.get("token") ||
    searchParams.get("accessToken") ||
    searchParams.get("jwt") ||
    "";

  if (!token) {
    throw new Error("OAuth callback does not contain token");
  }

  // Lưu token trước, user info sẽ được fetch từ /api/auth/me
  localStorage.setItem(TOKEN_KEY, token);

  const refreshToken = searchParams.get("refreshToken") || "";
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

  // Tạm thời lưu user rỗng, OAuth2CallbackPage sẽ gọi /api/auth/me để lấy thêm
  const tempUser = {
    username: searchParams.get("username") || searchParams.get("email") || "",
    email: searchParams.get("email") || "",
    role: normalizeRoleValue(searchParams.get("role") || DEFAULT_MEMBER_ROLE),
    roles: [normalizeRoleValue(searchParams.get("role") || DEFAULT_MEMBER_ROLE)],
  };
  localStorage.setItem(USER_KEY, JSON.stringify(tempUser));

  return { token, refreshToken, user: tempUser, role: tempUser.role, roles: tempUser.roles };
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function formatRoleForDisplay(roleValue) {
  const role = normalizeRoleValue(roleValue || getStoredRole());

  if (!role || role === DEFAULT_MEMBER_ROLE) return "Research member";

  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
