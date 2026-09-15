import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function TrangChuScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào 👋</Text>
            <Text style={styles.brandName}>Beauty Store</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/man_hinh/gio_hang")}>
            <Ionicons name="cart-outline" size={28} color="#e91e8c" />
          </TouchableOpacity>
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Khuyến mãi hôm nay</Text>
          <Text style={styles.bannerSub}>Giảm đến 50% sản phẩm làm đẹp</Text>
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Danh mục</Text>
        <View style={styles.categoryRow}>
          {["Skincare", "Makeup", "Perfume", "Haircare"].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={styles.catItem}
              onPress={() => router.push("/man_hinh/san_pham")}
            >
              <Ionicons name="flower-outline" size={24} color="#e91e8c" />
              <Text style={styles.catText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Products placeholder */}
        <Text style={styles.sectionTitle}>Sản phẩm nổi bật</Text>
        <View style={styles.productGrid}>
          {[1, 2, 3, 4].map((i) => (
            <TouchableOpacity
              key={i}
              style={styles.productCard}
              onPress={() => router.push("/man_hinh/san_pham")}
            >
              <View style={styles.productImage} />
              <Text style={styles.productName}>Sản phẩm {i}</Text>
              <Text style={styles.productPrice}>250.000₫</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { fontSize: 13, color: "#888" },
  brandName: { fontSize: 22, fontWeight: "800", color: "#e91e8c" },
  banner: {
    backgroundColor: "#fce4ec",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e91e8c",
    marginBottom: 4,
  },
  bannerSub: { fontSize: 13, color: "#c2185b" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  catItem: {
    alignItems: "center",
    backgroundColor: "#fce4ec",
    borderRadius: 12,
    padding: 12,
    width: "23%",
  },
  catText: { fontSize: 11, color: "#e91e8c", marginTop: 4, fontWeight: "600" },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  productCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    padding: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  productImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#fce4ec",
    borderRadius: 10,
    marginBottom: 8,
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  productPrice: { fontSize: 14, fontWeight: "700", color: "#e91e8c" },
});
