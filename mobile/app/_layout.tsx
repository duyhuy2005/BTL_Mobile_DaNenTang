import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="man_hinh/dang_nhap/index" />
        <Stack.Screen name="man_hinh/dang_ky/index" />
        <Stack.Screen name="man_hinh/trang_chu/index" />
        <Stack.Screen name="man_hinh/san_pham/index" />
        <Stack.Screen name="man_hinh/gio_hang/index" />
        <Stack.Screen name="man_hinh/dat_hang/index" />
        <Stack.Screen name="man_hinh/don_hang/index" />
        <Stack.Screen name="man_hinh/yeu_thich/index" />
        <Stack.Screen name="man_hinh/hoan_tra/index" />
        <Stack.Screen name="man_hinh/danh_gia/index" />
        <Stack.Screen name="man_hinh/ca_nhan/index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
