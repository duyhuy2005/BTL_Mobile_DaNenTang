import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { duongDanAnh } from "@/dich_vu/duongDanAnh";
import { hoanTraService, ReturnDetail } from "@/dich_vu/hoanTra";

const labels: Record<string, string> = {
  CHO_DUYET: "Chờ xem xét", DA_DUYET: "Đã chấp thuận", TU_CHOI: "Bị từ chối",
  CHO_KHACH_GUI_HANG: "Chờ gửi hàng", CHO_LAY_HANG_HOAN: "Chờ nhận hàng",
  DA_LAY_HANG_HOAN: "Đã lấy hàng", DANG_HOAN_VE: "Đang hoàn về",
  DA_NHAN_HANG_HOAN: "Đã nhận hàng", DANG_KIEM_TRA: "Đang kiểm tra",
  CHAP_NHAN_HOAN: "Đã chấp nhận sau kiểm tra", TU_CHOI_SAU_KIEM_TRA: "Bị từ chối sau kiểm tra",
  CHO_HOAN_TIEN: "Chờ hoàn tiền", DANG_HOAN_TIEN: "Đang hoàn tiền",
  DA_HOAN_TIEN: "Đã hoàn tiền", HOAN_TIEN_THAT_BAI: "Hoàn tiền chưa thành công",
  HOAN_TAT: "Hoàn tất", DA_HUY: "Đã hủy",
};
const money = (value: number) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

