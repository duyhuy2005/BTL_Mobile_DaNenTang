import { Ionicons } from "@expo/vector-icons";
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { AuthHero } from "@/src/auth/AuthHero";
import { authStyles } from "@/src/auth/authStyles";
import { passwordResetService } from "@/src/auth/passwordResetService";
import { validateEmailOrPhone } from "@/src/auth/authValidation";
import OInput from "@/src/dung_chung/tsx/OInput";

export default function QuenMatKhauScreen() {
  const router = useRouter(); const [identifier, setIdentifier] = useState(""); const [error, setError] = useState<string>(); const [loading, setLoading] = useState(false);
  async function submit() {
    const nextError = validateEmailOrPhone(identifier).identifier; setError(nextError); if (nextError) return;
    setLoading(true); try { await passwordResetService.requestOtp(identifier); } catch (e) { Alert.alert("Chưa thể gửi mã", e instanceof Error ? e.message : "Có lỗi xảy ra"); } finally { setLoading(false); }
  }
  return <SafeAreaView style={authStyles.safe}><KeyboardAvoidingView style={authStyles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView contentContainerStyle={authStyles.scroll} keyboardShouldPersistTaps="handled"><TouchableOpacity style={authStyles.back} onPress={() => router.back()}><Ionicons name="chevron-back" size={27} color="#222222" /></TouchableOpacity><AuthHero compact /><View style={authStyles.card}><Text style={authStyles.title}>Quên mật khẩu?</Text><Text style={authStyles.subtitle}>Nhập email hoặc số điện thoại của bạn để nhận mã xác thực đặt lại mật khẩu.</Text><OInput nhan="Email hoặc số điện thoại" value={identifier} onChangeText={(value) => { setIdentifier(value); if (error) setError(undefined); }} loi={error} keyboardType="email-address" autoCapitalize="none" icon_trai={<Ionicons name="mail-outline" size={21} color="#777777" />} /><TouchableOpacity style={[authStyles.primary, loading && authStyles.primaryDisabled]} disabled={loading} onPress={submit}><Text style={authStyles.primaryText}>{loading ? "Đang gửi..." : "Gửi mã xác thực"}</Text></TouchableOpacity><TouchableOpacity onPress={() => router.replace("/man_hinh/dang_nhap")}><Text style={authStyles.note}>‹  Quay lại <Text style={authStyles.link}>đăng nhập</Text></Text></TouchableOpacity></View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
