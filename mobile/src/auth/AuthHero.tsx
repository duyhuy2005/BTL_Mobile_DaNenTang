import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export function AuthHero({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={styles.mark}>
        <Ionicons name="leaf" size={30} color="#176A50" />
      </View>
      <Text style={styles.brand}>BeautyStore</Text>
      <Text style={styles.slogan}>Mỹ phẩm chính hãng · Cho vẻ đẹp thật của bạn</Text>
      {!compact && (
        <View style={styles.placeholder}>
          <View style={styles.bottle} />
          <View style={styles.jar} />
          <View style={styles.flower}><Text>✦</Text></View>
          <Text style={styles.placeholderText}>Làn da khỏe{`\n`}Cuộc sống đẹp hơn</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingTop: 12, marginBottom: 16 },
  compact: { paddingTop: 2, marginBottom: 12 },
  mark: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFFB8" },
  brand: { marginTop: 4, fontSize: 28, fontWeight: "700", color: "#14553F" },
  slogan: { marginTop: 2, fontSize: 13, fontStyle: "italic", color: "#57806E" },
  placeholder: { alignSelf: "stretch", height: 142, marginTop: 14, borderRadius: 24, overflow: "hidden", backgroundColor: "#FCE4EE", justifyContent: "center" },
  bottle: { position: "absolute", right: 78, bottom: -8, width: 58, height: 112, borderRadius: 28, backgroundColor: "#F7C5D6", borderWidth: 5, borderColor: "#FFF7FA" },
  jar: { position: "absolute", right: 20, bottom: 12, width: 78, height: 52, borderRadius: 20, backgroundColor: "#F4B3CA", borderTopWidth: 8, borderColor: "#FFF7FA" },
  flower: { position: "absolute", right: 130, bottom: 26, width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFFFFFAA", alignItems: "center", justifyContent: "center" },
  placeholderText: { marginLeft: 22, fontSize: 19, lineHeight: 28, fontWeight: "600", color: "#65434E" },
});
