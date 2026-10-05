import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SanPham } from "../../kieu_du_lieu";
import { dinhDangTien } from "../ts/dinh_dang";
import { MAUCHU, GIAO_DIEN, FONT } from "../ts/mau_sac";
import { BASE_URL } from "../ts/api";
import { useNewStatus } from "../../home/useNewStatus";

type Props = {
  san_pham: SanPham;
  on_them_gio_hang?: (sp: SanPham) => void;
};

function layUrlHinh(hinh?: string): string | undefined {
  if (!hinh) return undefined;
  if (hinh.startsWith("http")) return hinh;
  return `${BASE_URL.replace("/api", "")}/uploads/products/${hinh}`;
}

export default function TheSanPham({ san_pham, on_them_gio_hang }: Props) {
  const router = useRouter();
  const urlHinh = layUrlHinh(san_pham.HinhAnh);
  const showNew = useNewStatus(san_pham.isNew, san_pham.newUntil);

  return (
    <TouchableOpacity
      style={styles.the}
      activeOpacity={0.88}
      onPress={() => router.push(`/man_hinh/san_pham?id=${san_pham.MaSanPham}`)}
    >
      <View style={styles.khung_hinh}>
        {urlHinh ? (
          <Image
            source={{ uri: urlHinh }}
            style={styles.hinh}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.hinh_mac_dinh}>
            <Text style={styles.emoji_hinh}>🌸</Text>
          </View>
        )}
        {showNew && <View style={styles.nhan_moi}><Text style={styles.chu_nhan_moi}>MỚI</Text></View>}
        {san_pham.SoLuong === 0 && (
          <View style={styles.het_hang}>
            <Text style={styles.chu_het_hang}>Hết hàng</Text>
          </View>
        )}
      </View>
      <View style={styles.thong_tin}>
        <Text style={styles.ten} numberOfLines={2}>
          {san_pham.TenSanPham}
        </Text>
        {san_pham.ThuongHieu && (
          <Text style={styles.thuong_hieu}>{san_pham.ThuongHieu}</Text>
        )}
        <View style={styles.hang_gia}>
          <Text style={styles.gia}>{dinhDangTien(san_pham.GiaBan)}</Text>
        </View>
        {on_them_gio_hang && (
          <TouchableOpacity
            style={[
              styles.nut_them,
              san_pham.SoLuong === 0 && styles.nut_disabled,
            ]}
            onPress={() => on_them_gio_hang(san_pham)}
            disabled={san_pham.SoLuong === 0}
          >
            <Text style={styles.chu_nut}>+ Thêm</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  the: {
    backgroundColor: MAUCHU.TRANG,
    borderRadius: GIAO_DIEN.BORDER_RADIUS,
    overflow: "hidden",
    ...GIAO_DIEN.SHADOW,
  },
  khung_hinh: { position: "relative" },
  hinh: { width: "100%", height: 160 },
  hinh_mac_dinh: {
    width: "100%",
    height: 160,
    backgroundColor: MAUCHU.HONG_NHAT,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji_hinh: { fontSize: 48 },
  het_hang: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nhan_moi: { position: "absolute", top: 8, left: 8, backgroundColor: "#08785B", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9 },
  chu_nhan_moi: { color: "#fff", fontSize: 10, fontWeight: "800" },
  chu_het_hang: { color: MAUCHU.TRANG, fontSize: 11, fontWeight: FONT.DAM },
  thong_tin: { padding: 10 },
  ten: {
    fontSize: 13,
    fontWeight: FONT.DAM,
    color: MAUCHU.DEN,
    marginBottom: 2,
  },
  thuong_hieu: { fontSize: 11, color: MAUCHU.XAM, marginBottom: 4 },
  hang_gia: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  gia: { fontSize: 14, fontWeight: FONT.DAM_HON, color: MAUCHU.HONG },
  nut_them: {
    backgroundColor: MAUCHU.HONG,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  nut_disabled: { backgroundColor: MAUCHU.XAM_VIEN },
  chu_nut: { color: MAUCHU.TRANG, fontSize: 12, fontWeight: FONT.DAM },
});
