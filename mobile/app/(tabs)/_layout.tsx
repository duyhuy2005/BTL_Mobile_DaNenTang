import { Redirect } from "expo-router";

// (tabs) không dùng nữa — redirect về trang chủ
export default function TabLayout() {
  return <Redirect href="/man_hinh/dang_nhap" />;
}
