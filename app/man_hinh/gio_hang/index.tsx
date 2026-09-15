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

type CartItem = { id: number; name: string; price: number; qty: number };

export default function GioHangScreen() {
  const [items, setItems] = useState<CartItem[]>([
    { id: 1, name: "Son môi đỏ", price: 250000, qty: 1 },
    { id: 2, name: "Kem dưỡng da", price: 350000, qty: 2 },
  ]);

  const updateQty = (id: number, delta: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i,
      ),
    );
  };

  const remove = (id: number) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Giỏ hàng ({items.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.image} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.price}>
                {item.price.toLocaleString("vi-VN")}₫
              </Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQty(item.id, -1)}
                >
                  <Ionicons name="remove" size={16} color="#e91e8c" />
                </TouchableOpacity>
                <Text style={styles.qty}>{item.qty}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQty(item.id, 1)}
                >
                  <Ionicons name="add" size={16} color="#e91e8c" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => remove(item.id)}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={20} color="#ff5252" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.totalPrice}>
            {total.toLocaleString("vi-VN")}₫
          </Text>
        </View>
        <TouchableOpacity
          style={styles.btnOrder}
          onPress={() => router.push("/man_hinh/dat_hang")}
        >
          <Text style={styles.btnOrderText}>Đặt hàng</Text>
        </TouchableOpacity>
      </View>
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
  container: { paddingHorizontal: 16, paddingBottom: 32 },
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
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#e91e8c",
    alignItems: "center",
    justifyContent: "center",
  },
  qty: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    minWidth: 20,
    textAlign: "center",
  },
  deleteBtn: { padding: 6 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  totalLabel: { fontSize: 13, color: "#888" },
  totalPrice: { fontSize: 20, fontWeight: "800", color: "#e91e8c" },
  btnOrder: {
    backgroundColor: "#7c3aed",
    borderRadius: 13,
    paddingHorizontal: 28,
    paddingVertical: 14,
    elevation: 4,
  },
  btnOrderText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
