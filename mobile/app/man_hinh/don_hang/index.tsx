import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/nguon/AuthContext";
import { donHangService } from "@/dich_vu/donHang";
import { duongDanAnh } from "@/dich_vu/duongDanAnh";
import { HoaDon } from "@/kieu_du_lieu/DonHang";

const TABS = [
  { key: "ALL", label: "Tất cả" }, { key: "CHO_XAC_NHAN", label: "Chờ xác nhận" },
  { key: "DANG_CHUAN_BI", label: "Đang chuẩn bị" }, { key: "DA_DONG_GOI", label: "Đã đóng gói" },
  { key: "DANG_GIAO", label: "Đang giao" }, { key: "DA_GIAO", label: "Đã giao" },
  { key: "HOAN_THANH", label: "Hoàn thành" }, { key: "DA_HUY", label: "Đã hủy" },
  { key: "HOAN_TAT", label: "Hoàn tất" },
] as const;
const STATUS: Record<string, { label: string; color: string }> = {
  CHO_XAC_NHAN: { label: "Chờ xác nhận", color: "#df8a10" }, DA_XAC_NHAN: { label: "Đã xác nhận", color: "#2d83d5" },
  DANG_CHUAN_BI: { label: "Đang chuẩn bị", color: "#2d83d5" }, DA_DONG_GOI: { label: "Đã đóng gói", color: "#7955bb" },
  DANG_GIAO: { label: "Đang giao", color: "#1685c2" }, DA_GIAO: { label: "Đã giao", color: "#238a54" },
  HOAN_THANH: { label: "Hoàn thành", color: "#238a54" }, DA_HUY: { label: "Đã hủy", color: "#d34858" },
  GIAO_THAT_BAI: { label: "Giao thất bại", color: "#d34858" }, DANG_HOAN_HANG: { label: "Đang hoàn về", color: "#9A56C8" }, DA_HOAN_HANG: { label: "Đã hoàn hàng", color: "#7C6698" },
};
const money = (v?: number) => `${Number(v || 0).toLocaleString("vi-VN")} ₫`;
const paymentLabel: Record<string,string> = { DA_THANH_TOAN:"Đã thanh toán",THANH_TOAN_MOT_PHAN:"Đã thanh toán một phần",HOAN_MOT_PHAN:"Đã hoàn một phần",DA_HOAN_TIEN:"Đã hoàn toàn bộ" };
const dateText = (value?: string) => value ? new Date(value).toLocaleString("vi-VN") : "—";

