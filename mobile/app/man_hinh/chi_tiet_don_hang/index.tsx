import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/nguon/AuthContext";
import { donHangService } from "@/dich_vu/donHang";
import { vanChuyenService, VanDonCuaToi } from "@/dich_vu/vanchuyen";
import { hoanTraService, ReturnEligibility } from "@/dich_vu/hoanTra";
import { duongDanAnh } from "@/dich_vu/duongDanAnh";
import { HoaDon } from "@/kieu_du_lieu/DonHang";

const money = (v?: number) => `${Number(v || 0).toLocaleString("vi-VN")} ₫`;
const paymentLabel: Record<string,string> = { DA_THANH_TOAN:"Đã thanh toán",THANH_TOAN_MOT_PHAN:"Đã thanh toán một phần",HOAN_MOT_PHAN:"Đã hoàn một phần",DA_HOAN_TIEN:"Đã hoàn toàn bộ" };
const statusLabel: Record<string, string> = { CHO_XAC_NHAN: "Chờ xác nhận", DA_XAC_NHAN: "Đã xác nhận", DANG_CHUAN_BI: "Đang chuẩn bị", DA_DONG_GOI: "Đã đóng gói", DANG_GIAO: "Đang giao", DA_GIAO: "Đã giao", HOAN_THANH: "Hoàn thành", DA_HUY: "Đã hủy", GIAO_THAT_BAI: "Giao thất bại" };

