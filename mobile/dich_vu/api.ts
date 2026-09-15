const BASE_URL = "https://api.beautystore.vn/v1"; // Thay bằng URL thực tế

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

async function request<T>(
  endpoint: string,
  method: Method = "GET",
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const config: RequestInit = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Lỗi không xác định" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, "GET", undefined, token),
  post: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, "POST", body, token),
  put: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, "PUT", body, token),
  patch: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, "PATCH", body, token),
  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, "DELETE", undefined, token),
};
