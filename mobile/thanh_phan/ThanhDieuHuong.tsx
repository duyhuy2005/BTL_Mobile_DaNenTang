import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, router } from "expo-router";

type Tab = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  route: string;
};

const TABS: Tab[] = [
  {
    label: "Trang chủ",
    icon: "home-outline",
    iconActive: "home",
    route: "/man_hinh/trang_chu",
  },
  {
    label: "Sản phẩm",
    icon: "grid-outline",
    iconActive: "grid",
    route: "/man_hinh/san_pham",
  },
  {
    label: "Giỏ hàng",
    icon: "cart-outline",
    iconActive: "cart",
    route: "/man_hinh/gio_hang",
  },
  {
    label: "Yêu thích",
    icon: "heart-outline",
    iconActive: "heart",
    route: "/man_hinh/yeu_thich",
  },
  {
    label: "Cá nhân",
    icon: "person-outline",
    iconActive: "person",
    route: "/man_hinh/ca_nhan",
  },
];

export default function ThanhDieuHuong() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.route);
        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={22}
                color={active ? "#7c3aed" : "#aaa"}
              />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingBottom: 6,
    paddingTop: 8,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tab: { flex: 1, alignItems: "center" },
  iconWrap: {
    width: 40,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  iconWrapActive: { backgroundColor: "#f3f0ff" },
  label: { fontSize: 10, color: "#aaa", marginTop: 2 },
  labelActive: { color: "#7c3aed", fontWeight: "700" },
});