export default function ChiTietDonHangScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
  const { token } = useAuth();
  const [order, setOrder] = useState<HoaDon | null>(null);
  const [delivery, setDelivery] = useState<VanDonCuaToi | null>(null);
  const [returnEligibility, setReturnEligibility] = useState<ReturnEligibility | null>(null);
  const [returnEligibilityError, setReturnEligibilityError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!token || !Number.isInteger(id) || id <= 0) { setError("Mã đơn hàng không hợp lệ hoặc phiên đăng nhập đã hết hạn."); setLoading(false); return; }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const [o, s] = await Promise.all([donHangService.layChiTiet(id, token), vanChuyenService.layDanhSachCuaToi(token)]);
      setOrder(o.data);
      setDelivery(s.data.find(item => Number(item.HoaDonId) === id) || null);
      try {
        const eligibility = await hoanTraService.dieuKien(id);
        setReturnEligibility(eligibility.data);
        setReturnEligibilityError("");
      } catch (eligibilityError: any) {
        setReturnEligibility(null);
        setReturnEligibilityError(eligibilityError?.message || "Không thể kiểm tra điều kiện hoàn trả.");
      }
    } catch (e: any) { setError(e?.message || "Không thể tải chi tiết đơn hàng."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [id, token]);
  useEffect(() => { void load(); }, [load]);

  const cancelOrder = async () => {
    if (!token || !order) return;
    if (!reason.trim()) { Alert.alert("Thiếu lý do", "Vui lòng nhập lý do hủy đơn."); return; }
    setSaving(true);
    try {
      await donHangService.thaoTac(order.MaHoaDon, { action: "cancel", reason: reason.trim() }, token);
      setCancelOpen(false); setReason(""); await load(true); Alert.alert("Đã hủy đơn", "Trạng thái đơn hàng đã được cập nhật.");
    } catch (e: any) { Alert.alert("Không thể hủy đơn", e?.message || "Vui lòng tải lại và thử lại."); }
    finally { setSaving(false); }
  };

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color="#176A50" /><Text style={styles.muted}>Đang tải chi tiết đơn…</Text></View></SafeAreaView>;
  if (error || !order) return <SafeAreaView style={styles.safe}><View style={styles.center}><Ionicons name="cloud-offline-outline" size={38} color="#176A50" /><Text style={styles.error}>{error || "Không tìm thấy đơn hàng."}</Text><TouchableOpacity style={styles.button} onPress={() => void load()}><Text style={styles.buttonText}>Thử lại</Text></TouchableOpacity></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#173E32" /></TouchableOpacity><Text style={styles.title}>Chi tiết đơn hàng</Text><View style={{ width: 24 }} /></View>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#176A50" />}>
      <View style={styles.card}><View style={styles.between}><Text style={styles.order}>Đơn #{order.MaHoaDon}</Text><Text style={styles.badge}>{statusLabel[order.TrangThai] || order.TrangThai}</Text></View><Text style={styles.muted}>Đặt lúc {order.NgayLap ? new Date(order.NgayLap).toLocaleString("vi-VN") : "—"}</Text></View>
      <View style={styles.card}><Text style={styles.section}>Sản phẩm</Text>{(order.ChiTiet || []).map((p, i) => { const image = duongDanAnh(p.HinhAnh); return <View key={`${p.MaSanPham}-${i}`} style={styles.product}>{image ? <Image source={{ uri: image }} style={styles.image} /> : <View style={styles.imagePlaceholder}><Ionicons name="image-outline" size={20} color="#aaa" /></View>}<View style={{ flex: 1 }}><Text style={styles.productName}>{p.TenSanPham}</Text><Text style={styles.muted}>SL {p.SoLuong} · Giá gốc {money(p.GiaGocLucMua ?? p.DonGia)}</Text>{Number(p.TienGiamKhuyenMai) > 0 && <Text style={styles.discount}>Khuyến mại: −{money(Number(p.TienGiamKhuyenMai) * p.SoLuong)}</Text>}{p.TenChuongTrinhSnapshot && <Text style={styles.muted}>{p.TenChuongTrinhSnapshot}</Text>}</View><Text style={styles.itemPrice}>{money(p.ThanhTien)}</Text></View>; })}</View>
      <View style={styles.card}><Text style={styles.section}>Địa chỉ nhận hàng</Text><Text style={styles.value}>{order.HoTen || "Khách hàng"}</Text><Text style={styles.muted}>{order.SoDienThoaiNhan || order.SoDienThoai || "—"}</Text><Text style={styles.value}>{order.DiaChiGiaoHang || "Chưa có địa chỉ giao hàng"}</Text></View>
      <View style={styles.card}><Text style={styles.section}>Thanh toán</Text><View style={styles.between}><Text style={styles.muted}>Tạm tính</Text><Text style={styles.value}>{money(order.TamTinh)}</Text></View><View style={styles.between}><Text style={styles.muted}>Giảm giá sản phẩm</Text><Text style={styles.discount}>−{money(order.GiamGiaSanPham)}</Text></View><View style={styles.between}><Text style={styles.muted}>Voucher</Text><Text style={styles.discount}>−{money(order.GiamGiaVoucher)}</Text></View>{(order.UuDai || []).map((d, i) => <View key={`${d.MaCode}-${i}`} style={styles.between}><Text style={styles.muted}>{d.TenChuongTrinh || d.MaCode}</Text><Text style={styles.value}>{money(d.SoTienGiam)}</Text></View>)}<View style={styles.between}><Text style={styles.muted}>Phí vận chuyển</Text><Text style={styles.value}>{Number(order.PhiVanChuyen || 0) > 0 ? money(order.PhiVanChuyen) : order.TrangThaiVanChuyen === "CHUA_TAO_VAN_DON" ? "Chưa báo giá" : money(order.PhiVanChuyen)}</Text></View><View style={[styles.between, styles.totalLine]}><Text style={styles.totalLabel}>Tạm tính đơn hàng</Text><Text style={styles.total}>{money(order.TongTien)}</Text></View>{order.TrangThaiVanChuyen === "CHUA_TAO_VAN_DON" && <Text style={styles.muted}>Phí vận chuyển sẽ được cập nhật khi cửa hàng tạo vận đơn.</Text>}<Text style={styles.muted}>{order.PhuongThucThanhToan || "—"} · {paymentLabel[order.TrangThaiThanhToan||""] || "Chưa thanh toán"}</Text></View>
      <View style={styles.card}><Text style={styles.section}>Lịch sử đơn hàng</Text>{order.LichSuTrangThai?.length ? order.LichSuTrangThai.map((h, i) => <View style={styles.history} key={h.MaLichSu || i}><View style={styles.dot} /><View style={{ flex: 1 }}><Text style={styles.value}>{statusLabel[h.TrangThaiMoi] || h.TrangThaiMoi}</Text><Text style={styles.muted}>{new Date(h.NgayThayDoi).toLocaleString("vi-VN")}{h.GhiChu ? ` · ${h.GhiChu}` : ""}</Text></View></View>) : <Text style={styles.muted}>Chưa có lịch sử trạng thái.</Text>}</View>
      {order.TrangThai !== "DA_HUY" && <TouchableOpacity style={styles.trackButton} onPress={() => router.push(delivery ? { pathname: "/man_hinh/theo_doi_van_chuyen", params: { id: String(delivery.Id) } } as any : { pathname: "/man_hinh/theo_doi_van_chuyen", params: { hoaDonId: String(order.MaHoaDon) } } as any)}><Ionicons name="car-outline" size={20} color="white" /><Text style={styles.trackText}>{delivery ? `Theo dõi vận chuyển · ${delivery.MaVanDon}` : "Theo dõi tiến độ đơn hàng"}</Text><Ionicons name="chevron-forward" size={18} color="white" /></TouchableOpacity>}
      {order.TrangThai === "CHO_XAC_NHAN" && <TouchableOpacity style={styles.cancelButton} onPress={() => setCancelOpen(true)}><Text style={styles.cancelText}>Yêu cầu hủy đơn</Text></TouchableOpacity>}
      {returnEligibility?.canRequestReturn
        ? <TouchableOpacity style={{ backgroundColor: "#C46416", padding: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }} onPress={() => router.push({ pathname: "/man_hinh/hoan_tra/tao", params: { orderId: String(order.MaHoaDon) } } as any)}><Ionicons name="arrow-undo-outline" size={19} color="white" /><Text style={{ color: "white", fontWeight: "800" }}>Yêu cầu hoàn trả</Text></TouchableOpacity>
        : <View style={{ padding: 13, backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: "#E4ECE7" }}><Text style={{ color: "#173E32", fontWeight: "700" }}>Hoàn trả</Text><Text style={styles.muted}>{returnEligibilityError ? `${returnEligibilityError} Kéo xuống để thử lại.` : returnEligibility?.reason || "Đang kiểm tra điều kiện hoàn trả…"}</Text></View>}
    </ScrollView>
    <Modal visible={cancelOpen} transparent animationType="fade" onRequestClose={() => setCancelOpen(false)}><View style={styles.modalBackdrop}><View style={styles.modal}><Text style={styles.section}>Lý do hủy đơn</Text><TextInput style={styles.reason} value={reason} onChangeText={setReason} multiline placeholder="Nhập lý do hủy đơn" /><View style={styles.between}><TouchableOpacity onPress={() => setCancelOpen(false)}><Text style={styles.muted}>Quay lại</Text></TouchableOpacity><TouchableOpacity disabled={saving} style={styles.button} onPress={() => void cancelOrder()}><Text style={styles.buttonText}>{saving ? "Đang gửi…" : "Gửi yêu cầu"}</Text></TouchableOpacity></View></View></View></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#F5F8F6" }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "white", borderBottomWidth: 1, borderColor: "#E5ECE7" }, title: { fontSize: 18, fontWeight: "700", color: "#173E32" }, content: { padding: 14, paddingBottom: 32, gap: 11 }, card: { padding: 15, backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#E4ECE7" }, between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }, order: { fontSize: 16, fontWeight: "800", color: "#173E32" }, badge: { color: "#A45D00", backgroundColor: "#FFF1D4", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, overflow: "hidden" }, muted: { color: "#718078", fontSize: 12, marginTop: 5 }, section: { fontSize: 15, fontWeight: "700", color: "#173E32", marginBottom: 10 }, product: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderTopWidth: 1, borderColor: "#E8EEEA" }, image: { width: 54, height: 54, borderRadius: 9, backgroundColor: "#F1F5F2" }, imagePlaceholder: { width: 54, height: 54, borderRadius: 9, backgroundColor: "#F1F5F2", alignItems: "center", justifyContent: "center" }, productName: { color: "#20382E", fontWeight: "600", fontSize: 13 }, itemPrice: { fontSize: 12, color: "#C45C16", fontWeight: "700" }, discount: { color: "#C45C16", fontSize: 12, marginTop: 3 }, value: { color: "#20382E", fontSize: 13, marginTop: 4 }, totalLine: { borderTopWidth: 1, borderColor: "#E4ECE7", paddingTop: 10, marginTop: 8 }, totalLabel: { fontWeight: "700", color: "#173E32" }, total: { color: "#C45C16", fontSize: 17, fontWeight: "800" }, history: { flexDirection: "row", gap: 10, paddingVertical: 8 }, dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#238A54", marginTop: 7 }, trackButton: { backgroundColor: "#176A50", padding: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, trackText: { flex: 1, color: "white", fontWeight: "700", marginHorizontal: 8, fontSize: 13 }, cancelButton: { padding: 13, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#C54444", backgroundColor: "white" }, cancelText: { color: "#B4233D", fontWeight: "700" }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 25, gap: 10 }, error: { color: "#A12F50", textAlign: "center" }, button: { backgroundColor: "#176A50", paddingVertical: 10, paddingHorizontal: 17, borderRadius: 9 }, buttonText: { color: "white", fontWeight: "700" }, modalBackdrop: { flex: 1, backgroundColor: "#0008", justifyContent: "center", padding: 20 }, modal: { backgroundColor: "white", padding: 18, borderRadius: 14 }, reason: { minHeight: 90, textAlignVertical: "top", borderWidth: 1, borderColor: "#DCE6DF", borderRadius: 10, padding: 10, marginBottom: 14 } });
