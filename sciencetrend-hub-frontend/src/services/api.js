import { clearCache } from "../utils/apiCache";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api"
).replace(/\/$/, "");

function getStoredToken() {
  return localStorage.getItem("token") || "";
}

function getStoredRefreshToken() {
  return localStorage.getItem("refreshToken") || "";
}

async function refreshAccessToken() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return "";

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return "";

    const payload = await response.json().catch(() => ({}));
    const data = payload?.data ?? payload;
    const token = data?.token ?? data?.accessToken ?? "";
    if (!token) return "";

    localStorage.setItem("token", token);
    if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    return token;
  } catch {
    return "";
  }
}

function normalizeEndpoint(endpoint) {
  return endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, item));
      return;
    }
    searchParams.append(key, value);
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

function buildErrorMessage(errorBody, status) {
  // 500 — server crashed, no need to expose internal message
  if (status >= 500) {
    return "The server ran into a problem. Try again in a moment.";
  }
  if (!errorBody) return "Something went wrong. Please try again.";
  if (typeof errorBody === "string") {
    const trimmed = errorBody.trim();
    // Suppress raw HTML error pages or empty strings
    if (!trimmed || trimmed.startsWith("<!")) {
      return "Something went wrong. Please try again.";
    }
    return trimmed;
  }
  if (errorBody.message) return errorBody.message;
  if (errorBody.error) return errorBody.error;
  if (Array.isArray(errorBody.errors)) {
    return errorBody.errors
      .map((item) => item.defaultMessage || item.message || String(item))
      .join("\n");
  }
  return "Something went wrong. Please try again.";
}

export async function apiRequest(endpoint, options = {}) {
  const {
    params,
    body,
    headers: customHeaders = {},
    auth = true,
    timeout = 12000,
    ...fetchOptions
  } = options;

  const token = getStoredToken();
  const isFormData = body instanceof FormData;
  const hasBody = body !== undefined && body !== null;

  let headers = {
    ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  };

  const requestBody =
    hasBody && !isFormData && typeof body !== "string"
      ? JSON.stringify(body)
      : body;

  const url = `${API_BASE_URL}${normalizeEndpoint(endpoint)}${buildQueryString(params)}`;
  const method = (fetchOptions.method || "GET").toUpperCase();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(url, { ...fetchOptions, method, headers, body: requestBody, signal: controller.signal });
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.error(`[API Timeout] ${method} ${url} timed out after ${timeout}ms`);
      throw new Error("Request timed out. Please check your network connection.", { cause: error });
    }
    console.error(`[API Network Error] ${method} ${url} failed:`, error);
    throw new Error("Network request failed. Please check your connection.", { cause: error });
  }

  if (res.status === 401 && auth && !normalizeEndpoint(endpoint).startsWith("/auth/")) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      headers = { ...headers, Authorization: `Bearer ${nextToken}` };
      const retryController = new AbortController();
      const retryTimeoutId = setTimeout(() => retryController.abort(), timeout);
      try {
        res = await fetch(url, {
          ...fetchOptions,
          method,
          headers,
          body: requestBody,
          signal: retryController.signal,
        });
      } finally {
        clearTimeout(retryTimeoutId);
      }
    }
  }

  if (res.status === 204) {
    if (method !== "GET") {
      clearCache();
    }
    return null;
  }

  const contentType = res.headers.get("content-type") || "";
  const responseBody = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => "");

  if (!res.ok) {
    const errorMsg = buildErrorMessage(responseBody, res.status);
    console.error(`[API HTTP Error] ${res.status} on ${method} ${url} - Error: ${errorMsg}`, responseBody);
    throw new Error(errorMsg);
  }

  // If request is successful and is a mutating method, clear memory cache
  if (method !== "GET") {
    clearCache();
  }

  return responseBody;
}
