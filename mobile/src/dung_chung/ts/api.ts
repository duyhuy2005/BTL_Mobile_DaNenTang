import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError } from "axios";
import { API_URL } from "../../../hang_so";
import { phienDangNhap } from "@/dich_vu/suKienPhien";
import { tokenStore } from "@/dich_vu/tokenStore";

const BASE_URL = API_URL.BASE;

if (__DEV__) console.info("[Mobile API] baseURL:", BASE_URL);

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      try {
        await tokenStore.remove();
        await AsyncStorage.multiRemove(["accessToken", "refreshToken", "refresh_token", "user", "khachHang", "beautystore.voucher.selected"]);
      } finally { phienDangNhap.expired(); }
    }
    return Promise.reject(error);
  },
);

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function getToken(): Promise<string | null> {
  try {
    return await tokenStore.get();
  } catch {
    return null;
  }
}

async function request<T>(
  endpoint: string,
  method: Method = "GET",
  body?: unknown,
  tokenOverride?: string,
  isFormData = false,
): Promise<T> {
  try {
    const response = await client.request<T>({
      url: endpoint,
      method,
      data: body,
      headers: tokenOverride
        ? { Authorization: `Bearer ${tokenOverride}`, ...(isFormData ? { "Content-Type": "multipart/form-data" } : {}) }
        : isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status ?? 0;
      const actualUrl = error.config ? client.getUri(error.config) : `${BASE_URL}${endpoint}`;
      console.error("[Mobile API] Request failed", {
        url: actualUrl,
        method,
        status: status || "NETWORK_ERROR",
        responseData: error.response?.data ?? error.message,
      });
      const message =
        error.response?.data?.message ||
        (status ? `Lỗi HTTP ${status}` : "Không thể kết nối tới server");
      throw new ApiError(message, status);
    }
    throw error;
  }
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

  postForm: <T>(endpoint: string, body: FormData, token?: string) =>
    request<T>(endpoint, "POST", body, token, true),
};

export { BASE_URL, ApiError };
