import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthHero } from "@/src/auth/AuthHero";
import { authStyles } from "@/src/auth/authStyles";
import OInput from "@/src/dung_chung/tsx/OInput";
import { useDangKyLogic } from "@/src/auth/hooks/useDangKyLogic";

export default function ManHinhDangKy() {
  const logic = useDangKyLogic();
  return (
    <SafeAreaView style={authStyles.safe}>
      <KeyboardAvoidingView style={authStyles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={authStyles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthHero compact />
          <View style={authStyles.card}>
            <Text style={authStyles.title}>Đăng ký tài khoản</Text><Text style={authStyles.subtitle}>Tạo tài khoản để khám phá BeautyStore. Nhập email hoặc số điện thoại để làm tên đăng nhập.</Text>
            <OInput nhan="Họ và tên" value={logic.fullName} onChangeText={(value) => logic.update("fullName", value)} loi={logic.errors.fullName} icon_trai={<Ionicons name="person-outline" size={21} color="#777777" />} />
            <OInput nhan="Số điện thoại" value={logic.phone} onChangeText={(value) => logic.update("phone", value)} loi={logic.errors.phone} keyboardType="phone-pad" icon_trai={<Ionicons name="call-outline" size={20} color="#777777" />} />
            <OInput nhan="Email" value={logic.email} onChangeText={(value) => logic.update("email", value)} loi={logic.errors.email} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" icon_trai={<Ionicons name="mail-outline" size={21} color="#777777" />} />
            <OInput nhan="Mật khẩu" value={logic.password} onChangeText={(value) => logic.update("password", value)} loi={logic.errors.password} secureTextEntry={!logic.showPassword} autoCapitalize="none" icon_trai={<Ionicons name="lock-closed-outline" size={20} color="#777777" />} icon_phai={<Ionicons name={logic.showPassword ? "eye-off-outline" : "eye-outline"} size={21} color="#777777" />} on_nhan_phai={() => logic.setShowPassword(!logic.showPassword)} />
            <OInput nhan="Xác nhận mật khẩu" value={logic.confirmPassword} onChangeText={(value) => logic.update("confirmPassword", value)} loi={logic.errors.confirmPassword} secureTextEntry={!logic.showConfirmPassword} autoCapitalize="none" returnKeyType="done" onSubmitEditing={logic.submit} icon_trai={<Ionicons name="lock-closed-outline" size={20} color="#777777" />} icon_phai={<Ionicons name={logic.showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={21} color="#777777" />} on_nhan_phai={() => logic.setShowConfirmPassword(!logic.showConfirmPassword)} />
            <TouchableOpacity style={authStyles.checkboxRow} onPress={logic.toggleTerms} activeOpacity={0.8}><View style={[authStyles.checkbox, logic.acceptedTerms && authStyles.checkboxSelected]}>{logic.acceptedTerms && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}</View><Text style={authStyles.terms}>Tôi đồng ý với <Text onPress={() => Alert.alert("Điều khoản BeautyStore", "Tài khoản chỉ dành cho khách hàng từ đủ tuổi sử dụng dịch vụ. Bạn cần cung cấp thông tin liên hệ chính xác, bảo vệ mật khẩu và chỉ sử dụng dịch vụ cho mục đích hợp pháp.")} style={authStyles.link}>Điều khoản sử dụng</Text> và <Text onPress={() => Alert.alert("Chính sách bảo mật", "BeautyStore sử dụng thông tin tài khoản và địa chỉ để xác thực, hỗ trợ và giao đơn hàng. Thông tin liên hệ đăng nhập không thể đổi trước khi hoàn tất xác minh.")} style={authStyles.link}>Chính sách bảo mật</Text></Text></TouchableOpacity>
            {logic.errors.terms && <Text style={authStyles.error}>{logic.errors.terms}</Text>}
            <TouchableOpacity style={[authStyles.primary, logic.isSubmitting && authStyles.primaryDisabled]} onPress={logic.submit} disabled={logic.isSubmitting} activeOpacity={0.86}>{logic.isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={authStyles.primaryText}>Đăng ký</Text>}</TouchableOpacity>
            <View style={authStyles.footer}><Text style={authStyles.footerText}>Đã có tài khoản? </Text><TouchableOpacity onPress={logic.goToLogin}><Text style={authStyles.link}>Đăng nhập ngay</Text></TouchableOpacity></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
