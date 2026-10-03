import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/nguon/AuthContext";
import { donHangService } from "@/dich_vu/donHang";
import { HoaDon } from "@/kieu_du_lieu/DonHang";
import { ChiTietVanDon, vanChuyenService, VanDonCuaToi } from "@/dich_vu/vanchuyen";

const LABELS: Record<string, string> = { CHO_LAY_HANG: "Chờ lấy hàng", DA_LAY_HANG: "Đã lấy hàng", DANG_VAN_CHUYEN: "Đang vận chuyển", DANG_GIAO: "Đang giao", GIAO_THANH_CONG: "Giao thành công", GIAO_THAT_BAI: "Giao thất bại", CHO_GIAO_LAI: "Chờ giao lại", DANG_HOAN_VE: "Đang hoàn về", DA_HOAN_VE: "Đã hoàn về", DA_HUY_VAN_DON: "Đã hủy vận đơn" };
const dateText = (value?: string) => value ? new Date(value).toLocaleString("vi-VN") : "—";
const money = (v?: number) => `${Number(v || 0).toLocaleString("vi-VN")} ₫`;

export default function TheoDoiVanChuyenScreen() {
  const params = useLocalSearchParams<{ id?: string; hoaDonId?: string }>();
  const id = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const orderId = Number(Array.isArray(params.hoaDonId) ? params.hoaDonId[0] : params.hoaDonId);
  const { token } = useAuth();
  const [deliveries, setDeliveries] = useState<VanDonCuaToi[]>([]);
  const [delivery, setDelivery] = useState<ChiTietVanDon | null>(null);
  const [preparingOrder, setPreparingOrder] = useState<HoaDon | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (!token) { setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."); setLoading(false); return; }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      // Verify order ownership through /hoadon/:id before showing the truthful
      // pre-shipment state. A missing shipment is not itself a tracking error.
      const order = orderId ? (await donHangService.layChiTiet(orderId, token)).data : null;
      setPreparingOrder(order);
      const list = await vanChuyenService.layDanhSachCuaToi(token);
      setDeliveries(list.data);
      const chosen = id ? list.data.find(x => Number(x.Id) === id) : orderId ? list.data.find(x => Number(x.HoaDonId) === orderId) : null;
      if (id && !chosen) { setDelivery(null); setError("Không tìm thấy vận đơn thuộc tài khoản của bạn."); return; }
      if (chosen) setDelivery((await vanChuyenService.layChiTiet(chosen.Id, token)).data);
      else setDelivery(null);
    } catch (e: any) { setError(e?.message || "Không thể tải thông tin vận chuyển."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [id, orderId, token]);
  useEffect(() => { void load(); }, [load]);

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#173E32" /></TouchableOpacity><Text style={styles.title}>{delivery ? "Theo dõi vận đơn" : preparingOrder ? "Tiến độ đơn hàng" : "Vận chuyển của tôi"}</Text><TouchableOpacity onPress={() => void load(true)}><Ionicons name="refresh" size={21} color="#176A50" /></TouchableOpacity></View>
    {loading ? <View style={styles.center}><ActivityIndicator color="#ec168c" /><Text style={styles.muted}>Đang tải vận chuyển…</Text></View> : error ? <View style={styles.center}><Ionicons name="cloud-offline-outline" size={38} color="#ec168c" /><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={() => void load()} style={styles.button}><Text style={styles.buttonText}>Thử lại</Text></TouchableOpacity></View> : delivery ? <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#ec168c" />}>
      <View style={styles.card}><View style={styles.between}><Text style={styles.section}>Mã vận đơn</Text><Text style={styles.code}>{delivery.MaVanDon || "Chưa có mã"}</Text></View><Text style={styles.muted}>Đơn hàng #{delivery.HoaDonId} · {delivery.TenDonVi || "Đơn vị vận chuyển"}</Text><View style={styles.status}><Ionicons name="car-outline" size={22} color="#ec168c" /><Text style={styles.statusText}>{LABELS[delivery.TrangThai] || delivery.TrangThai}</Text></View><Text style={styles.muted}>Cập nhật gần nhất: {dateText(delivery.UpdatedAt || delivery.CreatedAt)}</Text>{delivery.LyDoThatBai ? <Text style={styles.failed}>Lý do giao thất bại: {delivery.LyDoThatBai}</Text> : null}</View>
      <View style={styles.card}><Text style={styles.section}>Người nhận</Text><Text style={styles.value}>{delivery.TenNguoiNhan || "—"}</Text><Text style={styles.muted}>{delivery.SoDienThoaiNhan || "—"}</Text><Text style={styles.value}>{delivery.DiaChiGiaoHang || "—"}</Text></View>
      <View style={styles.card}><Text style={styles.section}>Thông tin giao hàng</Text><View style={styles.between}><Text style={styles.muted}>Dự kiến giao</Text><Text style={styles.value}>{delivery.NgayDuKienGiao ? new Date(delivery.NgayDuKienGiao).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</Text></View><View style={styles.between}><Text style={styles.muted}>Tiền thu hộ (COD)</Text><Text style={styles.value}>{money(delivery.TienThuHo)}</Text></View><View style={styles.between}><Text style={styles.muted}>COD</Text><Text style={styles.value}>{delivery.TrangThaiCOD || "—"}</Text></View></View>
      <View style={styles.card}><Text style={styles.section}>Hành trình vận chuyển</Text>{delivery.Timeline?.length ? delivery.Timeline.map((item, index) => <View style={styles.timeline} key={item.Id || index}><View style={styles.marker}><View style={styles.dot} />{index < delivery.Timeline.length - 1 && <View style={styles.line} />}</View><View style={styles.event}><Text style={styles.eventTitle}>{LABELS[item.TrangThaiMoi] || item.TrangThaiMoi}</Text><Text style={styles.muted}>{dateText(item.CreatedAt)}{item.ViTri ? ` · ${item.ViTri}` : ""}</Text>{item.GhiChu ? <Text style={styles.muted}>{item.GhiChu}</Text> : null}{item.LyDoThatBai ? <Text style={styles.failed}>{item.LyDoThatBai}</Text> : null}</View></View>) : <Text style={styles.muted}>Đơn vị vận chuyển chưa ghi nhận hành trình.</Text>}</View>
    </ScrollView> : preparingOrder ? <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#176A50" />}>
      <View style={styles.card}><Text style={styles.section}>Đơn hàng #{preparingOrder.MaHoaDon}</Text><View style={styles.status}><Ionicons name="cube-outline" size={22} color="#176A50"/><Text style={styles.statusText}>{preparingOrder.TrangThai}</Text></View><Text style={styles.muted}>Đơn hàng đang được cửa hàng xử lý. Thông tin vận đơn sẽ xuất hiện tại đây sau khi đóng gói và bàn giao.</Text><TouchableOpacity style={styles.orderButton} onPress={() => router.push({ pathname: "/man_hinh/chi_tiet_don_hang", params: { id: String(preparingOrder.MaHoaDon) } } as any)}><Text style={styles.orderButtonText}>Xem chi tiết đơn hàng</Text></TouchableOpacity></View>
    </ScrollView> : <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#176A50" />}>
      {deliveries.length ? deliveries.map(item => <TouchableOpacity key={item.Id} style={styles.card} onPress={() => router.replace({ pathname: "/man_hinh/theo_doi_van_chuyen", params: { id: String(item.Id) } } as any)}><View style={styles.between}><Text style={styles.code}>{item.MaVanDon}</Text><Text style={styles.badge}>{LABELS[item.TrangThai] || item.TrangThai}</Text></View><Text style={styles.muted}>Đơn #{item.HoaDonId} · {item.TenDonVi}</Text><Text style={styles.muted}>Cập nhật {dateText(item.CreatedAt)}</Text></TouchableOpacity>) : <View style={styles.center}><Ionicons name="car-outline" size={40} color="#d4a1b8" /><Text style={styles.section}>Chưa có vận đơn</Text><Text style={styles.muted}>Vận đơn sẽ xuất hiện sau khi đơn hàng được đóng gói.</Text></View>}
    </ScrollView>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#F5F8F6" }, header: { backgroundColor: "white", flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#E5ECE7" }, title: { fontSize: 18, fontWeight: "700", color: "#173E32" }, content: { padding: 14, paddingBottom: 30, gap: 11 }, card: { backgroundColor: "white", borderRadius: 14, padding: 15, borderWidth: 1, borderColor: "#E4ECE7" }, between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }, section: { fontSize: 15, fontWeight: "700", color: "#173E32" }, code: { color: "#176A50", fontWeight: "800", fontSize: 14 }, muted: { color: "#718078", fontSize: 12, marginTop: 6 }, value: { color: "#20382E", fontSize: 13, marginTop: 7 }, status: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#EAF5EF", borderRadius: 10, padding: 11, marginTop: 12 }, statusText: { color: "#176A50", fontWeight: "700" }, badge: { overflow: "hidden", color: "#176A50", backgroundColor: "#EAF5EF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, fontSize: 11 }, timeline: { flexDirection: "row", minHeight: 65 }, marker: { width: 20, alignItems: "center" }, dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#238A54", marginTop: 5 }, line: { width: 2, flex: 1, backgroundColor: "#C7E2D1", marginVertical: 3 }, event: { flex: 1, paddingBottom: 14, paddingLeft: 6 }, eventTitle: { fontWeight: "700", color: "#20382E", fontSize: 13 }, failed: { color: "#C53C50", fontSize: 12, marginTop: 6 }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 25, gap: 9 }, error: { textAlign: "center", color: "#A12F50" }, button: { backgroundColor: "#176A50", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9, marginTop: 3 }, buttonText: { color: "white", fontWeight: "700" }, orderButton: { backgroundColor: "#176A50", padding: 13, borderRadius: 10, alignItems: "center", marginTop: 16 }, orderButtonText: { color: "white", fontWeight: "700" } });
