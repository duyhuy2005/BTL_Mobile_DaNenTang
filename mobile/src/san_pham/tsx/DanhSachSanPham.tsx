import React, { useEffect } from "react";
import {
  FlatList,
  StyleSheet,
  TextInput,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import TheSanPham from "../../dung_chung/tsx/TheSanPham";
import {
  DangTai,
  KhongCoDuLieu,
  HienLoi,
} from "../../dung_chung/tsx/TrangThai";
import { MAUCHU, GIAO_DIEN, FONT } from "../../dung_chung/ts/mau_sac";
import { useDanhSachSanPham } from "../ts/sanPham";
import { SanPham } from "../../kieu_du_lieu";

type Props = {
  token: string;
  on_them_gio_hang?: (sp: SanPham) => void;
  tieu_de?: string;
};

export default function DanhSachSanPham({
  token,
  on_them_gio_hang,
  tieu_de,
}: Props) {
  const { danhSach, dangTai, loi, conTrang, tai, timKiem, timKiemMoi } =
    useDanhSachSanPham(token);

  useEffect(() => {
    tai(true);
  }, []);

  if (loi && danhSach.length === 0) {
    return <HienLoi loi={loi} on_thu_lai={() => tai(true)} />;
  }

  return (
    <View style={styles.container}>
      {/* Thanh tìm kiếm */}
      <View style={styles.tim_kiem_khung}>
        <Text style={styles.icon_tk}>🔍</Text>
        <TextInput
          style={styles.tim_kiem_input}
          placeholder="Tìm sản phẩm, thương hiệu..."
          placeholderTextColor={MAUCHU.XAM}
          value={timKiem}
          onChangeText={timKiemMoi}
          onSubmitEditing={() => tai(true)}
          returnKeyType="search"
        />
        {timKiem.length > 0 && (
          <TouchableOpacity onPress={() => timKiemMoi("")}>
            <Text style={styles.xoa_tk}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={danhSach}
        keyExtractor={(item) => String(item.MaSanPham)}
        numColumns={2}
        columnWrapperStyle={styles.cot}
        contentContainerStyle={styles.danh_sach}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <TheSanPham san_pham={item} on_them_gio_hang={on_them_gio_hang} />
          </View>
        )}
        ListEmptyComponent={
          !dangTai ? (
            <KhongCoDuLieu thong_bao="Không tìm thấy sản phẩm" icon="🔍" />
          ) : null
        }
        ListFooterComponent={dangTai ? <DangTai /> : null}
        onEndReached={() => conTrang && tai()}
        onEndReachedThreshold={0.3}
        onRefresh={() => tai(true)}
        refreshing={dangTai && danhSach.length === 0}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MAUCHU.XAM_NHAT },
  tim_kiem_khung: {
    flexDirection: "row",
    alignItems: "center",
    margin: GIAO_DIEN.PADDING,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: MAUCHU.TRANG,
    borderRadius: GIAO_DIEN.BORDER_RADIUS,
    gap: 10,
    ...GIAO_DIEN.SHADOW,
  },
  icon_tk: { fontSize: 18 },
  tim_kiem_input: { flex: 1, fontSize: 14, color: MAUCHU.DEN },
  xoa_tk: { fontSize: 16, color: MAUCHU.XAM, padding: 4 },
  danh_sach: { paddingHorizontal: GIAO_DIEN.PADDING, paddingBottom: 20 },
  cot: { gap: GIAO_DIEN.PADDING / 2 },
  item: { flex: 1, marginBottom: GIAO_DIEN.PADDING / 2 },
});
