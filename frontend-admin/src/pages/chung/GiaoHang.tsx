import axios from 'axios';
import {
  ArrowPathIcon, BanknotesIcon, CalendarDaysIcon, CubeIcon, ExclamationTriangleIcon,
  MagnifyingGlassIcon, MapPinIcon, PhoneIcon, PlusIcon, TruckIcon, UserIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { API_BASE_URL, shippingAPI } from '../../services/api';
import type { ShippingAction } from '../../services/api';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

type Shipment = {
  Id: number; HoaDonId: number; MaVanDon: string; TenNguoiNhan: string; SoDienThoaiNhan: string;
  TienThuHo: number; NgayDuKienGiao?: string; TrangThai: string; TrangThaiCOD: string;
  CreatedAt: string; SoLanGiao: number; MaDonVi: string; TenDonVi: string;
};
type Product = { MaSanPham: number; TenSanPham: string; HinhAnh?: string; MaSKU?: string; BienThe?: string; SoLuong: number; DonGia: number };
type Detail = Shipment & {
  LoaiDichVu: string; EmailNguoiNhan?: string; DiaChiGiaoHang: string; GhiChuGiaoHang?: string;
  KhoiLuong: number; KichThuoc?: string; PhiVanChuyen: number; PhuongThucThanhToan?: string;
  TrangThaiThanhToan?: string; NgayGiaoThanhCong?: string; LyDoThatBai?: string; SanPham: Product[];
  Timeline: Array<{ Id: number; TrangThaiMoi: string; ViTri?: string; GhiChu?: string; LyDoThatBai?: string; ThoiDiemSuKien: string; ThoiDiemNhan: string; NguonCapNhat: string; NguoiCapNhat: string }>;
  TienTe?: { collections: Array<{NguonThu:string;SoTien:number}>; settlements: Array<{TienShopNhan:number;PhiKhauTru:number;DieuChinh:number}> };
};
type Stats = { TongSo: number; ChoLayHang: number; DangVanChuyen: number; DangGiao: number; GiaoThanhCong: number; GiaoThanhCongHomNay: number; GiaoThatBai: number; DangHoanVe: number };
type Carrier = { Id: number; MaDonVi: string; TenDonVi: string };
type EligibleOrder = {
  MaHoaDon: number; TenNguoiNhan: string; SoDienThoaiNhan: string; DiaChiGiaoHang: string;
  TongTien: number; TongGiaTriHang: number; TienCOD: number; PhuongThucThanhToan: string;
  TongSoLuong: number; KhoiLuongDuKien: number; SanPham: Array<{ MaSanPham: number; TenSanPham: string; SoLuong: number; DonGia: number }>;
};

const STATUS: Record<string, { label: string; tone: string }> = {
  CHO_LAY_HANG: { label: 'Chờ lấy hàng', tone: 'bg-amber-50 text-amber-700' },
  DA_LAY_HANG: { label: 'Đã lấy hàng', tone: 'bg-sky-50 text-sky-700' },
  DANG_VAN_CHUYEN: { label: 'Đang vận chuyển', tone: 'bg-blue-50 text-blue-700' },
  DANG_GIAO: { label: 'Đang giao', tone: 'bg-emerald-50 text-emerald-700' },
  GIAO_THANH_CONG: { label: 'Giao thành công', tone: 'bg-green-50 text-green-700' },
  GIAO_THAT_BAI: { label: 'Giao thất bại', tone: 'bg-rose-50 text-rose-700' },
  CHO_GIAO_LAI: { label: 'Chờ giao lại', tone: 'bg-violet-50 text-violet-700' },
  DANG_HOAN_VE: { label: 'Đang hoàn về', tone: 'bg-purple-50 text-purple-700' },
  DA_HOAN_VE: { label: 'Đã hoàn về', tone: 'bg-slate-100 text-slate-700' },
  DA_HUY_VAN_DON: { label: 'Đã hủy', tone: 'bg-slate-100 text-slate-500' },
};
const COD_LABEL: Record<string, string> = {
  KHONG_COD: 'Không thu hộ', CHUA_THU_HO: 'Chưa thu hộ', DA_THU_HO: 'Đã thu hộ',
  THU_MOT_PHAN: 'Đã thu một phần', NHAN_MOT_PHAN: 'Đã nhận đối soát một phần', SHOP_THU_TRUC_TIEP: 'Shop đã nhận trực tiếp',
  CHO_DOI_SOAT: 'Chờ đối soát (dữ liệu cũ)', DA_DOI_SOAT: 'Đã đối soát (dữ liệu cũ)', DA_CHUYEN_TIEN: 'Đã chuyển tiền (dữ liệu cũ)', THU_HO_THAT_BAI: 'Thu hộ thất bại',
};
const money = (value?: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const date = (value?: string) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const dateTime = (value?: string) => value ? new Date(value).toLocaleString('vi-VN') : '—';
const newIdempotencyKey = () => globalThis.crypto?.randomUUID?.() || `cod-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
const apiOrigin = API_BASE_URL.replace(/\/api$/, '');
const fallbackImage = `${apiOrigin}/uploads/products/skincare-default.jpg`;
function imageUrl(value?: string) {
  if (!value) return fallbackImage;
  const normalized = value.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith('/')) return `${apiOrigin}${normalized}`;
  return `${apiOrigin}/uploads/products/${normalized.split('/').pop()}`;
}
function errorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return 'Đã xảy ra lỗi không xác định.';
  if (!error.response) return 'Không thể kết nối máy chủ.';
  const map: Record<number, string> = { 401: 'Phiên đăng nhập đã hết hạn.', 403: 'Bạn không có quyền thao tác.', 404: 'Không tìm thấy dữ liệu.', 409: error.response.data?.message || 'Dữ liệu đã thay đổi, vui lòng tải lại.', 500: 'Backend hoặc database đang gặp lỗi.' };
  return error.response.data?.message || map[error.response.status] || 'Không thể xử lý yêu cầu.';
}

function Pill({ value }: { value: string }) {
  const item = STATUS[value] || { label: value || '—', tone: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${item.tone}`}>{item.label}</span>;
}
function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4"><div className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}><header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4"><h2 className="text-lg font-black text-slate-900">{title}</h2><button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button></header><div className="p-6">{children}</div></div></div>;
}

