import { Ionicons } from "@expo/vector-icons";
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthHero } from "@/src/auth/AuthHero";
import { authStyles } from "@/src/auth/authStyles";
import { maskIdentifier } from "@/src/auth/authValidation";
import { passwordResetService } from "@/src/auth/passwordResetService";

export default function XacThucOtpScreen() {
  const router = useRouter(); const { identifier = "" } = useLocalSearchParams<{ identifier: string }>(); const [digits, setDigits] = useState(["", "", "", "", "", ""]); const [seconds, setSeconds] = useState(60); const refs = useRef<Array<TextInput | null>>([]);
  useEffect(() => { if (!seconds) return; const timer = setTimeout(() => setSeconds((value) => value - 1), 1000); return () => clearTimeout(timer); }, [seconds]);
  function change(value: string, index: number) { const digit = value.replace(/\D/g, "").slice(-1); const next = [...digits]; next[index] = digit; setDigits(next); if (digit && index < 5) refs.current[index + 1]?.focus(); }
  async function confirm() { const otp = digits.join(""); if (otp.length < 6) return Alert.alert("Thiếu mã xác thực", "Vui lòng nhập đủ 6 chữ số."); try { await passwordResetService.verifyOtp(identifier, otp); } catch (e) { Alert.alert("Chưa thể xác thực", e instanceof Error ? e.message : "Có lỗi xảy ra"); } }
  async function resend() { try { await passwordResetService.requestOtp(identifier); } catch (e) { Alert.alert("Chưa thể gửi lại", e instanceof Error ? e.message : "Có lỗi xảy ra"); } }
  return <SafeAreaView style={authStyles.safe}><KeyboardAvoidingView style={authStyles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={authStyles.scroll}><TouchableOpacity style={authStyles.back} onPress={() => router.back()}><Ionicons name="chevron-back" size={27} color="#222222" /></TouchableOpacity><AuthHero compact /><View style={authStyles.card}><Text style={authStyles.title}>Nhập mã xác thực</Text><Text style={authStyles.subtitle}>Chúng tôi đã gửi mã xác thực 6 số đến{`\n`}<Text style={authStyles.link}>{maskIdentifier(identifier)}</Text></Text><View style={authStyles.otpRow}>{digits.map((digit, index) => <TextInput key={index} ref={(node) => { refs.current[index] = node; }} style={[authStyles.otpInput, !!digit && authStyles.otpInputActive]} value={digit} onChangeText={(value) => change(value, index)} onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === "Backspace" && !digits[index] && index) refs.current[index - 1]?.focus(); }} keyboardType="number-pad" maxLength={1} selectTextOnFocus />)}</View><Text style={authStyles.resend}>Không nhận được mã? {seconds ? `Gửi lại sau ${seconds}s` : <Text onPress={() => { setSeconds(60); resend(); }} style={authStyles.link}>Gửi lại mã</Text>}</Text><TouchableOpacity style={authStyles.primary} onPress={confirm}><Text style={authStyles.primaryText}>Xác nhận</Text></TouchableOpacity><TouchableOpacity onPress={() => router.replace("/man_hinh/quen_mat_khau")}><Text style={authStyles.note}>Thay đổi <Text style={authStyles.link}>email/số điện thoại</Text></Text></TouchableOpacity></View></View></KeyboardAvoidingView></SafeAreaView>;
}
