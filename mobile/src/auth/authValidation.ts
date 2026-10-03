export type LoginErrors = {
  identifier?: string;
  password?: string;
};

export type RegisterErrors = {
  fullName?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

export type ForgotPasswordErrors = { identifier?: string };
export type ResetPasswordErrors = { password?: string; confirmPassword?: string };

const phonePattern = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailOrPhone(identifier: string): ForgotPasswordErrors {
  const value = identifier.trim().replace(/\s/g, "");
  if (!value) return { identifier: "Vui lòng nhập email hoặc số điện thoại" };
  if (value.includes("@") && !emailPattern.test(value)) return { identifier: "Email không hợp lệ" };
  if (!value.includes("@") && !phonePattern.test(value)) return { identifier: "Số điện thoại không hợp lệ" };
  return {};
}

export function validateNewPassword(password: string, confirmPassword: string): ResetPasswordErrors {
  const errors: ResetPasswordErrors = {};
  if (!password) errors.password = "Vui lòng nhập mật khẩu mới";
  else if (password.length < 8) errors.password = "Mật khẩu phải có ít nhất 8 ký tự";
  if (!confirmPassword) errors.confirmPassword = "Vui lòng xác nhận mật khẩu mới";
  else if (password !== confirmPassword) errors.confirmPassword = "Mật khẩu xác nhận không khớp";
  return errors;
}

export function maskIdentifier(identifier: string): string {
  const value = identifier.trim();
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, Math.min(3, name.length))}***@${domain}`;
  }
  return `******${value.slice(-4)}`;
}

export function validateLogin(identifier: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  if (!identifier.trim()) errors.identifier = "Vui lòng nhập email hoặc số điện thoại";
  if (!password) errors.password = "Vui lòng nhập mật khẩu";
  return errors;
}

export function validateRegistration(values: {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}): RegisterErrors {
  const errors: RegisterErrors = {};
  if (!values.fullName.trim()) errors.fullName = "Vui lòng nhập họ và tên";
  if (values.phone.trim() && !phonePattern.test(values.phone.replace(/\s/g, ""))) {
    errors.phone = "Số điện thoại không hợp lệ";
  }
  if (values.email.trim() && !emailPattern.test(values.email.trim())) errors.email = "Email không hợp lệ";
  if (!values.email.trim() && !values.phone.trim()) errors.email = "Nhập email hoặc số điện thoại để đăng nhập";
  if (!values.password) errors.password = "Vui lòng nhập mật khẩu";
  else if (values.password.length < 8) errors.password = "Mật khẩu phải có ít nhất 8 ký tự";
  if (!values.confirmPassword) errors.confirmPassword = "Vui lòng xác nhận mật khẩu";
  else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Mật khẩu xác nhận không khớp";
  }
  if (!values.acceptedTerms) errors.terms = "Vui lòng đồng ý với điều khoản sử dụng";
  return errors;
}
