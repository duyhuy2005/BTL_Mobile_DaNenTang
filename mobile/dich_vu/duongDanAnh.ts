import { BASE_URL } from "./api";

const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, "");

/** Convert DB paths and relative upload paths to a URL reachable from the handset. */
export function duongDanAnh(path?: string | null, folder = "products"): string | undefined {
  if (!path?.trim()) return undefined;
  const value = path.trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${API_ORIGIN}${value}`;
  if (value.startsWith("uploads/")) return `${API_ORIGIN}/${value}`;
  return `${API_ORIGIN}/uploads/${folder}/${encodeURIComponent(value.split("/").pop() || value)}`;
}
