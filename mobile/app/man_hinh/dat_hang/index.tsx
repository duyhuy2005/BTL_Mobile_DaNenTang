import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/nguon/AuthContext";
import { useCart } from "@/nguon/CartContext";
import { takeCheckoutAddressChoice } from "@/nguon/checkoutAddressSelection";
import { clearQuickBuySelection, getQuickBuySelection } from "@/nguon/quickBuySelection";
import { donHangService } from "@/dich_vu/donHang";
import { duongDanAnh } from "@/dich_vu/duongDanAnh";
import { gioHangService, ItemGioHang } from "@/dich_vu/gioHang";
import { sanPhamService } from "@/dich_vu/sanPham";
import { DiaChiNhanHang, khachHangService } from "@/dich_vu/khachHang";
import { voucherService } from "@/dich_vu/voucher";

type CheckoutLine = { MaSanPham: number; MaBienThe?: number | null; SoLuong: number };
type CheckoutItem = Omit<ItemGioHang, "MaGioHang"> & { MaGioHang?: number; MaSKU?: string | null; QuyCach?: string | null };
const money = (value: number | null) => Number.isFinite(value) && value! >= 0 ? `${value!.toLocaleString("vi-VN")}đ` : "Không thể tính giá";

function prepareCheckoutLines(selected: unknown[], cart: CheckoutItem[]) {
  const lines = new Map<string, CheckoutLine>();
  const errors: string[] = [];
  selected.forEach((raw: any, index) => {
    const label = typeof raw?.TenSanPham === "string" ? raw.TenSanPham : `Sản phẩm dòng ${index + 1}`;
    const validScalar = (value: unknown) => (typeof value === "number" || (typeof value === "string" && value.trim() !== "")) && Number.isSafeInteger(Number(value));
    if (!validScalar(raw?.MaSanPham)) { errors.push(`${label}: mã sản phẩm không hợp lệ.`); return; }
    if (!validScalar(raw?.SoLuong)) { errors.push(`${label}: số lượng phải là số nguyên dương.`); return; }
    const id = Number(raw.MaSanPham);
    const quantity = Number(raw.SoLuong);
    if (!Number.isSafeInteger(id) || id <= 0) { errors.push(`${label}: mã sản phẩm không hợp lệ.`); return; }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) { errors.push(`${label}: số lượng phải là số nguyên dương.`); return; }
    const variantId=raw?.MaBienThe == null || raw?.MaBienThe === "" ? null : Number(raw.MaBienThe);
    if(variantId!==null&&(!Number.isSafeInteger(variantId)||variantId<=0)){errors.push(`${label}: mã biến thể không hợp lệ.`);return;}
    const item = cart.find((line) => Number(line.MaSanPham) === id && (line.MaBienThe ?? null) === variantId);
    if (!item) { errors.push(`${label}: không còn trong giỏ hàng; hãy tải lại giỏ.`); return; }
    const cartQuantity = Number(item.SoLuong);
    if (!Number.isSafeInteger(cartQuantity) || cartQuantity <= 0 || quantity !== cartQuantity) {
      errors.push(`${item.TenSanPham}: số lượng trong giỏ đã thay đổi; hãy quay lại tải lại giỏ.`); return;
    }
    if (!item.DuocBan) { errors.push(`${item.TenSanPham}: sản phẩm đã ngừng bán.`); return; }
    const available = item.CoTheBan;
    if (available == null || !Number.isSafeInteger(available) || available < quantity) {
      errors.push(`${item.TenSanPham}: tồn khả dụng không đủ hoặc không hợp lệ (còn ${available == null ? "không xác định" : Math.max(0, available)}).`); return;
    }
    const key=`${id}:${variantId??"legacy"}`, combined = Number(lines.get(key)?.SoLuong || 0) + quantity;
    if (!Number.isSafeInteger(combined) || combined > cartQuantity) { errors.push(`${item.TenSanPham}: số lượng đặt vượt số lượng trong giỏ.`); return; }
    lines.set(key,{MaSanPham:id,MaBienThe:variantId,SoLuong:combined});
  });
  return { lines: [...lines.values()], errors };
}

