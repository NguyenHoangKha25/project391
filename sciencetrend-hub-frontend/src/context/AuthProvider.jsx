import { useCallback, useMemo, useState } from "react";
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
} from "../utils/authStorage";

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
      logoutUser,
      refreshAuthState,
    }),
    [authState, loginUser, logoutUser, refreshAuthState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
