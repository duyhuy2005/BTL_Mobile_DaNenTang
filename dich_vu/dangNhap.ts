import { api } from "./api";
import {
  ThongTinDangNhap,
  ThongTinDangKy,
  KhachHang,
} from "@/kieu_du_lieu/KhachHang";

type AuthResponse = { token: string; khachHang: KhachHang };

export const dangNhapService = {
  dangNhap: (data: ThongTinDangNhap) =>
    api.post<AuthResponse>("/auth/login", data),

  dangKy: (data: ThongTinDangKy) =>
    api.post<AuthResponse>("/auth/register", data),

  dangXuat: (token: string) => api.post<void>("/auth/logout", {}, token),

  layThongTinTaiKhoan: (token: string) => api.get<KhachHang>("/auth/me", token),
};
