import { api } from "./api";
import {
  AuthResponse,
  ThongTinDangNhap,
  ThongTinDangKy,
  KhachHang,
} from "@/kieu_du_lieu/KhachHang";

export const dangNhapService = {
  // POST /api/auth/login — body: { TenDangNhap, MatKhau }
  dangNhap: (data: ThongTinDangNhap) =>
    api.post<AuthResponse>("/auth/login", data),

  // POST /api/auth/register — body: { TenDangNhap, MatKhau, VaiTro? }
  dangKy: (tenDangNhap: string, matKhau: string) =>
    api.post<AuthResponse>("/auth/register", {
      TenDangNhap: tenDangNhap,
      MatKhau: matKhau,
      VaiTro: "KhachHang",
    }),

  dangKyDayDu: (data: ThongTinDangKy) =>
    api.post<AuthResponse>("/auth/register", {
      TenDangNhap: data.TenDangNhap,
      MatKhau: data.MatKhau,
      HoTen: data.HoTen,
      SoDienThoai: data.SoDienThoai,
      Email: data.Email,
      VaiTro: data.VaiTro ?? "KhachHang",
    }),

  // POST /api/khachhang — tạo hồ sơ khách hàng sau khi đăng ký tài khoản
  taoKhachHang: (
    maTaiKhoan: number,
    data: {
      HoTen: string;
      SoDienThoai: string;
      Email: string;
      DiaChi?: string;
    },
    token: string,
  ) =>
    api.post<{ success: boolean; data: { MaKhachHang: number } }>(
      "/khachhang",
      { MaTaiKhoan: maTaiKhoan, ...data },
      token,
    ),
};
