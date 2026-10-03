// Khớp với bảng TaiKhoan trong DB
export type TaiKhoan = {
  MaTaiKhoan: number;
  TenDangNhap: string;
  HoTen?: string;
  Email?: string;
  VaiTro: "Admin" | "NhanVien" | "KhachHang";
  TrangThai: string;
};

// Khớp với bảng KhachHang trong DB
export type KhachHang = {
  MaKhachHang: number;
  MaTaiKhoan: number;
  HoTen: string;
  SoDienThoai?: string;
  Email?: string;
  DiaChi?: string;
  NgaySinh?: string | null;
  GioiTinh?: "Nam" | "Nữ" | "Khác" | null;
  AnhDaiDien?: string | null;
  TrangThai: number; // bit: 1 = hoạt động
};

// Form đăng nhập → POST /api/auth/login
export type ThongTinDangNhap = {
  TenDangNhap: string;
  MatKhau: string;
};

// Form đăng ký → POST /api/auth/register
export type ThongTinDangKy = {
  TenDangNhap: string;
  MatKhau: string;
  XacNhanMatKhau?: string;
  HoTen: string;
  SoDienThoai?: string;
  Email?: string;
  DiaChi?: string;
  VaiTro?: "KhachHang";
};

// Response từ /api/auth/login và /api/auth/register
export type AuthResponse = {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: TaiKhoan;
    khachHang: KhachHang | null;
  };
};
