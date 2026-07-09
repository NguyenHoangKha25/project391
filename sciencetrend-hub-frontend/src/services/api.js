const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api"
).replace(/\/$/, "");

function getStoredToken() {
  return localStorage.getItem("token") || "";
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
    ...fetchOptions
  } = options;

  const token = getStoredToken();
  const isFormData = body instanceof FormData;
  const hasBody = body !== undefined && body !== null;

  const headers = {
    ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  };

  const requestBody =
    hasBody && !isFormData && typeof body !== "string"
      ? JSON.stringify(body)
      : body;

  const url = `${API_BASE_URL}${normalizeEndpoint(endpoint)}${buildQueryString(params)}`;

  const res = await fetch(url, { ...fetchOptions, headers, body: requestBody });

  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  const responseBody = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(buildErrorMessage(responseBody, res.status));
  }

  return responseBody;
}
