import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
};

export default function ONhapLieu({
  label,
  error,
  containerStyle,
  isPassword,
  leftIcon,
  ...props
}: Props) {
  const [showPw, setShowPw] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color="#aaa"
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor="#bbb"
          secureTextEntry={isPassword && !showPw}
          autoCapitalize="none"
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPw(!showPw)}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={showPw ? "eye-outline" : "eye-off-outline"}
              size={19}
              color="#aaa"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 13, color: "#555", fontWeight: "600", marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#f0d0e0",
    paddingHorizontal: 13,
    height: 48,
  },
  inputError: { borderColor: "#ff5252" },
  leftIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: "#333" },
  eyeBtn: { padding: 4 },
  errorText: { fontSize: 12, color: "#ff5252", marginTop: 4 },
});