export default function ReturnDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const router = useRouter();
  const [data, setData] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (!Number.isSafeInteger(id) || id <= 0) { setError("Mã yêu cầu hoàn trả không hợp lệ."); setLoading(false); return; }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try { setData((await hoanTraService.chiTiet(id)).data); }
    catch (reason: any) { setError(reason?.message || "Không tải được chi tiết yêu cầu."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const cancel = () => Alert.alert("Hủy yêu cầu", "Bạn có thể hủy khi yêu cầu đang chờ xem xét, đã chấp thuận hoặc chờ gửi hàng.", [
    { text: "Để sau", style: "cancel" },
    { text: "Hủy yêu cầu", style: "destructive", onPress: async () => {
      try { await hoanTraService.huy(id); await load(true); }
      catch (reason: any) { Alert.alert("Không thể hủy", reason?.message || "Hãy tải lại trạng thái yêu cầu."); }
    } },
  ]);
  const addEvidence = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Cần quyền truy cập ảnh", "Cho phép BeautyStore truy cập thư viện để gửi ảnh bằng chứng."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 6, quality: 0.8 });
    if (result.canceled || !result.assets.length) return;
    setUploadingEvidence(true);
    try {
      await hoanTraService.taiBangChung(id, result.assets.slice(0, 6).map((asset, index) => ({ uri: asset.uri, name: asset.fileName || `return-evidence-${Date.now()}-${index}.jpg`, mimeType: asset.mimeType || "image/jpeg" })));
      await load(true);
    } catch (reason: any) { Alert.alert("Chưa tải được ảnh", reason?.message || "Hãy thử gửi ảnh lại."); }
    finally { setUploadingEvidence(false); }
  };

  return <SafeAreaView style={s.safe}>
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={23} color="#173E32" /></TouchableOpacity>
      <Text style={s.headerTitle}>Chi tiết hoàn trả</Text>
      <TouchableOpacity onPress={() => void load(true)}><Ionicons name="refresh" size={21} color="#176A50" /></TouchableOpacity>
    </View>
    {loading ? <View style={s.center}><ActivityIndicator color="#176A50" /><Text style={s.muted}>Đang tải chi tiết…</Text></View>
      : error || !data ? <View style={s.center}><Text style={s.error}>{error || "Không tìm thấy yêu cầu."}</Text><TouchableOpacity style={s.button} onPress={() => void load()}><Text style={s.buttonText}>Thử lại</Text></TouchableOpacity></View>
        : <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#176A50" />}>
          <View style={s.card}>
            <View style={s.row}><Text style={s.code}>{data.MaYeuCau}</Text><Text style={s.status}>{labels[data.TrangThai] || data.TrangThai}</Text></View>
            <Text style={s.muted}>Đơn #{data.MaHoaDon} · Tạo {new Date(data.NgayYeuCau).toLocaleString("vi-VN")}</Text>
            <Text style={s.muted}>Lý do: {data.LyDo}</Text>
            {data.MoTa ? <Text style={s.body}>{data.MoTa}</Text> : null}
            {data.LyDoTuChoi ? <Text style={s.error}>Phản hồi cửa hàng: {data.LyDoTuChoi}</Text> : null}
          </View>
          <View style={s.card}><Text style={s.heading}>Sản phẩm hoàn trả</Text>{data.chiTiet.map((item) => {
            const image = duongDanAnh(item.HinhAnh);
            return <View style={s.product} key={item.Id}>
              {image ? <Image source={{ uri: image }} style={s.image} /> : <View style={[s.image, s.placeholder]}><Ionicons name="image-outline" size={20} color="#9baa9f" /></View>}
              <View style={{ flex: 1 }}><Text style={s.productName}>{item.TenSanPham}</Text><Text style={s.muted}>Số lượng: {item.SoLuongTra} · Giá mua {money(item.DonGiaSnapshot)}</Text></View>
              <Text style={s.amount}>{money(item.SoTienDuKien)}</Text>
            </View>;
          })}</View>
          {(data.bangChung.length > 0 || data.TrangThai === "CHO_DUYET") && <View style={s.card}><View style={s.row}><Text style={s.heading}>Ảnh bằng chứng</Text>{data.TrangThai === "CHO_DUYET" && <TouchableOpacity disabled={uploadingEvidence} onPress={() => void addEvidence()}><Text style={s.addEvidence}>{uploadingEvidence ? "Đang tải…" : "+ Thêm ảnh"}</Text></TouchableOpacity>}</View>{data.bangChung.length > 0 ? <View style={s.images}>{data.bangChung.map((image) => <Image key={image.Id} source={{ uri: duongDanAnh(image.Url, "returns") }} style={s.evidence} />)}</View> : <Text style={s.muted}>Chưa có ảnh bằng chứng. Bạn có thể bổ sung khi yêu cầu đang chờ duyệt.</Text>}</View>}
          <View style={s.card}><Text style={s.heading}>Tiến trình xử lý</Text>{data.timeline.map((event, index) => <View style={s.timeline} key={`${event.NgayTao}-${index}`}><View style={s.dot} /><View style={{ flex: 1 }}><Text style={s.productName}>{labels[event.TrangThaiMoi] || event.TrangThaiMoi}</Text><Text style={s.muted}>{new Date(event.NgayTao).toLocaleString("vi-VN")}</Text></View></View>)}</View>
          <View style={s.card}>
            <Text style={s.heading}>Thông tin hoàn tiền</Text>
            <View style={s.row}><Text style={s.muted}>Trạng thái</Text><Text style={s.productName}>{data.SoTienDaHoan >= data.SoTienDuKien && data.SoTienDuKien > 0 ? "Đã hoàn đủ" : data.SoTienDaHoan > 0 ? "Đã hoàn một phần" : "Chưa thực hiện"}</Text></View>
            <View style={s.row}><Text style={s.muted}>Dự kiến</Text><Text style={s.amount}>{money(data.SoTienDuKien)}</Text></View>
            <View style={s.row}><Text style={s.muted}>Đã hoàn</Text><Text style={s.productName}>{money(data.SoTienDaHoan)}</Text></View>
            {data.giaoDichHoanTien.map((item, index) => <Text style={s.muted} key={`${item.NgayTao}-${index}`}>{item.PhuongThuc} · {item.TrangThai} · {money(item.SoTien)}</Text>)}
          </View>
          {["CHO_DUYET", "DA_DUYET", "CHO_KHACH_GUI_HANG"].includes(data.TrangThai) && <TouchableOpacity style={s.cancel} onPress={cancel}><Text style={s.cancelText}>Hủy yêu cầu</Text></TouchableOpacity>}
        </ScrollView>}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5FAF7" }, header: { height: 56, paddingHorizontal: 16, backgroundColor: "white", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, headerTitle: { fontWeight: "800", fontSize: 17, color: "#173E32" }, content: { padding: 14, paddingBottom: 30, gap: 10 }, card: { backgroundColor: "white", padding: 14, borderRadius: 13, borderWidth: 1, borderColor: "#E3ECE6" }, row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginVertical: 3 }, code: { fontWeight: "900", fontSize: 19, color: "#173E32" }, status: { fontSize: 11, fontWeight: "800", color: "#966000", backgroundColor: "#FFF1D4", borderRadius: 11, paddingHorizontal: 9, paddingVertical: 6, overflow: "hidden" }, muted: { fontSize: 12, color: "#77837C", marginTop: 5 }, body: { fontSize: 13, color: "#364940", marginTop: 9 }, heading: { fontSize: 15, fontWeight: "800", color: "#173E32", marginBottom: 7 }, addEvidence: { color: "#176A50", fontSize: 12, fontWeight: "800" }, product: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderTopWidth: 1, borderColor: "#EDF1EE" }, image: { width: 58, height: 58, borderRadius: 9, backgroundColor: "#F0F4F1" }, placeholder: { alignItems: "center", justifyContent: "center" }, productName: { fontSize: 13, fontWeight: "700", color: "#263A30" }, amount: { fontSize: 13, fontWeight: "800", color: "#176A50" }, images: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, evidence: { width: 95, height: 95, borderRadius: 8, backgroundColor: "#EDF2EF" }, timeline: { flexDirection: "row", gap: 10, paddingVertical: 7 }, dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: "#168654", marginTop: 5 }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 25, gap: 12 }, error: { color: "#AA3333" }, button: { backgroundColor: "#176A50", padding: 12, borderRadius: 9 }, buttonText: { color: "white", fontWeight: "700" }, cancel: { padding: 13, alignItems: "center", backgroundColor: "white", borderWidth: 1, borderColor: "#CE6558", borderRadius: 11 }, cancelText: { color: "#B44438", fontWeight: "800" },
});
