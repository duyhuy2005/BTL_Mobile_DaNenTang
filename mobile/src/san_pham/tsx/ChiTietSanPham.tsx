import React, { useEffect } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DauTrang from "../../dung_chung/tsx/DauTrang";
import NutBam from "../../dung_chung/tsx/NutBam";
import { DangTai, HienLoi } from "../../dung_chung/tsx/TrangThai";
import { MAUCHU, GIAO_DIEN, FONT } from "../../dung_chung/ts/mau_sac";
import { dinhDangTien } from "../../dung_chung/ts/dinh_dang";
import { BASE_URL } from "../../dung_chung/ts/api";
import { useChiTietSanPham } from "../ts/sanPham";

type Props = {
  maSanPham: number;
  token: string;
  on_them_gio_hang?: (maSanPham: number, donGia: number) => void;
};

function layUrl(hinh?: string) {
  if (!hinh) return undefined;
  if (hinh.startsWith("http")) return hinh;
  return `${BASE_URL.replace("/api", "")}/uploads/products/${hinh}`;
}

export default function ChiTietSanPham({
  maSanPham,
  token,
  on_them_gio_hang,
}: Props) {
  const { sanPham, dangTai, loi, tai } = useChiTietSanPham(maSanPham, token);

  useEffect(() => {
    tai();
  }, []);

  if (dangTai) return <DangTai />;
  if (loi) return <HienLoi loi={loi} on_thu_lai={tai} />;
  if (!sanPham) return null;

  const urlHinh = layUrl(sanPham.HinhAnh);

  return (
    <View style={styles.container}>
      <DauTrang tieu_de={sanPham.TenSanPham} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hình ảnh */}
        <View style={styles.khung_hinh}>
          {urlHinh ? (
            <Image
              source={{ uri: urlHinh }}
              style={styles.hinh}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.hinh_pd}>
              <Text style={{ fontSize: 80 }}>🌸</Text>
            </View>
          )}
        </View>

        <View style={styles.noi_dung}>
          {/* Tên + thương hiệu */}
          <Text style={styles.ten}>{sanPham.TenSanPham}</Text>
          {sanPham.ThuongHieu && (
            <Text style={styles.thuong_hieu}>{sanPham.ThuongHieu}</Text>
          )}
          {sanPham.TenDanhMuc && (
            <View style={styles.nhan_danh_muc}>
              <Text style={styles.chu_nhan}>{sanPham.TenDanhMuc}</Text>
            </View>
          )}

          {/* Giá */}
          <View style={styles.khung_gia}>
            <Text style={styles.gia}>{dinhDangTien(sanPham.GiaBan)}</Text>
            <Text style={[styles.ton_kho, sanPham.SoLuong === 0 && styles.het]}>
              {sanPham.SoLuong > 0
                ? `Còn ${sanPham.SoLuong} sản phẩm`
                : "Hết hàng"}
            </Text>
          </View>

          {/* Mô tả */}
          {sanPham.MoTa && (
            <View style={styles.phan}>
              <Text style={styles.tieu_phan}>Mô tả sản phẩm</Text>
              <Text style={styles.mo_ta}>{sanPham.MoTa}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer thêm giỏ hàng */}
      <View style={styles.footer}>
        <NutBam
          tieu_de="🛒  Thêm vào giỏ hàng"
          onPress={() => on_them_gio_hang?.(sanPham.MaSanPham, sanPham.GiaBan)}
          disabled={sanPham.SoLuong === 0}
          style={styles.nut}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MAUCHU.TRANG },
  khung_hinh: { height: 300, backgroundColor: MAUCHU.HONG_NHAT },
  hinh: { width: "100%", height: "100%" },
  hinh_pd: { flex: 1, alignItems: "center", justifyContent: "center" },
  noi_dung: { padding: GIAO_DIEN.PADDING_LN },
  ten: {
    fontSize: 20,
    fontWeight: FONT.DAM_HON,
    color: MAUCHU.DEN,
    marginBottom: 4,
  },
  thuong_hieu: { fontSize: 14, color: MAUCHU.XAM, marginBottom: 8 },
  nhan_danh_muc: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: MAUCHU.HONG_NHAT,
    borderRadius: 20,
    marginBottom: 16,
  },
  chu_nhan: { fontSize: 12, color: MAUCHU.HONG, fontWeight: FONT.DAM },
  khung_gia: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  gia: { fontSize: 24, fontWeight: FONT.DAM_HON, color: MAUCHU.HONG },
  ton_kho: { fontSize: 13, color: MAUCHU.XANH_LA },
  het: { color: MAUCHU.DO },
  phan: { marginBottom: 20 },
  tieu_phan: {
    fontSize: 15,
    fontWeight: FONT.DAM_HON,
    color: MAUCHU.DEN,
    marginBottom: 8,
  },
  mo_ta: { fontSize: 14, color: MAUCHU.XAM_DAM, lineHeight: 22 },
  footer: {
    padding: GIAO_DIEN.PADDING,
    borderTopWidth: 1,
    borderTopColor: MAUCHU.XAM_VIEN,
    backgroundColor: MAUCHU.TRANG,
  },
  nut: { marginBottom: 0 },
});
