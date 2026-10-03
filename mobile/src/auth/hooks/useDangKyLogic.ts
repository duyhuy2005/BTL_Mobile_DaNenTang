import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { validateRegistration, type RegisterErrors } from "@/src/auth/authValidation";
import { dangNhapService } from "@/dich_vu/dangNhap";

export function useDangKyLogic() {
  const router = useRouter(); const [fullName, setFullName] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [showPassword, setShowPassword] = useState(false); const [showConfirmPassword, setShowConfirmPassword] = useState(false); const [acceptedTerms, setAcceptedTerms] = useState(false); const [isSubmitting, setIsSubmitting] = useState(false); const [errors, setErrors] = useState<RegisterErrors>({});
  const setters = { fullName: setFullName, phone: setPhone, email: setEmail, password: setPassword, confirmPassword: setConfirmPassword };
  function update(field: keyof typeof setters, value: string) { setters[field](value); if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined })); }
  function toggleTerms() { setAcceptedTerms((value) => !value); if (errors.terms) setErrors((current) => ({ ...current, terms: undefined })); }
  async function submit() { if (isSubmitting) return; const nextErrors = validateRegistration({ fullName, phone, email, password, confirmPassword, acceptedTerms }); setErrors(nextErrors); if (Object.keys(nextErrors).length) return; setIsSubmitting(true); try { const identifier = email.trim().toLowerCase() || phone.replace(/\s/g, ""); const response = await dangNhapService.dangKyDayDu({ TenDangNhap: identifier, MatKhau: password, HoTen: fullName.trim(), SoDienThoai: phone.trim() ? phone.replace(/\s/g, "") : undefined, Email: email.trim() ? email.trim().toLowerCase() : undefined, VaiTro: "KhachHang" }); if (!response.success) { Alert.alert("Đăng ký chưa thành công", response.message || "Vui lòng thử lại."); return; } Alert.alert("Đăng ký thành công", "Tài khoản khách hàng đã được kích hoạt. Bạn có thể đăng nhập bằng email hoặc số điện thoại đã đăng ký.", [{ text: "Đăng nhập ngay", onPress: () => router.replace("/man_hinh/dang_nhap") }]); } catch (error: unknown) { Alert.alert("Đăng ký chưa thành công", error instanceof Error ? error.message : "Không thể kết nối đến máy chủ"); } finally { setIsSubmitting(false); } }
  return { fullName, phone, email, password, confirmPassword, showPassword, showConfirmPassword, acceptedTerms, isSubmitting, errors, update, setShowPassword, setShowConfirmPassword, toggleTerms, submit, goToLogin: () => router.replace("/man_hinh/dang_nhap") };
}
