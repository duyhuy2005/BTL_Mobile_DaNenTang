import React, { useState } from "react";
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

const INIT = [
  { id: 1, name: "Son môi đỏ Cherry", price: "250.000₫" },
  { id: 2, name: "Kem dưỡng ẩm Hera", price: "350.000₫" },
  { id: 3, name: "Nước hoa mini", price: "480.000₫" },
];

export default function YeuThichScreen() {
  const [items, setItems] = useState(INIT);
  const remove = (id: number) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Yêu thích ({items.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={64} color="#f0d0e0" />
            <Text style={styles.emptyText}>Chưa có sản phẩm yêu thích</Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.image} />
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>{item.price}</Text>
                <TouchableOpacity
                  style={styles.btnAdd}
                  onPress={() => router.push("/man_hinh/gio_hang")}
                >
                  <Ionicons name="cart-outline" size={14} color="#fff" />
                  <Text style={styles.btnAddText}>Thêm vào giỏ</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => remove(item.id)}
                style={styles.heartBtn}
              >
                <Ionicons name="heart" size={22} color="#e91e8c" />
              </TouchableOpacity>
            </View>
          ))
        )}
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
  container: { paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: { fontSize: 15, color: "#bbb", marginTop: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 14,
    padding: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  image: {
    width: 72,
    height: 72,
    backgroundColor: "#fce4ec",
    borderRadius: 10,
    marginRight: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 4 },
  price: { fontSize: 14, fontWeight: "700", color: "#e91e8c", marginBottom: 8 },
  btnAdd: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7c3aed",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    alignSelf: "flex-start",
  },
  btnAddText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  heartBtn: { padding: 6 },
});
