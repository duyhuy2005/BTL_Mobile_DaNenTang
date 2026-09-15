import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

type Props = {
  tieuDe: string;
  coNutQuayLai?: boolean;
  nutBenPhai?: React.ReactNode;
  style?: ViewStyle;
  mauNen?: string;
  mauChu?: string;
};

export default function DauTrang({
  tieuDe,
  coNutQuayLai = true,
  nutBenPhai,
  style,
  mauNen = "#fff",
  mauChu = "#333",
}: Props) {
  return (
    <View style={[styles.container, { backgroundColor: mauNen }, style]}>
      <View style={styles.left}>
        {coNutQuayLai && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={mauChu} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.title, { color: mauChu }]} numberOfLines={1}>
        {tieuDe}
      </Text>
      <View style={styles.right}>
        {nutBenPhai ?? <View style={{ width: 40 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  left: { width: 40 },
  right: { width: 40, alignItems: "flex-end" },
  title: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
});
