import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { MAUCHU, GIAO_DIEN, FONT } from "../ts/mau_sac";

// Loading toàn màn hình
export function DangTai({ thong_bao = "Đang tải..." }: { thong_bao?: string }) {
  return (
    <View style={styles.giua_trang}>
      <ActivityIndicator size="large" color={MAUCHU.HONG} />
      <Text style={styles.chu_tai}>{thong_bao}</Text>
    </View>
  );
}

// Trạng thái rỗng
export function KhongCoDuLieu({
  thong_bao = "Không có dữ liệu",
  icon = "📭",
}: {
  thong_bao?: string;
  icon?: string;
}) {
  return (
    <View style={styles.giua_trang}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.chu_rong}>{thong_bao}</Text>
    </View>
  );
}

// Lỗi
export function HienLoi({
  loi,
  on_thu_lai,
}: {
  loi: string;
  on_thu_lai?: () => void;
}) {
  return (
    <View style={styles.giua_trang}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.chu_loi}>{loi}</Text>
      {on_thu_lai && (
        <Text style={styles.thu_lai} onPress={on_thu_lai}>
          Thử lại
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  giua_trang: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: GIAO_DIEN.PADDING * 2,
    gap: 12,
  },
  icon: { fontSize: 48 },
  chu_tai: { fontSize: 14, color: MAUCHU.XAM },
  chu_rong: { fontSize: 15, color: MAUCHU.XAM, textAlign: "center" },
  chu_loi: { fontSize: 14, color: MAUCHU.DO, textAlign: "center" },
  thu_lai: {
    fontSize: 14,
    color: MAUCHU.HONG,
    fontWeight: FONT.DAM,
    textDecorationLine: "underline",
  },
});
