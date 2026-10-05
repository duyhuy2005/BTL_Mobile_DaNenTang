import { api } from "./api";

export type ItemGioHang = {
  MaGioHang: number;
  MaSanPham: number;
  MaBienThe?: number | null;
  SoLuong: number;
  TenSanPham: string;
  GiaBan: number;
  GiaKhuyenMaiHienTai: number;
  PhanTramGiam?: number;
  DangKhuyenMai?: boolean;
  TenKhuyenMai?: string | null;
  HinhAnh?: string;
  ThuongHieu?: string;
  MaSKUBienThe?: string | null;
  DungTich?: number | null;
  DonViDungTich?: string | null;
  KhoiLuong?: number | null;
  DonViKhoiLuong?: string | null;
  MaMau?: string | null;
  TenMau?: string | null;
  MaHEX?: string | null;
  MuiHuong?: string | null;
  QuyCachDongGoi?: string | null;
  DuocBan: boolean;
  TonThucTe?: number;
  DaGiu?: number;
  CoTheBan?: number;
  LyDoKhongMuaDuoc?: string | null;
};

export type GioHangResponse = {
  success: boolean;
  data: {
    MaGioHang: number;
    items: ItemGioHang[];
  };
};

function integerField(value: unknown, field: string, productName: string, minimum: number): number {
  if ((typeof value !== "number" && typeof value !== "string") || (typeof value === "string" && !value.trim())) {
    throw new Error(`${productName}: API giỏ hàng trả trường ${field} không hợp lệ. Hãy tải lại sau khi cập nhật Backend.`);
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum) throw new Error(`${productName}: API giỏ hàng trả trường ${field} không hợp lệ.`);
  return number;
}

function moneyField(value: unknown, field: string, productName: string): number {
  if ((typeof value !== "number" && typeof value !== "string") || (typeof value === "string" && !value.trim())) {
    throw new Error(`${productName}: API giỏ hàng thiếu giá ${field}.`);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${productName}: API giỏ hàng trả giá ${field} không hợp lệ.`);
  return number;
}

function normalizeCartResponse(response: GioHangResponse): GioHangResponse {
  if (!response?.success || !response.data || !Array.isArray(response.data.items)) {
    throw new Error("Backend trả cấu trúc giỏ hàng không hợp lệ.");
  }
  return {
    ...response,
    data: {
      ...response.data,
      items: response.data.items.map((raw) => {
        const productName = typeof raw?.TenSanPham === "string" && raw.TenSanPham.trim() ? raw.TenSanPham : "Sản phẩm trong giỏ";
        const status: unknown = (raw as any)?.DuocBan;
        if (![true, false, 0, 1].includes(status as boolean | number)) throw new Error(`${productName}: Backend trả trạng thái bán không hợp lệ.`);
        return {
          ...raw,
          MaGioHang: integerField(raw.MaGioHang, "mã giỏ", productName, 1),
          MaSanPham: integerField(raw.MaSanPham, "mã sản phẩm", productName, 1),
          MaBienThe: raw.MaBienThe == null ? null : integerField(raw.MaBienThe, "mã biến thể", productName, 1),
          SoLuong: integerField(raw.SoLuong, "số lượng giỏ", productName, 1),
          GiaBan: moneyField(raw.GiaBan, "bán", productName),
          GiaKhuyenMaiHienTai: moneyField(raw.GiaKhuyenMaiHienTai, "hiện tại", productName),
          DuocBan: status === true || status === 1,
          TonThucTe: raw.TonThucTe == null ? undefined : integerField(raw.TonThucTe, "tồn thực tế", productName, 0),
          DaGiu: raw.DaGiu == null ? undefined : integerField(raw.DaGiu, "số lượng đã giữ", productName, 0),
          CoTheBan: raw.CoTheBan == null ? undefined : integerField(raw.CoTheBan, "tồn có thể bán", productName, 0),
        };
      }),
    },
  };
}

function positiveInteger(value: unknown, label: string): number {
  if ((typeof value !== "number" && typeof value !== "string") || (typeof value === "string" && !value.trim())) {
    throw new Error(`${label} phải là số nguyên dương.`);
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`${label} phải là số nguyên dương.`);
  return number;
}

export const gioHangService = {
  // GET /api/giohang/me — backend derives owner from Bearer JWT.
  layGioHang: async (token: string) => normalizeCartResponse(await api.get<GioHangResponse>("/giohang/me", token)),

  themSanPham: (maSanPham: number, soLuong: number, token: string, maBienThe?: number | null) =>
    api.post<{ success: boolean; message: string }>(
      "/giohang",
      { MaSanPham: positiveInteger(maSanPham, "Mã sản phẩm"), MaBienThe: maBienThe == null ? null : positiveInteger(maBienThe, "Mã biến thể"), SoLuong: positiveInteger(soLuong, "Số lượng") },
      token,
    ),

  capNhatSoLuong: (maSanPham: number, soLuong: number, token: string, maBienThe?: number | null) =>
    api.put<{ success: boolean; message: string }>(
      "/giohang",
      { MaSanPham: positiveInteger(maSanPham, "Mã sản phẩm"), MaBienThe: maBienThe == null ? null : positiveInteger(maBienThe, "Mã biến thể"), SoLuong: positiveInteger(soLuong, "Số lượng") },
      token,
    ),

  xoaSanPham: (maSanPham: number, token: string, maBienThe?: number | null) =>
    api.delete<{ success: boolean; message: string }>(`/giohang/${positiveInteger(maSanPham, "Mã sản phẩm")}${maBienThe == null ? "" : `?MaBienThe=${positiveInteger(maBienThe, "Mã biến thể")}`}`, token),
  xoaTatCa: (token: string) =>
    api.delete<{ success: boolean; message: string; data: { SoDongDaXoa: number } }>("/giohang/me", token),
};
