import { api } from "./api";

export const yeuThichService = {
  layDanhSach: (token: string) => api.get<{ success: boolean; data: any[]; total: number }>("/yeuthich/me", token),
  them: (MaSanPham: number, token: string) => api.post<{ success: boolean; message: string }>("/yeuthich", { MaSanPham }, token),
  xoa: (MaSanPham: number, token: string) => api.delete<{ success: boolean; message: string }>(`/yeuthich/${MaSanPham}`, token),
};
