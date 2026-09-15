import { api } from "./api";
import { KhachHang } from "@/kieu_du_lieu/KhachHang";

export const khachHangService = {
  layThongTin: (token: string) =>
    api.get<KhachHang>("/khach-hang/profile", token),

  capNhatThongTin: (data: Partial<KhachHang>, token: string) =>
    api.put<KhachHang>("/khach-hang/profile", data, token),

  doiMatKhau: (
    data: { matKhauCu: string; matKhauMoi: string },
    token: string,
  ) => api.post<void>("/khach-hang/doi-mat-khau", data, token),
};
