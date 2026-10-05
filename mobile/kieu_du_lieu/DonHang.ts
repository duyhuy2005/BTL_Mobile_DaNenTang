// Mã trạng thái được backend lưu trong HoaDon.TrangThai.
export type TrangThaiDonHang =
  | "CHO_XAC_NHAN" | "DA_XAC_NHAN" | "DANG_CHUAN_BI" | "DA_DONG_GOI"
  | "DANG_GIAO" | "DA_GIAO" | "HOAN_THANH" | "DA_HUY" | "GIAO_THAT_BAI";

export type ChiTietHoaDon = {
  MaChiTiet: number;
  MaHoaDon: number;
  MaSanPham: number;
  TenSanPham: string;
  SoLuong: number;
  DonGia: number;
  ThanhTien: number;
  HinhAnh?: string;
  GiaGocLucMua?: number;
  TienGiamKhuyenMai?: number;
  GiaSauKhuyenMai?: number;
  TienVoucherPhanBo?: number;
  GiaThucTra?: number;
  TenChuongTrinhSnapshot?: string;
};

export type SanPhamTomTatDon = { MaSanPham: number; TenSanPham: string; HinhAnh?: string | null; SoLuong: number };
export type UuDaiDonHang = { LoaiApDung: string; MaCode: string; TenChuongTrinh: string; SoTienGiam: number };

export type HoaDon = {
  MaHoaDon: number;
  MaKhachHang: number;
  HoTen?: string;
  NgayLap: string;
  TrangThai: TrangThaiDonHang;
  TongTien: number;
  TamTinh?: number;
  GiamGia?: number;
  GiamGiaSanPham?: number;
  GiamGiaVoucher?: number;
  PhiVanChuyen?: number;
  DiaChiGiaoHang?: string;
  SoDienThoaiNhan?: string;
  SoDienThoai?: string;
  TrangThaiThanhToan?: string;
  MaVanDon?: string | null;
  TrangThaiVanChuyen?: string;
  SoDongSanPham?: number;
  TongSoLuong?: number;
  SanPhamTomTat?: SanPhamTomTatDon[];
  UuDai?: UuDaiDonHang[];
  LichSuTrangThai?: { MaLichSu: number; TrangThaiCu?: string; TrangThaiMoi: string; GhiChu?: string; NgayThayDoi: string; NguoiThayDoi?: string }[];
  PhuongThucThanhToan: "COD" | "Banking";
  GhiChu?: string;
  ChiTiet?: ChiTietHoaDon[];
};