export default function GiaoHang() {
  const navigate = useNavigate();
  const role = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').VaiTro || ''; } catch { return ''; } })();
  const isStaff = role === 'NhanVien';
  const isAdmin = role === 'Admin';
  const pageSize = isStaff ? 4 : 10;
  const [searchParams, setSearchParams] = useSearchParams();
  const autoCreateHandled = useRef(false);
  const [rows, setRows] = useState<Shipment[]>([]); const [stats, setStats] = useState<Stats>({ TongSo: 0, ChoLayHang: 0, DangVanChuyen: 0, DangGiao: 0, GiaoThanhCong: 0, GiaoThanhCongHomNay: 0, GiaoThatBai: 0, DangHoanVe: 0 }); const [statsLoaded, setStatsLoaded] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]); const [selected, setSelected] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true); const [detailLoading, setDetailLoading] = useState(false); const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(''); const [toast, setToast] = useState(''); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [pages, setPages] = useState(1);
  const [status, setStatus] = useState(''); const [carrier, setCarrier] = useState(''); const [payment, setPayment] = useState(''); const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState(''); const [appliedSearch, setAppliedSearch] = useState(''); const [createOpen, setCreateOpen] = useState(false);
  const [eligible, setEligible] = useState<EligibleOrder[]>([]); const [createForm, setCreateForm] = useState({ HoaDonId: '', DonViVanChuyenId: '', LoaiDichVu: 'Giao nhanh', KhoiLuong: '0.5', KichThuoc: '', PhiVanChuyen: '30000', NgayDuKienGiao: '', GhiChuGiaoHang: '' });
  const [confirmAction, setConfirmAction] = useState<{ action: ShippingAction; label: string } | null>(null);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [codReceipt, setCodReceipt] = useState({ SoTien:'', PhuongThuc:'TIEN_MAT', MaThamChieu:'', ChungTuUrl:'', IdempotencyKey:newIdempotencyKey(), note:'' });
  const [settlement, setSettlement] = useState({ TienShopNhan:'', PhiKhauTru:'0', DieuChinh:'0', LyDoDieuChinh:'', MaGiaoDich:'', ChungTuUrl:'', IdempotencyKey:newIdempotencyKey() });
  const [reasonAction, setReasonAction] = useState<'cancel' | 'failed' | null>(null); const [reason, setReason] = useState(''); const [note, setNote] = useState(''); const [eventAt, setEventAt] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  const [scheduleOpen, setScheduleOpen] = useState(false); const [expectedDate, setExpectedDate] = useState(''); const [returnOpen, setReturnOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<Array<{ MaSanPham: number; TenSanPham: string; ordered: number; SoLuongNhapLai: number; SoLuongHuHong: number; TinhTrang: string; GhiChu: string }>>([]);

  async function loadList() {
    try { setLoading(true); setError(''); const response = await shippingAPI.getAll({ search: appliedSearch || undefined, status: status || undefined, carrier: carrier || undefined, from: dateFrom || undefined, to: dateTo || undefined, payment: payment || undefined, page, limit: pageSize }); setRows(response.data.data); setTotal(response.data.pagination.total); setPages(Math.max(1, response.data.pagination.totalPages)); }
    catch (e) { setError(errorMessage(e)); setRows([]); } finally { setLoading(false); }
  }
  async function loadStats() { const response = await shippingAPI.getStats(); setStats(response.data.data); setStatsLoaded(true); }
  async function loadCarriers() { const response = await shippingAPI.getCarriers(); setCarriers(response.data.data); }
  async function openDetail(id: number) { try { setDetailLoading(true); const response = await shippingAPI.getById(id); setSelected(response.data.data); } catch (e) { setToast(errorMessage(e)); } finally { setDetailLoading(false); } }
  async function refresh(id?: number) { await Promise.all([loadList(), loadStats()]); if (id) await openDetail(id); }
  useEffect(() => { loadStats().catch((e) => setError(errorMessage(e))); loadCarriers().catch((e) => setError(errorMessage(e))); }, []);
  useEffect(() => { loadList(); }, [page, status, carrier, payment, dateFrom, dateTo, appliedSearch, pageSize]);
  useEffect(() => {
    const orderId = Number(searchParams.get('createFor'));
    if (!orderId || autoCreateHandled.current) return;
    autoCreateHandled.current = true;
    shippingAPI.getEligibleOrders().then((response) => {
      const orders = response.data.data as EligibleOrder[];
      setEligible(orders);
      if (orders.some((item) => item.MaHoaDon === orderId)) {
        const order = orders.find((item) => item.MaHoaDon === orderId)!;
        setCreateForm((current) => ({ ...current, HoaDonId: String(orderId), KhoiLuong: String(order.KhoiLuongDuKien || 0.25) }));
        setCreateOpen(true);
      } else setToast('Đơn hàng chưa đóng gói hoặc đã có vận đơn hoạt động.');
      setSearchParams({}, { replace: true });
    }).catch((e) => setToast(errorMessage(e)));
  }, [searchParams, setSearchParams]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3500); return () => window.clearTimeout(timer); }, [toast]);

  const tabs = useMemo(() => [
    ['', 'Tất cả', stats.TongSo], ['CHO_LAY_HANG', isStaff ? 'Chờ bàn giao' : 'Chờ lấy hàng', stats.ChoLayHang], ['DANG_VAN_CHUYEN', 'Đang vận chuyển', stats.DangVanChuyen],
    ['DANG_GIAO', 'Đang giao', stats.DangGiao], ['GIAO_THANH_CONG', 'Giao thành công', stats.GiaoThanhCong], ['GIAO_THAT_BAI', 'Giao thất bại', stats.GiaoThatBai],
  ] as Array<[string, string, number]>, [stats, isStaff]);
  const chosenOrder = eligible.find((item) => item.MaHoaDon === Number(createForm.HoaDonId));
  const adminStatCards: Array<{ Icon: typeof CubeIcon; label: string; value: number; tone: string }> = [
    { Icon: CubeIcon, label: 'Chờ lấy hàng', value: stats.ChoLayHang, tone: 'bg-amber-50 text-amber-600' },
    { Icon: TruckIcon, label: 'Đang vận chuyển', value: stats.DangVanChuyen, tone: 'bg-blue-50 text-blue-600' },
    { Icon: TruckIcon, label: 'Đang giao', value: stats.DangGiao, tone: 'bg-emerald-50 text-emerald-600' },
    { Icon: ExclamationTriangleIcon, label: 'Giao thất bại', value: stats.GiaoThatBai, tone: 'bg-rose-50 text-rose-600' },
    { Icon: ArrowPathIcon, label: 'Đang hoàn về', value: stats.DangHoanVe, tone: 'bg-purple-50 text-purple-600' },
  ];
  const staffStatCards: Array<{ Icon: typeof CubeIcon; label: string; value: number; tone: string }> = [
    { Icon: CubeIcon, label: 'Chờ bàn giao', value: stats.ChoLayHang, tone: 'bg-amber-50 text-amber-600' },
    { Icon: TruckIcon, label: 'Đang giao', value: stats.DangVanChuyen + stats.DangGiao, tone: 'bg-blue-50 text-blue-600' },
    { Icon: ExclamationTriangleIcon, label: 'Giao thất bại', value: stats.GiaoThatBai, tone: 'bg-rose-50 text-rose-600' },
    { Icon: TruckIcon, label: 'Đã giao hôm nay', value: stats.GiaoThanhCongHomNay, tone: 'bg-emerald-50 text-emerald-600' },
  ];
  const statCards = isStaff ? staffStatCards : adminStatCards;

  async function showCreate() {
    try { const response = await shippingAPI.getEligibleOrders(); setEligible(response.data.data); setCreateOpen(true); }
    catch (e) { setToast(errorMessage(e)); }
  }
  async function createShipment(event: FormEvent) {
    event.preventDefault(); try { setSubmitting(true); const response = await shippingAPI.create({ ...createForm, HoaDonId: Number(createForm.HoaDonId), DonViVanChuyenId: Number(createForm.DonViVanChuyenId), KhoiLuong: Number(createForm.KhoiLuong), PhiVanChuyen: Number(createForm.PhiVanChuyen) }); setCreateOpen(false); setToast(response.data.message); setCreateForm({ HoaDonId: '', DonViVanChuyenId: '', LoaiDichVu: 'Giao nhanh', KhoiLuong: '0.5', KichThuoc: '', PhiVanChuyen: '30000', NgayDuKienGiao: '', GhiChuGiaoHang: '' }); await refresh(); }
    catch (e) { setToast(errorMessage(e)); } finally { setSubmitting(false); }
  }
  async function runAction(action: ShippingAction, payload: Record<string, unknown> = {}) {
    if (!selected) return; const eventDate = new Date(eventAt); if (!Number.isFinite(eventDate.getTime()) || eventDate.getTime() > Date.now() + 5 * 60 * 1000) { setToast('Thời điểm sự kiện không hợp lệ hoặc nằm trong tương lai.'); return; } try { setSubmitting(true); const response = await shippingAPI.action(selected.Id, { action, eventAt: eventDate.toISOString(), ...payload }); setToast(response.data.message); setConfirmAction(null); setReasonAction(null); setScheduleOpen(false); setReturnOpen(false); setReason(''); setNote(''); await refresh(selected.Id); }
    catch (e) { setToast(errorMessage(e)); } finally { setSubmitting(false); }
  }
  async function submitSettlement(event: FormEvent) {
    event.preventDefault(); if(!selected) return;
    try { setSubmitting(true); const response=await shippingAPI.settleCod(selected.Id,{...settlement,TienShopNhan:Number(settlement.TienShopNhan),PhiKhauTru:Number(settlement.PhiKhauTru),DieuChinh:Number(settlement.DieuChinh),ThoiDiemNhan:new Date().toISOString()});setToast(response.data.message);setSettlementOpen(false);await refresh(selected.Id); }
    catch(e){setToast(errorMessage(e));} finally{setSubmitting(false)}
  }
  function beginCodCollection() {
    if(!selected) return;
    const carrierCollected=(selected.TienTe?.collections||[]).filter(x=>x.NguonThu==='VAN_CHUYEN').reduce((sum,x)=>sum+Number(x.SoTien),0);
    setCodReceipt({SoTien:String(Math.max(0,Number(selected.TienThuHo)-carrierCollected)),PhuongThuc:'TIEN_MAT',MaThamChieu:'',ChungTuUrl:'',IdempotencyKey:newIdempotencyKey(),note:''});
    setConfirmAction({action:'cod_collected',label:'Nhập khoản tiền đơn vị vận chuyển xác nhận đã thu từ khách. Đây chưa phải tiền shop nhận.'});
  }
  function beginSettlement() {
    if(!selected) return;
    const collected=(selected.TienTe?.collections||[]).filter(x=>x.NguonThu==='VAN_CHUYEN').reduce((sum,x)=>sum+Number(x.SoTien),0);
    const accounted=(selected.TienTe?.settlements||[]).reduce((sum,x)=>sum+Number(x.TienShopNhan)+Number(x.PhiKhauTru)+Number(x.DieuChinh),0);
    setSettlement({TienShopNhan:String(Math.max(0,collected-accounted)),PhiKhauTru:'0',DieuChinh:'0',LyDoDieuChinh:'',MaGiaoDich:'',ChungTuUrl:'',IdempotencyKey:newIdempotencyKey()});setSettlementOpen(true);
  }
  function beginReturn() { if (!selected) return; setReturnItems(selected.SanPham.map((item) => ({ MaSanPham: item.MaSanPham, TenSanPham: item.TenSanPham, ordered: item.SoLuong, SoLuongNhapLai: item.SoLuong, SoLuongHuHong: 0, TinhTrang: 'Nguyên tem, đủ điều kiện bán', GhiChu: '' }))); setReturnOpen(true); }

  return <div className="min-h-[calc(100vh-73px)] bg-[#f7f9fc] p-4 text-slate-800 lg:p-6">
    {toast && <div className="fixed right-5 top-5 z-[100] rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}
    <div className={`mx-auto transition-all ${selected ? 'max-w-[1500px] pr-0 xl:pr-[420px]' : 'max-w-[1500px]'}`}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-4 text-sm text-slate-500">Nhân viên&nbsp; / &nbsp;<b className="text-slate-700">Vận chuyển</b></p><h1 className="text-3xl font-black tracking-tight text-[#10213d]">{isStaff ? 'Vận chuyển' : 'Quản lý vận chuyển'}</h1><p className="mt-1 text-slate-500">{isStaff ? 'Bàn giao đơn và theo dõi tiến trình giao hàng.' : 'Theo dõi vận đơn, hành trình giao hàng và COD.'}</p><span className="mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Cập nhật thủ công · chưa tích hợp hãng vận chuyển</span></div><button onClick={showCreate} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 font-bold text-white shadow-lg shadow-amber-200"><PlusIcon className="h-5 w-5" />Tạo vận đơn</button></div>
      <div className={`mb-5 grid gap-3 sm:grid-cols-2 ${isStaff ? 'xl:grid-cols-4' : 'xl:grid-cols-5'}`}>
        {statCards.map(({ Icon, label, value, tone }) => <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}><Icon className="h-7 w-7" /></div><div><p className="text-sm font-semibold text-slate-500">{label}</p><b className="text-2xl text-[#10213d]">{statsLoaded ? Number(value ?? 0) : '—'}</b></div></div>)}
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex gap-2 overflow-x-auto border-b px-4 pt-2">{tabs.map(([value, label, count]) => <button key={label} onClick={() => { setStatus(value); setPage(1); }} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold ${status === value ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-500'}`}>{label}<span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs">{Number(count || 0)}</span></button>)}</div>
        <div className="grid gap-3 border-b p-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); setAppliedSearch(search.trim()); }} className="relative"><MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã vận đơn, mã đơn hoặc người nhận" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 outline-none focus:border-pink-400" /></form>
          <select value={carrier} onChange={(e) => { setCarrier(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3"><option value="">Đơn vị vận chuyển</option>{carriers.map((item) => <option key={item.Id} value={item.MaDonVi}>{item.TenDonVi}</option>)}</select>
          <input aria-label="Từ ngày tạo" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3" />
          <input aria-label="Đến ngày tạo" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3" />
          <select value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3"><option value="">COD / Online</option><option value="COD">COD</option><option value="ONLINE">Online</option></select>
          <button onClick={() => { setSearch(''); setAppliedSearch(''); setCarrier(''); setDateFrom(''); setDateTo(''); setPayment(''); setStatus(''); setPage(1); }} className="rounded-xl border border-amber-200 px-4 py-2 font-bold text-amber-700">Đặt lại</button>
        </div>
        {error && <div className="m-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700"><span>{error}</span><button onClick={() => refresh()} className="font-bold underline">Thử lại</button></div>}
        <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Mã vận đơn', 'Mã đơn', 'Người nhận', 'Đơn vị VC', 'Tiền COD', 'Dự kiến giao', 'Trạng thái', 'Thao tác'].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody>
          {loading ? Array.from({ length: 6 }).map((_, i) => <tr key={i} className="border-t"><td colSpan={8} className="p-4"><div className="h-8 animate-pulse rounded bg-slate-100" /></td></tr>) : rows.length === 0 ? <tr><td colSpan={8} className="p-14 text-center text-slate-400"><TruckIcon className="mx-auto mb-3 h-12 w-12" />Chưa có vận đơn phù hợp.</td></tr> : rows.map((row) => <tr key={row.Id} onClick={() => openDetail(row.Id)} className={`cursor-pointer border-t hover:bg-pink-50/50 ${selected?.Id === row.Id ? 'bg-pink-50' : ''}`}><td className="px-4 py-3 font-extrabold text-slate-900">{row.MaVanDon}</td><td className="px-4 py-3 font-semibold">DH{String(row.HoaDonId).padStart(8, '0')}</td><td className="px-4 py-3"><b className="block">{row.TenNguoiNhan}</b><span className="text-xs text-slate-500">{row.SoDienThoaiNhan}</span></td><td className="px-4 py-3 font-bold">{row.MaDonVi}</td><td className="px-4 py-3 font-semibold">{money(row.TienThuHo)}</td><td className="px-4 py-3">{date(row.NgayDuKienGiao)}</td><td className="px-4 py-3"><Pill value={row.TrangThai} /></td><td className="px-4 py-3"><button onClick={(e) => { e.stopPropagation(); openDetail(row.Id); }} className="rounded-lg border px-3 py-2 text-xs font-bold hover:border-pink-300 hover:text-pink-600">Xem</button></td></tr>)}
        </tbody></table></div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-slate-500"><span>Vận đơn · hiển thị {rows.length ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, total)} trên {total}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-30">‹</button><span className="rounded-lg bg-amber-400 px-4 py-2 font-bold text-slate-900">{page}/{pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-30">›</button></div></footer>
      </section>
    </div>

    {selected && <aside className="fixed bottom-0 right-0 top-0 z-50 w-full overflow-y-auto border-l bg-white shadow-2xl sm:w-[430px]"><header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5"><div><p className="text-xs text-slate-500">Chi tiết vận đơn</p><h2 className="font-black text-slate-900">#{selected.MaVanDon}</h2></div><button onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button></header>{detailLoading ? <div className="p-6"><div className="h-48 animate-pulse rounded-xl bg-slate-100" /></div> : <><div className="space-y-4 p-5">
      <section className="rounded-xl border p-4"><h3 className="mb-3 font-black">Thông tin vận đơn</h3><div className="grid grid-cols-2 gap-2 text-sm"><span className="text-slate-500">Mã đơn hàng</span><b>DH{String(selected.HoaDonId).padStart(8, '0')}</b><span className="text-slate-500">Đơn vị</span><b>{selected.TenDonVi}</b><span className="text-slate-500">Dịch vụ</span><b>{selected.LoaiDichVu}</b><span className="text-slate-500">Ngày tạo</span><b>{dateTime(selected.CreatedAt)}</b><span className="text-slate-500">Dự kiến</span><b>{date(selected.NgayDuKienGiao)}</b><span className="text-slate-500">Số lần giao</span><b>{selected.SoLanGiao}/3</b></div><div className="mt-3 flex items-center justify-between"><Pill value={selected.TrangThai} /><button onClick={() => navigate(`/invoices/${selected.HoaDonId}`)} className="text-sm font-bold text-blue-700 underline">Xem đơn hàng</button></div></section>
      <section className="rounded-xl border p-4"><h3 className="mb-3 font-black">Thông tin người nhận</h3><p className="flex gap-2 text-sm"><UserIcon className="h-5 w-5" />{selected.TenNguoiNhan}</p><p className="mt-2 flex gap-2 text-sm"><PhoneIcon className="h-5 w-5" />{selected.SoDienThoaiNhan}</p>{selected.EmailNguoiNhan && <p className="mt-2 text-sm text-slate-500">{selected.EmailNguoiNhan}</p>}<p className="mt-2 flex gap-2 text-sm"><MapPinIcon className="h-5 w-5 shrink-0" />{selected.DiaChiGiaoHang}</p>{selected.GhiChuGiaoHang && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs">Ghi chú: {selected.GhiChuGiaoHang}</p>}</section>
      <section className="rounded-xl border p-4"><h3 className="mb-3 font-black">Sản phẩm trong gói hàng</h3><div className="space-y-3">{selected.SanPham.map((item) => <div key={item.MaSanPham} className="flex gap-3"><img src={imageUrl(item.HinhAnh)} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = fallbackImage; }} className="h-14 w-14 rounded-xl border object-cover" /><div className="min-w-0 flex-1"><b className="block truncate text-sm">{item.TenSanPham}</b><span className="text-xs text-slate-500">{item.MaSKU || 'Chưa có SKU'} · {item.BienThe || 'Mặc định'} · SL: {item.SoLuong}</span></div><b className="text-sm">{money(item.DonGia)}</b></div>)}</div></section>
      <section className="rounded-xl border p-4"><h3 className="mb-3 flex items-center gap-2 font-black"><BanknotesIcon className="h-5 w-5" />Thanh toán và kiện hàng</h3><div className="grid grid-cols-2 gap-2 text-sm"><span className="text-slate-500">Phí vận chuyển</span><b className="text-right">{money(selected.PhiVanChuyen)}</b><span className="text-slate-500">Tiền thu hộ COD</span><b className="text-right">{money(selected.TienThuHo)}</b><span className="text-slate-500">Khối lượng</span><b className="text-right">{selected.KhoiLuong} kg</b><span className="text-slate-500">Kích thước</span><b className="text-right">{selected.KichThuoc || '—'}</b><span className="text-slate-500">Thanh toán</span><b className="text-right">{selected.PhuongThucThanhToan || '—'}</b><span className="text-slate-500">Đối soát COD</span><b className="text-right text-pink-600">{COD_LABEL[selected.TrangThaiCOD] || selected.TrangThaiCOD}</b></div></section>
      <section><h3 className="mb-3 font-black">Hành trình vận chuyển</h3>{selected.Timeline.map((item, index) => <div key={item.Id} className="relative flex gap-3 pb-5"><i className="relative z-[1] mt-1 h-3 w-3 shrink-0 rounded-full bg-amber-400 ring-4 ring-amber-50" />{index < selected.Timeline.length - 1 && <i className="absolute left-[5px] top-4 h-full w-px bg-amber-100" />}<div><b className="text-sm">{STATUS[item.TrangThaiMoi]?.label || item.TrangThaiMoi}</b><p className="text-xs text-slate-500">Sự kiện: {dateTime(item.ThoiDiemSuKien)} · ghi nhận: {dateTime(item.ThoiDiemNhan)}</p><p className="text-xs text-slate-500">Nguồn: {item.NguonCapNhat === 'THU_CONG' ? 'Nhân viên cập nhật thủ công' : item.NguonCapNhat === 'CHUA_GHI_NHAN' ? 'Lịch sử cũ · chưa lưu nguồn' : item.NguonCapNhat} · {item.NguoiCapNhat}</p>{item.ViTri && <p className="text-xs text-slate-500">{item.ViTri}</p>}{(item.GhiChu || item.LyDoThatBai) && <p className="mt-1 text-xs">{item.GhiChu || item.LyDoThatBai}</p>}</div></div>)}</section>
      <section className="rounded-xl border p-3"><label className="block text-xs font-bold text-slate-600">Thời điểm sự kiện<input type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label><p className="mt-1 text-xs text-slate-500">Thời điểm hệ thống ghi nhận sẽ được lưu riêng.</p></section>
    </div><ActionBar detail={selected} submitting={submitting} isAdmin={isAdmin} confirm={setConfirmAction} collect={beginCodCollection} settle={beginSettlement} reason={setReasonAction} schedule={() => setScheduleOpen(true)} returned={beginReturn} /></>}</aside>}

    {createOpen && <Modal title="Tạo vận đơn" onClose={() => setCreateOpen(false)} wide><form onSubmit={createShipment} className="space-y-4"><label className="block text-sm font-bold">Đơn hàng đủ điều kiện<select required value={createForm.HoaDonId} onChange={(e) => { const order = eligible.find((item) => item.MaHoaDon === Number(e.target.value)); setCreateForm({ ...createForm, HoaDonId: e.target.value, KhoiLuong: order ? String(order.KhoiLuongDuKien || 0.25) : createForm.KhoiLuong }); }} className="mt-1 w-full rounded-xl border p-3 font-normal"><option value="">Chọn đơn đã đóng gói</option>{eligible.map((item) => <option key={item.MaHoaDon} value={item.MaHoaDon}>DH{String(item.MaHoaDon).padStart(8, '0')} — {item.TenNguoiNhan}</option>)}</select></label>{chosenOrder && <div className="rounded-xl bg-pink-50 p-4 text-sm"><b>{chosenOrder.TenNguoiNhan} · {chosenOrder.SoDienThoaiNhan}</b><p>{chosenOrder.DiaChiGiaoHang}</p><div className="mt-2 space-y-1">{chosenOrder.SanPham.map((item) => <p key={item.MaSanPham}>{item.TenSanPham} × {item.SoLuong}</p>)}</div><div className="mt-3 grid grid-cols-2 gap-2 border-t border-pink-100 pt-3"><span>Giá trị hàng</span><b className="text-right">{money(chosenOrder.TongGiaTriHang)}</b><span>Tiền COD</span><b className="text-right">{money(chosenOrder.TienCOD)}</b><span>Khối lượng dự kiến</span><b className="text-right">{chosenOrder.KhoiLuongDuKien} kg</b><span>Thanh toán</span><b className="text-right">{chosenOrder.PhuongThucThanhToan}</b></div></div>}<div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Đơn vị vận chuyển<select required value={createForm.DonViVanChuyenId} onChange={(e) => setCreateForm({ ...createForm, DonViVanChuyenId: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal"><option value="">Chọn đơn vị</option>{carriers.map((item) => <option key={item.Id} value={item.Id}>{item.TenDonVi}</option>)}</select></label><label className="text-sm font-bold">Loại dịch vụ<input required value={createForm.LoaiDichVu} onChange={(e) => setCreateForm({ ...createForm, LoaiDichVu: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="text-sm font-bold">Khối lượng (kg)<input required min="0.01" step="0.01" type="number" value={createForm.KhoiLuong} onChange={(e) => setCreateForm({ ...createForm, KhoiLuong: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="text-sm font-bold">Kích thước<input value={createForm.KichThuoc} onChange={(e) => setCreateForm({ ...createForm, KichThuoc: e.target.value })} placeholder="Dài x rộng x cao" className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="text-sm font-bold">Phí vận chuyển<input required min="0" type="number" value={createForm.PhiVanChuyen} onChange={(e) => setCreateForm({ ...createForm, PhiVanChuyen: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="text-sm font-bold">Ngày dự kiến giao<input required type="date" value={createForm.NgayDuKienGiao} onChange={(e) => setCreateForm({ ...createForm, NgayDuKienGiao: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label></div><label className="block text-sm font-bold">Ghi chú<textarea value={createForm.GhiChuGiaoHang} onChange={(e) => setCreateForm({ ...createForm, GhiChuGiaoHang: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><div className="flex justify-end gap-3"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl border px-5 py-3">Hủy</button><button disabled={submitting} className="rounded-xl bg-amber-500 px-5 py-3 font-bold text-white disabled:opacity-50">Tạo vận đơn</button></div></form></Modal>}
    {confirmAction && <Modal title="Xác nhận thao tác" onClose={() => setConfirmAction(null)}><p>{confirmAction.label}</p>{confirmAction.action === 'cod_collected' && <div className="mt-4 grid gap-3"><label className="text-sm font-bold">Số tiền đơn vị vận chuyển thực thu<input type="number" min="1" max={selected?.TienThuHo} value={codReceipt.SoTien} onChange={e=>setCodReceipt({...codReceipt,SoTien:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="text-sm font-bold">Phương thức<select value={codReceipt.PhuongThuc} onChange={e=>setCodReceipt({...codReceipt,PhuongThuc:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal"><option value="TIEN_MAT">Tiền mặt</option><option value="CHUYEN_KHOAN">Chuyển khoản</option></select></label><label className="text-sm font-bold">Mã tham chiếu / biên nhận<input required value={codReceipt.MaThamChieu} onChange={e=>setCodReceipt({...codReceipt,MaThamChieu:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>{codReceipt.PhuongThuc==='CHUYEN_KHOAN'&&<label className="text-sm font-bold">Link chứng từ<input required value={codReceipt.ChungTuUrl} onChange={e=>setCodReceipt({...codReceipt,ChungTuUrl:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>}<label className="text-sm font-bold">Ghi chú<textarea value={codReceipt.note} onChange={e=>setCodReceipt({...codReceipt,note:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label></div>}<div className="mt-6 flex justify-end gap-3"><button onClick={() => setConfirmAction(null)} className="rounded-xl border px-4 py-2">Quay lại</button><button disabled={submitting || (confirmAction.action === 'cod_collected' && (!Number(codReceipt.SoTien)||!codReceipt.MaThamChieu.trim()||(codReceipt.PhuongThuc==='CHUYEN_KHOAN'&&!codReceipt.ChungTuUrl.trim())))} onClick={() => runAction(confirmAction.action, confirmAction.action === 'cod_collected' ? { SoTien:Number(codReceipt.SoTien),PhuongThuc:codReceipt.PhuongThuc,MaThamChieu:codReceipt.MaThamChieu,ChungTuUrl:codReceipt.ChungTuUrl||undefined,IdempotencyKey:codReceipt.IdempotencyKey,note:codReceipt.note } : {})} className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-slate-950 disabled:opacity-40">Xác nhận</button></div></Modal>}
    {settlementOpen && selected && <Modal title="Đối soát COD thực nhận" onClose={()=>setSettlementOpen(false)}><form onSubmit={submitSettlement} className="space-y-3"><p className="rounded-lg bg-amber-50 p-3 text-sm">Chỉ ghi nhận khi đã kiểm tra tiền vào tài khoản shop. Tổng thu COD từ vận chuyển: {money((selected.TienTe?.collections||[]).filter(x=>x.NguonThu==='VAN_CHUYEN').reduce((a,x)=>a+Number(x.SoTien),0))}.</p><label className="block text-sm font-bold">Tiền shop thực nhận<input required type="number" min="0" value={settlement.TienShopNhan} onChange={e=>setSettlement({...settlement,TienShopNhan:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="block text-sm font-bold">Phí hãng khấu trừ<input type="number" min="0" value={settlement.PhiKhauTru} onChange={e=>setSettlement({...settlement,PhiKhauTru:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="block text-sm font-bold">Điều chỉnh (+/-)<input type="number" value={settlement.DieuChinh} onChange={e=>setSettlement({...settlement,DieuChinh:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>{Number(settlement.DieuChinh)!==0&&<label className="block text-sm font-bold">Lý do điều chỉnh<input required value={settlement.LyDoDieuChinh} onChange={e=>setSettlement({...settlement,LyDoDieuChinh:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>}<label className="block text-sm font-bold">Mã giao dịch<input required value={settlement.MaGiaoDich} onChange={e=>setSettlement({...settlement,MaGiaoDich:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="block text-sm font-bold">Chứng từ (link nếu có)<input value={settlement.ChungTuUrl} onChange={e=>setSettlement({...settlement,ChungTuUrl:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><button disabled={submitting||!settlement.MaGiaoDich||Number(settlement.TienShopNhan)<0||Number(settlement.PhiKhauTru)<0} className="w-full rounded-xl bg-green-600 py-3 font-bold text-white disabled:opacity-40">Ghi nhận khoản đã thực nhận</button></form></Modal>}
    {reasonAction && <Modal title={reasonAction === 'failed' ? 'Ghi nhận giao thất bại' : 'Hủy vận đơn'} onClose={() => setReasonAction(null)}><label className="text-sm font-bold">Lý do<select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal"><option value="">Chọn lý do</option>{(reasonAction === 'failed' ? ['Không liên hệ được', 'Khách hẹn ngày khác', 'Sai địa chỉ', 'Khách từ chối nhận', 'Khách không đủ tiền COD', 'Kiện hàng hỏng', 'Lý do khác'] : ['Khách yêu cầu hủy', 'Sai thông tin vận đơn', 'Thay đổi đơn vị vận chuyển', 'Lý do khác']).map((item) => <option key={item}>{item}</option>)}</select></label><label className="mt-4 block text-sm font-bold">Ghi chú<textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><button disabled={!reason || submitting} onClick={() => runAction(reasonAction, { reason, note })} className="mt-5 w-full rounded-xl bg-rose-600 py-3 font-bold text-white disabled:opacity-40">Xác nhận</button></Modal>}
    {scheduleOpen && <Modal title="Lên lịch giao lại" onClose={() => setScheduleOpen(false)}><label className="text-sm font-bold">Ngày dự kiến giao lại<input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="mt-4 block text-sm font-bold">Ghi chú<textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><button disabled={!expectedDate || submitting} onClick={() => runAction('reschedule', { expectedDate, note })} className="mt-5 w-full rounded-xl bg-violet-600 py-3 font-bold text-white disabled:opacity-40">Lưu lịch giao lại</button></Modal>}
    {returnOpen && <Modal title="Kiểm tra hàng hoàn" onClose={() => setReturnOpen(false)} wide><div className="space-y-4">{returnItems.map((item, index) => <div key={item.MaSanPham} className="rounded-xl border p-4"><b>{item.TenSanPham} — đã bán {item.ordered}</b><div className="mt-3 grid gap-3 md:grid-cols-3"><label className="text-xs font-bold">Nhập lại kho<input type="number" min="0" max={item.ordered} value={item.SoLuongNhapLai} onChange={(e) => setReturnItems((current) => current.map((x, i) => i === index ? { ...x, SoLuongNhapLai: Number(e.target.value) } : x))} className="mt-1 w-full rounded-lg border p-2" /></label><label className="text-xs font-bold">Hỏng/đã mở<input type="number" min="0" max={item.ordered} value={item.SoLuongHuHong} onChange={(e) => setReturnItems((current) => current.map((x, i) => i === index ? { ...x, SoLuongHuHong: Number(e.target.value) } : x))} className="mt-1 w-full rounded-lg border p-2" /></label><label className="text-xs font-bold">Tình trạng<select value={item.TinhTrang} onChange={(e) => setReturnItems((current) => current.map((x, i) => i === index ? { ...x, TinhTrang: e.target.value } : x))} className="mt-1 w-full rounded-lg border p-2"><option>Nguyên tem, đủ điều kiện bán</option><option>Đã mở</option><option>Hỏng/vỡ</option><option>Thiếu sản phẩm</option></select></label></div></div>)}</div><label className="mt-4 block text-sm font-bold">Ghi chú kiểm tra<textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><button disabled={submitting || returnItems.some((item) => item.SoLuongNhapLai + item.SoLuongHuHong > item.ordered)} onClick={() => runAction('returned', { note, items: returnItems })} className="mt-5 w-full rounded-xl bg-purple-600 py-3 font-bold text-white disabled:opacity-40">Xác nhận hàng đã về shop</button></Modal>}
  </div>;
}

function ActionBar({ detail, submitting, isAdmin, confirm, collect, settle, reason, schedule, returned }: { detail: Detail; submitting: boolean; isAdmin: boolean; confirm: (value: { action: ShippingAction; label: string }) => void; collect: () => void; settle: () => void; reason: (value: 'cancel' | 'failed') => void; schedule: () => void; returned: () => void }) {
  const button = 'rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-40';
  return <footer className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t bg-white p-4">
    {detail.TrangThai === 'CHO_LAY_HANG' && <><button disabled={submitting} onClick={() => reason('cancel')} className={`${button} border text-rose-600`}>Hủy vận đơn</button><button disabled={submitting} onClick={() => confirm({ action: 'picked_up', label: 'Xác nhận đơn vị vận chuyển đã lấy hàng? Tồn kho sẽ được xuất đúng một lần theo FEFO.' })} className={`${button} bg-amber-500 text-white`}>Xác nhận đã lấy hàng</button></>}
    {detail.TrangThai === 'DA_LAY_HANG' && <button disabled={submitting} onClick={() => confirm({ action: 'in_transit', label: 'Chuyển vận đơn sang đang vận chuyển?' })} className={`${button} bg-blue-600 text-white`}>Bắt đầu vận chuyển</button>}
    {detail.TrangThai === 'DANG_VAN_CHUYEN' && <button disabled={submitting} onClick={() => confirm({ action: 'out_for_delivery', label: 'Xác nhận kiện hàng đang được giao cho khách?' })} className={`${button} bg-emerald-600 text-white`}>Đang giao cho khách</button>}
    {detail.TrangThai === 'DANG_GIAO' && <><button disabled={submitting} onClick={() => reason('failed')} className={`${button} border text-rose-600`}>Giao thất bại</button><button disabled={submitting} onClick={() => confirm({ action: 'delivered', label: 'Xác nhận vận đơn đã giao. Với COD, trạng thái thanh toán vẫn chưa đổi cho đến khi xác nhận đã thu hộ.' })} className={`${button} bg-green-600 text-white`}>Giao thành công</button></>}
    {detail.TrangThai === 'GIAO_THAT_BAI' && <><button disabled={submitting || detail.SoLanGiao >= 3} onClick={schedule} className={`${button} border text-violet-600`}>Giao lại</button><button disabled={submitting} onClick={() => confirm({ action: 'return_to_shop', label: 'Chuyển hoàn kiện hàng về shop? Kho chưa được cộng lại ở bước này.' })} className={`${button} bg-purple-600 text-white`}>Hoàn hàng</button></>}
    {detail.TrangThai === 'CHO_GIAO_LAI' && <button disabled={submitting} onClick={() => confirm({ action: 'retry_delivery', label: 'Xác nhận bắt đầu giao lại?' })} className={`${button} bg-emerald-600 text-white`}>Đang giao lại</button>}
    {detail.TrangThai === 'DANG_HOAN_VE' && <button disabled={submitting} onClick={returned} className={`${button} bg-purple-600 text-white`}>Xác nhận đã hoàn về kho</button>}
    {detail.TrangThai === 'GIAO_THANH_CONG' && Number(detail.TienThuHo) > 0 && ['CHUA_THU_HO', 'THU_HO_THAT_BAI','THU_MOT_PHAN'].includes(detail.TrangThaiCOD) && <button disabled={submitting} onClick={collect} className={`${button} bg-amber-500 text-white`}>Ghi nhận số COD vận chuyển đã thu</button>}
    {isAdmin && (detail.TienTe?.collections||[]).some(x=>x.NguonThu==='VAN_CHUYEN') && <button disabled={submitting} onClick={settle} className={`${button} bg-green-600 text-white`}>Ghi nhận đối soát tiền thực nhận</button>}
  </footer>;
}
