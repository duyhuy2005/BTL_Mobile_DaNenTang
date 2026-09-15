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

type TrangThai = "cho_xac_nhan" | "dang_giao" | "da_giao" | "da_huy";

const STATUS_MAP: Record<TrangThai, { label: string; color: string }> = {
  cho_xac_nhan: { label: "Chờ xác nhận", color: "#ff9800" },
  dang_giao: { label: "Đang giao", color: "#2196f3" },
  da_giao: { label: "Đã giao", color: "#4caf50" },
  da_huy: { label: "Đã hủy", color: "#f44336" },
};

const ORDERS = [
  {
    id: "DH001",
    ngay: "08/09/2026",
    tong: "630.000₫",
    trangThai: "da_giao" as TrangThai,
  },
  {
    id: "DH002",
    ngay: "07/09/2026",
    tong: "250.000₫",
    trangThai: "dang_giao" as TrangThai,
  },
  {
    id: "DH003",
    ngay: "06/09/2026",
    tong: "480.000₫",
    trangThai: "cho_xac_nhan" as TrangThai,
  },
];

export default function DonHangScreen() {
  const [tab, setTab] = useState<TrangThai | "tat_ca">("tat_ca");
  const filtered =
    tab === "tat_ca" ? ORDERS : ORDERS.filter((o) => o.trangThai === tab);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Đơn hàng của tôi</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {(
          [
            ["tat_ca", "Tất cả"],
            ["cho_xac_nhan", "Chờ xác nhận"],
            ["dang_giao", "Đang giao"],
            ["da_giao", "Đã giao"],
            ["da_huy", "Đã hủy"],
          ] as [string, string][]
        ).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => setTab(key as any)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.container}>
        {filtered.map((order) => {
          const status = STATUS_MAP[order.trangThai];
          return (
            <TouchableOpacity key={order.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>#{order.id}</Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: status.color + "20" },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.date}>{order.ngay}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.total}>{order.tong}</Text>
                {order.trangThai === "da_giao" && (
                  <TouchableOpacity
                    style={styles.btnReview}
                    onPress={() => router.push("/man_hinh/danh_gia")}
                  >
                    <Text style={styles.btnReviewText}>Đánh giá</Text>
                  </TouchableOpacity>
                )}
                {order.trangThai === "da_giao" && (
                  <TouchableOpacity
                    style={styles.btnReturn}
                    onPress={() => router.push("/man_hinh/hoan_tra")}
                  >
                    <Text style={styles.btnReturnText}>Hoàn trả</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
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
  tabBar: { maxHeight: 50, marginBottom: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  tabActive: { backgroundColor: "#7c3aed" },
  tabText: { fontSize: 13, color: "#666" },
  tabTextActive: { color: "#fff", fontWeight: "600" },
  container: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orderId: { fontSize: 15, fontWeight: "700", color: "#333" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  date: { fontSize: 12, color: "#aaa", marginBottom: 12 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 8 },
  total: { fontSize: 16, fontWeight: "800", color: "#e91e8c", flex: 1 },
  btnReview: {
    backgroundColor: "#7c3aed",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnReviewText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  btnReturn: {
    backgroundColor: "#ff9800",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnReturnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
