import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MAUCHU, KY_TU } from "@/hang_so";

const { width, height } = Dimensions.get("window");

export default function ManHinhSplash() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/man_hinh/dang_nhap");
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={MAUCHU.HONG_NEN} />

      {/* Nền hoa gradient */}
      <View style={styles.nenHoa} />

      {/* Logo và tên app */}
      <View style={styles.giuaTrang}>
        <View style={styles.khungLogo}>
          <Text style={styles.bieu_tuong}>🌸</Text>
        </View>
        <Text style={styles.tenApp}>{KY_TU.TEN_APP}</Text>
        <Text style={styles.slogan}>{KY_TU.SLOGAN}</Text>
      </View>

      {/* Chân trang */}
      <View style={styles.chanTrang}>
        <Text style={styles.chuChanTrang}>Chăm sóc bản thân</Text>
        <Text style={styles.chuChanTrang2}>Là bắt đầu của hạnh phúc</Text>
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
    paddingVertical: 60,
  },
  nenHoa: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: MAUCHU.HONG_NHAT,
    opacity: 0.5,
  },
  giuaTrang: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  khungLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: MAUCHU.TRANG,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: MAUCHU.HONG,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 8,
  },
  bieu_tuong: {
    fontSize: 52,
  },
  tenApp: {
    fontSize: 34,
    fontWeight: "700",
    color: MAUCHU.HONG_DAM,
    letterSpacing: 0.5,
  },
  slogan: {
    fontSize: 15,
    color: MAUCHU.HONG,
    fontStyle: "italic",
  },
  chanTrang: {
    alignItems: "center",
    gap: 4,
  },
  chuChanTrang: {
    fontSize: 16,
    color: MAUCHU.XAM_DAM,
    fontWeight: "500",
  },
  chuChanTrang2: {
    fontSize: 14,
    color: MAUCHU.XAM,
  },
});