export default function DonHangScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<string>(params.tab || "ALL");
  const [rows, setRows] = useState<HoaDon[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const loadingMore = useRef(false);

  const load = useCallback(async (nextPage = 1, refresh = false) => {
    if (nextPage > 1 && loadingMore.current) return;
    if (nextPage > 1) loadingMore.current = true;
    if (!token) { loadingMore.current = false; setError("Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại."); setLoading(false); return; }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const response = await donHangService.layDanhSach(token, { page: nextPage, limit: 20, trangThai: tab === "ALL" || tab === "HOAN_TAT" ? undefined : tab, nhomTrangThai: tab === "HOAN_TAT" ? tab : undefined, exactStatus: true });
      setRows(current => nextPage === 1 ? response.data : [...current, ...response.data]);
      setPage(response.pagination.page);
      setTotalPages(response.pagination.totalPages);
    } catch (e: any) {
      setError(e?.message || "Không thể tải đơn hàng. Vui lòng thử lại.");
    } finally { loadingMore.current = false; setLoading(false); setRefreshing(false); }
  }, [token, tab]);

  useEffect(() => { const timer = setTimeout(() => { setRows([]); setPage(1); void load(1); }, 0); return () => clearTimeout(timer); }, [load]);
  useEffect(() => { if (!params.tab || !TABS.some(item => item.key === params.tab)) return; const timer = setTimeout(() => setTab(params.tab!), 0); return () => clearTimeout(timer); }, [params.tab]);

  const renderOrder = ({ item }: { item: HoaDon }) => {
    const status = STATUS[item.TrangThai] || { label: item.TrangThai, color: "#666" };
    return <TouchableOpacity activeOpacity={0.85} style={styles.card} onPress={() => router.push({ pathname: "/man_hinh/chi_tiet_don_hang", params: { id: String(item.MaHoaDon) } } as any)}>
      <View style={styles.rowBetween}><Text style={styles.orderId}>Đơn hàng #{item.MaHoaDon}</Text><Text style={[styles.badge, { color: status.color, backgroundColor: `${status.color}18` }]}>{status.label}</Text></View>
      <Text style={styles.muted}>Đặt lúc {dateText(item.NgayLap)}</Text>
      <View style={styles.products}>{(item.SanPhamTomTat || []).slice(0, 4).map((p, i) => {
        const uri = duongDanAnh(p.HinhAnh);
        return <View key={`${p.MaSanPham}-${i}`} style={styles.productThumb}>{uri ? <Image source={{ uri }} style={styles.thumb} /> : <Ionicons name="image-outline" size={19} color="#aaa" />}<Text style={styles.qty}>×{p.SoLuong}</Text></View>;
      })}<Text style={styles.itemCount}>{item.TongSoLuong ?? item.SoDongSanPham ?? 0} sản phẩm</Text></View>
      <View style={[styles.rowBetween, styles.bottom]}><View><Text style={styles.muted}>Thanh toán · {item.PhuongThucThanhToan || "—"}</Text><Text style={styles.payment}>{paymentLabel[item.TrangThaiThanhToan||""] || "Chưa thanh toán"}</Text></View><Text style={styles.total}>{money(item.TongTien)}</Text></View>
      <View style={styles.detailLink}><Text style={styles.link}>Xem chi tiết</Text><Ionicons name="chevron-forward" size={17} color="#176A50" /></View>
    </TouchableOpacity>;
  };

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#173E32" /></TouchableOpacity><Text style={styles.title}>Đơn hàng của tôi</Text><TouchableOpacity onPress={() => void load(1, true)}><Ionicons name="refresh" size={20} color="#176A50"/></TouchableOpacity></View>
    <FlatList horizontal data={[...TABS]} keyExtractor={x => x.key} showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabContent} renderItem={({ item }) => <TouchableOpacity style={[styles.tab, tab === item.key && styles.activeTab]} onPress={() => setTab(item.key)}><Text style={[styles.tabText, tab === item.key && styles.activeTabText]}>{item.label}</Text></TouchableOpacity>} />
    {error ? <View style={styles.center}><Ionicons name="cloud-offline-outline" size={38} color="#176A50" /><Text style={styles.error}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => void load(1)}><Text style={styles.retryText}>Thử lại</Text></TouchableOpacity></View>
      : loading && !refreshing ? <View style={styles.center}><ActivityIndicator color="#176A50" /><Text style={styles.muted}>Đang tải đơn hàng…</Text></View>
      : <FlatList data={rows} keyExtractor={item => String(item.MaHoaDon)} renderItem={renderOrder} contentContainerStyle={rows.length ? styles.list : styles.emptyList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(1, true)} tintColor="#176A50" />} ListEmptyComponent={<View style={styles.center}><Ionicons name="receipt-outline" size={42} color="#83A994" /><Text style={styles.emptyTitle}>Chưa có đơn hàng</Text><Text style={styles.muted}>Đơn hàng của bạn sẽ xuất hiện tại đây.</Text></View>} ListFooterComponent={page < totalPages ? <TouchableOpacity style={styles.loadMore} onPress={() => void load(page + 1)}><Text style={styles.link}>Tải thêm đơn hàng</Text></TouchableOpacity> : null} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F8F6" }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "white", borderBottomWidth: 1, borderColor: "#E5ECE7" }, title: { fontSize: 19, fontWeight: "700", color: "#173E32" },
  tabs: { maxHeight: 54, backgroundColor: "white" }, tabContent: { paddingHorizontal: 12, alignItems: "center", gap: 8 }, tab: { borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: "#F1F5F2" }, activeTab: { backgroundColor: "#176A50" }, tabText: { color: "#59665F", fontSize: 12 }, activeTabText: { color: "white", fontWeight: "700" },
  list: { padding: 14, paddingBottom: 28 }, card: { padding: 15, borderRadius: 15, backgroundColor: "white", marginBottom: 12, borderWidth: 1, borderColor: "#E4ECE7", elevation: 1 }, rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, orderId: { fontWeight: "700", color: "#173E32", fontSize: 15 }, badge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: "700", overflow: "hidden" }, muted: { color: "#718078", fontSize: 12, marginTop: 6 }, products: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 13 }, productThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#F1F5F2", alignItems: "center", justifyContent: "center" }, thumb: { width: 42, height: 42, borderRadius: 8 }, qty: { position: "absolute", right: -2, bottom: -3, backgroundColor: "white", borderRadius: 8, color: "#555", fontSize: 9, paddingHorizontal: 3 }, itemCount: { color: "#718078", fontSize: 11, marginLeft: 4 }, bottom: { borderTopWidth: 1, borderColor: "#E8EEEA", paddingTop: 10, marginTop: 12 }, payment: { color: "#718078", fontSize: 11, marginTop: 2 }, total: { color: "#C45C16", fontWeight: "800", fontSize: 15 }, detailLink: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 8 }, link: { color: "#176A50", fontWeight: "700", fontSize: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 }, emptyList: { flexGrow: 1 }, emptyTitle: { color: "#173E32", fontSize: 16, fontWeight: "700", marginTop: 6 }, error: { color: "#A12F50", textAlign: "center", marginTop: 8 }, retry: { backgroundColor: "#176A50", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 }, retryText: { color: "white", fontWeight: "700" }, loadMore: { alignSelf: "center", padding: 13 },
});
