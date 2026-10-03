import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MAUCHU } from "@/src/dung_chung/ts/mau_sac";

export function SocialButtons({ label }: { label: string }) {
  return (
    <>
      <View style={styles.divider}><View style={styles.line} /><Text style={styles.dividerText}>{label}</Text><View style={styles.line} /></View>
      <View style={styles.buttons}>
        <TouchableOpacity accessibilityRole="button" style={styles.button}><Text style={styles.google}>G</Text><Text style={styles.text}>Google</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.button}><Ionicons name="logo-facebook" size={23} color="#1877F2" /><Text style={styles.text}>Facebook</Text></TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: "#E7DDE1" }, dividerText: { color: MAUCHU.XAM, fontSize: 13 },
  buttons: { flexDirection: "row", gap: 12 }, button: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1, borderColor: "#E7DDE1", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  google: { color: "#4285F4", fontSize: 22, fontWeight: "800" }, text: { fontSize: 14, fontWeight: "600", color: MAUCHU.DEN },
});
