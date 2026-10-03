import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../dung_chung/ts/api";
import { FormDangKy, ApiResponse } from "../../kieu_du_lieu";

type LoiForm = Partial<FormDangKy & { xacNhanMatKhau: string }>;

export function useDangKy() {
  const router = useRouter();

  const [form, setForm] = useState({
    TenDangNhap: "",
    MatKhau: "",
    xacNhanMatKhau: "",
    HoTen: "",
    Email: "",
    SoDienThoai: "",
  });
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const [hienXacNhan, setHienXacNhan] = useState(false);
  const [dongY, setDongY] = useState(false);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState<LoiForm>({});

  function capNhat(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if ((loi as any)[field]) setLoi((l) => ({ ...l, [field]: undefined }));
  }

  function kiemTra(): boolean {
    const loiMoi: LoiForm = {};
    if (!form.HoTen.trim()) loiMoi.HoTen = "Vui lòng nhập họ và tên";
    const phone = /^(03|05|07|08|09)[0-9]{8}$/;
    if (!form.SoDienThoai) loiMoi.SoDienThoai = "Vui lòng nhập số điện thoại";
    else if (!phone.test(form.SoDienThoai))
      loiMoi.SoDienThoai = "Số điện thoại không hợp lệ";
    if (!form.Email) loiMoi.Email = "Vui lòng nhập email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.Email))
      loiMoi.Email = "Email không hợp lệ";
    if (!form.TenDangNhap.trim())
      loiMoi.TenDangNhap = "Vui lòng nhập tên đăng nhập";
    else if (form.TenDangNhap.trim().length < 4)
      loiMoi.TenDangNhap = "Tối thiểu 4 ký tự";
    if (!form.MatKhau) loiMoi.MatKhau = "Vui lòng nhập mật khẩu";
    else if (form.MatKhau.length < 6) loiMoi.MatKhau = "Tối thiểu 6 ký tự";
    if (!form.xacNhanMatKhau)
      loiMoi.xacNhanMatKhau = "Vui lòng xác nhận mật khẩu";
    else if (form.MatKhau !== form.xacNhanMatKhau)
      loiMoi.xacNhanMatKhau = "Mật khẩu không khớp";
    setLoi(loiMoi);
    return Object.keys(loiMoi).length === 0;
  }

  async function xuLy() {
    if (!kiemTra()) return;
    if (!dongY) {
      Alert.alert("Thông báo", "Vui lòng đồng ý điều khoản sử dụng");
      return;
    }

    setDangXuLy(true);
    try {
      // Backend tự tạo KhachHang khi có HoTen
      const res = await api.post<ApiResponse<{ MaTaiKhoan: number }>>(
        "/auth/register",
        {
          TenDangNhap: form.TenDangNhap.trim(),
          MatKhau: form.MatKhau,
          HoTen: form.HoTen.trim(),
          Email: form.Email,
          SoDienThoai: form.SoDienThoai,
          VaiTro: "KhachHang",
        },
      );

      if (res.success) {
        Alert.alert("Thành công 🎉", "Tài khoản đã được tạo!", [
          {
            text: "Đăng nhập ngay",
            onPress: () => router.replace("/man_hinh/dang_nhap"),
          },
        ]);
      } else {
        Alert.alert("Lỗi", res.message || "Đăng ký thất bại");
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
    hienXacNhan,
    setHienXacNhan,
    dongY,
    setDongY,
    dangXuLy,
    loi,
    xuLy,
    diDangNhap: () => router.back(),
  };
}
