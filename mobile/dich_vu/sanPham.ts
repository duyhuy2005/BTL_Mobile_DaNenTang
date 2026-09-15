import { api } from "./api";
import { SanPham } from "@/kieu_du_lieu/SanPham";

type DanhSachSanPham = {
  data: SanPham[];
  total: number;
  trang: number;
  soTrangToiDa: number;
};

export const sanPhamService = {
  layDanhSach: (params?: {
    trang?: number;
    giaoHang?: number;
    danhMuc?: string;
    tuKhoa?: string;
  }) => {
    const query = new URLSearchParams(params as any).toString();
    return api.get<DanhSachSanPham>(`/san-pham${query ? "?" + query : ""}`);
  },

  layChiTiet: (id: string) => api.get<SanPham>(`/san-pham/${id}`),

  timKiem: (tuKhoa: string) =>
    api.get<DanhSachSanPham>(`/san-pham?tuKhoa=${encodeURIComponent(tuKhoa)}`),

  laySanPhamNoiBat: () => api.get<SanPham[]>("/san-pham/noi-bat"),

  laySanPhamKhuyenMai: () => api.get<SanPham[]>("/san-pham/khuyen-mai"),
};
