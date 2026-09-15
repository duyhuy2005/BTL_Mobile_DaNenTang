import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function DangNhapScreen() {
  const [taiKhoan, setTaiKhoan] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [showMatKhau, setShowMatKhau] = useState(false);
  const [ghiNho, setGhiNho] = useState(true);

  const handleDangNhap = () => {
    if (!taiKhoan || !matKhau) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập số điện thoại/email và mật khẩu.",
      );
      return;
    }
    router.replace("/man_hinh/trang_chu");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hoa trang trí góc trên ── */}
          <View style={styles.flowerTL}>
            <View
              style={[
                styles.flowerPetal,
                {
                  width: 80,
                  height: 80,
                  top: -20,
                  left: -20,
                  backgroundColor: "rgba(233,150,170,0.22)",
                  borderRadius: 40,
                },
              ]}
            />
            <View
              style={[
                styles.flowerPetal,
                {
                  width: 55,
                  height: 55,
                  top: 30,
                  left: 10,
                  backgroundColor: "rgba(233,150,170,0.15)",
                  borderRadius: 28,
                },
              ]}
            />
            <View
              style={[
                styles.flowerPetal,
                {
                  width: 40,
                  height: 40,
                  top: 5,
                  left: 50,
                  backgroundColor: "rgba(233,150,170,0.18)",
                  borderRadius: 20,
                },
              ]}
            />
          </View>
          <View style={styles.flowerTR}>
            <View
              style={[
                styles.flowerPetal,
                {
                  width: 70,
                  height: 70,
                  top: -15,
                  right: -15,
                  backgroundColor: "rgba(233,150,170,0.20)",
                  borderRadius: 35,
                },
              ]}
            />
            <View
              style={[
                styles.flowerPetal,
                {
                  width: 45,
                  height: 45,
                  top: 35,
                  right: 15,
                  backgroundColor: "rgba(233,150,170,0.13)",
                  borderRadius: 23,
                },
              ]}
            />
          </View>

          {/* ── Logo ── */}
          <View style={styles.logoSection}>
            {/* Lotus icon vẽ bằng View */}
            <View style={styles.lotusWrap}>
              {/* Cánh giữa */}
              <View style={[styles.lotusPetal, styles.lotusPetalCenter]} />
              {/* Cánh trái */}
              <View style={[styles.lotusPetal, styles.lotusPetalLeft]} />
              {/* Cánh phải */}
              <View style={[styles.lotusPetal, styles.lotusPetalRight]} />
              {/* Cánh trái ngoài */}
              <View style={[styles.lotusPetal, styles.lotusPetalFarLeft]} />
              {/* Cánh phải ngoài */}
              <View style={[styles.lotusPetal, styles.lotusPetalFarRight]} />
              {/* Đế hoa */}
              <View style={styles.lotusBase} />
            </View>
            <Text style={styles.brandName}>BloomBeauty</Text>
            <Text style={styles.tagline}>Vẻ đẹp từ thiên nhiên</Text>
          </View>

          {/* ── Form ── */}
          <View style={styles.formWrap}>
            {/* Input tài khoản */}
            <View style={styles.inputBox}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={19}
                  color="#b0a0a8"
                />
              </View>
              <TextInput
                style={styles.input}
                value={taiKhoan}
                onChangeText={setTaiKhoan}
                placeholder="Số điện thoại / Email"
                placeholderTextColor="#c0b0b8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Input mật khẩu */}
            <View style={styles.inputBox}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color="#b0a0a8"
                />
              </View>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={matKhau}
                onChangeText={setMatKhau}
                placeholder="Mật khẩu"
                placeholderTextColor="#c0b0b8"
                secureTextEntry={!showMatKhau}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowMatKhau(!showMatKhau)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showMatKhau ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#b0a0a8"
                />
              </TouchableOpacity>
            </View>

            {/* Ghi nhớ + Quên mật khẩu */}
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setGhiNho(!ghiNho)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, ghiNho && styles.checkboxOn]}>
                  {ghiNho && (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  )}
                </View>
                <Text style={styles.rememberText}>Ghi nhớ đăng nhập</Text>
              </TouchableOpacity>

              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>

            {/* Nút đăng nhập */}
            <TouchableOpacity
              style={styles.btnDangNhap}
              onPress={handleDangNhap}
              activeOpacity={0.85}
            >
              <Text style={styles.btnDangNhapText}>Đăng nhập</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc đăng nhập bằng</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
                {/* Google G icon */}
                <View style={styles.googleIcon}>
                  <Text style={styles.googleText}>G</Text>
                </View>
                <Text style={styles.socialBtnText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
                {/* Facebook icon */}
                <View style={styles.fbIcon}>
                  <Text style={styles.fbText}>f</Text>
                </View>
                <Text style={styles.socialBtnText}>Facebook</Text>
              </TouchableOpacity>
            </View>

            {/* Đăng ký */}
            <TouchableOpacity
              style={styles.registerRow}
              onPress={() => router.push("/man_hinh/dang_ky")}
              activeOpacity={0.7}
            >
              <Text style={styles.registerText}>
                Chưa có tài khoản?{" "}
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ROSE = "#d4618a";
const ROSE_BTN = "#d4618a";
const PINK_BG = "#fdf0f3";
const PINK_INPUT_BG = "#fff";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PINK_BG,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },

  // ── Hoa trang trí ──
  flowerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 120,
    height: 100,
  },
  flowerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 110,
    height: 100,
  },
  flowerPetal: {
    position: "absolute",
  },

  // ── Logo ──
  logoSection: {
    alignItems: "center",
    paddingTop: 64,
    paddingBottom: 40,
  },
  lotusWrap: {
    width: 72,
    height: 64,
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 14,
    position: "relative",
  },
  lotusPetal: {
    position: "absolute",
    width: 26,
    height: 36,
    borderRadius: 13,
    backgroundColor: ROSE,
    bottom: 10,
  },
  lotusPetalCenter: {
    width: 24,
    height: 40,
    borderRadius: 12,
    bottom: 12,
    left: 24,
    backgroundColor: ROSE,
    transform: [{ rotate: "0deg" }],
  },
  lotusPetalLeft: {
    width: 22,
    height: 34,
    borderRadius: 11,
    bottom: 8,
    left: 14,
    backgroundColor: "#c4567a",
    transform: [{ rotate: "-22deg" }],
  },
  lotusPetalRight: {
    width: 22,
    height: 34,
    borderRadius: 11,
    bottom: 8,
    left: 36,
    backgroundColor: "#c4567a",
    transform: [{ rotate: "22deg" }],
  },
  lotusPetalFarLeft: {
    width: 20,
    height: 30,
    borderRadius: 10,
    bottom: 4,
    left: 4,
    backgroundColor: "#e8a0b8",
    transform: [{ rotate: "-42deg" }],
  },
  lotusPetalFarRight: {
    width: 20,
    height: 30,
    borderRadius: 10,
    bottom: 4,
    left: 48,
    backgroundColor: "#e8a0b8",
    transform: [{ rotate: "42deg" }],
  },
  lotusBase: {
    position: "absolute",
    bottom: 0,
    left: 10,
    width: 52,
    height: 14,
    borderRadius: 7,
    backgroundColor: ROSE,
  },

  brandName: {
    fontSize: 28,
    fontWeight: "700",
    color: ROSE,
    letterSpacing: 0.3,
    marginBottom: 5,
  },
  tagline: {
    fontSize: 14,
    color: "#b08090",
    fontStyle: "italic",
  },

  // ── Form ──
  formWrap: {
    gap: 0,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PINK_INPUT_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eddde5",
    paddingHorizontal: 14,
    height: 54,
    marginBottom: 14,
    shadowColor: "#d4618a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    marginRight: 10,
    width: 22,
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#444",
  },
  eyeBtn: {
    padding: 2,
  },

  // ── Options ──
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
    marginTop: 2,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#ddc8d0",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    backgroundColor: ROSE,
    borderColor: ROSE,
  },
  rememberText: {
    fontSize: 13,
    color: "#777",
  },
  forgotText: {
    fontSize: 13,
    color: ROSE,
    fontWeight: "600",
  },

  // ── Nút đăng nhập ──
  btnDangNhap: {
    backgroundColor: ROSE_BTN,
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    shadowColor: ROSE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDangNhapText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // ── Divider ──
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#eddde5",
  },
  dividerText: {
    fontSize: 13,
    color: "#b09098",
  },

  // ── Social ──
  socialRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 28,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eddde5",
    height: 50,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  socialBtnText: {
    fontSize: 15,
    color: "#444",
    fontWeight: "500",
  },

  // Google icon
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  googleText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4285F4",
  },

  // Facebook icon
  fbIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1877F2",
    alignItems: "center",
    justifyContent: "center",
  },
  fbText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    marginTop: -1,
  },

  // ── Đăng ký ──
  registerRow: {
    alignItems: "center",
  },
  registerText: {
    fontSize: 14,
    color: "#888",
  },
  registerLink: {
    color: ROSE,
    fontWeight: "700",
  },
});
