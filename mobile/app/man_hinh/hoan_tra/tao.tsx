import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { hoanTraService, ReturnOrder } from "@/dich_vu/hoanTra";

const reasons = [["GIAO_SAI", "Giao sai sản phẩm"], ["GIAO_THIEU", "Giao thiếu sản phẩm"], ["HU_HONG", "Bao bì/sản phẩm hư hỏng"], ["HET_HAN_CHAT_LUONG", "Hết hạn hoặc lỗi chất lượng"], ["KHONG_DUNG_MO_TA", "Không đúng mô tả"], ["DI_UNG", "Dị ứng/kích ứng"], ["DOI_Y", "Đổi ý (hàng còn nguyên tem)"]];

export default function CreateReturn() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const rawOrderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const requestedOrderId = Number(rawOrderId) || 0;
  const [orders, setOrders] = useState<ReturnOrder[]>([]);
  const [order, setOrder] = useState<ReturnOrder | null>(null);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [sealed, setSealed] = useState(false);
  const [files, setFiles] = useState<Array<{ uri: string; name: string; mimeType: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [eligibilityReason, setEligibilityReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(""); setEligibilityReason("");
    try {
      const response = await hoanTraService.layDonHangDuocTra();
      const available = response.data || [];
      setOrders(available);
      if (requestedOrderId) {
        const selectedOrder = available.find(item => Number(item.MaHoaDon) === requestedOrderId);
        if (selectedOrder) { setOrder(selectedOrder); setSelected({}); }
        else {
          setOrder(null);
          try { const status = await hoanTraService.dieuKien(requestedOrderId); setEligibilityReason(status.data.reason || "Đơn này hiện không đủ điều kiện hoàn trả"); }
          catch (e: any) { setEligibilityReason(e?.message || "Không kiểm tra được điều kiện hoàn trả"); }
        }
      }
    } catch (e: any) { setError(e?.message || "Không tải được đơn đủ điều kiện"); }
    finally { setLoading(false); }
  }, [requestedOrderId]);

  useEffect(() => { void load(); }, [load]);

  const chooseImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 5, quality: 0.8 });
    if (!result.canceled) setFiles(result.assets.slice(0, 5).map((asset, index) => ({ uri: asset.uri, name: asset.fileName || `return-evidence-${Date.now()}-${index}.jpg`, mimeType: asset.mimeType || "image/jpeg" })));
  };

  const submit = async () => {
    if (!order) return Alert.alert("Chọn đơn hàng", "Hãy chọn đơn muốn trả.");
    const items = Object.entries(selected).filter(([, quantity]) => quantity > 0).map(([id, SoLuong]) => ({ MaSanPham: Number(id), SoLuong }));
    if (!items.length) return Alert.alert("Chọn sản phẩm", "Chọn ít nhất một dòng hàng.");
    if (!reason) return Alert.alert("Chọn lý do", "Lý do hoàn trả là bắt buộc.");
    if (reason === "DOI_Y" && !sealed) return Alert.alert("Xác nhận điều kiện", "Đổi ý chỉ được yêu cầu khi hàng còn nguyên tem, chưa mở, chưa dùng.");
    if (reason === "HU_HONG" && !files.length) return Alert.alert("Cần ảnh bằng chứng", "Vui lòng thêm ít nhất một ảnh cho sản phẩm hư hỏng.");
    setSaving(true); setError("");
    try {
      const key = `ret-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
      const response = await hoanTraService.taoYeuCau({ MaHoaDon: order.MaHoaDon, items, LyDo: reason, MoTa: description.trim(), LoaiYeuCau: "HOAN_TIEN", PhuongThucNhanTien: "CHUYEN_KHOAN", XacNhanNguyenTem: reason === "DOI_Y" ? sealed : undefined, IdempotencyKey: key });
      const returnId = response.data.Id;
      if (files.length) {
        try { await hoanTraService.taiBangChung(returnId, files); }
        catch (uploadError: any) {
          Alert.alert("Đã nhận yêu cầu, ảnh chưa tải lên", uploadError?.message || "Mở chi tiết yêu cầu để thử tải ảnh lại.", [{ text: "Mở chi tiết", onPress: () => router.replace({ pathname: "/man_hinh/hoan_tra/chi_tiet/[id]", params: { id: String(returnId) } }) }]);
          return;
        }
      }
      Alert.alert("Đã tiếp nhận", `Mã yêu cầu RT${String(returnId).padStart(8, "0")}. Yêu cầu đang chờ cửa hàng xem xét; chưa có khoản hoàn tiền hoặc cập nhật tồn kho nào được thực hiện.`, [{ text: "Xem yêu cầu", onPress: () => router.replace({ pathname: "/man_hinh/hoan_tra/chi_tiet/[id]", params: { id: String(returnId) } }) }]);
    } catch (e: any) { setError(e?.message || "Không gửi được yêu cầu"); }
    finally { setSaving(false); }
  };

  return <SafeAreaView style={s.safe}>
    <View style={s.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={23} color="#173E32" /></TouchableOpacity><Text style={s.title}>Tạo yêu cầu hoàn trả</Text><TouchableOpacity onPress={() => void load()}><Ionicons name="refresh" size={21} color="#176A50" /></TouchableOpacity></View>
    {loading ? <View style={s.center}><ActivityIndicator color="#176A50" /><Text style={s.muted}>Đang kiểm tra đơn đủ điều kiện…</Text></View> : <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        {error ? <View style={s.errorBox}><Text style={s.error}>{error}</Text><TouchableOpacity onPress={() => void load()}><Text style={s.green}>Thử lại</Text></TouchableOpacity></View> : null}
        {eligibilityReason ? <View style={s.errorBox}><Text style={s.error}>{eligibilityReason}</Text></View> : null}
        <View style={s.notice}><Ionicons name="information-circle-outline" size={19} color="#176A50" /><Text style={s.noticeText}>Chỉ gửi yêu cầu để cửa hàng xem xét. Chấp thuận không đồng nghĩa đã hoàn tiền; hàng chỉ được kiểm tra và xử lý kho sau khi nhận thực tế.</Text></View>
        <Text style={s.heading}>Đơn hàng đủ điều kiện</Text>
        {orders.length === 0 ? <Text style={s.muted}>Hiện không có đơn đã giao, đã thanh toán và còn trong thời hạn theo chính sách của cửa hàng.</Text> : orders.map(item => <TouchableOpacity key={item.MaHoaDon} style={[s.card, order?.MaHoaDon === item.MaHoaDon && s.selected]} onPress={() => { setOrder(item); setSelected({}); setEligibilityReason(""); }}><Text style={s.bold}>Đơn #{item.MaHoaDon}</Text><Text style={s.muted}>{new Date(item.NgayLap).toLocaleDateString("vi-VN")} · {item.SanPham.length} mặt hàng · {Number(item.TongTien).toLocaleString("vi-VN")}đ</Text></TouchableOpacity>)}
        {order && <>
          <Text style={s.heading}>Chọn mặt hàng và số lượng</Text>
          {order.SanPham.map(product => <View style={s.product} key={product.MaSanPham}><View style={{ flex: 1 }}><Text style={s.bold}>{product.TenSanPham}</Text><Text style={s.muted}>Còn có thể yêu cầu: {product.SoLuong}</Text></View><View style={s.qty}><TouchableOpacity onPress={() => setSelected(current => ({ ...current, [product.MaSanPham]: Math.max(0, (current[product.MaSanPham] || 0) - 1) }))}><Text style={s.qtyText}>−</Text></TouchableOpacity><Text style={s.bold}>{selected[product.MaSanPham] || 0}</Text><TouchableOpacity onPress={() => setSelected(current => ({ ...current, [product.MaSanPham]: Math.min(product.SoLuong, (current[product.MaSanPham] || 0) + 1) }))}><Text style={s.qtyText}>＋</Text></TouchableOpacity></View></View>)}
          <Text style={s.heading}>Lý do</Text>{reasons.map(([id, label]) => <TouchableOpacity key={id} style={[s.reason, reason === id && s.selected]} onPress={() => setReason(id)}><Ionicons name={reason === id ? "radio-button-on" : "radio-button-off"} size={20} color={reason === id ? "#176A50" : "#a6b0aa"} /><Text style={s.reasonText}>{label}</Text></TouchableOpacity>)}
          {reason === "DOI_Y" && <TouchableOpacity style={s.reason} onPress={() => setSealed(value => !value)}><Ionicons name={sealed ? "checkbox" : "square-outline"} size={20} color="#176A50" /><Text style={s.reasonText}>Tôi xác nhận hàng còn nguyên tem, chưa mở và chưa sử dụng</Text></TouchableOpacity>}
          <Text style={s.heading}>Mô tả (tùy chọn)</Text><TextInput value={description} onChangeText={setDescription} maxLength={500} multiline style={s.textarea} placeholder="Mô tả cụ thể tình trạng sản phẩm…" /><Text style={s.muted}>{description.length}/500</Text>
          <Text style={s.heading}>Ảnh bằng chứng · tối đa 5 ảnh</Text><TouchableOpacity style={s.upload} onPress={() => void chooseImages()}><Ionicons name="camera-outline" size={20} color="#176A50" /><Text style={s.green}>{files.length ? `${files.length} ảnh đã chọn · Thêm ảnh` : "Chọn ảnh bằng chứng"}</Text></TouchableOpacity>
        </>}
        <TouchableOpacity disabled={saving || !order} style={[s.submit, (saving || !order) && { opacity: 0.55 }]} onPress={() => void submit()}>{saving ? <ActivityIndicator color="white" /> : <Text style={s.submitText}>Gửi yêu cầu</Text>}</TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>}
  </SafeAreaView>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#F5FAF7" }, header: { height: 56, backgroundColor: "white", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { fontSize: 17, fontWeight: "800", color: "#173E32" }, content: { padding: 15, paddingBottom: 32 }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }, muted: { fontSize: 12, color: "#75827b", marginTop: 5 }, notice: { backgroundColor: "#e9f4ee", padding: 12, borderRadius: 10, flexDirection: "row", gap: 9 }, noticeText: { flex: 1, fontSize: 12, color: "#365c49", lineHeight: 18 }, heading: { fontSize: 15, fontWeight: "800", color: "#173E32", marginTop: 18, marginBottom: 8 }, card: { backgroundColor: "white", padding: 13, borderRadius: 11, borderWidth: 1, borderColor: "#e5ede8", marginBottom: 7 }, selected: { borderColor: "#176A50", backgroundColor: "#f1faf4" }, bold: { fontSize: 14, fontWeight: "700", color: "#20372c" }, product: { backgroundColor: "white", padding: 12, borderRadius: 10, marginBottom: 7, flexDirection: "row", alignItems: "center", gap: 12 }, qty: { flexDirection: "row", alignItems: "center", gap: 12 }, qtyText: { fontSize: 22, color: "#176A50", paddingHorizontal: 4 }, reason: { backgroundColor: "white", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e5ede8", marginBottom: 7, flexDirection: "row", alignItems: "center", gap: 9 }, reasonText: { flex: 1, color: "#30433a", fontSize: 13 }, textarea: { backgroundColor: "white", borderRadius: 10, borderColor: "#dce7e0", borderWidth: 1, minHeight: 90, padding: 12, textAlignVertical: "top" }, upload: { height: 48, borderWidth: 1, borderColor: "#b4d0c0", borderStyle: "dashed", borderRadius: 10, backgroundColor: "white", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, green: { color: "#176A50", fontWeight: "700" }, submit: { backgroundColor: "#176A50", height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 23 }, submitText: { color: "white", fontWeight: "800", fontSize: 15 }, errorBox: { padding: 11, backgroundColor: "#fff2f1", borderRadius: 10, marginBottom: 8 }, error: { color: "#a33", fontSize: 13 } });
