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

const LY_DO = [
  "Sản phẩm bị lỗi",
  "Sai sản phẩm",
  "Không đúng mô tả",
  "Hàng bị hỏng khi vận chuyển",
  "Lý do khác",
];

export default function HoanTraScreen() {
  const [lyDo, setLyDo] = useState("");
  const [ghiChu, setGhiChu] = useState("");

  const handleSubmit = () => {
    if (!lyDo) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn lý do hoàn trả.");
      return;
    }
    Alert.alert(
      "Gửi yêu cầu thành công",
      "Chúng tôi sẽ xử lý yêu cầu hoàn trả trong 3-5 ngày làm việc.",
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Yêu cầu hoàn trả</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#2196f3"
          />
          <Text style={styles.infoText}>
            Yêu cầu hoàn trả chỉ được chấp nhận trong vòng 7 ngày kể từ ngày
            nhận hàng.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Lý do hoàn trả</Text>
        {LY_DO.map((ld) => (
          <TouchableOpacity
            key={ld}
            style={[styles.optionRow, lyDo === ld && styles.optionActive]}
            onPress={() => setLyDo(ld)}
          >
            <View style={[styles.radio, lyDo === ld && styles.radioActive]}>
              {lyDo === ld && <View style={styles.radioDot} />}
            </View>
            <Text
              style={[
                styles.optionText,
                lyDo === ld && styles.optionTextActive,
              ]}
            >
              {ld}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          Ghi chú thêm
        </Text>
        <TextInput
          style={styles.textArea}
          value={ghiChu}
          onChangeText={setGhiChu}
          placeholder="Mô tả chi tiết vấn đề..."
          placeholderTextColor="#bbb"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={styles.btnSubmit}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSubmitText}>Gửi yêu cầu hoàn trả</Text>
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
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    gap: 8,
  },
  infoText: { flex: 1, fontSize: 13, color: "#1565c0", lineHeight: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#eee",
    marginBottom: 8,
    gap: 10,
  },
  optionActive: { borderColor: "#7c3aed", backgroundColor: "#f3f0ff" },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: "#7c3aed" },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#7c3aed",
  },
  optionText: { fontSize: 14, color: "#555" },
  optionTextActive: { color: "#7c3aed", fontWeight: "600" },
  textArea: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#f0d0e0",
    padding: 14,
    fontSize: 14,
    color: "#333",
    minHeight: 100,
    marginBottom: 24,
  },
  btnSubmit: {
    backgroundColor: "#7c3aed",
    borderRadius: 13,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  btnSubmitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
