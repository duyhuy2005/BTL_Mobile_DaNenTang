import { useRouter } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { MAUCHU, FONT, GIAO_DIEN } from "../ts/mau_sac";

type Props = {
  tieu_de: string;
  co_back?: boolean;
  nut_phai?: React.ReactNode;
  style?: ViewStyle;
};

export default function DauTrang({
  tieu_de,
  co_back = true,
  nut_phai,
  style,
}: Props) {
  const router = useRouter();
  return (
    <View style={[styles.container, style]}>
      {co_back ? (
        <TouchableOpacity onPress={() => router.back()} style={styles.nut_back}>
          <Text style={styles.icon_back}>‹</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.cho_trong} />
      )}
      <Text style={styles.tieu_de} numberOfLines={1}>
        {tieu_de}
      </Text>
      <View style={styles.phai}>
        {nut_phai ?? <View style={styles.cho_trong} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: GIAO_DIEN.PADDING,
    paddingVertical: 12,
    backgroundColor: MAUCHU.TRANG,
    borderBottomWidth: 1,
    borderBottomColor: MAUCHU.XAM_VIEN,
  },
  nut_back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MAUCHU.XAM_NHAT,
    alignItems: "center",
    justifyContent: "center",
  },
  icon_back: { fontSize: 26, color: MAUCHU.DEN, marginTop: -2 },
  tieu_de: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: FONT.DAM_HON,
    color: MAUCHU.DEN,
  },
  phai: { width: 36, alignItems: "flex-end" },
  cho_trong: { width: 36 },
});
