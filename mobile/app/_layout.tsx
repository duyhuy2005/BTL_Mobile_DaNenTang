import { Stack, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import "react-native-reanimated";
import { AuthProvider, useAuth } from "@/nguon/AuthContext";
import { CartProvider } from "@/nguon/CartContext";

const publicRoutes = ["/man_hinh/splash", "/man_hinh/dang_nhap", "/man_hinh/dang_ky", "/man_hinh/quen_mat_khau", "/man_hinh/xac_thuc_otp", "/man_hinh/dat_lai_mat_khau", "/man_hinh/doi_mat_khau_thanh_cong", "/man_hinh/ca_nhan", "/man_hinh/trang_chu", "/man_hinh/danh_muc", "/man_hinh/san_pham", "/man_hinh/yeu_thich"];
const authRoutes = ["/man_hinh/dang_nhap", "/man_hinh/dang_ky", "/man_hinh/quen_mat_khau", "/man_hinh/xac_thuc_otp", "/man_hinh/dat_lai_mat_khau", "/man_hinh/doi_mat_khau_thanh_cong"];

function RouteGuard() {
  const { token, user, authStatus, authError, khoiPhucPhien } = useAuth();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ next?: string }>();
  const router = useRouter();
  useEffect(() => {
    if (authStatus === "restoring" || authStatus === "error" || !pathname) return;
    const isPublic = pathname === "/" || publicRoutes.some(route => pathname.startsWith(route));
    if (authStatus === "authenticated" && (!token || user?.VaiTro !== "KhachHang")) return;
    if (!token && !isPublic) router.replace({ pathname: "/man_hinh/dang_nhap", params: { next: pathname } });
    else if (token && authRoutes.some(route => pathname.startsWith(route))) {
      const next = typeof params.next === "string" && params.next.startsWith("/man_hinh/") && !authRoutes.some(route => params.next!.startsWith(route)) ? params.next as any : "/man_hinh/trang_chu";
      router.replace(next);
    }
  }, [authStatus, token, user?.VaiTro, pathname, params.next, router]);
  const privateRoute = pathname && pathname !== "/" && !publicRoutes.some(route => pathname.startsWith(route));
  if (authStatus === "restoring" && privateRoute) return <View style={{ position:"absolute",left:0,right:0,top:0,bottom:0,backgroundColor:"#F6FAF7",alignItems:"center",justifyContent:"center",gap:12 }}><ActivityIndicator color="#176A50"/><Text style={{color:"#53645C"}}>Đang xác minh phiên đăng nhập…</Text></View>;
  if (authStatus === "error" && privateRoute) return <View style={{ position:"absolute",left:0,right:0,top:0,bottom:0,backgroundColor:"#F6FAF7",alignItems:"center",justifyContent:"center",padding:28,gap:14 }}><Text style={{fontSize:18,fontWeight:"700",color:"#173E32"}}>Chưa thể xác minh tài khoản</Text><Text style={{textAlign:"center",color:"#53645C"}}>{authError || "Kiểm tra kết nối rồi thử lại."}</Text><TouchableOpacity onPress={() => void khoiPhucPhien()} style={{backgroundColor:"#176A50",paddingVertical:13,paddingHorizontal:28,borderRadius:12}}><Text style={{color:"white",fontWeight:"700"}}>Thử lại</Text></TouchableOpacity></View>;
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider><AuthProvider><CartProvider>
      <RouteGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="man_hinh/dang_nhap/index" />
        <Stack.Screen name="man_hinh/dang_ky/index" />
        <Stack.Screen name="man_hinh/quen_mat_khau/index" />
        <Stack.Screen name="man_hinh/xac_thuc_otp/index" />
        <Stack.Screen name="man_hinh/dat_lai_mat_khau/index" />
        <Stack.Screen name="man_hinh/doi_mat_khau_thanh_cong/index" />
        <Stack.Screen name="man_hinh/trang_chu/index" />
        <Stack.Screen name="man_hinh/danh_muc/index" />
        <Stack.Screen name="man_hinh/san_pham/index" />
        <Stack.Screen name="man_hinh/san_pham/[id]" />
        <Stack.Screen name="man_hinh/gio_hang/index" />
        <Stack.Screen name="man_hinh/dat_hang/index" />
        <Stack.Screen name="man_hinh/dat_hang_thanh_cong/index" />
        <Stack.Screen name="man_hinh/voucher/index" />
        <Stack.Screen name="man_hinh/don_hang/index" />
        <Stack.Screen name="man_hinh/chi_tiet_don_hang/index" />
        <Stack.Screen name="man_hinh/theo_doi_van_chuyen/index" />
        <Stack.Screen name="man_hinh/yeu_thich/index" />
        <Stack.Screen name="man_hinh/hoan_tra/index" />
        <Stack.Screen name="man_hinh/hoan_tra/tao" />
        <Stack.Screen name="man_hinh/hoan_tra/chi_tiet/[id]" />
        <Stack.Screen name="man_hinh/danh_gia/index" />
        <Stack.Screen name="man_hinh/danh_gia/viet" />
        <Stack.Screen name="man_hinh/thong_bao_ho_tro/index" />
        <Stack.Screen name="man_hinh/ca_nhan/index" />
        <Stack.Screen name="man_hinh/ho_so_ca_nhan/index" />
        <Stack.Screen name="man_hinh/dia_chi/index" />
        <Stack.Screen name="man_hinh/splash/index" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="dark" />
    </CartProvider></AuthProvider></SafeAreaProvider>
  );
}
