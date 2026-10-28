const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const TOKEN_KEY = "fleetflow_token";

export function getToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasToken() {
  return !!getToken();
}

interface ApiOptions extends RequestInit {
  auth?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const {
    auth = true,
    headers,
    ...requestOptions
  } = options;

  const finalHeaders = new Headers(headers);

  if (
    requestOptions.body &&
    !(requestOptions.body instanceof FormData) &&
    !finalHeaders.has("Content-Type")
  ) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getToken();

    if (token) {
      finalHeaders.set(
        "Authorization",
        `Bearer ${token}`
      );
    }
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...requestOptions,
      headers: finalHeaders,
    }
  );

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      removeToken();
    }

    throw new Error(
      data?.message ||
        `Erro na requisição (${response.status}).`
    );
  }

  return data as T;
}
