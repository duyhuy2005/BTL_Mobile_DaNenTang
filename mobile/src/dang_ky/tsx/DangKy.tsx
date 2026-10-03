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
import { useDangKy } from "../ts/dangKy";

export default function DangKy() {
  const {
    form,
    capNhat,
    hienMatKhau,
    setHienMatKhau,
    hienXacNhan,
    setHienXacNhan,
    dongY,
    setDongY,
    dangXuLy,
    loi,
    xuLy,
    diDangNhap,
  } = useDangKy();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={MAUCHU.HONG_NEN} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.cuon}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back + Logo */}
          <TouchableOpacity style={styles.nut_back} onPress={diDangNhap}>
            <Text style={styles.icon_back}>‹</Text>
          </TouchableOpacity>
          <View style={styles.logo_khu}>
            <View style={styles.logo_khung}>
              <Text style={styles.logo_icon}>🌸</Text>
            </View>
            <Text style={styles.ten_app}>BloomBeauty</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.tieu_de}>Đăng ký tài khoản</Text>
            <Text style={styles.mo_ta}>
              Tạo tài khoản để trải nghiệm mua sắm tốt hơn
            </Text>

            <OInput
              nhan="Họ và tên"
              value={form.HoTen}
              onChangeText={(v) => capNhat("HoTen", v)}
              loi={loi.HoTen}
              icon_trai={<Text style={s.oi}>👤</Text>}
            />
            <OInput
              nhan="Số điện thoại"
              value={form.SoDienThoai}
              onChangeText={(v) => capNhat("SoDienThoai", v)}
              loi={loi.SoDienThoai}
              keyboardType="phone-pad"
              autoCapitalize="none"
              icon_trai={<Text style={s.oi}>📱</Text>}
            />
            <OInput
              nhan="Email"
              value={form.Email}
              onChangeText={(v) => capNhat("Email", v)}
              loi={loi.Email}
              keyboardType="email-address"
              autoCapitalize="none"
              icon_trai={<Text style={s.oi}>✉️</Text>}
            />
            <OInput
              nhan="Tên đăng nhập"
              value={form.TenDangNhap}
              onChangeText={(v) => capNhat("TenDangNhap", v)}
              loi={loi.TenDangNhap}
              autoCapitalize="none"
              icon_trai={<Text style={s.oi}>🪪</Text>}
            />
            <OInput
              nhan="Mật khẩu"
              value={form.MatKhau}
              onChangeText={(v) => capNhat("MatKhau", v)}
              loi={loi.MatKhau}
              secureTextEntry={!hienMatKhau}
              icon_trai={<Text style={s.oi}>🔒</Text>}
              icon_phai={<Text style={s.oi}>{hienMatKhau ? "🙈" : "👁️"}</Text>}
              on_nhan_phai={() => setHienMatKhau(!hienMatKhau)}
            />
            <OInput
              nhan="Nhập lại mật khẩu"
              value={form.xacNhanMatKhau}
              onChangeText={(v) => capNhat("xacNhanMatKhau", v)}
              loi={(loi as any).xacNhanMatKhau}
              secureTextEntry={!hienXacNhan}
              icon_trai={<Text style={s.oi}>🔒</Text>}
              icon_phai={<Text style={s.oi}>{hienXacNhan ? "🙈" : "👁️"}</Text>}
              on_nhan_phai={() => setHienXacNhan(!hienXacNhan)}
            />

            {/* Điều khoản */}
            <TouchableOpacity
              style={s.hang_dk}
              onPress={() => setDongY(!dongY)}
            >
              <View style={[s.hop, dongY && s.hop_chon]}>
                {dongY && <Text style={s.dau_v}>✓</Text>}
              </View>
              <Text style={s.chu_dk}>
                Tôi đồng ý với <Text style={s.link}>Điều khoản sử dụng</Text>
              </Text>
            </TouchableOpacity>

            <NutBam
              tieu_de="Đăng ký"
              dang_tai={dangXuLy}
              onPress={xuLy}
              style={s.nut}
            />

            <View style={s.hang_dn}>
              <Text style={s.chu_dn}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={diDangNhap}>
                <Text style={s.link_dn}>Đăng nhập</Text>
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
  cuon: {
    flexGrow: 1,
    paddingHorizontal: GIAO_DIEN.PADDING_LN,
    paddingTop: 20,
    paddingBottom: 30,
  },
  nut_back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MAUCHU.TRANG,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    ...GIAO_DIEN.SHADOW,
  },
  icon_back: { fontSize: 28, color: MAUCHU.DEN, marginTop: -3 },
  logo_khu: { alignItems: "center", marginBottom: 20, gap: 6 },
  logo_khung: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: MAUCHU.TRANG,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: MAUCHU.HONG,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logo_icon: { fontSize: 32 },
  ten_app: { fontSize: 22, fontWeight: FONT.DAM_HON, color: MAUCHU.HONG_DAM },
  card: {
    backgroundColor: MAUCHU.TRANG,
    borderRadius: GIAO_DIEN.BORDER_RADIUS_LN,
    padding: 24,
    ...GIAO_DIEN.SHADOW,
  },
  tieu_de: {
    fontSize: 20,
    fontWeight: FONT.DAM_HON,
    color: MAUCHU.DEN,
    marginBottom: 4,
  },
  mo_ta: { fontSize: 13, color: MAUCHU.XAM, marginBottom: 20 },
});

const s = StyleSheet.create({
  oi: { fontSize: 18 },
  hang_dk: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    marginBottom: 18,
  },
  hop: {
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
  chu_dk: { flex: 1, fontSize: 13, color: MAUCHU.XAM_DAM },
  link: { color: MAUCHU.HONG, fontWeight: FONT.DAM },
  nut: { marginBottom: 16 },
  hang_dn: { flexDirection: "row", justifyContent: "center" },
  chu_dn: { fontSize: 14, color: MAUCHU.XAM },
  link_dn: { fontSize: 14, color: MAUCHU.HONG, fontWeight: FONT.DAM_HON },
});
