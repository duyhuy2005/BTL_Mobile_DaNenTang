import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/nguon/AuthContext";
import { donHangService } from "@/dich_vu/donHang";
import { duongDanAnh } from "@/dich_vu/duongDanAnh";
import { HoaDon } from "@/kieu_du_lieu/DonHang";

const money = (value?: number) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;
const paymentLabel: Record<string,string> = { DA_THANH_TOAN:"Đã thanh toán",THANH_TOAN_MOT_PHAN:"Đã thanh toán một phần",HOAN_MOT_PHAN:"Đã hoàn một phần",DA_HOAN_TIEN:"Đã hoàn toàn bộ" };
export default function DatHangThanhCongScreen() {
  const raw = useLocalSearchParams<{ id?: string }>().id;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  const { token } = useAuth();
  const [order, setOrder] = useState<HoaDon | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    if (!token || !Number.isSafeInteger(id) || id <= 0) { setError("Không tìm thấy mã đơn hàng hợp lệ."); setLoading(false); return; }
    donHangService.layChiTiet(id, token).then(response => {
      if (active) setOrder(response.data);
    }).catch((reason: any) => {
      if (active) setError(reason?.message || "Đơn đã gửi nhưng chưa tải được chi tiết. Mở Đơn hàng của tôi để kiểm tra.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, token]);

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
    <TouchableOpacity style={s.back} onPress={() => router.replace("/man_hinh/trang_chu")}><Ionicons name="arrow-back" size={22} color="#173E32"/><Text style={s.backText}>Tiếp tục mua sắm</Text></TouchableOpacity>
    <View style={s.hero}><View style={s.check}><Ionicons name="checkmark" size={42} color="white"/></View><Text style={s.title}>{order ? "Đặt hàng thành công" : "Đã gửi yêu cầu đặt hàng"}</Text><Text style={s.caption}>{order ? "BeautyStore đã ghi nhận đơn hàng của bạn." : "Hãy kiểm tra đơn hàng của tôi để xác nhận trạng thái mới nhất."}</Text></View>
    {loading ? <ActivityIndicator color="#176A50" size="large"/> : error ? <View style={s.card}><Text style={s.error}>{error}</Text><TouchableOpacity onPress={() => router.replace("/man_hinh/don_hang")}><Text style={s.link}>Mở đơn hàng của tôi</Text></TouchableOpacity></View> : order ? <View style={s.card}>
      <View style={s.row}><Text style={s.label}>Mã đơn hàng</Text><Text style={s.value}>DH{String(order.MaHoaDon).padStart(8,"0")}</Text></View>
      <View style={s.row}><Text style={s.label}>Trạng thái</Text><Text style={s.status}>{order.TrangThai === "CHO_XAC_NHAN" ? "Chờ xác nhận" : order.TrangThai}</Text></View>
      {(order.ChiTiet || []).map((item, index) => { const image = duongDanAnh(item.HinhAnh); return <View key={`${item.MaSanPham}-${index}`} style={s.product}>{image ? <Image source={{ uri: image }} style={s.productImage}/> : <View style={s.productImage}><Ionicons name="image-outline" size={18} color="#8B9B92"/></View>}<View style={{flex:1}}><Text style={s.productName}>{item.TenSanPham}</Text><Text style={s.label}>× {item.SoLuong}</Text></View><Text style={s.productPrice}>{money(item.ThanhTien)}</Text></View>; })}
      <View style={s.row}><Text style={s.label}>Tạm tính</Text><Text style={s.value}>{money(order.TamTinh)}</Text></View>
      <View style={s.row}><Text style={s.label}>Phí vận chuyển</Text><Text style={s.value}>{Number(order.PhiVanChuyen || 0) > 0 ? money(order.PhiVanChuyen) : order.TrangThaiVanChuyen === "CHUA_TAO_VAN_DON" ? "Chưa báo giá" : money(order.PhiVanChuyen)}</Text></View>
      <View style={s.row}><Text style={s.label}>Tổng tiền</Text><Text style={s.total}>{money(order.TongTien)}</Text></View>
      <Text style={s.payment}>{order.PhuongThucThanhToan === "COD" ? "Thanh toán khi nhận hàng (COD)" : order.PhuongThucThanhToan} · {paymentLabel[order.TrangThaiThanhToan||""] || "Chưa thanh toán"}</Text>
      {order.TrangThaiVanChuyen === "CHUA_TAO_VAN_DON" && <Text style={s.label}>Phí ship được cập nhật khi cửa hàng tạo vận đơn; số tiền trên là tạm tính.</Text>}
    </View> : null}
    <TouchableOpacity style={s.primary} onPress={() => order ? router.replace({ pathname: "/man_hinh/chi_tiet_don_hang", params: { id: String(order.MaHoaDon) } }) : router.replace("/man_hinh/don_hang")}><Text style={s.primaryText}>{order ? "Xem chi tiết đơn hàng" : "Mở đơn hàng của tôi"}</Text></TouchableOpacity>
    <TouchableOpacity style={s.secondary} onPress={() => router.replace("/man_hinh/trang_chu")}><Text style={s.secondaryText}>Tiếp tục mua sắm</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#F6FAF7"},content:{flexGrow:1,padding:20,justifyContent:"center",gap:16},back:{position:"absolute",top:12,left:18,flexDirection:"row",alignItems:"center",gap:8},backText:{color:"#173E32",fontWeight:"600"},hero:{alignItems:"center",paddingTop:44,paddingBottom:10},check:{width:86,height:86,borderRadius:43,backgroundColor:"#17865D",alignItems:"center",justifyContent:"center",marginBottom:18},title:{fontSize:24,fontWeight:"800",color:"#173E32",textAlign:"center"},caption:{textAlign:"center",color:"#65756C",marginTop:8,lineHeight:21},card:{backgroundColor:"white",borderRadius:16,padding:17,borderWidth:1,borderColor:"#E3ECE6",gap:13},row:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},label:{color:"#68766F",fontSize:12},value:{fontWeight:"800",color:"#173E32",fontSize:15},status:{color:"#A45D00",backgroundColor:"#FFF1D4",paddingHorizontal:10,paddingVertical:5,borderRadius:12,overflow:"hidden",fontWeight:"700"},total:{fontSize:20,fontWeight:"900",color:"#C45C16"},payment:{borderTopWidth:1,borderColor:"#EDF1EE",paddingTop:12,color:"#44564C"},product:{flexDirection:"row",alignItems:"center",gap:9,borderTopWidth:1,borderColor:"#EDF1EE",paddingTop:9},productImage:{width:42,height:42,borderRadius:8,backgroundColor:"#F1F5F2",alignItems:"center",justifyContent:"center"},productName:{flex:1,color:"#173E32",fontWeight:"700",fontSize:12},productPrice:{color:"#C45C16",fontWeight:"700",fontSize:12},error:{color:"#A43A3A",lineHeight:20},link:{color:"#176A50",fontWeight:"700",marginTop:8},primary:{backgroundColor:"#176A50",borderRadius:13,padding:16,alignItems:"center"},primaryText:{color:"white",fontWeight:"800"},secondary:{backgroundColor:"white",borderWidth:1,borderColor:"#176A50",borderRadius:13,padding:15,alignItems:"center"},secondaryText:{color:"#176A50",fontWeight:"800"}});
