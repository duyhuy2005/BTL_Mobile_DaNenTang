import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { MAUCHU, GIAO_DIEN } from "../ts/mau_sac";

type Props = TextInputProps & {
  nhan: string;
  loi?: string;
  icon_trai?: React.ReactNode;
  icon_phai?: React.ReactNode;
  on_nhan_phai?: () => void;
  container_style?: ViewStyle;
};

export default function OInput({
  nhan,
  loi,
  icon_trai,
  icon_phai,
  on_nhan_phai,
  container_style,
  ...rest
}: Props) {
  return (
    <View style={[styles.container, container_style]}>
      <View style={[styles.khung, !!loi && styles.khung_loi]}>
        {icon_trai && <View style={styles.icon_trai}>{icon_trai}</View>}
        <TextInput
          style={styles.input}
          placeholder={nhan}
          placeholderTextColor={MAUCHU.XAM}
          {...rest}
        />
        {icon_phai && (
          <TouchableOpacity onPress={on_nhan_phai} style={styles.icon_phai}>
            {icon_phai}
          </TouchableOpacity>
        )}
      </View>
      {!!loi && <Text style={styles.loi}>{loi}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  khung: {
    flexDirection: "row",
    alignItems: "center",
    height: GIAO_DIEN.DO_CAO_INPUT,
    borderWidth: 1.5,
    borderColor: MAUCHU.XAM_VIEN,
    borderRadius: GIAO_DIEN.BORDER_RADIUS,
    backgroundColor: MAUCHU.XAM_NHAT,
    paddingHorizontal: 14,
    gap: 10,
  },
  khung_loi: { borderColor: MAUCHU.DO },
  icon_trai: { justifyContent: "center" },
  icon_phai: { justifyContent: "center", padding: 4 },
  input: {
    flex: 1,
    fontSize: 15,
    color: MAUCHU.DEN,
  },
  loi: {
    fontSize: 12,
    color: MAUCHU.DO,
    marginTop: 4,
    marginLeft: 4,
  },
});
