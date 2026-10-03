import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/nguon/AuthContext";
import { useCart } from "@/nguon/CartContext";
import { gioHangService, ItemGioHang } from "@/dich_vu/gioHang";
import { duongDanAnh } from "@/dich_vu/duongDanAnh";

const money = (n: number) => Number.isFinite(n) && n >= 0 ? `${n.toLocaleString("vi-VN")}đ` : "Không thể tính giá";
export default function GioHangScreen() {
  const { token } = useAuth();
  const { updateCartCount } = useCart();
  const [items, setItems] = useState<ItemGioHang[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const lineKey=(item:any)=>`${item.MaSanPham}:${item.MaBienThe == null ? "legacy" : item.MaBienThe}`;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const loadedToken = useRef<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!token) { loadedToken.current = null; setLoading(false); setItems([]); setSelected([]); return; }
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      setError("");
      const response = await gioHangService.layGioHang(token);
      const nextItems = response.data.items;
      setItems(nextItems);
      updateCartCount(nextItems.reduce((sum, item) => sum + item.SoLuong, 0));
      const eligible = nextItems.filter(item => item.DuocBan && item.CoTheBan != null && item.CoTheBan > 0).map(lineKey);
      if (loadedToken.current !== token) setSelected(eligible);
      else setSelected(current => current.filter(id => nextItems.some(item => lineKey(item) === id)));
      loadedToken.current = token;
    } catch (reason: any) { setError(reason?.message || "Không thể tải giỏ hàng. Vui lòng thử lại."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, updateCartCount]);
  useEffect(() => { void load(); }, [load]);

  const chosen = useMemo(() => items.filter(item => selected.includes(lineKey(item)) && item.DuocBan && item.CoTheBan != null && item.CoTheBan > 0), [items, selected]);
  const total = chosen.reduce((sum, item) => sum + item.GiaKhuyenMaiHienTai * item.SoLuong, 0);
  const savings = chosen.reduce((sum, item) => sum + Math.max(0, item.GiaBan - item.GiaKhuyenMaiHienTai) * item.SoLuong, 0);
  const itemCount = items.reduce((sum, item) => sum + item.SoLuong, 0);
  const hasOverstock = chosen.some(item => item.CoTheBan == null || item.SoLuong > item.CoTheBan);
  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const update = async (item: ItemGioHang, quantity: number) => {
    const available = item.CoTheBan;
    if (quantity < 1 || available == null || quantity > available) return;
    setBusyId(item.MaSanPham);
    try { await gioHangService.capNhatSoLuong(item.MaSanPham, quantity, token!, item.MaBienThe); await load(true); }
    catch (reason: any) { Alert.alert("Không thể cập nhật giỏ", reason?.message || "Tồn kho có thể vừa thay đổi. Hãy tải lại giỏ hàng."); await load(true); }
    finally { setBusyId(null); }
  };
  const remove = async (item: ItemGioHang) => {
    setBusyId(item.MaSanPham);
    try { await gioHangService.xoaSanPham(item.MaSanPham, token!, item.MaBienThe); setSelected(current => current.filter(id => id !== lineKey(item))); await load(true); }
    catch (reason: any) { Alert.alert("Không thể xóa", reason?.message || "Vui lòng thử lại."); }
    finally { setBusyId(null); }
  };
  const clearAll = () => Alert.alert("Xóa toàn bộ giỏ hàng?", "Các sản phẩm sẽ bị xóa khỏi giỏ của tài khoản này.", [
    { text: "Giữ lại", style: "cancel" },
    { text: "Xóa tất cả", style: "destructive", onPress: async () => { setBusyId(-1); try { await gioHangService.xoaTatCa(token!); setSelected([]); await load(true); } catch (reason: any) { Alert.alert("Không thể xóa giỏ", reason?.message || "Vui lòng thử lại."); await load(true); } finally { setBusyId(null); } } },
  ]);

  if (loading) return <SafeAreaView style={s.center}><ActivityIndicator color="#176A50" size="large"/><Text style={s.muted}>Đang tải giỏ hàng…</Text></SafeAreaView>;
  if (error) return <SafeAreaView style={s.center}><Ionicons name="cloud-offline-outline" size={48} color="#B65A44"/><Text style={s.error}>{error}</Text><TouchableOpacity style={s.primary} onPress={() => void load()}><Text style={s.white}>Thử lại</Text></TouchableOpacity></SafeAreaView>;
  if (!items.length) return <SafeAreaView style={s.center}><Ionicons name="cart-outline" size={66} color="#176A50"/><Text style={s.title}>Giỏ hàng đang trống</Text><Text style={s.muted}>Sản phẩm bạn thêm sẽ hiển thị tại đây.</Text><TouchableOpacity style={s.primary} onPress={() => router.push("/man_hinh/san_pham")}><Text style={s.white}>Tiếp tục mua sắm</Text></TouchableOpacity></SafeAreaView>;

  return <SafeAreaView style={s.safe}>
    <FlatList data={items} keyExtractor={item => lineKey(item)} contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#176A50"/>}
      ListHeaderComponent={<><View style={s.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#173E32"/></TouchableOpacity><View style={{flex:1}}><Text style={s.title}>Giỏ hàng ({itemCount})</Text><Text style={s.muted}>Chọn sản phẩm muốn thanh toán</Text></View><TouchableOpacity disabled={busyId !== null} onPress={clearAll}><Text style={[s.link,busyId !== null && {opacity:.5}]}>Xóa tất cả</Text></TouchableOpacity></View><View style={s.notice}><Ionicons name="information-circle-outline" size={20} color="#176A50"/><Text style={s.noticeText}>Phí vận chuyển được báo khi cửa hàng tạo vận đơn.</Text></View></>}
      renderItem={({item}) => {
        const available = item.CoTheBan ?? 0;
        const sellable = Boolean(item.DuocBan) && available > 0;
        const overStock = sellable && item.SoLuong > available;
        const image = duongDanAnh(item.HinhAnh);
        return <View style={[s.item, !sellable && s.itemUnavailable]}>
          <TouchableOpacity disabled={!sellable} onPress={() => toggle(lineKey(item))}><Ionicons name={selected.includes(lineKey(item)) ? "checkbox" : "square-outline"} size={23} color={sellable ? "#176A50" : "#AAB4AE"}/></TouchableOpacity>
          {image ? <Image source={{uri:image}} style={s.image}/> : <View style={s.image}><Ionicons name="image-outline" size={28} color="#AAB4AE"/></View>}
          <View style={{flex:1}}><Text numberOfLines={2} style={s.name}>{item.TenSanPham || `Sản phẩm #${item.MaSanPham}`}</Text><Text style={[s.stock, (!sellable || overStock) && s.unavailable]}>{!sellable ? item.LyDoKhongMuaDuoc || "Không thể mua" : overStock ? `Vượt tồn · chỉ còn ${available}; giảm số lượng để tiếp tục` : `Có thể bán: ${available}`}</Text>{item.DangKhuyenMai && item.TenKhuyenMai ? <Text numberOfLines={1} style={s.promo}>{item.TenKhuyenMai} · −{item.PhanTramGiam}%</Text> : null}<Text style={s.price}>{money(item.GiaKhuyenMaiHienTai)}</Text>{item.DangKhuyenMai ? <Text style={s.old}>{money(item.GiaBan)}</Text> : null}<View style={s.qty}><TouchableOpacity disabled={!sellable || busyId===item.MaSanPham || item.SoLuong<=1} onPress={() => void update(item,overStock ? available : item.SoLuong-1)}><Ionicons name="remove-circle" size={27} color={item.SoLuong<=1?"#C8D2CC":"#176A50"}/></TouchableOpacity><Text style={s.qtyValue}>{item.SoLuong}</Text><TouchableOpacity disabled={!sellable || busyId===item.MaSanPham || item.SoLuong>=available} onPress={() => void update(item,item.SoLuong+1)}><Ionicons name="add-circle" size={27} color={item.SoLuong>=available?"#C8D2CC":"#176A50"}/></TouchableOpacity></View></View>
          <TouchableOpacity disabled={busyId===item.MaSanPham} onPress={() => Alert.alert("Xóa sản phẩm?","Xóa sản phẩm này khỏi giỏ hàng?",[{text:"Hủy",style:"cancel"},{text:"Xóa",style:"destructive",onPress:()=>void remove(item)}])}><Ionicons name="trash-outline" size={20} color="#637169"/></TouchableOpacity>
        </View>;
      }}
      ListFooterComponent={<><TouchableOpacity style={s.voucher} onPress={() => router.push("/man_hinh/voucher")}><Ionicons name="ticket-outline" size={20} color="#176A50"/><Text style={{flex:1,color:"#20382E",fontWeight:"600"}}>Mã giảm giá</Text><Text style={s.link}>Chọn voucher ›</Text></TouchableOpacity>{savings>0&&<Text style={s.savings}>Tiết kiệm {money(savings)} từ khuyến mại</Text>}<View style={s.summary}><Text style={s.muted}>Tạm tính ({chosen.length} dòng hàng)</Text><Text style={s.price}>{money(total)}</Text>{hasOverstock&&<Text style={s.unavailable}>Có mặt hàng vượt tồn khả dụng. Hãy giảm số lượng xuống mức cho phép trước khi mua.</Text>}</View></>}/>
    <View style={s.footer}>
      <TouchableOpacity disabled={busyId !== null} onPress={() => {
        const eligible = items.filter(item => item.DuocBan && Number(item.CoTheBan) > 0);
        const allSelected = eligible.length > 0 && eligible.every(item => selected.includes(lineKey(item)));
        setSelected(allSelected ? [] : eligible.map(lineKey));
      }}><Text style={s.link}>{chosen.length ? "Bỏ chọn" : "Chọn hàng"}</Text></TouchableOpacity>
      <View style={{ alignItems: "flex-end" }}><Text style={s.muted}>Tổng tiền hàng</Text><Text style={s.price}>{money(total)}</Text></View>
      <TouchableOpacity disabled={!chosen.length || hasOverstock || busyId !== null} style={[s.primary, (!chosen.length || hasOverstock || busyId !== null) && s.disabled]} onPress={() => {
        const itemsParam = JSON.stringify(chosen.map(item => ({ MaSanPham: item.MaSanPham, MaBienThe:item.MaBienThe ?? null, SoLuong: item.SoLuong })));
        const session = `checkout-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
        router.push({ pathname: "/man_hinh/dat_hang", params: { items: itemsParam, session } });
      }}><Text style={s.white}>Mua hàng ({chosen.length})</Text></TouchableOpacity>
    </View>
  </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#F6FAF7"},list:{padding:15,paddingBottom:112},header:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:13},title:{fontSize:21,fontWeight:"800",color:"#173E32"},muted:{color:"#718078",fontSize:12,marginTop:4},link:{color:"#176A50",fontWeight:"700"},notice:{flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"#EAF5EF",borderRadius:11,padding:12,marginBottom:5},noticeText:{flex:1,color:"#315A47",fontSize:12},item:{backgroundColor:"white",borderRadius:14,padding:11,marginTop:10,flexDirection:"row",alignItems:"center",gap:10,borderWidth:1,borderColor:"#E6EEE8"},itemUnavailable:{backgroundColor:"#F5F6F5"},image:{width:75,height:82,borderRadius:10,backgroundColor:"#F2F5F3",alignItems:"center",justifyContent:"center",resizeMode:"cover"},name:{fontSize:14,fontWeight:"700",color:"#20362C"},stock:{fontSize:11,color:"#176A50",marginTop:4},unavailable:{color:"#B24040"},promo:{fontSize:11,color:"#A76721",marginTop:4},price:{fontSize:16,fontWeight:"900",color:"#C45C16",marginTop:4},old:{fontSize:11,color:"#89928D",textDecorationLine:"line-through"},qty:{flexDirection:"row",alignItems:"center",gap:10,marginTop:5},qtyValue:{minWidth:20,textAlign:"center",fontWeight:"700",color:"#20362C"},voucher:{marginTop:14,backgroundColor:"white",borderWidth:1,borderColor:"#E6EEE8",borderRadius:12,padding:14,flexDirection:"row",alignItems:"center",gap:9},savings:{color:"#176A50",textAlign:"right",marginTop:10},summary:{marginTop:11,backgroundColor:"white",borderRadius:12,padding:15,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},footer:{position:"absolute",bottom:0,left:0,right:0,backgroundColor:"white",padding:12,paddingBottom:16,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10,borderTopWidth:1,borderColor:"#E4EBE6"},primary:{backgroundColor:"#176A50",borderRadius:12,paddingHorizontal:18,paddingVertical:12,alignSelf:"flex-start",marginTop:12},white:{color:"white",fontWeight:"800"},disabled:{backgroundColor:"#A8B9AF"},center:{flex:1,alignItems:"center",justifyContent:"center",gap:12,padding:25},error:{color:"#A43A3A",textAlign:"center"}});
