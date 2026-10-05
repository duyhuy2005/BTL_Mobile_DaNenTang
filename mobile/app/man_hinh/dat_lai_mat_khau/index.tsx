import { Ionicons } from "@expo/vector-icons";
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthHero } from "@/src/auth/AuthHero";
import { authStyles } from "@/src/auth/authStyles";
import { passwordResetService } from "@/src/auth/passwordResetService";
import { validateNewPassword } from "@/src/auth/authValidation";
import OInput from "@/src/dung_chung/tsx/OInput";

export default function DatLaiMatKhauScreen() {
  const router = useRouter(); const { identifier = "", otp = "" } = useLocalSearchParams<{ identifier: string; otp: string }>(); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [show, setShow] = useState(false); const [showConfirm, setShowConfirm] = useState(false); const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  async function submit() { const next = validateNewPassword(password, confirm); setErrors(next); if (Object.keys(next).length) return; try { await passwordResetService.resetPassword(identifier, otp, password); } catch (e) { Alert.alert("Chưa thể đặt lại mật khẩu", e instanceof Error ? e.message : "Có lỗi xảy ra"); } }
  return <SafeAreaView style={authStyles.safe}><KeyboardAvoidingView style={authStyles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView contentContainerStyle={authStyles.scroll} keyboardShouldPersistTaps="handled"><TouchableOpacity style={authStyles.back} onPress={() => router.back()}><Ionicons name="chevron-back" size={27} color="#222222" /></TouchableOpacity><AuthHero compact /><View style={authStyles.card}><Text style={authStyles.title}>Đặt mật khẩu mới</Text><Text style={authStyles.subtitle}>Tạo mật khẩu mới cho tài khoản của bạn.</Text><OInput nhan="Mật khẩu mới" value={password} onChangeText={setPassword} loi={errors.password} secureTextEntry={!show} icon_trai={<Ionicons name="lock-closed-outline" size={20} color="#777777" />} icon_phai={<Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={21} color="#777777" />} on_nhan_phai={() => setShow(!show)} /><OInput nhan="Xác nhận mật khẩu mới" value={confirm} onChangeText={setConfirm} loi={errors.confirmPassword} secureTextEntry={!showConfirm} icon_trai={<Ionicons name="lock-closed-outline" size={20} color="#777777" />} icon_phai={<Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={21} color="#777777" />} on_nhan_phai={() => setShowConfirm(!showConfirm)} /><TouchableOpacity style={authStyles.primary} onPress={submit}><Text style={authStyles.primaryText}>Đặt lại mật khẩu</Text></TouchableOpacity></View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
