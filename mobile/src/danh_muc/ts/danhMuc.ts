import { useState, useCallback } from "react";
import { api } from "../../dung_chung/ts/api";
import { DanhMuc, ApiResponse } from "../../kieu_du_lieu";

export function useDanhMuc(token: string) {
  const [danhSach, setDanhSach] = useState<DanhMuc[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi(null);
    try {
      const res = await api.get<{ success: boolean; data: DanhMuc[] }>(
        "/danhmuc",
        token,
      );
      if (res.success) setDanhSach(res.data);
    } catch (e: any) {
      setLoi(e.message);
    } finally {
      setDangTai(false);
    }
  }, [token]);

  return { danhSach, dangTai, loi, tai };
}
