const POST_LOGIN_REDIRECT_KEY = "sciencetrend_post_login_redirect";

export function getSafeInternalPath(value) {
  if (typeof value !== "string") return "";
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "";
  return path;
}

export function storePostLoginRedirect(value) {
  const path = getSafeInternalPath(value);
  try {
    if (path) sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path);
    else sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  } catch {
    // Username/password login still uses router state when storage is unavailable.
  }
}

export function consumePostLoginRedirect() {
  try {
    const path = getSafeInternalPath(sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY));
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    return path;
  } catch {
    return "";
  }
}
