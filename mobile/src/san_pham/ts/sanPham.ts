import { useState, useCallback } from "react";
import { api } from "../../dung_chung/ts/api";
import { SanPham, DanhSachResponse, ApiResponse } from "../../kieu_du_lieu";

export function useDanhSachSanPham(token: string) {
  const [danhSach, setDanhSach] = useState<SanPham[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [trang, setTrang] = useState(1);
  const [conTrang, setConTrang] = useState(true);
  const [timKiem, setTimKiem] = useState("");
  const [maDanhMuc, setMaDanhMuc] = useState<number | undefined>();

  const tai = useCallback(
    async (reset = false) => {
      if (dangTai) return;
      setDangTai(true);
      setLoi(null);
      try {
        const trangHienTai = reset ? 1 : trang;
        const q = new URLSearchParams({
          page: String(trangHienTai),
          limit: "20",
        });
        if (timKiem) q.append("search", timKiem);
        if (maDanhMuc) q.append("maDanhMuc", String(maDanhMuc));

        const res = await api.get<DanhSachResponse<SanPham>>(
          `/sanpham?${q.toString()}`,
          token,
        );
        if (res.success) {
          setDanhSach(reset ? res.data : (prev) => [...prev, ...res.data]);
          setConTrang(trangHienTai < res.pagination.totalPages);
          setTrang(trangHienTai + 1);
        }
      } catch (e: any) {
        setLoi(e.message);
      } finally {
        setDangTai(false);
      }
    },
    [dangTai, trang, timKiem, maDanhMuc, token],
  );

  function timKiemMoi(tu_khoa: string) {
    setTimKiem(tu_khoa);
    setTrang(1);
    setConTrang(true);
    setDanhSach([]);
  }

  function locTheoDanhMuc(ma?: number) {
    setMaDanhMuc(ma);
    setTrang(1);
    setConTrang(true);
    setDanhSach([]);
  }

  return {
    danhSach,
    dangTai,
    loi,
    conTrang,
    tai,
    timKiem,
    timKiemMoi,
    locTheoDanhMuc,
    maDanhMuc,
  };
}

export function useChiTietSanPham(maSanPham: number, token: string) {
  const [sanPham, setSanPham] = useState<SanPham | null>(null);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi(null);
    try {
      const res = await api.get<ApiResponse<SanPham>>(
        `/sanpham/${maSanPham}`,
        token,
      );
      if (res.success && res.data) setSanPham(res.data);
    } catch (e: any) {
      setLoi(e.message);
    } finally {
      setDangTai(false);
    }
  }, [maSanPham, token]);

  return { sanPham, dangTai, loi, tai };
}
