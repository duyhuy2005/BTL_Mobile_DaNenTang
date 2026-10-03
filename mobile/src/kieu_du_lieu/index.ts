// ============================================================
// KIỂU DỮ LIỆU — Khớp chính xác với DB và backend response
// ============================================================

// --- TaiKhoan (bảng TaiKhoan) ---
export type TaiKhoan = {
  MaTaiKhoan: number;
  TenDangNhap: string;
  HoTen?: string;
  Email?: string;
  SoDienThoai?: string;
  VaiTro: "Admin" | "NhanVien" | "KhachHang";
  TrangThai: string;
};

// --- KhachHang (bảng KhachHang) ---
export type KhachHang = {
  MaKhachHang: number;
  MaTaiKhoan: number;
  HoTen: string;
  SoDienThoai?: string;
  Email?: string;
  DiaChi?: string;
  TrangThai: number; // bit: 1 = hoạt động
};

// --- Auth Forms ---
export type FormDangNhap = {
  TenDangNhap: string;
  MatKhau: string;
};

export type FormDangKy = {
  TenDangNhap: string;
  MatKhau: string;
  HoTen: string;
  Email: string;
  SoDienThoai: string;
  VaiTro?: string;
};

// --- Auth Response từ /api/auth/login ---
export type AuthResponse = {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: TaiKhoan;
    khachHang: KhachHang | null;
  };
};

// --- DanhMuc (bảng DanhMuc) ---
export type DanhMuc = {
  MaDanhMuc: number;
  TenDanhMuc: string;
  MoTa?: string;
  HinhAnh?: string;
  TrangThai: number; // bit
};

// --- SanPham (bảng SanPham) ---
export type SanPham = {
  MaSanPham: number;
  TenSanPham: string;
  MaDanhMuc: number;
  TenDanhMuc?: string;
  ThuongHieu?: string;
  GiaNhap: number;
  GiaBan: number;
  SoLuong: number;
  MoTa?: string;
  HinhAnh?: string;
  TrangThai: number; // bit
  NgayTao?: string;
  isNew?: boolean;
  newUntil?: string | null;
  DiemTrungBinh?: number;
  SoDanhGia?: number;
};

// --- Pagination ---
export type PhanTrang = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type DanhSachResponse<T> = {
  success: boolean;
  data: T[];
  pagination: PhanTrang;
};

// --- GioHang ---
export type ItemGioHang = {
  MaGioHang: number;
  MaSanPham: number;
  SoLuong: number;
  TenSanPham: string;
  GiaBan: number;
  HinhAnh?: string;
  ThuongHieu?: string;
};

export type GioHang = {
  MaGioHang: number;
  MaKhachHang?: number;
  items: ItemGioHang[];
};

// --- HoaDon (bảng HoaDon) ---
export type TrangThaiHoaDon =
  | "Chờ xác nhận"
  | "Đang chuẩn bị"
  | "Đang giao"
  | "Đã giao"
  | "Đã hủy";

export type ChiTietHoaDon = {
  MaHoaDon: number;
  MaSanPham: number;
  TenSanPham: string;
  HinhAnh?: string;
  SoLuong: number;
  DonGia: number;
  ThanhTien: number;
};

export type HoaDon = {
  MaHoaDon: number;
  MaKhachHang: number;
  MaNhanVien?: number;
  HoTen?: string;
  SoDienThoai?: string;
  NgayLap: string;
  PhuongThucThanhToan: "COD" | "Banking";
  TrangThai: TrangThaiHoaDon;
  GhiChu?: string;
  ChiTiet?: ChiTietHoaDon[];
};

export type TaoHoaDonInput = {
  MaKhachHang: number;
  PhuongThucThanhToan?: "COD" | "Banking";
  GhiChu?: string;
  danhSachSanPham: {
    MaSanPham: number;
    SoLuong: number;
    DonGia: number;
  }[];
};

// --- API Response chuẩn ---
export type ApiResponse<T = void> = {
  success: boolean;
  message?: string;
  data?: T;
};
