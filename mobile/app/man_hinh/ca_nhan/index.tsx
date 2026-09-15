import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const MENU = [
  {
    icon: "person-outline",
    label: "Thông tin cá nhân",
    route: "/man_hinh/ca_nhan",
  },
  {
    icon: "bag-handle-outline",
    label: "Đơn hàng của tôi",
    route: "/man_hinh/don_hang",
  },
  {
    icon: "heart-outline",
    label: "Sản phẩm yêu thích",
    route: "/man_hinh/yeu_thich",
  },
  {
    icon: "refresh-outline",
    label: "Yêu cầu hoàn trả",
    route: "/man_hinh/hoan_tra",
  },
  {
    icon: "star-outline",
    label: "Đánh giá của tôi",
    route: "/man_hinh/danh_gia",
  },
  {
    icon: "notifications-outline",
    label: "Thông báo",
    route: "/man_hinh/ca_nhan",
  },
  { icon: "settings-outline", label: "Cài đặt", route: "/man_hinh/ca_nhan" },
];

export default function CaNhanScreen() {
  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: () => router.replace("/man_hinh/dang_nhap"),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Tài khoản</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Avatar */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#e91e8c" />
          </View>
          <Text style={styles.name}>Nguyễn Thị An</Text>
          <Text style={styles.email}>admin@gmail.com</Text>
          <TouchableOpacity style={styles.btnEdit}>
            <Text style={styles.btnEditText}>Chỉnh sửa hồ sơ</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            ["3", "Đơn hàng"],
            ["5", "Yêu thích"],
            ["2", "Đánh giá"],
          ].map(([num, label]) => (
            <View key={label} style={styles.statItem}>
              <Text style={styles.statNum}>{num}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {MENU.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.menuRow,
                idx < MENU.length - 1 && styles.menuBorder,
              ]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={20} color="#e91e8c" />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.btnLogout}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={20} color="#ff5252" />
          <Text style={styles.btnLogoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f8f8" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  title: { fontSize: 20, fontWeight: "800", color: "#333" },
  container: { paddingBottom: 36 },
  profileSection: {
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 28,
    marginBottom: 12,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#fce4ec",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  name: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 4 },
  email: { fontSize: 13, color: "#888", marginBottom: 14 },
  btnEdit: {
    backgroundColor: "#fce4ec",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  btnEditText: { color: "#e91e8c", fontWeight: "600", fontSize: 13 },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginBottom: 12,
    paddingVertical: 16,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "800", color: "#7c3aed" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  menuCard: { backgroundColor: "#fff", marginHorizontal: 0, marginBottom: 12 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fce4ec",
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 14, color: "#333", fontWeight: "500" },
  btnLogout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 13,
    height: 50,
    elevation: 1,
  },
  btnLogoutText: { color: "#ff5252", fontSize: 15, fontWeight: "700" },
});
