import React, { useEffect } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  DangTai,
  HienLoi,
  KhongCoDuLieu,
} from "../../dung_chung/tsx/TrangThai";
import { MAUCHU, GIAO_DIEN, FONT } from "../../dung_chung/ts/mau_sac";
import { useDanhMuc } from "../ts/danhMuc";
import { DanhMuc } from "../../kieu_du_lieu";

type Props = { token: string };

export default function DanhSachDanhMuc({ token }: Props) {
  const { danhSach, dangTai, loi, tai } = useDanhMuc(token);
  const router = useRouter();

  useEffect(() => {
    tai();
  }, []);

  if (dangTai) return <DangTai />;
  if (loi) return <HienLoi loi={loi} on_thu_lai={tai} />;

  return (
    <FlatList
      data={danhSach}
      keyExtractor={(item) => String(item.MaDanhMuc)}
      numColumns={2}
      columnWrapperStyle={styles.cot}
      contentContainerStyle={styles.ds}
      ListEmptyComponent={
        <KhongCoDuLieu thong_bao="Không có danh mục" icon="📂" />
      }
      renderItem={({ item }) => (
        <TheoDanhMuc
          danh_muc={item}
          on_nhan={() =>
            router.push(`/man_hinh/san_pham?maDanhMuc=${item.MaDanhMuc}`)
          }
        />
      )}
      showsVerticalScrollIndicator={false}
      onRefresh={tai}
      refreshing={dangTai}
    />
  );
}

function TheoDanhMuc({
  danh_muc,
  on_nhan,
}: {
  danh_muc: DanhMuc;
  on_nhan: () => void;
}) {
  return (
    <TouchableOpacity style={styles.the} onPress={on_nhan} activeOpacity={0.85}>
      <View style={styles.hinh_khung}>
        {danh_muc.HinhAnh ? (
          <Image
            source={{ uri: danh_muc.HinhAnh }}
            style={styles.hinh}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.icon_pd}>🌸</Text>
        )}
      </View>
      <Text style={styles.ten} numberOfLines={2}>
        {danh_muc.TenDanhMuc}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  ds: { padding: GIAO_DIEN.PADDING, gap: GIAO_DIEN.PADDING / 2 },
  cot: { gap: GIAO_DIEN.PADDING / 2 },
  the: {
    flex: 1,
    backgroundColor: MAUCHU.TRANG,
    borderRadius: GIAO_DIEN.BORDER_RADIUS,
    overflow: "hidden",
    ...GIAO_DIEN.SHADOW,
  },
  hinh_khung: {
    height: 110,
    backgroundColor: MAUCHU.HONG_NHAT,
    alignItems: "center",
    justifyContent: "center",
  },
  hinh: { width: "100%", height: "100%" },
  icon_pd: { fontSize: 40 },
  ten: {
    padding: 10,
    fontSize: 13,
    fontWeight: FONT.DAM,
    color: MAUCHU.DEN,
    textAlign: "center",
  },
});
