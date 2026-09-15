export type SanPham = {
  id: string;
  tenSanPham: string;
  moTa?: string;
  gia: number;
  giaGoc?: number;
  giamGia?: number;
  hinhAnh?: string;
  danhMuc?: string;
  thuongHieu?: string;
  soLuongTon?: number;
  danhGia?: number;
  soLuongDanhGia?: number;
  tags?: string[];
};
