import { apiRequest } from "./api";

/**
 * Sends a authentication request to log in a user.
 * 
 * @param {Object} credentials - The login credentials.
 * @param {string} credentials.username - The username of the user.
 * @param {string} credentials.password - The raw password of the user.
 * @returns {Promise<Object>} The server response containing token and user info.
 */
export function login({ username, password }) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: { username, password },
    auth: false,
  });
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
