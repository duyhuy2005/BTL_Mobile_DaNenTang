import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Modal, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/nguon/AuthContext";
import { sanPhamService } from "@/dich_vu/sanPham";
import { yeuThichService } from "@/dich_vu/yeuThich";
import { gioHangService } from "@/dich_vu/gioHang";
import { duongDanAnh } from "@/dich_vu/duongDanAnh";
import { useCart } from "@/nguon/CartContext";
import { useNewStatus } from "@/src/home/useNewStatus";
import type { DanhMuc, SanPham } from "@/kieu_du_lieu/SanPham";

type Sort = "newest" | "price_asc" | "price_desc" | "popular";
type Filters = { category?: number; brand?: string; skin?: string; from?: number; to?: number; inStock: boolean; promoOnly: boolean; sort: Sort };
const PAGE_SIZE = 20;
const money = (value: number) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

export default function SanPhamScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ maDanhMuc?: string; search?: string; chiKhuyenMai?: string; chiSanPhamMoi?: string }>();
  const { token } = useAuth();
  const { refreshCartCount } = useCart();
  const categoryParam = Number(params.maDanhMuc) || undefined;
  const newOnly = params.chiSanPhamMoi === "true";
  const [filters, setFilters] = useState<Filters>({ category: categoryParam, inStock: false, promoOnly: params.chiKhuyenMai === "true", sort: "newest" });
  const [searchText, setSearchText] = useState(String(params.search || ""));
  const [appliedSearch, setAppliedSearch] = useState(String(params.search || ""));
  const [products, setProducts] = useState<SanPham[]>([]);
  const [categories, setCategories] = useState<DanhMuc[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [skinTypes, setSkinTypes] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const nextPageRef = useRef(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const sequence = useRef(0);
  const moreLock = useRef(false);

  const loadFacets = useCallback(async () => {
    try {
      const [categoryResponse, facetResponse] = await Promise.all([sanPhamService.layDanhMuc(token ?? undefined), sanPhamService.layBoLoc()]);
      setCategories(categoryResponse.data || []);
      setBrands(facetResponse.data.brands || []);
      setSkinTypes(facetResponse.data.skinTypes || []);
    } catch (e) { console.warn("[Catalogue] Unable to load category/filter options", e); }
  }, [token]);
  const load = useCallback(async (reset = true, pull = false) => {
    if (!reset && moreLock.current) return;
    const current = ++sequence.current;
    const page = reset ? 1 : nextPageRef.current;
    if (reset) setLoading(true); else { if (moreLock.current) return; moreLock.current = true; setLoadingMore(true); }
    if (pull) setRefreshing(true);
    setError("");
    try {
      const response = await sanPhamService.layDanhSach(token ?? undefined, {
        page, limit: PAGE_SIZE, search: appliedSearch.trim() || undefined, maDanhMuc: filters.category,
        thuongHieu: filters.brand, loaiDa: filters.skin, giaTu: filters.from, giaDen: filters.to,
        conHang: filters.inStock, sort: filters.sort, chiKhuyenMai: filters.promoOnly, chiSanPhamMoi: newOnly,
      });
      if (current !== sequence.current) return;
      if (!response.success || !Array.isArray(response.data) || !response.pagination) throw new Error("Dữ liệu sản phẩm từ máy chủ không đúng định dạng");
      setProducts((old) => reset ? response.data : [...old, ...response.data]);
      setTotal(response.pagination.total);
      nextPageRef.current = page + 1;
    } catch (e: any) { if (current === sequence.current) setError(e?.message || "Không thể tải sản phẩm"); }
    finally { if (current === sequence.current) { setLoading(false); setRefreshing(false); setLoadingMore(false); moreLock.current = false; } }
  }, [token, appliedSearch, filters, newOnly]);

  useFocusEffect(useCallback(() => {
    void loadFacets(); void load(true);
    if (token) void yeuThichService.layDanhSach(token).then((r) => setFavoriteIds(r.data.map((x: any) => Number(x.MaSanPham)))).catch(() => setFavoriteIds([]));
    return () => { sequence.current += 1; };
  }, [load, loadFacets, token]));
  useEffect(() => {
    setFilters((value) => value.category === categoryParam ? value : ({ ...value, category: categoryParam }));
    setFilters((value) => ({ ...value, promoOnly: params.chiKhuyenMai === "true" }));
    const keyword = String(params.search || ""); setSearchText(keyword); setAppliedSearch(keyword);
  }, [categoryParam, params.search, params.chiKhuyenMai]);
  const selectedCategory = categories.find((x) => x.MaDanhMuc === filters.category);
  const activeFilterCount = Number(Boolean(filters.brand)) + Number(Boolean(filters.skin)) + Number(filters.from !== undefined || filters.to !== undefined) + Number(filters.inStock) + Number(filters.promoOnly) + Number(newOnly);
  const sortedLabel = useMemo(() => ({ newest: "Mới nhất", price_asc: "Giá tăng dần", price_desc: "Giá giảm dần", popular: "Bán chạy" }[filters.sort]), [filters.sort]);

  const requireLogin = (next: string) => { Alert.alert("Đăng nhập", "Vui lòng đăng nhập để sử dụng chức năng này.", [{ text: "Để sau", style: "cancel" }, { text: "Đăng nhập", onPress: () => router.push({ pathname: "/man_hinh/dang_nhap", params: { next } }) }]); };
  const toggleFavorite = async (id: number) => {
    if (!token) return requireLogin(`/man_hinh/san_pham/${id}`);
    const isSaved = favoriteIds.includes(id);
    try { if (isSaved) await yeuThichService.xoa(id, token); else await yeuThichService.them(id, token); setFavoriteIds((old) => isSaved ? old.filter((x) => x !== id) : [...old, id]); }
    catch (e: any) { Alert.alert("Yêu thích", e?.message || "Không thể cập nhật danh sách yêu thích"); }
  };
  const addCart = async (product: SanPham) => {
    if (!token) return requireLogin(`/man_hinh/san_pham/${product.MaSanPham}`);
    if (Number(product.SoLuong) <= 0) return Alert.alert("Hết hàng", "Sản phẩm hiện chưa có tồn kho khả dụng.");
    try { await gioHangService.themSanPham(product.MaSanPham, 1, token); await refreshCartCount(); Alert.alert("BeautyStore", "Đã thêm sản phẩm vào giỏ hàng."); }
    catch (e: any) { Alert.alert("Chưa thể thêm vào giỏ", e?.message || "Vui lòng tải lại và thử lại."); }
  };
  const applyFilters = () => {
    const from = fromText.trim() ? Number(fromText) : undefined;
    const to = toText.trim() ? Number(toText) : undefined;
    if (from !== undefined && (!Number.isFinite(from) || from < 0) || to !== undefined && (!Number.isFinite(to) || to < 0)) return Alert.alert("Khoảng giá", "Nhập mức giá hợp lệ.");
    if (from !== undefined && to !== undefined && from > to) return Alert.alert("Khoảng giá", "Giá từ phải nhỏ hơn hoặc bằng giá đến.");
    setFilters((value) => ({ ...value, from, to })); setModalOpen(false);
  };
  const resetFilters = () => { setFilters({ category: categoryParam, inStock: false, promoOnly: params.chiKhuyenMai === "true", sort: "newest" }); setFromText(""); setToText(""); setSearchText(""); setAppliedSearch(""); setModalOpen(false); };

  return <SafeAreaView style={s.safe}>
    <View style={s.header}><TouchableOpacity onPress={() => router.back()} style={s.headerIcon}><Ionicons name="arrow-back" size={22} color="#12372C"/></TouchableOpacity><View style={s.headerBrand}><Text style={s.brand}>BeautyStore</Text><Text style={s.brandCaption}>{selectedCategory?.TenDanhMuc || "Khám phá mỹ phẩm chính hãng"}</Text></View><TouchableOpacity onPress={() => router.push("/man_hinh/gio_hang")} style={s.headerIcon}><Ionicons name="cart-outline" size={23} color="#145B45"/></TouchableOpacity></View>
    <View style={s.search}><Ionicons name="search-outline" size={19} color="#64748B"/><TextInput value={searchText} onChangeText={setSearchText} onSubmitEditing={() => setAppliedSearch(searchText)} returnKeyType="search" placeholder="Tìm tên sản phẩm, thương hiệu…" style={s.searchInput}/>{searchText ? <TouchableOpacity onPress={() => { setSearchText(""); setAppliedSearch(""); }}><Ionicons name="close-circle" size={19} color="#94A3B8"/></TouchableOpacity> : null}</View>
    <View style={s.filterBar}><TouchableOpacity style={s.filterChip} onPress={() => setModalOpen(true)}><Ionicons name="options-outline" size={17} color="#08785B"/><Text style={s.filterText}>Bộ lọc{activeFilterCount ? ` (${activeFilterCount})` : ""}</Text></TouchableOpacity><TouchableOpacity style={s.sortChip} onPress={() => setModalOpen(true)}><Text style={s.filterText}>{sortedLabel}</Text><Ionicons name="chevron-down" size={15} color="#475569"/></TouchableOpacity></View>
    {selectedCategory && <TouchableOpacity style={s.categoryPill} onPress={() => setFilters((v) => ({ ...v, category: undefined }))}><Text style={s.categoryPillText}>{selectedCategory.TenDanhMuc}  ×</Text></TouchableOpacity>}
    {loading ? <View style={s.state}><ActivityIndicator size="large" color="#08785B"/><Text style={s.muted}>Đang tải sản phẩm…</Text></View> : error ? <View style={s.state}><Ionicons name="cloud-offline-outline" size={42} color="#B42318"/><Text style={s.error}>{error}</Text><TouchableOpacity style={s.retry} onPress={() => void load(true)}><Text style={s.retryText}>Thử lại</Text></TouchableOpacity></View> : <FlatList data={products} keyExtractor={(item) => String(item.MaSanPham)} numColumns={2} columnWrapperStyle={s.row} contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true, true)} tintColor="#08785B"/>} onEndReachedThreshold={0.5} onEndReached={() => { if (!loading && !loadingMore && products.length < total) void load(false); }} ListHeaderComponent={<Text style={s.results}>{total.toLocaleString("vi-VN")} sản phẩm · {selectedCategory?.TenDanhMuc || "Tất cả danh mục"}</Text>} ListEmptyComponent={<View style={s.empty}><Ionicons name="search-outline" size={42} color="#A7C9B2"/><Text style={s.emptyTitle}>Chưa có sản phẩm phù hợp</Text><Text style={s.muted}>Hãy thử bỏ bớt bộ lọc hoặc từ khóa.</Text><TouchableOpacity onPress={resetFilters}><Text style={s.resetText}>Xóa bộ lọc</Text></TouchableOpacity></View>} ListFooterComponent={loadingMore ? <ActivityIndicator color="#08785B" style={{ padding: 16 }}/> : products.length < total ? <Text style={s.moreLabel}>Cuộn xuống để tải thêm</Text> : null} renderItem={({ item }) => <ProductCard product={item} favorite={favoriteIds.includes(item.MaSanPham)} onPress={() => router.push(`/man_hinh/san_pham/${item.MaSanPham}`)} onHeart={() => void toggleFavorite(item.MaSanPham)} onCart={() => void addCart(item)} onBuy={() => router.push({pathname:`/man_hinh/san_pham/${item.MaSanPham}`,params:{buyNow:"true"}})}/>}/>}
    <View style={s.tabs}>{[["home-outline","Trang chủ","/man_hinh/trang_chu"],["grid-outline","Danh mục","/man_hinh/danh_muc"],["heart-outline","Yêu thích","/man_hinh/yeu_thich"],["receipt-outline","Đơn hàng","/man_hinh/don_hang"],["person-outline","Tài khoản","/man_hinh/ca_nhan"]].map(([icon,label,path])=><TouchableOpacity key={label} style={s.tab} onPress={()=>router.push(path as never)}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={21} color="#64748B"/><Text style={s.tabLabel}>{label}</Text></TouchableOpacity>)}</View>
    <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}><View style={s.modalShade}><View style={s.sheet}><View style={s.sheetHeader}><Text style={s.sheetTitle}>Bộ lọc sản phẩm</Text><TouchableOpacity onPress={() => setModalOpen(false)}><Ionicons name="close" size={23} color="#334155"/></TouchableOpacity></View><ScrollView keyboardShouldPersistTaps="handled"><Text style={s.label}>Danh mục</Text><View style={s.options}>{categories.map((category) => <TouchableOpacity key={category.MaDanhMuc} style={[s.option, filters.category === category.MaDanhMuc && s.optionSelected]} onPress={() => setFilters((v) => ({ ...v, category: v.category === category.MaDanhMuc ? undefined : category.MaDanhMuc }))}><Text style={[s.optionText, filters.category === category.MaDanhMuc && s.optionTextSelected]}>{category.TenDanhMuc}</Text></TouchableOpacity>)}</View><Text style={s.label}>Thương hiệu</Text><View style={s.options}>{brands.map((brand) => <TouchableOpacity key={brand} style={[s.option, filters.brand === brand && s.optionSelected]} onPress={() => setFilters((v) => ({ ...v, brand: v.brand === brand ? undefined : brand }))}><Text style={[s.optionText, filters.brand === brand && s.optionTextSelected]}>{brand}</Text></TouchableOpacity>)}</View><Text style={s.label}>Loại da</Text><View style={s.options}>{skinTypes.length ? skinTypes.map((type) => <TouchableOpacity key={type} style={[s.option, filters.skin === type && s.optionSelected]} onPress={() => setFilters((v) => ({ ...v, skin: v.skin === type ? undefined : type }))}><Text style={[s.optionText, filters.skin === type && s.optionTextSelected]}>{type}</Text></TouchableOpacity>) : <Text style={s.muted}>Chưa có dữ liệu loại da để lọc.</Text>}</View><Text style={s.label}>Khoảng giá (₫)</Text><View style={s.priceInputs}><TextInput keyboardType="numeric" value={fromText} onChangeText={setFromText} placeholder="Từ" style={s.priceInput}/><Text style={s.muted}>đến</Text><TextInput keyboardType="numeric" value={toText} onChangeText={setToText} placeholder="Đến" style={s.priceInput}/></View><View style={s.stockRow}><Text style={s.label}>Chỉ xem sản phẩm còn hàng</Text><Switch value={filters.inStock} onValueChange={(inStock) => setFilters((v) => ({ ...v, inStock }))} trackColor={{ true: "#0A805F" }}/></View><Text style={s.label}>Sắp xếp</Text>{([["newest","Mới nhất"],["price_asc","Giá tăng dần"],["price_desc","Giá giảm dần"],["popular","Bán chạy"]] as [Sort,string][]).map(([value,label])=><TouchableOpacity key={value} style={s.sortOption} onPress={() => setFilters((v) => ({ ...v, sort: value }))}><Text style={s.optionText}>{label}</Text><Ionicons name={filters.sort===value?"radio-button-on":"radio-button-off"} size={19} color={filters.sort===value?"#08785B":"#94A3B8"}/></TouchableOpacity>)}</ScrollView><View style={s.sheetButtons}><TouchableOpacity style={s.clearButton} onPress={resetFilters}><Text style={s.clearText}>Đặt lại</Text></TouchableOpacity><TouchableOpacity style={s.applyButton} onPress={applyFilters}><Text style={s.applyText}>Áp dụng</Text></TouchableOpacity></View></View></View></Modal>
  </SafeAreaView>;
}

