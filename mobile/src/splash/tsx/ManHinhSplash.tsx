import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { MAUCHU, FONT } from "../../dung_chung/ts/mau_sac";

const { width } = Dimensions.get("window");

export default function ManHinhSplash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/man_hinh/dang_nhap"), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.trang_tri_1} />
      <View style={styles.trang_tri_2} />
      <View style={styles.giua}>
        <View style={styles.khung_icon}>
          <Text style={styles.icon}>🌸</Text>
        </View>
        <Text style={styles.ten_app}>BloomBeauty</Text>
        <Text style={styles.slogan}>Vẻ đẹp từ thiên nhiên</Text>
      </View>
      <View style={styles.chan}>
        <Text style={styles.chu_chan}>Chăm sóc bản thân</Text>
        <Text style={styles.chu_chan_2}>Là bắt đầu của hạnh phúc</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MAUCHU.HONG_NEN,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 70,
  },
  trang_tri_1: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: MAUCHU.HONG_NHAT,
    opacity: 0.5,
  },
  trang_tri_2: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: MAUCHU.HONG_NHAT,
    opacity: 0.4,
  },
  giua: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  khung_icon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: MAUCHU.TRANG,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: MAUCHU.HONG,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: { fontSize: 52 },
  ten_app: { fontSize: 34, fontWeight: FONT.DAM_HON, color: MAUCHU.HONG_DAM },
  slogan: { fontSize: 15, color: MAUCHU.HONG, fontStyle: "italic" },
  chan: { alignItems: "center", gap: 4 },
  chu_chan: { fontSize: 16, color: MAUCHU.XAM_DAM, fontWeight: FONT.VUA },
  chu_chan_2: { fontSize: 14, color: MAUCHU.XAM },
});
