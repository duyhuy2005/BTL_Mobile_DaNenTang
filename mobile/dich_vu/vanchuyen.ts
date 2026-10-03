import { api } from "./api";

export type VanDonCuaToi = {
  Id: number;
  HoaDonId: number;
  MaVanDon: string;
  TrangThai: string;
  TrangThaiCOD?: string;
  NgayDuKienGiao?: string;
  CreatedAt: string;
  TenDonVi: string;
};

export type ChiTietVanDon = VanDonCuaToi & {
  TenNguoiNhan?: string;
  SoDienThoaiNhan?: string;
  DiaChiGiaoHang?: string;
  TienThuHo?: number;
  LyDoThatBai?: string;
  UpdatedAt?: string;
  Timeline: {
    Id: number;
    TrangThaiCu?: string;
    TrangThaiMoi: string;
    ViTri?: string;
    GhiChu?: string;
    LyDoThatBai?: string;
    CreatedAt: string;
    NguoiCapNhat?: string;
  }[];
};

export const vanChuyenService = {
  layDanhSachCuaToi: (token: string) =>
    api.get<{ success: boolean; data: VanDonCuaToi[] }>("/vanchuyen/me", token),
  layChiTiet: (id: number, token: string) =>
    api.get<{ success: boolean; data: ChiTietVanDon }>(`/vanchuyen/${id}`, token),
};
