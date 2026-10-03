// Khớp với database backend
export type SanPham = {
  MaSanPham: number;
  MaSKU?: string | null;
  TenSanPham: string;
  MaDanhMuc: number;
  TenDanhMuc?: string;
  ThuongHieu?: string;
  GiaNhap: number;
  GiaBan: number;
  GiaKhuyenMai?: number;
  GiaGoc?: number;
  GiaKhuyenMaiHienTai?: number;
  PhanTramGiam?: number;
  DangKhuyenMai?: boolean;
  MaChuongTrinhKhuyenMai?: number | null;
  MaKhuyenMai?: string | null;
  TenKhuyenMai?: string | null;
  LoaiKhuyenMai?: string | null;
  ThoiGianKetThucKhuyenMai?: string | null;
  SoLuong: number;
  MoTa?: string;
  ThanhPhan?: string;
  CongDung?: string;
  HuongDanSuDung?: string;
  HinhAnh?: string;
  TrangThai: string;
  NgayTao?: string;
  XuatXu?: string;
  DoiTuongSuDung?: string;
  LoaiDaPhuHop?: string;
  CanhBaoKichUng?: string;
  DungTich?: number | null;
  DonVi?: string | null;
  QuyCachDongGoi?: string | null;
  HinhAnhChiTiet?: Array<{ MaHinhAnh: number; DuongDan: string; LaAnhDaiDien: boolean; ThuTu: number }>;
  TonThucTe?: number;
  DaGiu?: number;
  CoTheBan?: number;
  SoLuongDaBan?: number;
  isNew?: boolean;
  newUntil?: string | null;
  DiemTrungBinh?: number;
  SoDanhGia?: number;
  BienThe?: BienTheSanPham[];
};

export type BienTheSanPham = {
  MaBienThe: number;
  MaSanPham?: number;
  MaSKU: string;
  DungTich?: number | null;
  DonViDungTich?: string | null;
  KhoiLuong?: number | null;
  DonViKhoiLuong?: string | null;
  MaMau?: string | null;
  TenMau?: string | null;
  MaHEX?: string | null;
  MuiHuong?: string | null;
  QuyCachDongGoi?: string | null;
  GiaBan: number;
  HinhAnh?: string | null;
  TrangThai: boolean | number;
  CoTheBan?: number;
  TonThucTe?: number;
  DaGiu?: number;
  DuocBan?: boolean | number;
};

export type DanhMuc = {
  MaDanhMuc: number;
  TenDanhMuc: string;
  MaDanhMucCha?: number | null;
  MaDanhMucCode?: string | null;
  TenDanhMucCha?: string | null;
  ThuTuHienThi?: number;
  SoSanPham?: number;
  HinhAnh?: string | null;
  MoTa?: string | null;
  TrangThai?: number | boolean;
};

export type PhanTrang = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type DanhSachSanPhamResponse = {
  success: boolean;
  data: SanPham[];
  pagination: PhanTrang;
};
