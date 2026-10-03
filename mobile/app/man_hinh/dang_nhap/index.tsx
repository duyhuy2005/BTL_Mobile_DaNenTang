import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthHero } from "@/src/auth/AuthHero";
import { authStyles } from "@/src/auth/authStyles";
import OInput from "@/src/dung_chung/tsx/OInput";
import { useDangNhapLogic } from "@/src/auth/hooks/useDangNhapLogic";

export default function ManHinhDangNhap() {
  const logic = useDangNhapLogic();
  return (
    <SafeAreaView style={authStyles.safe}>
      <KeyboardAvoidingView style={authStyles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={authStyles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthHero />
          <View style={authStyles.card}>
            <Text style={authStyles.title}>Đăng nhập</Text>
            <Text style={authStyles.subtitle}>Chào mừng bạn trở lại!</Text>
            <OInput nhan="Email hoặc số điện thoại" value={logic.identifier} onChangeText={logic.updateIdentifier} loi={logic.errors.identifier} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" returnKeyType="next" icon_trai={<Ionicons name="mail-outline" size={21} color="#777777" />} />
            <OInput nhan="Mật khẩu" value={logic.password} onChangeText={logic.updatePassword} loi={logic.errors.password} secureTextEntry={!logic.showPassword} autoCapitalize="none" returnKeyType="done" onSubmitEditing={logic.submit} icon_trai={<Ionicons name="lock-closed-outline" size={20} color="#777777" />} icon_phai={<Ionicons name={logic.showPassword ? "eye-off-outline" : "eye-outline"} size={21} color="#777777" />} on_nhan_phai={() => logic.setShowPassword(!logic.showPassword)} />
            <View style={authStyles.linkRow}><Pressable onPress={() => logic.goToForgotPassword()}><Text style={authStyles.link}>Quên mật khẩu?</Text></Pressable></View>
            <TouchableOpacity style={[authStyles.primary, logic.isSubmitting && authStyles.primaryDisabled]} onPress={logic.submit} disabled={logic.isSubmitting} activeOpacity={0.86}>{logic.isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={authStyles.primaryText}>Đăng nhập</Text>}</TouchableOpacity>
            <View style={authStyles.footer}><Text style={authStyles.footerText}>Chưa có tài khoản? </Text><TouchableOpacity onPress={logic.goToRegister}><Text style={authStyles.link}>Đăng ký ngay</Text></TouchableOpacity></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
