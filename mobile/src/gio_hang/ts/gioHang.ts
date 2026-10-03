import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { api } from "../../dung_chung/ts/api";
import { GioHang, ItemGioHang } from "../../kieu_du_lieu";

export function useGioHang(maKhachHang: number, token: string) {
  const [gioHang, setGioHang] = useState<GioHang | null>(null);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const tai = useCallback(async () => {
    if (!maKhachHang) return;
    setDangTai(true);
    setLoi(null);
    try {
      const res = await api.get<{ success: boolean; data: GioHang }>(
        `/giohang/${maKhachHang}`,
        token,
      );
      if (res.success) setGioHang(res.data);
    } catch (e: any) {
      setLoi(e.message);
    } finally {
      setDangTai(false);
    }
  }, [maKhachHang, token]);

  async function themSanPham(maSanPham: number, soLuong = 1) {
    try {
      await api.post(
        `/giohang/${maKhachHang}/them`,
        { MaSanPham: maSanPham, SoLuong: soLuong },
        token,
      );
      await tai();
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    }
  }

  async function capNhatSoLuong(maSanPham: number, soLuong: number) {
    try {
      await api.put(
        `/giohang/${maKhachHang}/capnhat`,
        { MaSanPham: maSanPham, SoLuong: soLuong },
        token,
      );
      await tai();
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    }
  }

  async function xoaSanPham(maSanPham: number) {
    try {
      await api.delete(`/giohang/${maKhachHang}/xoa/${maSanPham}`, token);
      await tai();
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    }
  }

  const tongTien = (gioHang?.items ?? []).reduce(
    (sum, item) => sum + item.GiaBan * item.SoLuong,
    0,
  );

  const tongSoLuong = (gioHang?.items ?? []).reduce(
    (sum, item) => sum + item.SoLuong,
    0,
  );

  return {
    gioHang,
    dangTai,
    loi,
    tai,
    themSanPham,
    capNhatSoLuong,
    xoaSanPham,
    tongTien,
    tongSoLuong,
  };
}
