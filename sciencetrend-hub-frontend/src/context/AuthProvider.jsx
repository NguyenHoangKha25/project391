import { useCallback, useEffect, useMemo, useState } from "react";
import AuthContext from "./AuthContext";
import { logoutFromServer } from "../services/authService";
import {
  clearAuthSession,
  formatRoleForDisplay,
  getDefaultAuthenticatedPath,
  getRefreshToken,
  getStoredRole,
  getStoredRoles,
  getToken,
  isAdmin,
  readStoredUser,
  saveAuthSession,
  saveCurrentUser,
} from "../utils/authStorage";
import { getCurrentUser } from "../services/userService";

function buildAuthState() {
  const user = readStoredUser();
  const roles = getStoredRoles();
  const role = getStoredRole();
  const token = getToken();

  return {
    token,
    user,
    role,
    roles,
    isLoggedIn: Boolean(token),
    isAdminUser: isAdmin(),
  };
}

function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => buildAuthState());

  const refreshAuthState = useCallback(() => {
    const nextState = buildAuthState();
    setAuthState(nextState);
    return nextState;
  }, []);

  const loginUser = useCallback(
    (response, fallbackUser = {}) => {
      const session = saveAuthSession(response, fallbackUser);
      refreshAuthState();
      return session;
    },
    [refreshAuthState],
  );

  const updateCurrentUser = useCallback(
    (userResponse) => {
      const user = saveCurrentUser(userResponse);
      refreshAuthState();
      return user;
    },
    [refreshAuthState],
  );

  useEffect(() => {
    if (!authState.token) return;

    let cancelled = false;
    getCurrentUser()
      .then((response) => {
        if (!cancelled) updateCurrentUser(response);
      })
      .catch(() => {
        // Keep the locally stored session when the profile endpoint is temporarily unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [authState.token, updateCurrentUser]);

  // Gọi BE logout (POST /api/auth/logout) đồng thời clear local storage
  const logoutUser = useCallback(() => {
    const refreshToken = getRefreshToken();
    // Fire-and-forget: không block UI khi BE chậm hoặc fail
    logoutFromServer(refreshToken).catch(() => {});
    clearAuthSession();
    refreshAuthState();
  }, [refreshAuthState]);

  const value = useMemo(
    () => ({
      ...authState,
      displayRole: formatRoleForDisplay(authState.role),
      defaultPath: getDefaultAuthenticatedPath(),
      loginUser,
      updateCurrentUser,
      logoutUser,
      refreshAuthState,
    }),
    [authState, loginUser, logoutUser, refreshAuthState, updateCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
