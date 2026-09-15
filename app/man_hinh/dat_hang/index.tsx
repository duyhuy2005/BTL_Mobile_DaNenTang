import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function DatHangScreen() {
  const [hoTen, setHoTen] = useState("");
  const [soDienThoai, setSoDienThoai] = useState("");
  const [diaChi, setDiaChi] = useState("");
  const [phuongThuc, setPhuongThuc] = useState<"cod" | "banking">("cod");

  const handleOrder = () => {
    if (!hoTen || !soDienThoai || !diaChi) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng điền đầy đủ thông tin giao hàng.",
      );
      return;
    }
    Alert.alert("Đặt hàng thành công", "Đơn hàng của bạn đã được tiếp nhận!", [
      { text: "OK", onPress: () => router.replace("/man_hinh/don_hang") },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Đặt hàng</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>

        {[
          {
            label: "Họ tên",
            value: hoTen,
            setter: setHoTen,
            placeholder: "Nguyễn Văn A",
          },
          {
            label: "Số điện thoại",
            value: soDienThoai,
            setter: setSoDienThoai,
            placeholder: "0901234567",
            keyboard: "phone-pad",
          },
          {
            label: "Địa chỉ",
            value: diaChi,
            setter: setDiaChi,
            placeholder: "123 Đường ABC, Quận 1, TP.HCM",
          },
        ].map((f) => (
          <View key={f.label} style={styles.fieldGroup}>
            <Text style={styles.label}>{f.label}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={f.value}
                onChangeText={f.setter}
                placeholder={f.placeholder}
                placeholderTextColor="#bbb"
                keyboardType={f.keyboard as any}
              />
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          Phương thức thanh toán
        </Text>
        {[
          {
            key: "cod",
            label: "Thanh toán khi nhận hàng (COD)",
            icon: "cash-outline",
          },
          {
            key: "banking",
            label: "Chuyển khoản ngân hàng",
            icon: "card-outline",
          },
        ].map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.payRow, phuongThuc === m.key && styles.payRowActive]}
            onPress={() => setPhuongThuc(m.key as any)}
          >
            <Ionicons
              name={m.icon as any}
              size={22}
              color={phuongThuc === m.key ? "#7c3aed" : "#888"}
            />
            <Text
              style={[
                styles.payText,
                phuongThuc === m.key && styles.payTextActive,
              ]}
            >
              {m.label}
            </Text>
            {phuongThuc === m.key && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#7c3aed"
                style={{ marginLeft: "auto" }}
              />
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Tóm tắt đơn hàng</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tạm tính</Text>
            <Text style={styles.summaryVal}>600.000₫</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
            <Text style={styles.summaryVal}>30.000₫</Text>
          </View>
          <View
            style={[
              styles.summaryRow,
              {
                borderTopWidth: 1,
                borderTopColor: "#f0f0f0",
                marginTop: 8,
                paddingTop: 8,
              },
            ]}
          >
            <Text
              style={[
                styles.summaryLabel,
                { fontWeight: "700", color: "#333" },
              ]}
            >
              Tổng cộng
            </Text>
            <Text
              style={[
                styles.summaryVal,
                { color: "#e91e8c", fontWeight: "800" },
              ]}
            >
              630.000₫
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.btnOrder}
          onPress={handleOrder}
          activeOpacity={0.85}
        >
          <Text style={styles.btnOrderText}>Xác nhận đặt hàng</Text>
        </TouchableOpacity>
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
  container: { paddingHorizontal: 16, paddingBottom: 36 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 14,
  },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, color: "#555", fontWeight: "600", marginBottom: 6 },
  inputRow: {
    backgroundColor: "#f9f9f9",
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#f0d0e0",
    paddingHorizontal: 13,
    height: 48,
    justifyContent: "center",
  },
  input: { fontSize: 15, color: "#333" },
  payRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#eee",
    marginBottom: 10,
    gap: 10,
  },
  payRowActive: { borderColor: "#7c3aed", backgroundColor: "#f3f0ff" },
  payText: { fontSize: 14, color: "#666" },
  payTextActive: { color: "#7c3aed", fontWeight: "600" },
  summaryBox: {
    backgroundColor: "#fafafa",
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: { fontSize: 14, color: "#666" },
  summaryVal: { fontSize: 14, color: "#333", fontWeight: "600" },
  btnOrder: {
    backgroundColor: "#7c3aed",
    borderRadius: 13,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  btnOrderText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
