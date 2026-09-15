import { api } from "./api";
import { DonHang, TrangThaiDonHang } from "@/kieu_du_lieu/DonHang";

type TaoDonHangInput = Omit<
  DonHang,
  "id" | "maDonHang" | "ngayDat" | "trangThai"
>;

export const donHangService = {
  layDanhSach: (token: string, trangThai?: TrangThaiDonHang) => {
    const query = trangThai ? `?trangThai=${trangThai}` : "";
    return api.get<DonHang[]>(`/don-hang${query}`, token);
  },

  layChiTiet: (id: string, token: string) =>
    api.get<DonHang>(`/don-hang/${id}`, token),

  taoDonHang: (data: TaoDonHangInput, token: string) =>
    api.post<DonHang>("/don-hang", data, token),

  huyDonHang: (id: string, token: string) =>
    api.patch<DonHang>(`/don-hang/${id}/huy`, {}, token),

  yeuCauHoanTra: (id: string, lyDo: string, token: string) =>
    api.post<void>(`/don-hang/${id}/hoan-tra`, { lyDo }, token),
};
