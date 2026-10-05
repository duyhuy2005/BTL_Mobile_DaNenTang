import { useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { validateLogin, type LoginErrors } from "@/src/auth/authValidation";
import { dangNhapService } from "@/dich_vu/dangNhap";
import { useAuth } from "@/nguon/AuthContext";

export function useDangNhapLogic() {
  const router = useRouter(); const params = useLocalSearchParams<{ next?: string }>(); const { dangNhap } = useAuth(); const [identifier, setIdentifier] = useState(""); const [password, setPassword] = useState(""); const [showPassword, setShowPassword] = useState(false); const [isSubmitting, setIsSubmitting] = useState(false); const [errors, setErrors] = useState<LoginErrors>({});
  const updateIdentifier = (value: string) => { setIdentifier(value); if (errors.identifier) setErrors((current) => ({ ...current, identifier: undefined })); };
  const updatePassword = (value: string) => { setPassword(value); if (errors.password) setErrors((current) => ({ ...current, password: undefined })); };
  async function submit() { if (isSubmitting) return; const nextErrors = validateLogin(identifier, password); setErrors(nextErrors); if (Object.keys(nextErrors).length) return; setIsSubmitting(true); try { const response = await dangNhapService.dangNhap({ TenDangNhap: identifier.trim(), MatKhau: password }); if (!response.success || !response.data) { Alert.alert("Đăng nhập chưa thành công", response.message || "Vui lòng thử lại."); return; } if (response.data.user.VaiTro !== "KhachHang" || !response.data.khachHang) { Alert.alert("Không thể đăng nhập", "Ứng dụng này chỉ dành cho tài khoản Khách hàng có hồ sơ liên kết."); return; } await dangNhap(response.data.token, response.data.user, response.data.khachHang); const authPaths = ["/man_hinh/dang_nhap", "/man_hinh/dang_ky", "/man_hinh/quen_mat_khau", "/man_hinh/xac_thuc_otp", "/man_hinh/dat_lai_mat_khau", "/man_hinh/doi_mat_khau_thanh_cong"]; const next = typeof params.next === "string" && params.next.startsWith("/man_hinh/") && !authPaths.some((path) => params.next!.startsWith(path)) ? params.next as any : "/man_hinh/trang_chu"; router.replace(next); } catch (error: unknown) { Alert.alert("Đăng nhập chưa thành công", error instanceof Error ? error.message : "Không thể kết nối đến máy chủ"); } finally { setIsSubmitting(false); } }
  return { identifier, password, showPassword, isSubmitting, errors, updateIdentifier, updatePassword, setShowPassword, submit, goToRegister: () => router.push("/man_hinh/dang_ky"), goToForgotPassword: () => router.push("/man_hinh/quen_mat_khau") };
}
