import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from "react-native";
import { MAUCHU, GIAO_DIEN, FONT } from "../ts/mau_sac";

type Props = TouchableOpacityProps & {
  tieu_de: string;
  dang_tai?: boolean;
  loai?: "chinh" | "phu" | "vien";
  style?: ViewStyle;
};

export default function NutBam({
  tieu_de,
  dang_tai = false,
  loai = "chinh",
  style,
  disabled,
  ...rest
}: Props) {
  const isDisabled = disabled || dang_tai;

  return (
    <TouchableOpacity
      style={[
        styles.nut,
        loai === "chinh" && styles.chinh,
        loai === "phu" && styles.phu,
        loai === "vien" && styles.vien,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.82}
      {...rest}
    >
      {dang_tai ? (
        <ActivityIndicator
          color={loai === "chinh" ? MAUCHU.TRANG : MAUCHU.HONG}
        />
      ) : (
        <Text
          style={[
            styles.chu,
            loai === "phu" && styles.chu_phu,
            loai === "vien" && styles.chu_vien,
          ]}
        >
          {tieu_de}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  nut: {
    height: GIAO_DIEN.DO_CAO_NUT,
    borderRadius: GIAO_DIEN.BORDER_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  chinh: {
    backgroundColor: MAUCHU.HONG,
    ...GIAO_DIEN.SHADOW_HONG,
  },
  phu: {
    backgroundColor: MAUCHU.HONG_NHAT,
  },
  vien: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: MAUCHU.HONG,
  },
  disabled: { opacity: 0.6 },
  chu: {
    color: MAUCHU.TRANG,
    fontSize: 16,
    fontWeight: FONT.DAM_HON,
  },
  chu_phu: { color: MAUCHU.HONG_DAM },
  chu_vien: { color: MAUCHU.HONG },
});