function ProductCard({ product, favorite, onPress, onHeart, onCart, onBuy }: { product: SanPham; favorite: boolean; onPress: () => void; onHeart: () => void; onCart: () => void; onBuy: () => void }) {
  const discounted = product.DangKhuyenMai && Number(product.GiaKhuyenMaiHienTai) < Number(product.GiaBan);
  const price = discounted ? Number(product.GiaKhuyenMaiHienTai) : Number(product.GiaBan);
  const uri = duongDanAnh(product.HinhAnh);
  const showNew = useNewStatus(product.isNew, product.newUntil);
  return <View style={s.card}><TouchableOpacity onPress={onPress} activeOpacity={0.9}><View style={s.photoWrap}>{uri ? <Image source={{ uri }} style={s.photo}/> : <Ionicons name="image-outline" size={36} color="#9FC8AF"/>}{showNew&&<Text style={s.newBadge}>MỚI</Text>}{discounted&&<Text style={[s.saleBadge,showNew&&{top:34}]}>-{Number(product.PhanTramGiam)||0}%</Text>}<TouchableOpacity style={s.heart} onPress={onHeart}><Ionicons name={favorite?"heart":"heart-outline"} size={20} color={favorite?"#0A805F":"#475569"}/></TouchableOpacity></View><Text style={s.productName} numberOfLines={2}>{product.TenSanPham}</Text>{product.ThuongHieu?<Text style={s.brandName} numberOfLines={1}>{product.ThuongHieu}</Text>:null}<View style={s.priceLine}><Text style={s.price}>{money(price)}</Text>{discounted?<Text style={s.oldPrice}>{money(Number(product.GiaBan))}</Text>:null}</View><Text style={s.rating}>★ {Number(product.DiemTrungBinh||0).toFixed(1)} · {Number(product.SoDanhGia||0)} đánh giá</Text>{Number(product.SoLuong)<=0?<Text style={s.out}>Hết hàng</Text>:null}</TouchableOpacity><View style={s.actionRow}><TouchableOpacity disabled={Number(product.SoLuong)<=0} style={[s.addButton,s.actionHalf,Number(product.SoLuong)<=0&&s.disabledButton]} onPress={onCart}><Ionicons name="cart-outline" size={16} color={Number(product.SoLuong)<=0?"#94A3B8":"#fff"}/><Text style={[s.addLabel,Number(product.SoLuong)<=0&&s.disabledLabel]}>Thêm giỏ</Text></TouchableOpacity><TouchableOpacity disabled={Number(product.SoLuong)<=0} style={[s.buyButton,s.actionHalf,Number(product.SoLuong)<=0&&s.disabledButton]} onPress={onBuy}><Text style={[s.buyLabel,Number(product.SoLuong)<=0&&s.disabledLabel]}>Mua ngay</Text></TouchableOpacity></View></View>;
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#F7FBF8"},header:{height:62,paddingHorizontal:14,backgroundColor:"#fff",flexDirection:"row",alignItems:"center",gap:10,borderBottomWidth:1,borderColor:"#E8F0EA"},headerIcon:{width:38,height:38,borderRadius:13,backgroundColor:"#EDF7F0",alignItems:"center",justifyContent:"center"},headerBrand:{flex:1},brand:{fontSize:18,fontWeight:"900",color:"#075B43"},brandCaption:{fontSize:11,color:"#718096",marginTop:2},search:{height:44,margin:13,marginBottom:7,paddingHorizontal:13,borderRadius:14,borderWidth:1,borderColor:"#E0EAE3",backgroundColor:"#fff",flexDirection:"row",alignItems:"center",gap:8},searchInput:{flex:1,color:"#18382D",fontSize:14},filterBar:{flexDirection:"row",justifyContent:"space-between",paddingHorizontal:14,paddingBottom:9,gap:8},filterChip:{height:36,paddingHorizontal:13,borderRadius:12,backgroundColor:"#E6F4EA",flexDirection:"row",alignItems:"center",gap:7},sortChip:{height:36,paddingHorizontal:12,borderRadius:12,backgroundColor:"#fff",borderWidth:1,borderColor:"#E0EAE3",flexDirection:"row",alignItems:"center",gap:5},filterText:{fontSize:12,fontWeight:"700",color:"#174B39"},categoryPill:{alignSelf:"flex-start",marginHorizontal:14,marginBottom:7,paddingHorizontal:12,paddingVertical:6,borderRadius:16,backgroundColor:"#DDF3E5"},categoryPillText:{fontSize:12,fontWeight:"700",color:"#08785B"},results:{fontSize:12,color:"#64748B",marginBottom:10},list:{paddingHorizontal:13,paddingBottom:92},row:{justifyContent:"space-between",gap:10},card:{width:"48.5%",marginBottom:12,padding:8,borderRadius:16,backgroundColor:"#fff",borderWidth:1,borderColor:"#E9F0EB"},photoWrap:{height:158,borderRadius:12,backgroundColor:"#F1F7F2",alignItems:"center",justifyContent:"center",overflow:"hidden"},photo:{width:"100%",height:"100%",resizeMode:"cover"},newBadge:{position:"absolute",left:7,top:7,color:"#fff",backgroundColor:"#08785B",borderRadius:7,paddingHorizontal:7,paddingVertical:4,fontSize:10,fontWeight:"900"},saleBadge:{position:"absolute",left:7,top:34,color:"#fff",backgroundColor:"#F07842",borderRadius:7,paddingHorizontal:7,paddingVertical:4,fontSize:10,fontWeight:"800"},heart:{position:"absolute",right:7,top:7,width:30,height:30,backgroundColor:"#ffffffdf",borderRadius:15,alignItems:"center",justifyContent:"center"},productName:{marginTop:8,minHeight:36,fontSize:13,lineHeight:17,fontWeight:"700",color:"#152F26"},brandName:{color:"#718096",fontSize:11,marginTop:2},priceLine:{flexDirection:"row",alignItems:"center",flexWrap:"wrap",gap:5,marginTop:5},price:{color:"#08785B",fontWeight:"900",fontSize:14},oldPrice:{color:"#94A3B8",fontSize:10,textDecorationLine:"line-through"},rating:{color:"#718096",fontSize:10,marginTop:4},out:{color:"#B42318",fontSize:11,fontWeight:"800",marginTop:4},actionRow:{flexDirection:"row",gap:6,marginTop:8},actionHalf:{flex:1,marginTop:0},addButton:{height:33,marginTop:8,borderRadius:10,backgroundColor:"#08785B",alignItems:"center",justifyContent:"center",flexDirection:"row",gap:5},buyButton:{height:33,borderRadius:10,borderWidth:1,borderColor:"#08785B",alignItems:"center",justifyContent:"center"},addLabel:{color:"#fff",fontSize:10,fontWeight:"800"},buyLabel:{color:"#08785B",fontSize:10,fontWeight:"800"},disabledButton:{backgroundColor:"#EEF1EF",borderColor:"#EEF1EF"},disabledLabel:{color:"#82908A"},state:{flex:1,alignItems:"center",justifyContent:"center",padding:24,gap:11},error:{color:"#475569",textAlign:"center"},muted:{fontSize:12,color:"#718096",marginTop:4},retry:{paddingHorizontal:21,paddingVertical:11,borderRadius:12,backgroundColor:"#08785B"},retryText:{color:"#fff",fontWeight:"800"},empty:{alignItems:"center",paddingVertical:65,gap:7},emptyTitle:{fontSize:16,fontWeight:"800",color:"#18382D",marginTop:8},resetText:{color:"#08785B",fontWeight:"800",marginTop:8},moreLabel:{textAlign:"center",color:"#718096",padding:15},tabs:{position:"absolute",bottom:0,left:0,right:0,height:68,backgroundColor:"#fff",borderTopWidth:1,borderColor:"#E5E7EB",flexDirection:"row",justifyContent:"space-around",paddingTop:8},tab:{flex:1,alignItems:"center",gap:3},tabLabel:{fontSize:10,color:"#64748B"},modalShade:{flex:1,justifyContent:"flex-end",backgroundColor:"#0007"},sheet:{maxHeight:"86%",backgroundColor:"#fff",borderTopLeftRadius:24,borderTopRightRadius:24,paddingHorizontal:18,paddingTop:17,paddingBottom:22},sheetHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingBottom:13,borderBottomWidth:1,borderColor:"#EDF1EE"},sheetTitle:{fontSize:18,fontWeight:"900",color:"#17352A"},label:{fontSize:13,fontWeight:"800",color:"#18382D",marginTop:16,marginBottom:8},options:{flexDirection:"row",flexWrap:"wrap",gap:8},option:{paddingHorizontal:12,paddingVertical:8,borderRadius:17,backgroundColor:"#F2F5F3",borderWidth:1,borderColor:"#EDF1EE"},optionSelected:{backgroundColor:"#E2F3E7",borderColor:"#0A805F"},optionText:{fontSize:12,color:"#475569"},optionTextSelected:{color:"#08785B",fontWeight:"800"},priceInputs:{flexDirection:"row",alignItems:"center",gap:10},priceInput:{flex:1,height:42,borderRadius:11,borderWidth:1,borderColor:"#DCE6DF",paddingHorizontal:12,color:"#18382D"},stockRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:5},sortOption:{height:42,flexDirection:"row",justifyContent:"space-between",alignItems:"center",borderBottomWidth:1,borderColor:"#F0F2F0"},sheetButtons:{flexDirection:"row",gap:10,paddingTop:15},clearButton:{flex:1,height:46,borderRadius:13,borderWidth:1,borderColor:"#08785B",alignItems:"center",justifyContent:"center"},clearText:{color:"#08785B",fontWeight:"800"},applyButton:{flex:1,height:46,borderRadius:13,backgroundColor:"#08785B",alignItems:"center",justifyContent:"center"},applyText:{color:"#fff",fontWeight:"900"}});
