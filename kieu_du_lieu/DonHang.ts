import { SanPham } from "./SanPham";

export type TrangThaiDonHang =
  | "cho_xac_nhan"
  | "dang_chuan_bi"
  | "dang_giao"
  | "da_giao"
  | "da_huy";

export type ChiTietDonHang = {
  sanPham: SanPham;
  soLuong: number;
  giaBan: number;
};

export type DonHang = {
  id: string;
  maDonHang: string;
  ngayDat: string;
  trangThai: TrangThaiDonHang;
  danhSachSanPham: ChiTietDonHang[];
  tongTien: number;
  phiVanChuyen: number;
  diaChi: string;
  tenNguoiNhan: string;
  soDienThoai: string;
  phuongThucThanhToan: "cod" | "banking";
  ghiChu?: string;
};
