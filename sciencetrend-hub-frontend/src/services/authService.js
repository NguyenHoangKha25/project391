import { apiRequest } from "./api";

const AUTH_WARMUP_TTL = 2 * 60 * 1000;
const AUTH_WARMUP_TIMEOUT = 20000;
const LOGIN_TIMEOUT = 45000;
const LOGIN_RETRY_DELAY = 800;

let authWarmupRequest = null;
let authServiceReadyUntil = 0;

function isRetryableLoginError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("unable to connect")
    || message.includes("timed out")
    || message.includes("server ran into a problem");
}

function waitForLoginRetry() {
  return new Promise((resolve) => {
    setTimeout(resolve, LOGIN_RETRY_DELAY);
  });
}

/**
 * Wakes the deployed API through a small public catalog request. Railway can
 * suspend an idle service, while Google OAuth naturally wakes it by navigating
 * through the backend first. Password login should receive the same treatment.
 */
export function warmAuthService() {
  if (Date.now() < authServiceReadyUntil) return Promise.resolve(true);
  if (authWarmupRequest) return authWarmupRequest;

  authWarmupRequest = apiRequest("/papers", {
    params: { page: 0, size: 1 },
    auth: false,
    timeout: AUTH_WARMUP_TIMEOUT,
  })
    .then(() => {
      authServiceReadyUntil = Date.now() + AUTH_WARMUP_TTL;
      return true;
    })
    .catch(() => false)
    .finally(() => {
      authWarmupRequest = null;
    });

  return authWarmupRequest;
}

/**
 * Sends a authentication request to log in a user.
 * 
 * @param {Object} credentials - The login credentials.
 * @param {string} credentials.username - The username of the user.
 * @param {string} credentials.password - The raw password of the user.
 * @returns {Promise<Object>} The server response containing token and user info.
 */
export async function login({ username, password }) {
  await warmAuthService();

  const options = {
    method: "POST",
    body: { username, password },
    auth: false,
    timeout: LOGIN_TIMEOUT,
  };

  try {
    return await apiRequest("/auth/login", options);
  } catch (error) {
    if (!isRetryableLoginError(error)) throw error;
    await waitForLoginRetry();
    return apiRequest("/auth/login", options);
  }
}

/**
 * Registers a new account in the system.
 * 
 * @param {Object} details - Account registration details.
 * @param {string} details.username - Username to register.
 * @param {string} details.email - User email address.
 * @param {string} details.password - User password.
 * @param {string} details.confirmPassword - Retyped password for verification.
 * @param {"STUDENT"|"LECTURER"|"RESEARCHER"} details.role - Selected workspace role.
 * @returns {Promise<Object>} Result details from the registration API.
 */
export function register({ username, email, password, confirmPassword, role }) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: { username, email, password, confirmPassword, role },
    auth: false,
  });
}

/**
 * Initiates the forgot-password flow.
 * 
 * @param {string} identifier - The username or email of the target account.
 * @returns {Promise<Object>} Response indicating if the recovery code was dispatched.
 */
export function forgotPassword(identifier) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: { identifier },
    auth: false,
  });
}

/**
 * Resets a user's password using a reset token.
 * 
 * @param {string} token - The password reset token from email/callback.
 * @param {string} newPassword - The new password.
 * @param {string} confirmPassword - The confirmed new password.
 * @returns {Promise<Object>} Success or failure status of the password update.
 */
export function resetPassword(token, newPassword, confirmPassword) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: { token, newPassword, confirmPassword },
    auth: false,
  });
}

/**
 * Refreshes the local JWT session token using a refresh token.
 * 
 * @param {string} refreshTokenValue - Stored refresh token.
 * @returns {Promise<Object>} Stored session payload with a new accessToken.
 */
export function refreshToken(refreshTokenValue) {
  return apiRequest("/auth/refresh-token", {
    method: "POST",
    body: { refreshToken: refreshTokenValue },
    auth: false,
  });
}

/**
 * Invalidates the refresh token on the server during logout.
 * 
 * @param {string} refreshTokenValue - The active refresh token.
 * @returns {Promise<null>} Resolves when logout is recorded.
 */
export function logoutFromServer(refreshTokenValue) {
  if (!refreshTokenValue) return Promise.resolve();
  return apiRequest("/auth/logout", {
    method: "POST",
    body: { refreshToken: refreshTokenValue },
  });
}
