import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/nguon/AuthContext";
import { sanPhamService } from "@/dich_vu/sanPham";
import { duongDanAnh } from "@/dich_vu/duongDanAnh";
import type { DanhMuc } from "@/kieu_du_lieu/SanPham";

export default function DanhMucScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [items, setItems] = useState<DanhMuc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (pull = false) => {
    pull ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const response = await sanPhamService.layDanhMuc(token ?? undefined);
      if (!response.success || !Array.isArray(response.data)) throw new Error("Phản hồi danh mục không hợp lệ");
      setItems(response.data.filter((category) => category.TrangThai === undefined || category.TrangThai === true || Number(category.TrangThai) === 1));
    } catch (e: any) { setError(e?.message || "Không thể tải danh mục"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const groups = useMemo(() => {
    const roots = items.filter((item) => item.MaDanhMucCha == null);
    const children = items.filter((item) => item.MaDanhMucCha != null);
    return roots.map((root) => ({ ...root, children: children.filter((child) => Number(child.MaDanhMucCha) === root.MaDanhMuc) }));
  }, [items]);
  const open = (id: number) => router.push({ pathname: "/man_hinh/san_pham", params: { maDanhMuc: String(id) } });

  return <SafeAreaView style={s.safe}>
    <View style={s.header}><View><Text style={s.brand}>BeautyStore</Text><Text style={s.subtitle}>Khám phá theo danh mục</Text></View><TouchableOpacity style={s.icon} onPress={() => router.push("/man_hinh/gio_hang")}><Ionicons name="cart-outline" size={23} color="#145B45" /></TouchableOpacity></View>
    {loading ? <View style={s.state}><ActivityIndicator color="#08785B" size="large"/><Text style={s.muted}>Đang tải danh mục…</Text></View> : error ? <View style={s.state}><Ionicons name="cloud-offline-outline" size={42} color="#B42318"/><Text style={s.message}>{error}</Text><TouchableOpacity style={s.retry} onPress={() => void load()}><Text style={s.retryText}>Thử lại</Text></TouchableOpacity></View> : <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#08785B"/>}>
      {groups.length === 0 ? <View style={s.state}><Text style={s.muted}>Chưa có danh mục đang hoạt động.</Text></View> : groups.map((group) => <View key={group.MaDanhMuc} style={s.group}>
        <TouchableOpacity style={s.groupTitle} onPress={() => open(group.MaDanhMuc)}>
          <View style={s.groupImage}>{duongDanAnh(group.HinhAnh, "categories") ? <Image source={{ uri: duongDanAnh(group.HinhAnh, "categories") }} style={s.photo}/> : <Ionicons name="grid-outline" size={25} color="#08785B"/>}</View>
          <View style={s.groupText}><Text style={s.title}>{group.TenDanhMuc}</Text><Text style={s.muted}>{Number(group.SoSanPham || 0)} sản phẩm trong nhóm</Text></View><Ionicons name="chevron-forward" size={20} color="#08785B"/>
        </TouchableOpacity>
        {group.children.length ? <View style={s.childGrid}>{group.children.map((child) => <TouchableOpacity key={child.MaDanhMuc} style={s.child} onPress={() => open(child.MaDanhMuc)}>
          {duongDanAnh(child.HinhAnh, "categories") ? <Image source={{ uri: duongDanAnh(child.HinhAnh, "categories") }} style={s.childImage}/> : <View style={s.childPlaceholder}><Ionicons name="leaf-outline" size={22} color="#08785B"/></View>}
          <Text numberOfLines={2} style={s.childName}>{child.TenDanhMuc}</Text><Text style={s.childCount}>{Number(child.SoSanPham || 0) ? `${child.SoSanPham} sản phẩm` : "Chưa có sản phẩm"}</Text>
        </TouchableOpacity>)}</View> : <TouchableOpacity style={s.emptyCategory} onPress={() => open(group.MaDanhMuc)}><Text style={s.muted}>Chưa có danh mục con · Xem sản phẩm</Text></TouchableOpacity>}
      </View>)}
    </ScrollView>}
    <View style={s.tabs}>{[["home-outline","Trang chủ","/man_hinh/trang_chu"],["grid","Danh mục","/man_hinh/danh_muc"],["heart-outline","Yêu thích","/man_hinh/yeu_thich"],["receipt-outline","Đơn hàng","/man_hinh/don_hang"],["person-outline","Tài khoản","/man_hinh/ca_nhan"]].map(([icon,label,path],i)=><TouchableOpacity key={label} style={s.tab} onPress={()=>{if(i!==1)router.push(path as never)}}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={21} color={i===1?"#08785B":"#64748B"}/><Text style={[s.tabLabel,i===1&&s.tabActive]}>{label}</Text></TouchableOpacity>)}</View>
  </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#F7FBF8"},header:{paddingHorizontal:18,paddingVertical:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:"#fff"},brand:{fontSize:21,fontWeight:"800",color:"#075B43"},subtitle:{fontSize:12,color:"#64748B",marginTop:2},icon:{width:42,height:42,borderRadius:15,backgroundColor:"#E9F6EF",alignItems:"center",justifyContent:"center"},content:{padding:16,paddingBottom:100,gap:14},group:{backgroundColor:"#fff",borderRadius:18,padding:13,borderWidth:1,borderColor:"#E6EFEA"},groupTitle:{flexDirection:"row",alignItems:"center",gap:11,paddingBottom:12},groupImage:{width:48,height:48,borderRadius:15,backgroundColor:"#E9F6EF",alignItems:"center",justifyContent:"center",overflow:"hidden"},photo:{width:"100%",height:"100%"},groupText:{flex:1},title:{fontSize:17,fontWeight:"800",color:"#102A24"},muted:{fontSize:12,color:"#718096",marginTop:3},childGrid:{flexDirection:"row",flexWrap:"wrap",gap:10},child:{width:"31.5%",alignItems:"center",paddingVertical:10,borderRadius:14,backgroundColor:"#F7FBF8"},childImage:{width:66,height:66,borderRadius:18,backgroundColor:"#E5F2EA"},childPlaceholder:{width:66,height:66,borderRadius:18,backgroundColor:"#E5F2EA",alignItems:"center",justifyContent:"center"},childName:{marginTop:7,fontSize:12,fontWeight:"700",color:"#18382D",textAlign:"center",paddingHorizontal:4},childCount:{fontSize:10,color:"#718096",marginTop:3},emptyCategory:{padding:12,backgroundColor:"#F7FBF8",borderRadius:12,alignItems:"center"},state:{flex:1,justifyContent:"center",alignItems:"center",padding:26,gap:12},message:{color:"#475569",textAlign:"center"},retry:{backgroundColor:"#08785B",paddingHorizontal:20,paddingVertical:11,borderRadius:13},retryText:{color:"#fff",fontWeight:"700"},tabs:{position:"absolute",bottom:0,left:0,right:0,height:68,backgroundColor:"#fff",borderTopWidth:1,borderColor:"#E5E7EB",flexDirection:"row",justifyContent:"space-around",paddingTop:8},tab:{flex:1,alignItems:"center",gap:3},tabLabel:{fontSize:10,color:"#64748B"},tabActive:{color:"#08785B",fontWeight:"800"}});
