import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../dung_chung/ts/api";
import { useAuth } from "../../dieu_huong/AuthContext";
import { AuthResponse, FormDangNhap } from "../../kieu_du_lieu";

export function useDangNhap() {
  const router = useRouter();
  const { dangNhap } = useAuth();

  const [form, setForm] = useState<FormDangNhap>({
    TenDangNhap: "",
    MatKhau: "",
  });
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const [ghiNho, setGhiNho] = useState(false);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState<Partial<FormDangNhap>>({});

  function capNhat(field: keyof FormDangNhap, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (loi[field]) setLoi((l) => ({ ...l, [field]: undefined }));
  }

  function kiemTra(): boolean {
    const loiMoi: Partial<FormDangNhap> = {};
    if (!form.TenDangNhap.trim())
      loiMoi.TenDangNhap = "Vui lòng nhập tên đăng nhập";
    if (!form.MatKhau) loiMoi.MatKhau = "Vui lòng nhập mật khẩu";
    else if (form.MatKhau.length < 6)
      loiMoi.MatKhau = "Mật khẩu phải có ít nhất 6 ký tự";
    setLoi(loiMoi);
    return Object.keys(loiMoi).length === 0;
  }

  async function xuLy() {
    if (!kiemTra()) return;
    setDangXuLy(true);
    try {
      const res = await api.post<AuthResponse>("/auth/login", {
        TenDangNhap: form.TenDangNhap.trim(),
        MatKhau: form.MatKhau,
      });
      if (res.success && res.data) {
        await dangNhap(res.data.token, res.data.user, res.data.khachHang);
        router.replace("/man_hinh/trang_chu");
      } else {
        Alert.alert("Lỗi đăng nhập", res.message || "Đăng nhập thất bại");
      }
    } catch (e: any) {
      Alert.alert("Lỗi kết nối", e.message || "Không thể kết nối server");
    } finally {
      setDangXuLy(false);
    }
  }

  return {
    form,
    capNhat,
    hienMatKhau,
    setHienMatKhau,
    ghiNho,
    setGhiNho,
    dangXuLy,
    loi,
    xuLy,
    diDangKy: () => router.push("/man_hinh/dang_ky"),
  };
}
