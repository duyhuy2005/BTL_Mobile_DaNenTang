import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function SanPhamScreen() {
  const [search, setSearch] = useState("");

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Sản phẩm</Text>
        <TouchableOpacity onPress={() => router.push("/man_hinh/gio_hang")}>
          <Ionicons name="cart-outline" size={24} color="#e91e8c" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons
          name="search-outline"
          size={18}
          color="#aaa"
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm kiếm sản phẩm..."
          placeholderTextColor="#bbb"
        />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <TouchableOpacity key={i} style={styles.card}>
              <View style={styles.image} />
              <Text style={styles.name}>Sản phẩm {i + 1}</Text>
              <Text style={styles.price}>{(i + 1) * 150}.000₫</Text>
              <TouchableOpacity style={styles.btnCart}>
                <Ionicons name="cart-outline" size={16} color="#fff" />
                <Text style={styles.btnCartText}>Thêm vào giỏ</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#333" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#333" },
  container: { paddingHorizontal: 16, paddingBottom: 32 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
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
  image: {
    width: "100%",
    height: 110,
    backgroundColor: "#fce4ec",
    borderRadius: 10,
    marginBottom: 8,
  },
  name: { fontSize: 13, fontWeight: "600", color: "#333", marginBottom: 4 },
  price: { fontSize: 14, fontWeight: "700", color: "#e91e8c", marginBottom: 8 },
  btnCart: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    borderRadius: 8,
    paddingVertical: 6,
    gap: 4,
  },
  btnCartText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
