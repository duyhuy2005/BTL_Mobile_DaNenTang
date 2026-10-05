import { StyleSheet } from "react-native";
import { MAUCHU } from "@/src/dung_chung/ts/mau_sac";

export const authStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4FAF6" },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 20 },
  card: { backgroundColor: MAUCHU.TRANG, borderRadius: 24, padding: 22, shadowColor: "#174936", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 3 },
  title: { color: "#123E33", fontSize: 26, fontWeight: "800", marginBottom: 5 },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFFFFFB8", alignItems: "center", justifyContent: "center", marginBottom: -42, zIndex: 1 },
  subtitle: { color: "#777777", fontSize: 14, lineHeight: 20, marginBottom: 22 },
  inputIcon: { width: 22, textAlign: "center" },
  linkRow: { alignItems: "flex-end", marginTop: -2, marginBottom: 20 },
  link: { color: "#176A50", fontSize: 14, fontWeight: "700" },
  primary: { height: 54, borderRadius: 13, backgroundColor: "#176A50", justifyContent: "center", alignItems: "center", shadowColor: "#176A50", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 },
  primaryDisabled: { opacity: 0.65 }, primaryText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  footer: { marginTop: 24, flexDirection: "row", justifyContent: "center", flexWrap: "wrap" }, footerText: { color: "#777777", fontSize: 14 },
  checkboxRow: { flexDirection: "row", alignItems: "flex-start", marginTop: -2, marginBottom: 20, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#D9CCD1", alignItems: "center", justifyContent: "center" },
  checkboxSelected: { backgroundColor: "#176A50", borderColor: "#176A50" }, terms: { flex: 1, color: "#555555", fontSize: 13, lineHeight: 19 }, error: { color: "#D93025", fontSize: 12, marginTop: -14, marginBottom: 14, marginLeft: 3 },
  note: { textAlign: "center", color: "#777777", fontSize: 14, lineHeight: 20, marginTop: 18 },
  otpRow: { flexDirection: "row", justifyContent: "space-between", gap: 7, marginTop: 10, marginBottom: 22 },
  otpInput: { flex: 1, minWidth: 38, maxWidth: 52, height: 56, borderWidth: 1.5, borderColor: "#E7DDE1", borderRadius: 13, textAlign: "center", fontSize: 22, fontWeight: "700", color: "#222222", backgroundColor: "#FFFFFF" },
  otpInputActive: { borderColor: "#EC168C" },
  resend: { marginTop: 20, marginBottom: 26, textAlign: "center", color: "#777777", fontSize: 14 },
  successMark: { width: 78, height: 78, borderRadius: 39, backgroundColor: "#EC168C", alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 18 },
});