export default function DatHangScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ items?: string; flow?: string; session?: string }>();
  const checkoutSession = params.session || `legacy-${params.flow || "cart"}-${params.items || "empty"}`;
  const buyNowFlow = params.flow === "buyNow";
  const { refreshCartCount } = useCart();
  const [selected, setSelected] = useState<CheckoutLine[]>([]);
  const [cart, setCart] = useState<CheckoutItem[]>([]);
  const [codes, setCodes] = useState<string[]>([]);
  const [autoCodes, setAutoCodes] = useState<string[]>([]);
  const [voucherMode, setVoucherMode] = useState<"AUTO"|"MANUAL"|"NONE">("AUTO");
  const [voucherOffers, setVoucherOffers] = useState<any[]>([]);
  const [quoteReady, setQuoteReady] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [voucherNotice, setVoucherNotice] = useState("");
  const [addresses, setAddresses] = useState<DiaChiNhanHang[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const selectedAddressRef = useRef<number | null>(null);
  const initializedAddressToken = useRef<string | null>(null);
  const explicitAddressRequired = useRef(false);
  const addressScreenRequested = useRef(false);
  const [addressError, setAddressError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<"COD" | "Banking">("COD");
  const [discount, setDiscount] = useState<number | null>(null);
  const [quoteSubtotal, setQuoteSubtotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quoteRetry, setQuoteRetry] = useState(0);
  const [error, setError] = useState("");
  const submitLock = useRef(false);
  const idempotencyKey = useRef("");
  const requestSequence = useRef(0);
  const quoteSequence = useRef(0);
  const voucherPickerRequested = useRef(false);
  const autoCodesRef = useRef<string[]>([]);

  const load = useCallback(async (refresh = false) => {
    const sequence = ++requestSequence.current;
    if (!token) { setError("Vui lòng đăng nhập để thanh toán."); setLoading(false); return; }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      let parsed: CheckoutLine[];
      let checkoutItems: CheckoutItem[];
      const [profile, saved, savedMode] = await Promise.all([khachHangService.layThongTin(token), voucherService.getCheckoutSelection(checkoutSession), voucherService.getCheckoutMode(checkoutSession)]);
      if (buyNowFlow) {
        const choice = getQuickBuySelection();
        if (!choice) throw new Error("Phiên Mua ngay đã hết. Hãy quay lại sản phẩm và chọn mua lại.");
        const detail = await sanPhamService.layChiTiet(choice.MaSanPham, token);
        const product = detail.data;
        if (!detail.success || !product || Number(product.TrangThai) !== 1) throw new Error("Sản phẩm đã ngừng bán hoặc không còn khả dụng.");
        const variant=choice.MaBienThe == null?null:product.BienThe?.find((v:any)=>Number(v.MaBienThe)===Number(choice.MaBienThe));
        if(choice.MaBienThe != null&&!variant) throw new Error("Biến thể đã chọn không còn thuộc sản phẩm.");
        const available = Number(variant?.CoTheBan ?? product.CoTheBan ?? product.SoLuong);
        const basePrice = Number(variant?.GiaBan ?? product.GiaBan);
        const currentPrice = Number(product.GiaKhuyenMaiHienTai ?? product.GiaBan);
        if (!Number.isSafeInteger(available) || available < choice.SoLuong) throw new Error(`Tồn có thể bán đã thay đổi. Hiện còn ${Number.isSafeInteger(available) ? available : "không xác định"}. Hãy quay lại chọn số lượng phù hợp.`);
        if (!Number.isFinite(basePrice) || basePrice < 0 || !Number.isFinite(currentPrice) || currentPrice < 0) throw new Error("Máy chủ trả giá sản phẩm không hợp lệ. Không thể mở checkout.");
        parsed = [{ MaSanPham: product.MaSanPham, MaBienThe:choice.MaBienThe??null, SoLuong: choice.SoLuong }];
        checkoutItems = [{ MaSanPham: product.MaSanPham, MaBienThe:choice.MaBienThe??null, SoLuong: choice.SoLuong, TenSanPham: product.TenSanPham, GiaBan: basePrice, GiaKhuyenMaiHienTai: currentPrice, PhanTramGiam: product.PhanTramGiam, DangKhuyenMai: product.DangKhuyenMai, TenKhuyenMai: product.TenKhuyenMai, HinhAnh: variant?.HinhAnh||product.HinhAnh, ThuongHieu: product.ThuongHieu, DuocBan: true, TonThucTe: variant?.TonThucTe??product.TonThucTe, DaGiu: variant?.DaGiu??product.DaGiu, CoTheBan: available, MaSKU: variant?.MaSKU||product.MaSKU, QuyCach: variant?.DungTich != null ? `${variant.DungTich}${variant.DonViDungTich ? ` ${variant.DonViDungTich}` : ""}` : variant?.QuyCachDongGoi||product.QuyCachDongGoi }];
      } else {
        try { parsed = JSON.parse(params.items || "[]") as CheckoutLine[]; } catch { throw new Error("Danh sách sản phẩm thanh toán không đọc được. Hãy quay lại giỏ hàng."); }
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Chưa chọn sản phẩm để thanh toán.");
        const basket = await gioHangService.layGioHang(token);
        const ids = new Set(parsed.map((item: any) => `${Number(item?.MaSanPham)}:${item?.MaBienThe == null ? "legacy" : Number(item.MaBienThe)}`));
        checkoutItems = basket.data.items.filter((item) => ids.has(`${Number(item.MaSanPham)}:${item.MaBienThe == null ? "legacy" : Number(item.MaBienThe)}`));
      }
      let addressRows: DiaChiNhanHang[] = [];
      let addressLoadError = "";
      try { addressRows = (await khachHangService.danhSachDiaChi(token)).data; }
      catch (reason: any) { addressLoadError = reason?.message || "Không thể tải địa chỉ nhận hàng."; }
      if (sequence !== requestSequence.current) return;
      setSelected(parsed);
      setCodes(saved);
      setAutoCodes([]);
      autoCodesRef.current=[];
      setVoucherMode(saved.length ? "MANUAL" : savedMode);
      setQuoteReady(false);
      setAddressError(addressLoadError);
      setAddresses(addressRows);
      const sameAccount = initializedAddressToken.current === token;
      if (!sameAccount) {
        selectedAddressRef.current = null;
        explicitAddressRequired.current = false;
        setSelectedAddress(null);
        setName(profile.data?.HoTen || ""); setPhone(profile.data?.SoDienThoai || ""); setAddress("");
        initializedAddressToken.current = token;
      }
      const handedOffId = takeCheckoutAddressChoice(token);
      const requestedId = handedOffId ?? (sameAccount ? selectedAddressRef.current : null);
      const chosen = requestedId != null
        ? addressRows.find((item) => item.Id === requestedId)
        : explicitAddressRequired.current ? undefined : addressRows.find((item) => item.MacDinh);
      if (chosen) {
        selectedAddressRef.current = chosen.Id;
        explicitAddressRequired.current = false;
        setSelectedAddress(chosen.Id); setName(chosen.TenNguoiNhan); setPhone(chosen.SoDienThoai); setAddress(chosen.DiaChi);
        setAddressError("");
      } else if (requestedId != null) {
        selectedAddressRef.current = null;
        explicitAddressRequired.current = true;
        setSelectedAddress(null); setAddress("");
        setAddressError("Địa chỉ đang chọn đã bị xóa hoặc không còn hợp lệ. Vui lòng chọn địa chỉ khác.");
      } else {
        selectedAddressRef.current = null;
        if (!addressLoadError) explicitAddressRequired.current = true;
        setSelectedAddress(null); setAddress("");
      }
      setCart(checkoutItems);
      setDiscount(null);
      setDataLoaded(true);
    } catch (reason: any) {
      if (sequence === requestSequence.current) setError(reason?.message || "Không thể tải dữ liệu thanh toán.");
    } finally {
      if (sequence === requestSequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, [token, params.items, buyNowFlow, checkoutSession]);
  useEffect(() => {
    let active=true;
    void Promise.resolve().then(()=>active?load():undefined);
    return () => { active=false; requestSequence.current++; };
  }, [load]);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (voucherPickerRequested.current) {
      voucherPickerRequested.current = false;
      void Promise.all([voucherService.getCheckoutSelection(checkoutSession), voucherService.getCheckoutMode(checkoutSession)]).then(([next, mode]) => {
        if (active) { setCodes(next); setVoucherMode(mode); setQuoteReady(false); }
      });
    }
    if (addressScreenRequested.current && token) {
      addressScreenRequested.current = false;
      void khachHangService.danhSachDiaChi(token).then((response) => {
        if (!active) return;
        const rows = response.data;
        setAddresses(rows);
        const handedOffId = takeCheckoutAddressChoice(token);
        const requestedId = handedOffId ?? selectedAddressRef.current;
        const chosen = requestedId == null
          ? explicitAddressRequired.current ? undefined : rows.find((item) => item.MacDinh)
          : rows.find((item) => item.Id === requestedId);
        if (chosen) {
          selectedAddressRef.current = chosen.Id;
          explicitAddressRequired.current = false;
          setSelectedAddress(chosen.Id); setName(chosen.TenNguoiNhan); setPhone(chosen.SoDienThoai); setAddress(chosen.DiaChi);
          setAddressError("");
        } else if (requestedId != null) {
          selectedAddressRef.current = null;
          explicitAddressRequired.current = true;
          setSelectedAddress(null); setAddress("");
          setAddressError("Địa chỉ đang chọn đã bị xóa hoặc không còn hợp lệ. Vui lòng chọn địa chỉ khác.");
        } else {
          explicitAddressRequired.current = true;
          setSelectedAddress(null); setAddress("");
          setAddressError("");
        }
      }).catch((reason: any) => {
        if (active) setAddressError(reason?.message || "Không thể tải địa chỉ. Hãy thử lại.");
      });
    }
    return () => { active = false; };
  }, [token,checkoutSession]));

  const validation = useMemo(() => prepareCheckoutLines(selected, cart), [selected, cart]);
  const lines = validation.lines;
  const linesKey = JSON.stringify(lines);
  const appliedCodes = voucherMode === "AUTO" ? autoCodes : codes;
  const manualCodesKey = voucherMode==="MANUAL"?codes.join("|"):"";
  useEffect(() => {
    if (!dataLoaded || !token || validation.errors.length || !lines.length) return;
    const sequence = ++quoteSequence.current;
    void Promise.resolve().then(()=>{
      if(sequence===quoteSequence.current){setQuoteLoading(true);setQuoteReady(false);setQuoteError("");}
      return voucherService.checkoutOptions({danhSachSanPham:lines,mode:voucherMode,MaVoucher:voucherMode==="MANUAL"?codes[0]:undefined,MaVoucherPhiShip:voucherMode==="MANUAL"?codes[1]:undefined},token);
    })
      .then((response:any) => {
        if (sequence !== quoteSequence.current) return;
        const data=response.data;
        const amount=Number(data?.discount), total=Number(data?.totalAfterDiscount);
        const serverSubtotal=Number(data?.subtotal);
        if (!response.success || !Number.isFinite(amount) || amount<0 || !Number.isFinite(total) || total<0 || !Number.isFinite(serverSubtotal) || serverSubtotal<0) throw new Error("Máy chủ chưa trả báo giá voucher hợp lệ.");
        const chosen=Array.isArray(data.selected)?data.selected as string[]:[];
        setVoucherOffers(Array.isArray(data.offers)?data.offers:[]);
        if (voucherMode==="AUTO") {
          if(autoCodesRef.current.length&&!chosen.some(code=>autoCodesRef.current.includes(code))) setVoucherNotice("Điều kiện của voucher tự áp dụng đã thay đổi; báo giá mới đã được tính lại.");
          autoCodesRef.current=chosen;
          setAutoCodes(chosen);
        }
        if (voucherMode==="MANUAL" && codes.some(code=>!chosen.includes(code))) {
          setVoucherNotice(data.selectionReason || "Một mã đã chọn không còn phù hợp; báo giá đã loại mã đó.");
          setCodes(chosen); void voucherService.setCheckoutSelection(checkoutSession,chosen);
          if(!chosen.length){setVoucherMode("NONE");void voucherService.setCheckoutMode(checkoutSession,"NONE");}
        } else if(data.selectionReason) setVoucherNotice(data.selectionReason);
        else if(data.shippingPending) setVoucherNotice("Voucher phí vận chuyển sẽ được tính khi có phí vận chuyển thực tế.");
        setDiscount(amount); setQuoteSubtotal(serverSubtotal); setQuoteReady(true);
      })
      .catch((reason:any)=>{if(sequence===quoteSequence.current){setDiscount(null);setQuoteSubtotal(null);setQuoteError(reason?.message||"Không thể lấy báo giá voucher.");setQuoteReady(false);}})
      .finally(()=>{if(sequence===quoteSequence.current)setQuoteLoading(false);});
    return ()=>{ if (quoteSequence.current===sequence) quoteSequence.current++; };
  },[dataLoaded,token,lines,linesKey,validation.errors.length,selectedAddress,voucherMode,manualCodesKey,codes,quoteRetry,checkoutSession]);
  const subtotal = quoteReady ? quoteSubtotal : null;
  const promoSavings = cart.reduce((sum, item) => sum + Math.max(0, item.GiaBan - item.GiaKhuyenMaiHienTai) * item.SoLuong, 0);
  const grandEstimate = subtotal == null ? null : Math.max(0, subtotal - (discount ?? 0));
  const totalItems = cart.reduce((sum, item) => sum + item.SoLuong, 0);
  const submitBlockReason = validation.errors[0]
    || (!lines.length ? "Không có sản phẩm hợp lệ để đặt hàng." : "")
    || (addressError ? "Không xác minh được địa chỉ nhận hàng. Hãy thử tải lại trước khi đặt hàng." : "")
    || (selectedAddress == null ? "Vui lòng chọn hoặc thêm địa chỉ nhận hàng đã lưu." : "")
    || (!name.trim() ? "Vui lòng nhập người nhận." : "")
    || (!phone.trim() ? "Vui lòng nhập số điện thoại người nhận." : "")
    || (phone.trim() && !/^\+?[0-9][0-9 .-]{7,18}$/.test(phone.trim()) ? "Số điện thoại người nhận không đúng định dạng." : "")
    || (!address.trim() ? "Vui lòng nhập địa chỉ giao hàng." : "")
    || (!quoteReady ? (quoteError ? "Báo giá chưa sẵn sàng. Hãy thử lại hoặc chọn không dùng voucher." : "Đang cập nhật báo giá…") : "")
    || (subtotal == null ? "Không thể tính giá. Hãy tải lại giỏ hàng." : "");

  const chooseAddress = (item: DiaChiNhanHang) => {
    selectedAddressRef.current = item.Id;
    explicitAddressRequired.current = false;
    setSelectedAddress(item.Id); setName(item.TenNguoiNhan); setPhone(item.SoDienThoai); setAddress(item.DiaChi);
  };
  const openAddressPicker = () => {
    addressScreenRequested.current = true;
    router.push({ pathname: "/man_hinh/dia_chi", params: { mode: "select" } });
  };
  const retryAddresses = async () => {
    if (!token) return;
    setAddressError("");
    try {
      const rows = (await khachHangService.danhSachDiaChi(token)).data;
      setAddresses(rows);
      const requestedId = selectedAddressRef.current;
      const chosen = requestedId == null
        ? explicitAddressRequired.current ? undefined : rows.find((item) => item.MacDinh)
        : rows.find((item) => item.Id === requestedId);
      if (chosen) chooseAddress(chosen);
      else if (requestedId != null) {
        selectedAddressRef.current = null; explicitAddressRequired.current = true;
        setSelectedAddress(null); setAddress("");
        setAddressError("Địa chỉ đang chọn đã bị xóa hoặc không còn hợp lệ. Vui lòng chọn địa chỉ khác.");
      } else if (!rows.length) {
        explicitAddressRequired.current = true;
        setAddressError("Bạn chưa có địa chỉ nhận hàng. Hãy thêm địa chỉ để tiếp tục.");
      } else {
        explicitAddressRequired.current = true;
        setAddressError("Hãy chọn địa chỉ nhận hàng cho đơn này.");
      }
    } catch (reason: any) { setAddressError(reason?.message || "Không thể tải địa chỉ. Hãy thử lại."); }
  };
  const openVoucherPicker = () => { setVoucherNotice("");voucherPickerRequested.current=true; router.push({pathname:"/man_hinh/voucher",params:{from:"checkout",items:JSON.stringify(lines),session:checkoutSession}}); };
  const chooseNoVoucher = async () => { setCodes([]);setVoucherMode("NONE");setVoucherNotice("Bạn chọn thanh toán không dùng voucher.");setQuoteReady(false);await voucherService.setCheckoutSelection(checkoutSession,[]);await voucherService.setCheckoutMode(checkoutSession,"NONE"); };
  const retryQuote = () => { setQuoteReady(false);setQuoteError("");setQuoteRetry(value=>value+1); };

  const submit = async () => {
    if (submitLock.current) return;
    const addressId = selectedAddress;
    if (addressId == null) { setError("Vui lòng chọn địa chỉ nhận hàng đã lưu."); return; }
    if (!name.trim() || !phone.trim() || !address.trim()) { setError("Vui lòng nhập đầy đủ người nhận, số điện thoại và địa chỉ."); return; }
    if (!/^\+?[0-9][0-9 .-]{7,18}$/.test(phone.trim())) { setError("Số điện thoại người nhận không đúng định dạng."); return; }
    if (validation.errors.length) { setError(validation.errors.join("\n")); return; }
    if (!lines.length) { setError("Không có sản phẩm hợp lệ để đặt hàng."); return; }
    if (!token) { setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."); return; }
    if (!idempotencyKey.current) idempotencyKey.current=`mobile-${Date.now()}-${Math.random().toString(36).slice(2,14)}`;
    submitLock.current = true; setSubmitting(true); setError("");
    try {
      const response = await donHangService.taoHoaDon({
        IdempotencyKey: idempotencyKey.current,
        IdDiaChiNhanHang: addressId,
        MuaNgay: buyNowFlow,
        PhuongThucThanhToan: payment,
        TenNguoiNhan: name.trim(), SoDienThoaiNhan: phone.trim(), DiaChiGiaoHang: address.trim(),
        MaVoucher: appliedCodes[0], MaVoucherPhiShip: appliedCodes[1], ExpectedTotal: subtotal!-(discount??0), ExpectedVoucherDiscount: discount??0, danhSachSanPham: lines,
      }, token);
      const orderId = Number(response.data?.MaHoaDon);
      if (!response.success || !Number.isSafeInteger(orderId) || orderId <= 0) {
        throw new Error("Máy chủ chưa trả mã đơn hợp lệ. Đơn có thể đã tạo; hãy mở Đơn hàng của tôi để kiểm tra trước khi gửi lại.");
      }
      try { await voucherService.setSelected([]); await voucherService.clearCheckoutSelection(checkoutSession); } catch { /* Order is committed; local voucher cleanup is best effort. */ }
      if (buyNowFlow) clearQuickBuySelection();
      await refreshCartCount();
      router.replace({ pathname: "/man_hinh/dat_hang_thanh_cong", params: { id: String(orderId) } });
    } catch (reason: any) {
      setError(reason?.message || "Không thể tạo đơn hàng. Hãy kiểm tra danh sách đơn trước khi thử lại.");
      if (reason?.status===409) { setQuoteReady(false); setQuoteRetry(value=>value+1); }
    }
    finally { submitLock.current = false; setSubmitting(false); }
  };

  if (loading) return <SafeAreaView style={s.center}><ActivityIndicator color="#176A50" size="large"/><Text style={s.muted}>Đang tải thông tin thanh toán…</Text></SafeAreaView>;
  if (!dataLoaded) return <SafeAreaView style={s.center}><Ionicons name="cloud-offline-outline" size={44} color="#B65A44"/><Text style={s.error}>{error || "Không tải được dữ liệu thanh toán."}</Text><TouchableOpacity style={s.outline} onPress={() => void load(true)}><Text style={s.link}>Thử tải lại</Text></TouchableOpacity><TouchableOpacity onPress={() => router.back()}><Text style={s.link}>Quay lại giỏ hàng</Text></TouchableOpacity></SafeAreaView>;
  return <SafeAreaView style={s.safe}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.header}><TouchableOpacity accessibilityLabel="Quay lại" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#173E32"/></TouchableOpacity><Text style={s.title}>Thanh toán</Text><TouchableOpacity onPress={() => void load(true)}><Ionicons name="refresh" size={21} color="#176A50"/></TouchableOpacity></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#176A50"/>}>
        <Text style={s.section}>Thông tin nhận hàng</Text>
        {selectedAddress != null && <View style={s.addressList}><Text style={s.note}>Địa chỉ dùng cho đơn hàng này</Text><Text style={s.addressName}>{addresses.find((item) => item.Id === selectedAddress)?.TenNguoiNhan} · {addresses.find((item) => item.Id === selectedAddress)?.SoDienThoai}</Text><Text style={s.note}>{addresses.find((item) => item.Id === selectedAddress)?.DiaChi}</Text></View>}
        {addressError ? <View style={s.warning}><Ionicons name="warning-outline" size={18} color="#A24B16"/><Text style={s.warningText}>{addressError}</Text><TouchableOpacity onPress={() => void retryAddresses()}><Text style={s.link}>Thử lại</Text></TouchableOpacity></View> : null}
        <TouchableOpacity style={s.outline} onPress={openAddressPicker}><Text style={s.link}>{addresses.length ? "Đổi địa chỉ" : "＋ Thêm địa chỉ nhận hàng"}</Text></TouchableOpacity>
        {selectedAddress == null && <><TextInput style={s.input} value={name} onChangeText={(value) => { setName(value); setSelectedAddress(null); }} placeholder="Họ và tên người nhận" maxLength={120}/>
        <TextInput style={s.input} value={phone} onChangeText={(value) => { setPhone(value); setSelectedAddress(null); }} placeholder="Số điện thoại" keyboardType="phone-pad" maxLength={24}/>
        <TextInput style={[s.input, s.multiline]} value={address} onChangeText={(value) => { setAddress(value); setSelectedAddress(null); }} placeholder="Số nhà, đường, phường/xã, tỉnh/thành" multiline maxLength={500}/></>}

        <View style={s.sectionRow}><Text style={s.section}>Sản phẩm ({totalItems})</Text><TouchableOpacity onPress={() => router.back()}><Text style={s.link}>{buyNowFlow ? "Quay lại chọn mua ›" : "Xem lại giỏ ›"}</Text></TouchableOpacity></View>
        {cart.map((item) => { const image = duongDanAnh(item.HinhAnh); return <View key={item.MaSanPham} style={s.product}><View style={s.thumb}>{image ? <Image source={{ uri: image }} style={s.image}/> : <Ionicons name="image-outline" size={22} color="#91A39A"/>}</View><View style={{ flex: 1 }}><Text style={s.productName}>{item.TenSanPham}</Text><Text style={s.note}>{item.MaSKU ? `SKU ${item.MaSKU} · ` : ""}{item.QuyCach || ""}{item.QuyCach ? " · " : ""}× {item.SoLuong}{item.TenKhuyenMai ? ` · ${item.TenKhuyenMai}` : ""}</Text></View><Text style={s.amount}>{money(item.GiaKhuyenMaiHienTai * item.SoLuong)}</Text></View>; })}
        {validation.errors.length > 0 && <View style={s.warning}><Ionicons name="warning-outline" size={18} color="#A24B16"/><Text style={s.warningText}>{validation.errors.join("\n")}</Text></View>}

        <Text style={s.section}>Phương thức thanh toán</Text>
        {(["COD", "Banking"] as const).map((method) => <TouchableOpacity key={method} onPress={() => setPayment(method)} style={[s.payment, payment === method && s.paymentSelected]}><Ionicons name={payment === method ? "radio-button-on" : "radio-button-off"} size={21} color="#176A50"/><Ionicons name={method === "COD" ? "cash-outline" : "business-outline"} size={22} color="#173E32"/><View style={{ flex: 1 }}><Text style={s.addressName}>{method === "COD" ? "Thanh toán khi nhận hàng (COD)" : "Chuyển khoản ngân hàng"}</Text><Text style={s.note}>{method === "COD" ? "Chưa thanh toán cho đến khi thu tiền thành công." : "Đơn sẽ chờ xác nhận thanh toán; không tự đánh dấu đã trả."}</Text></View></TouchableOpacity>)}
        <TouchableOpacity style={s.voucher} onPress={openVoucherPicker}><Ionicons name="ticket-outline" size={20} color="#176A50"/><Text style={{ flex: 1, color: "#173E32", fontWeight: "700" }}>{appliedCodes.length ? `${voucherMode==="AUTO"?"Đã tự áp":"Đổi voucher"} · ${appliedCodes.join(", ")}` : "Chọn/Đổi voucher"}</Text><Ionicons name="chevron-forward" size={18} color="#176A50"/></TouchableOpacity>
        <TouchableOpacity style={s.outline} onPress={() => void chooseNoVoucher()} disabled={submitting || (voucherMode==="NONE"&&!codes.length)}><Text style={s.link}>{voucherMode==="NONE"&&!codes.length?"Đang không dùng voucher":"Không dùng voucher"}</Text></TouchableOpacity>
        {appliedCodes.map(code=>{const offer=voucherOffers.find(item=>String(item.MaVoucher).toUpperCase()===code.toUpperCase());return <Text key={code} style={offer?.HopLe?s.note:s.error}>{offer?.HopLe?`${code}: giảm ${money(Number(offer.SoTienGiamTamTinh)||0)}`:`${code}: ${offer?.ThongBao||voucherNotice||"Không đủ điều kiện"}`}</Text>;})}
        {voucherNotice? <Text style={s.note}>{voucherNotice}</Text>:null}

        <View style={s.summary}><Row label="Tạm tính sau khuyến mại" value={money(subtotal)}/><Row label="Tiết kiệm khuyến mại" value={`−${money(promoSavings)}`}/><Row label="Giảm voucher" value={quoteLoading?"Đang tính…":discount === null ? "Chưa có báo giá" : `−${money(discount)}`}/><Row label="Phí vận chuyển" value="Chưa được báo giá"/><Text style={s.note}>Phí vận chuyển được cập nhật khi nhân viên tạo vận đơn; đây không phải báo giá cuối cùng. Backend sẽ kiểm tra lại giá và voucher khi đặt đơn.</Text><View style={s.totalRow}><Text style={s.totalLabel}>Tạm tính hàng (chưa gồm ship)</Text><Text style={s.total}>{quoteReady?money(grandEstimate):"Chưa báo giá"}</Text></View></View>
        {quoteError?<View style={s.warning}><Text style={s.warningText}>{quoteError}</Text><TouchableOpacity onPress={retryQuote}><Text style={s.link}>Thử lại</Text></TouchableOpacity><TouchableOpacity onPress={()=>void chooseNoVoucher()}><Text style={s.link}>Tiếp tục không dùng mã</Text></TouchableOpacity></View>:null}
        {error ? <View style={s.errorBox}><Ionicons name="alert-circle-outline" size={19} color="#B4233D"/><Text style={s.error}>{error}</Text></View> : null}
        {submitBlockReason ? <Text style={s.error}>{submitBlockReason}</Text> : null}
        <TouchableOpacity style={[s.primary, (submitting || !!submitBlockReason || !lines.length) && s.disabled]} disabled={submitting || !!submitBlockReason || !lines.length} onPress={() => void submit()}><Text style={s.primaryText}>{submitting ? "Đang tạo đơn…" : `Đặt hàng · ${quoteReady?money(grandEstimate):"Đang báo giá…"}`}</Text></TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function Row({ label, value }: { label: string; value: string }) { return <View style={s.row}><Text style={s.rowLabel}>{label}</Text><Text style={s.rowValue}>{value}</Text></View>; }

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F8F6" }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "white", borderBottomWidth: 1, borderColor: "#E8EEEA" }, title: { fontSize: 19, fontWeight: "800", color: "#173E32" }, content: { padding: 15, paddingBottom: 36, gap: 9 }, section: { fontSize: 16, fontWeight: "800", color: "#173E32", marginTop: 9 }, sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 7 }, link: { color: "#176A50", fontWeight: "700" }, note: { color: "#718078", fontSize: 12, lineHeight: 18 }, muted: { color: "#718078", fontSize: 13 }, addressList: { backgroundColor: "white", borderRadius: 13, padding: 11, gap: 8, borderWidth: 1, borderColor: "#E4ECE7" }, addressCard: { flexDirection: "row", alignItems: "center", gap: 9, padding: 10, borderWidth: 1, borderColor: "#E4ECE7", borderRadius: 10 }, addressSelected: { borderColor: "#18805D", backgroundColor: "#F1F8F4" }, addressName: { color: "#20382E", fontWeight: "700", fontSize: 13 }, input: { backgroundColor: "white", borderWidth: 1, borderColor: "#DCE6DF", borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, color: "#20382E" }, multiline: { minHeight: 76, textAlignVertical: "top" }, product: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "white", borderRadius: 11, padding: 10, borderWidth: 1, borderColor: "#E7EDE9" }, thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#F1F5F2", alignItems: "center", justifyContent: "center" }, image: { width: 48, height: 48, borderRadius: 8, resizeMode: "cover" }, productName: { color: "#20382E", fontWeight: "700", fontSize: 13 }, amount: { color: "#C45C16", fontWeight: "800" }, warning: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFF5E6", padding: 11, borderRadius: 10 }, warningText: { flex: 1, color: "#854513", fontSize: 12, lineHeight: 18 }, payment: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "white", padding: 13, borderRadius: 11, borderWidth: 1, borderColor: "#E2EAE5" }, paymentSelected: { borderColor: "#18805D", backgroundColor: "#F1F8F4" }, voucher: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "white", padding: 14, borderRadius: 11, borderWidth: 1, borderColor: "#E2EAE5" }, outline: { alignSelf: "flex-start", padding: 10 }, summary: { backgroundColor: "white", borderRadius: 13, padding: 14, gap: 8, borderWidth: 1, borderColor: "#E4ECE7", marginTop: 3 }, row: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, rowLabel: { color: "#65756C", fontSize: 13 }, rowValue: { color: "#253A30", fontWeight: "600", fontSize: 13 }, totalRow: { borderTopWidth: 1, borderColor: "#E8EEEA", paddingTop: 10, marginTop: 2, flexDirection: "row", justifyContent: "space-between" }, totalLabel: { fontWeight: "800", color: "#173E32" }, total: { fontSize: 18, fontWeight: "900", color: "#C45C16" }, errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFF0F1", padding: 12, borderRadius: 10 }, error: { flex: 1, color: "#A42339", lineHeight: 19 }, primary: { backgroundColor: "#176A50", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 3 }, primaryText: { color: "white", fontWeight: "800", fontSize: 16 }, disabled: { backgroundColor: "#9AAEA2" },
});
