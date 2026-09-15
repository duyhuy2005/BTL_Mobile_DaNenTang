import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export default function NutTuyChinh({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
  textStyle,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
      onPress={onPress}
      activeOpacity={0.82}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? "#7c3aed" : "#fff"} />
      ) : (
        <Text
          style={[
            styles.text,
            styles[`text_${variant}` as keyof typeof styles],
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 13,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: "#7c3aed",
    elevation: 4,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  secondary: { backgroundColor: "#e91e8c", elevation: 4 },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#7c3aed",
  },
  danger: { backgroundColor: "#ff5252", elevation: 3 },
  disabled: { opacity: 0.5 },
  text: { fontSize: 15, fontWeight: "700" },
  text_primary: { color: "#fff" },
  text_secondary: { color: "#fff" },
  text_outline: { color: "#7c3aed" },
  text_danger: { color: "#fff" },
});
