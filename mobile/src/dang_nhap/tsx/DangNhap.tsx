import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import NutBam from "../../dung_chung/tsx/NutBam";
import OInput from "../../dung_chung/tsx/OInput";
import { MAUCHU, GIAO_DIEN, FONT } from "../../dung_chung/ts/mau_sac";
import { useDangNhap } from "../ts/dangNhap";

export default function DangNhap() {
  const {
    form,
    capNhat,
    hienMatKhau,
    setHienMatKhau,
    ghiNho,
    setGhiNho,
    dangXuLy,
    loi,
    xuLy,
    diDangKy,
  } = useDangNhap();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={MAUCHU.HONG_NEN} />
      <View style={styles.vong_tren} />
      <View style={styles.vong_duoi} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.cuon}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logo_khu}>
            <View style={styles.logo_khung}>
              <Text style={styles.logo_icon}>🌸</Text>
            </View>
            <Text style={styles.ten_app}>BloomBeauty</Text>
            <Text style={styles.slogan}>Vẻ đẹp từ thiên nhiên</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.tieu_de}>Đăng nhập</Text>
            <Text style={styles.mo_ta}>Chào mừng bạn trở lại</Text>

            <OInput
              nhan="Tên đăng nhập"
              value={form.TenDangNhap}
              onChangeText={(v) => capNhat("TenDangNhap", v)}
              loi={loi.TenDangNhap}
              autoCapitalize="none"
              returnKeyType="next"
              icon_trai={<Text style={styles.oi}>👤</Text>}
            />

            <OInput
              nhan="Mật khẩu"
              value={form.MatKhau}
              onChangeText={(v) => capNhat("MatKhau", v)}
              loi={loi.MatKhau}
              secureTextEntry={!hienMatKhau}
              returnKeyType="done"
              onSubmitEditing={xuLy}
              icon_trai={<Text style={styles.oi}>🔒</Text>}
              icon_phai={
                <Text style={styles.oi}>{hienMatKhau ? "🙈" : "👁️"}</Text>
              }
              on_nhan_phai={() => setHienMatKhau(!hienMatKhau)}
            />

            {/* Ghi nhớ + Quên MK */}
            <View style={styles.hang_tuy_chon}>
              <TouchableOpacity
                style={styles.hang_ghi_nho}
                onPress={() => setGhiNho(!ghiNho)}
              >
                <View style={[styles.hop_kiem, ghiNho && styles.hop_chon]}>
                  {ghiNho && <Text style={styles.dau_v}>✓</Text>}
                </View>
                <Text style={styles.chu_ghi_nho}>Ghi nhớ đăng nhập</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.quen}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>

            <NutBam
              tieu_de="Đăng nhập"
              dang_tai={dangXuLy}
              onPress={xuLy}
              style={styles.nut}
            />

            {/* Phân cách */}
            <View style={styles.phan_cach}>
              <View style={styles.duong} />
              <Text style={styles.chu_hoac}>Hoặc đăng nhập với</Text>
              <View style={styles.duong} />
            </View>

            {/* Mạng xã hội */}
            <View style={styles.hang_mxh}>
              <TouchableOpacity style={styles.nut_mxh}>
                <Text style={styles.icon_mxh}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nut_mxh}>
                <Text style={styles.icon_mxh}>🍎</Text>
              </TouchableOpacity>
            </View>

            {/* Đăng ký */}
            <View style={styles.hang_dk}>
              <Text style={styles.chu_dk}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={diDangKy}>
                <Text style={styles.link_dk}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MAUCHU.HONG_NEN },
  vong_tren: {
    position: "absolute",
    top: -80,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: MAUCHU.HONG_NHAT,
    opacity: 0.55,
  },
  vong_duoi: {
    position: "absolute",
    bottom: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: MAUCHU.HONG_NHAT,
    opacity: 0.4,
  },
  cuon: {
    flexGrow: 1,
    paddingHorizontal: GIAO_DIEN.PADDING_LN,
    paddingTop: 50,
    paddingBottom: 30,
  },
  logo_khu: { alignItems: "center", marginBottom: 28, gap: 8 },
  logo_khung: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: MAUCHU.TRANG,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: MAUCHU.HONG,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  logo_icon: { fontSize: 40 },
  ten_app: { fontSize: 28, fontWeight: FONT.DAM_HON, color: MAUCHU.HONG_DAM },
  slogan: { fontSize: 13, color: MAUCHU.HONG, fontStyle: "italic" },
  card: {
    backgroundColor: MAUCHU.TRANG,
    borderRadius: GIAO_DIEN.BORDER_RADIUS_LN,
    padding: 24,
    ...GIAO_DIEN.SHADOW,
  },
  tieu_de: {
    fontSize: 22,
    fontWeight: FONT.DAM_HON,
    color: MAUCHU.DEN,
    marginBottom: 4,
  },
  mo_ta: { fontSize: 14, color: MAUCHU.XAM, marginBottom: 22 },
  oi: { fontSize: 18 },
  hang_tuy_chon: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  hang_ghi_nho: { flexDirection: "row", alignItems: "center", gap: 8 },
  hop_kiem: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: MAUCHU.XAM_VIEN,
    alignItems: "center",
    justifyContent: "center",
  },
  hop_chon: { backgroundColor: MAUCHU.HONG, borderColor: MAUCHU.HONG },
  dau_v: { color: MAUCHU.TRANG, fontSize: 12, fontWeight: FONT.DAM_HON },
  chu_ghi_nho: { fontSize: 13, color: MAUCHU.XAM_DAM },
  quen: { fontSize: 13, color: MAUCHU.HONG, fontWeight: FONT.DAM },
  nut: { marginBottom: 18 },
  phan_cach: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  duong: { flex: 1, height: 1, backgroundColor: MAUCHU.XAM_VIEN },
  chu_hoac: { fontSize: 12, color: MAUCHU.XAM },
  hang_mxh: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 22,
  },
  nut_mxh: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: MAUCHU.XAM_VIEN,
    alignItems: "center",
    justifyContent: "center",
  },
  icon_mxh: { fontSize: 20, fontWeight: FONT.DAM_HON, color: MAUCHU.DEN },
  hang_dk: { flexDirection: "row", justifyContent: "center" },
  chu_dk: { fontSize: 14, color: MAUCHU.XAM },
  link_dk: { fontSize: 14, color: MAUCHU.HONG, fontWeight: FONT.DAM_HON },
});
