import { api } from "./api";
import {
  SanPham,
  DanhSachSanPhamResponse,
  DanhMuc,
} from "@/kieu_du_lieu/SanPham";

export const sanPhamService = {
  // GET /api/sanpham?page=1&limit=10&search=...&maDanhMuc=...
  layDanhSach: (
    token?: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      maDanhMuc?: number;
      thuongHieu?: string;
      loaiDa?: string;
      giaTu?: number;
      giaDen?: number;
      conHang?: boolean;
      sort?: "newest" | "new" | "price_asc" | "price_desc" | "popular";
      chiKhuyenMai?: boolean;
      chiSanPhamMoi?: boolean;
    },
  ) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.search) query.append("search", params.search);
    if (params?.maDanhMuc) query.append("maDanhMuc", String(params.maDanhMuc));
    if (params?.thuongHieu) query.append("thuongHieu", params.thuongHieu);
    if (params?.loaiDa) query.append("loaiDa", params.loaiDa);
    if (params?.giaTu !== undefined) query.append("giaTu", String(params.giaTu));
    if (params?.giaDen !== undefined) query.append("giaDen", String(params.giaDen));
    if (params?.conHang) query.append("conHang", "true");
    if (params?.sort) query.append("sort", params.sort);
    if (params?.chiKhuyenMai) query.append("chiKhuyenMai", "true");
    if (params?.chiSanPhamMoi) query.append("chiSanPhamMoi", "true");
    const qs = query.toString() ? `?${query.toString()}` : "";
    return api.get<DanhSachSanPhamResponse>(`/sanpham${qs}`, token);
  },

  // GET /api/sanpham/:id
  layChiTiet: (id: number, token?: string) =>
    api.get<{ success: boolean; data: SanPham }>(`/sanpham/${id}`, token),

  layBoLoc: () => api.get<{ success: boolean; data: { brands: string[]; skinTypes: string[] } }>("/sanpham/facets"),

  // GET /api/danhmuc
  layDanhMuc: (token?: string) =>
    api.get<{ success: boolean; data: DanhMuc[] }>("/danhmuc", token),
};
