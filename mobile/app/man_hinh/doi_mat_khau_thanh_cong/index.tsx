import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { AuthHero } from "@/src/auth/AuthHero";
import { authStyles } from "@/src/auth/authStyles";

export default function DoiMatKhauThanhCongScreen() {
  const router = useRouter(); return <SafeAreaView style={authStyles.safe}><View style={authStyles.scroll}><AuthHero compact /><View style={authStyles.card}><View style={authStyles.successMark}><Ionicons name="checkmark" size={46} color="#FFFFFF" /></View><Text style={[authStyles.title, { textAlign: "center" }]}>Đổi mật khẩu thành công</Text><Text style={[authStyles.subtitle, { textAlign: "center" }]}>Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập lại bằng mật khẩu mới.</Text><TouchableOpacity style={authStyles.primary} onPress={() => router.replace("/man_hinh/dang_nhap")}><Text style={authStyles.primaryText}>Đăng nhập ngay</Text></TouchableOpacity></View></View></SafeAreaView>;
}
