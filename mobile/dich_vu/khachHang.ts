import { api } from "./api";
import { KhachHang } from "@/kieu_du_lieu/KhachHang";

type CapNhatKhachHang = {
  HoTen?: string;
  NgaySinh?: string | null;
  GioiTinh?: "Nam" | "Nữ" | "Khác" | null;
};

export type DiaChiNhanHang = { Id: number; TenNguoiNhan: string; SoDienThoai: string; DiaChi: string; MacDinh: boolean; };
export type DiaChiInput = Pick<DiaChiNhanHang, "TenNguoiNhan" | "SoDienThoai" | "DiaChi"> & { MacDinh?: boolean };

function normalizeDiaChiList(value: unknown): DiaChiNhanHang[] {
  if (!Array.isArray(value)) throw new Error("Dữ liệu địa chỉ từ máy chủ không đúng định dạng.");
  return value.map((raw: any, index) => {
    const id = Number(raw?.Id);
    const ten = typeof raw?.TenNguoiNhan === "string" ? raw.TenNguoiNhan.trim() : "";
    const dienThoai = typeof raw?.SoDienThoai === "string" ? raw.SoDienThoai.trim() : "";
    const diaChi = typeof raw?.DiaChi === "string" ? raw.DiaChi.trim() : "";
    const flag = raw?.MacDinh;
    const macDinh = flag === true || flag === 1 || flag === "1" || flag === "true";
    if (!Number.isSafeInteger(id) || id <= 0 || !ten || !dienThoai || !diaChi) {
      throw new Error(`Địa chỉ dòng ${index + 1} thiếu mã hoặc thông tin nhận hàng hợp lệ.`);
    }
    if (!(flag === true || flag === false || flag === 1 || flag === 0 || flag === "1" || flag === "0" || flag === "true" || flag === "false")) {
      throw new Error(`Cờ địa chỉ mặc định dòng ${index + 1} không hợp lệ.`);
    }
    return { Id: id, TenNguoiNhan: ten, SoDienThoai: dienThoai, DiaChi: diaChi, MacDinh: macDinh };
  });
}

export const khachHangService = {
  // GET /api/khachhang/me — backend derives owner from Bearer JWT.
  layThongTin: (token: string) => api.get<{ success: boolean; data: KhachHang }>("/khachhang/me", token),
  tomTat: (token: string) => api.get<{ success: boolean; data: { TongDon: number; ChoXacNhan: number; DangGiao: number; HoanTat: number; HoanTra: number } }>("/khachhang/me/summary", token),

  // Login identifiers are intentionally excluded; changing them requires verification.
  capNhatThongTin: (
    data: CapNhatKhachHang,
    token: string,
  ) =>
    api.put<{ success: boolean; message: string; data?: KhachHang }>(
      "/khachhang/me",
      data,
      token,
    ),
  danhSachDiaChi: async (token: string) => {
    const response = await api.get<{ success: boolean; data: unknown }>("/khachhang/me/addresses", token);
    if (!response.success) throw new Error("Máy chủ không xác nhận được danh sách địa chỉ.");
    return { ...response, data: normalizeDiaChiList(response.data) };
  },
  themDiaChi: (data: DiaChiInput, token: string) => api.post<{ success: boolean; data: { Id: number } }>("/khachhang/me/addresses", data, token),
  suaDiaChi: (id: number, data: DiaChiInput, token: string) => api.put<{ success: boolean }>(`/khachhang/me/addresses/${id}`, data, token),
  datDiaChiMacDinh: (id: number, token: string) => api.post<{ success: boolean }>(`/khachhang/me/addresses/${id}/default`, {}, token),
  xoaDiaChi: (id: number, token: string) => api.delete<{ success: boolean }>(`/khachhang/me/addresses/${id}`, token),
  doiMatKhau: (MatKhauHienTai: string, MatKhauMoi: string, token: string) => api.post<{ success: boolean; message: string }>("/khachhang/me/change-password", { MatKhauHienTai, MatKhauMoi }, token),
  capNhatAnhDaiDien: (uri: string, token: string, mimeType = "image/jpeg") => { const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg"; const body = new FormData(); body.append("image", { uri, name: `avatar.${ext}`, type: mimeType } as any); return api.postForm<{ success: boolean; data: { AnhDaiDien: string } }>("/upload/avatar", body, token); },
};
