import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function DangKyScreen() {
  const [hoTen, setHoTen] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = () => {
    if (!hoTen || !email || !password || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp.");
      return;
    }
    router.replace("/man_hinh/dang_nhap");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>
            Đăng ký để trải nghiệm Beauty Store
          </Text>

          {[
            {
              label: "Họ tên",
              value: hoTen,
              setter: setHoTen,
              placeholder: "Nguyễn Văn A",
            },
            {
              label: "Email",
              value: email,
              setter: setEmail,
              placeholder: "email@gmail.com",
              keyboard: "email-address",
            },
          ].map((field) => (
            <View key={field.label} style={styles.fieldGroup}>
              <Text style={styles.label}>{field.label}</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={field.value}
                  onChangeText={field.setter}
                  placeholder={field.placeholder}
                  placeholderTextColor="#bbb"
                  keyboardType={field.keyboard as any}
                  autoCapitalize="none"
                />
              </View>
            </View>
          ))}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#bbb"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Xác nhận mật khẩu</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#bbb"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.btnRegister}
            onPress={handleRegister}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Đăng ký</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.linkRow}
          >
            <Text style={styles.linkText}>
              Đã có tài khoản? <Text style={styles.link}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PINK_BG = "#fce4ec";
const BRAND_PINK = "#e91e8c";
const PURPLE = "#7c3aed";
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PINK_BG },
  container: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 60,
    paddingBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: BRAND_PINK,
    marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: "#888", marginBottom: 32 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, color: "#555", fontWeight: "600", marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#f0d0e0",
    paddingHorizontal: 13,
    height: 48,
  },
  input: { flex: 1, fontSize: 15, color: "#333" },
  btnRegister: {
    backgroundColor: PURPLE,
    borderRadius: 13,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    elevation: 5,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  linkRow: { alignItems: "center", marginTop: 16 },
  linkText: { fontSize: 13, color: "#666" },
  link: { color: BRAND_PINK, fontWeight: "700" },
});
