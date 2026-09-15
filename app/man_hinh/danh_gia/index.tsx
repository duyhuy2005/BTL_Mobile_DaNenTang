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

export default function DanhGiaScreen() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert("Thiếu đánh giá", "Vui lòng chọn số sao.");
      return;
    }
    Alert.alert("Cảm ơn bạn", "Đánh giá của bạn đã được ghi nhận!", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Đánh giá sản phẩm</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Product */}
        <View style={styles.productRow}>
          <View style={styles.productImage} />
          <View>
            <Text style={styles.productName}>Son môi đỏ Cherry</Text>
            <Text style={styles.productSub}>Đơn hàng #DH001</Text>
          </View>
        </View>

        {/* Stars */}
        <Text style={styles.sectionTitle}>Chất lượng sản phẩm</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={38}
                color={star <= rating ? "#ffc107" : "#ddd"}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingLabel}>
          {rating === 0
            ? "Chưa đánh giá"
            : ["", "Rất tệ", "Tệ", "Bình thường", "Tốt", "Xuất sắc"][rating]}
        </Text>

        {/* Comment */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          Nhận xét của bạn
        </Text>
        <TextInput
          style={styles.textArea}
          value={comment}
          onChangeText={setComment}
          placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
          placeholderTextColor="#bbb"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={styles.btnSubmit}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSubmitText}>Gửi đánh giá</Text>
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
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fafafa",
    borderRadius: 14,
    padding: 14,
    marginBottom: 28,
  },
  productImage: {
    width: 64,
    height: 64,
    backgroundColor: "#fce4ec",
    borderRadius: 10,
  },
  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  productSub: { fontSize: 12, color: "#aaa" },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 14,
  },
  starsRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  ratingLabel: { fontSize: 14, color: "#888", marginBottom: 4 },
  textArea: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#f0d0e0",
    padding: 14,
    fontSize: 14,
    color: "#333",
    minHeight: 120,
    marginBottom: 28,
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
