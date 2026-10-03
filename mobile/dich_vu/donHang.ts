import { api } from "./api";
import { HoaDon } from "@/kieu_du_lieu/DonHang";

type TaoHoaDonInput = {
  IdDiaChiNhanHang: number;
  MuaNgay?: boolean;
  PhuongThucThanhToan?: "COD" | "Banking";
  GhiChu?: string;
  TenNguoiNhan?: string;
  SoDienThoaiNhan?: string;
  DiaChiGiaoHang?: string;
  MaVoucher?: string;
  MaVoucherPhiShip?: string;
  IdempotencyKey?: string;
  ExpectedTotal?: number;
  ExpectedVoucherDiscount?: number;
  danhSachSanPham: { MaSanPham: number; MaBienThe?: number | null; SoLuong: number }[];
};

function normalizeOrderLines(lines: TaoHoaDonInput["danhSachSanPham"]) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error("Đơn hàng phải có ít nhất một sản phẩm hợp lệ.");
  }
  return lines.map((line, index) => {
    const rawId: unknown = line?.MaSanPham;
    const rawQuantity: unknown = line?.SoLuong;
    if (rawId === null || rawId === undefined || String(rawId).trim() === "") {
      throw new Error(`Sản phẩm dòng ${index + 1} thiếu mã sản phẩm.`);
    }
    if (rawQuantity === null || rawQuantity === undefined || String(rawQuantity).trim() === "") {
      throw new Error(`Sản phẩm dòng ${index + 1} thiếu số lượng.`);
    }
    const MaSanPham = Number(rawId);
    const SoLuong = Number(rawQuantity);
    if (!Number.isSafeInteger(MaSanPham) || MaSanPham <= 0) {
      throw new Error(`Mã sản phẩm dòng ${index + 1} phải là số nguyên dương.`);
    }
    if (!Number.isSafeInteger(SoLuong) || SoLuong <= 0) {
      throw new Error(`Số lượng dòng ${index + 1} phải là số nguyên dương.`);
    }
    const rawVariant: unknown = (line as any)?.MaBienThe;
    const MaBienThe = rawVariant == null || rawVariant === "" ? null : Number(rawVariant);
    if (MaBienThe !== null && (!Number.isSafeInteger(MaBienThe) || MaBienThe <= 0)) throw new Error(`Mã biến thể dòng ${index + 1} phải là số nguyên dương.`);
    return { MaSanPham, MaBienThe, SoLuong };
  });
}

type DanhSachHoaDonResponse = {
  success: boolean;
  data: HoaDon[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const donHangService = {
  // GET /api/hoadon/me?trangThai=...&page=...
  layDanhSach: (
    token: string,
    params?: {
      trangThai?: string;
      page?: number;
      limit?: number;
      exactStatus?: boolean;
      nhomTrangThai?: string;
    },
  ) => {
    const q = new URLSearchParams();
    if (params?.trangThai) q.append("trangThai", params.trangThai);
    if (params?.page) q.append("page", String(params.page));
    if (params?.limit) q.append("limit", String(params.limit));
    if (params?.exactStatus) q.append("exactStatus", "true");
    if (params?.nhomTrangThai) q.append("nhomTrangThai", params.nhomTrangThai);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return api.get<DanhSachHoaDonResponse>(`/hoadon/me${qs}`, token);
  },

  // GET /api/hoadon/:id
  layChiTiet: (id: number, token: string) =>
    api.get<{ success: boolean; data: HoaDon }>(`/hoadon/${id}`, token),

  // POST /api/hoadon
  taoHoaDon: (data: TaoHoaDonInput, token: string) => {
    if (!Number.isSafeInteger(data.IdDiaChiNhanHang) || data.IdDiaChiNhanHang <= 0) {
      throw new Error("Vui lòng chọn địa chỉ nhận hàng đã lưu trước khi đặt đơn.");
    }
    const requestBody = { ...data, danhSachSanPham: normalizeOrderLines(data.danhSachSanPham) };
    if (__DEV__) {
      // Deliberately omit JWT and recipient/contact/address information from logs.
      console.info("[Checkout] POST /api/hoadon", {
        danhSachSanPham: requestBody.danhSachSanPham,
      });
    }
    return api.post<{
      success: boolean;
      message: string;
      data: { MaHoaDon: number; TrangThai?: string };
    }>("/hoadon", requestBody, token);
  },

  thaoTac: (id: number, data: { action: "cancel"; reason: string }, token: string) =>
    api.post<{ success: boolean; message: string; data: { MaHoaDon: number; TrangThai: string } }>(`/hoadon/${id}/actions`, data, token),

};
