export type KhachHang = {
  id: string;
  hoTen: string;
  email: string;
  soDienThoai?: string;
  diaChi?: string;
  avatar?: string;
  ngayTao?: string;
  role: "admin" | "khach_hang";
};

export type ThongTinDangNhap = {
  email: string;
  matKhau: string;
};

export type ThongTinDangKy = {
  hoTen: string;
  email: string;
  matKhau: string;
  xacNhanMatKhau: string;
};
