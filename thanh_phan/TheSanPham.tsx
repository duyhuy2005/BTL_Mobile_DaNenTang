import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SanPham } from "@/kieu_du_lieu/SanPham";

type Props = {
  sanPham: SanPham;
  onPress?: () => void;
  onAddToCart?: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
};

export default function TheSanPham({
  sanPham,
  onPress,
  onAddToCart,
  onToggleFavorite,
  isFavorite,
}: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.imageWrap}>
        {sanPham.hinhAnh ? (
          <Image
            source={{ uri: sanPham.hinhAnh }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        <TouchableOpacity style={styles.heartBtn} onPress={onToggleFavorite}>
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={20}
            color={isFavorite ? "#e91e8c" : "#ccc"}
          />
        </TouchableOpacity>
        {sanPham.giamGia && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-{sanPham.giamGia}%</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {sanPham.tenSanPham}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {sanPham.gia.toLocaleString("vi-VN")}₫
          </Text>
          {sanPham.giaGoc && (
            <Text style={styles.priceOld}>
              {sanPham.giaGoc.toLocaleString("vi-VN")}₫
            </Text>
          )}
        </View>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Ionicons
              key={s}
              name="star"
              size={11}
              color={s <= (sanPham.danhGia ?? 0) ? "#ffc107" : "#eee"}
            />
          ))}
          <Text style={styles.reviewCount}>
            ({sanPham.soLuongDanhGia ?? 0})
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.cartBtn} onPress={onAddToCart}>
        <Ionicons name="cart-outline" size={18} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  imageWrap: { position: "relative" },
  image: { width: "100%", height: 130 },
  imagePlaceholder: { backgroundColor: "#fce4ec" },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#e91e8c",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  info: { padding: 10, paddingBottom: 8 },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  price: { fontSize: 14, fontWeight: "800", color: "#e91e8c" },
  priceOld: { fontSize: 11, color: "#bbb", textDecorationLine: "line-through" },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  reviewCount: { fontSize: 10, color: "#aaa", marginLeft: 2 },
  cartBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
});
