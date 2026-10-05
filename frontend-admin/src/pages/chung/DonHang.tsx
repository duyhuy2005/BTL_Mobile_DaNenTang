import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BanknotesIcon, CalendarDaysIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon,
  ClockIcon, CubeIcon, ExclamationCircleIcon, FunnelIcon, MagnifyingGlassIcon,
  MapPinIcon, PhoneIcon, ShoppingCartIcon, TruckIcon, UserIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { API_BASE_URL, invoicesAPI, shippingAPI } from '../../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

type ProductPreview = { MaSanPham: number; TenSanPham: string; HinhAnh?: string; SoLuong: number };
type Order = {
  MaHoaDon: number; HoTen: string; SoDienThoai?: string; NgayLap: string; TongTien: number;
  PhuongThucThanhToan?: string; TrangThai: string; TrangThaiThanhToan?: string;
  TrangThaiVanChuyen?: string; DonViVanChuyen?: string; MaVanDon?: string;
  SanPhamTomTat: ProductPreview[]; SoDongSanPham: number; TongSoLuong: number;
};
type Detail = Order & {
  Email?: string; DiaChiGiaoHang?: string; TenNguoiNhan?: string; KhachDat?: string; SoDienThoaiKhach?: string; SoTienDaThu?:number; CODConPhaiThu?:number; TamTinh?: number; GiamGia?: number;
  GiamGiaSanPham?: number; GiamGiaVoucher?: number; PhiVanChuyen?: number; LyDoHuy?: string;
  GhiChu?: string;
  ChiTiet: Array<{ MaSanPham: number; TenSanPham: string; HinhAnh?: string; MaSKU?: string; BienThe?: string; SoLuong: number; DonGia: number; ThanhTien: number }>;
  LichSuTrangThai: Array<{ MaLichSu: number; TrangThaiMoi: string; GhiChu?: string; NgayThayDoi: string; NguoiThayDoi?: string }>;
};
type Stats = { TongDon: number; ChoXacNhan: number; ChoChuanBi: number; ChoBanGiao: number; DangChuanBi: number; DangGiao: number; DaGiao: number; HoanThanh: number; GiaoThatBai: number; DaHuy: number; DoanhThuHomNay: number };
type ActionName = 'confirm' | 'start_prepare' | 'pack' | 'complete' | 'reject' | 'cancel' | 'mark_paid';

const ORDER_LABEL: Record<string, string> = {
  CHO_XAC_NHAN: 'Chờ xác nhận', DA_XAC_NHAN: 'Đã xác nhận', DANG_CHUAN_BI: 'Đang chuẩn bị',
  DA_DONG_GOI: 'Đã đóng gói', DANG_GIAO: 'Đang giao', DA_GIAO: 'Đã giao', HOAN_THANH: 'Hoàn thành',
  DA_HUY: 'Đã hủy', GIAO_THAT_BAI: 'Giao thất bại', DANG_HOAN_HANG: 'Đang hoàn hàng', DA_HOAN_HANG: 'Đã hoàn hàng',
};
const PAYMENT_LABEL: Record<string, string> = {
  CHUA_THANH_TOAN: 'Chưa thanh toán', CHO_THANH_TOAN: 'Chờ thanh toán', DA_THANH_TOAN: 'Đã thanh toán',
  THANH_TOAN_MOT_PHAN: 'Đã thanh toán một phần', HOAN_MOT_PHAN: 'Hoàn một phần', CHO_HOAN_TIEN: 'Chờ hoàn tiền', DA_HOAN_TIEN: 'Đã hoàn tiền',
};
const SHIPPING_LABEL: Record<string, string> = {
  CHUA_TAO_VAN_DON: 'Chưa tạo vận đơn', CHO_LAY_HANG: 'Chờ lấy hàng', DA_LAY_HANG: 'Đã lấy hàng',
  DANG_VAN_CHUYEN: 'Đang vận chuyển', DANG_GIAO: 'Đang giao', CHO_GIAO_LAI: 'Chờ giao lại',
  GIAO_THANH_CONG: 'Giao thành công', GIAO_THAT_BAI: 'Giao thất bại', DANG_HOAN_VE: 'Đang hoàn về',
  DA_HOAN_VE: 'Đã hoàn về', DA_HUY_VAN_DON: 'Đã hủy vận đơn',
};

const money = (value: number | undefined) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const dateTime = (value?: string) => value ? new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const orderCode = (id: number) => `DH${String(id).padStart(8, '0')}`;
const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

function firstImage(value?: string) {
  if (!value) return '';
  let path = value.trim();
  try {
    const parsed = JSON.parse(path);
    if (Array.isArray(parsed)) path = String(parsed[0] || '');
    else if (parsed && typeof parsed === 'object') path = String(parsed.url || parsed.path || parsed.HinhAnh || '');
  } catch { /* plain database path */ }
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  path = path.replace(/\\/g, '/');
  if (!path.startsWith('/')) {
    const clean = path.replace(/^uploads\//, '');
    path = clean.includes('/') ? `/uploads/${clean}` : `/uploads/products/${clean}`;
  }
  return `${apiOrigin}${path}`;
}

function errorMessage(error: any) {
  if (!error.response) return 'Không thể kết nối máy chủ Backend.';
  const status = error.response.status;
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Tài khoản không có quyền xử lý đơn hàng.';
  if (status === 404) return 'Không tìm thấy API hoặc đơn hàng.';
  if (status === 409) return error.response.data?.message || 'Trạng thái đơn hàng đã thay đổi. Vui lòng tải lại.';
  if (status >= 500) return `Lỗi Backend/database: ${error.response.data?.message || 'Không xác định'}`;
  return error.response.data?.message || 'Không thể xử lý yêu cầu.';
}

function ProductImage({ src, className = 'h-10 w-10' }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = firstImage(src);
  const fallbackUrl = `${apiOrigin}/uploads/products/skincare-default.jpg`;
  if (!url || failed) return <img src={fallbackUrl} className={`${className} shrink-0 rounded-lg border border-slate-100 object-cover`} alt="Ảnh sản phẩm mặc định" />;
  return <img src={url} onError={() => setFailed(true)} className={`${className} shrink-0 rounded-lg border border-slate-100 object-cover`} alt="" />;
}

function StatusPill({ value, kind = 'order' }: { value?: string; kind?: 'order' | 'payment' | 'shipping' }) {
  const labels = kind === 'payment' ? PAYMENT_LABEL : kind === 'shipping' ? SHIPPING_LABEL : ORDER_LABEL;
  const text = value ? labels[value] || value : (kind === 'shipping' ? 'Chưa tạo vận đơn' : 'Chưa xác định');
  const palette = text.includes('Đã giao') || text.includes('Hoàn thành') || text === 'Đã thanh toán' || text === 'Giao thành công'
    ? 'bg-emerald-50 text-emerald-700' : text.includes('Đang') ? 'bg-blue-50 text-blue-700'
      : text.includes('thất bại') || text.includes('hủy') || text.includes('Hủy') ? 'bg-rose-50 text-rose-700'
        : text.includes('Chờ') || text.includes('chuẩn bị') ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${palette}`}><i className="h-1.5 w-1.5 rounded-full bg-current" />{text}</span>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4"><div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b px-5 py-4"><h3 className="text-lg font-bold text-slate-900">{title}</h3><button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button></header><div className="p-5">{children}</div></div></div>;
}

const tabs = [
  ['all', 'Tất cả', 'TongDon'], ['CHO_XAC_NHAN', 'Chờ xác nhận', 'ChoXacNhan'], ['DANG_CHUAN_BI', 'Đang chuẩn bị', 'DangChuanBi'],
  ['DANG_GIAO', 'Đang giao', 'DangGiao'], ['DA_GIAO', 'Đã giao', 'DaGiao'], ['GIAO_THAT_BAI', 'Giao thất bại', 'GiaoThatBai'], ['DA_HUY', 'Đã hủy', 'DaHuy'],
] as const;

export default function DonHang() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const isStaff = currentUser.VaiTro === 'NhanVien';
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ TongDon: 0, ChoXacNhan: 0, ChoChuanBi: 0, ChoBanGiao: 0, DangChuanBi: 0, DangGiao: 0, DaGiao: 0, HoanThanh: 0, GiaoThatBai: 0, DaHuy: 0, DoanhThuHomNay: 0 });
  const [selected, setSelected] = useState<Detail | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [day, setDay] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [payment, setPayment] = useState('');
  const [shipping, setShipping] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [reasonAction, setReasonAction] = useState<ActionName | null>(null);
  const [reason, setReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ action: ActionName; label: string } | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState({ SoTien:'', PhuongThuc:'CHUYEN_KHOAN', MaThamChieu:'', ChungTuUrl:'', IdempotencyKey:globalThis.crypto?.randomUUID?.() || `pay-${Date.now()}` });
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const actionLock = useRef(false);

  const pageSize = isStaff ? 6 : 8;
  const customerFilter = Number(searchParams.get('maKhachHang')) || undefined;
  const employeeStatusGroup = isStaff && ['CHO_XAC_NHAN','CHO_CHUAN_BI','CHO_BAN_GIAO','DANG_GIAO','HOAN_TAT','DA_HUY'].includes(activeTab) ? activeTab as NonNullable<Parameters<typeof invoicesAPI.getAll>[0]>['nhomTrangThai'] : undefined;
  const params = useMemo(() => ({
    page, limit: pageSize, search: search.trim() || undefined, ngayDat: isStaff ? undefined : day || undefined,
    tuNgay: isStaff ? dateFrom || undefined : undefined, denNgay: isStaff ? dateTo || undefined : undefined,
    nhomTrangThai: employeeStatusGroup, maKhachHang: customerFilter,
    trangThai: activeTab === 'all' || employeeStatusGroup ? undefined : activeTab, thanhToan: payment || undefined, vanChuyen: isStaff ? undefined : shipping || undefined,
  }), [page, pageSize, search, day, dateFrom, dateTo, activeTab, employeeStatusGroup, payment, shipping, isStaff, customerFilter]);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); setError('');
    try {
      const [listResponse, statsResponse] = await Promise.all([invoicesAPI.getAll(params), invoicesAPI.getStats()]);
      setOrders(listResponse.data.data || []);
      setTotalPages(listResponse.data.pagination?.totalPages || 1);
      setTotal(listResponse.data.pagination?.total || 0);
      setStats(statsResponse.data.data || {});
      setHasLoaded(true);
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [params]);

  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3500); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (!isStaff) return;
    const timer = window.setInterval(() => { if (!document.hidden) void load(true); }, 45_000);
    const onVisible = () => { if (!document.hidden) void load(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [isStaff, load]);

  const openDetail = async (id: number) => {
    // The staff layout returns before the admin side drawer is rendered. Route staff to
    // the shared detail page instead of leaving selected state invisible.
    if (isStaff) { navigate(`/invoices/${id}`); return; }
    setDetailLoading(true); setError('');
    try { const response = await invoicesAPI.getById(id); setSelected(response.data.data); }
    catch (e) { setError(errorMessage(e)); }
    finally { setDetailLoading(false); }
  };

  const runAction = async (action: ActionName, extra: Record<string, string> = {}) => {
    if (!selected || actionLock.current) return;
    actionLock.current = true;
    setSubmitting(true); setError('');
    try {
      const response = await invoicesAPI.action(selected.MaHoaDon, { action, ...extra });
      setToast(response.data.message || 'Cập nhật đơn hàng thành công.');
      setReasonAction(null); setReason('');
      await Promise.all([load(), openDetail(selected.MaHoaDon)]);
    } catch (e:any) {
      const message = errorMessage(e);
      if (e?.response?.status === 409) {
        await Promise.all([load(true), openDetail(selected.MaHoaDon)]);
        setError(message);
      } else setError(message);
    }
    finally { actionLock.current = false; setSubmitting(false); }
  };
  const submitReceipt = async () => {
    if(!selected || actionLock.current) return;
    actionLock.current=true;setSubmitting(true);
    try { const response=await shippingAPI.receiveOrderPayment(selected.MaHoaDon,{...receipt,SoTien:Number(receipt.SoTien),ThoiDiemThu:new Date().toISOString()});setToast(response.data.message||'Đã ghi nhận khoản thực nhận.');setReceiptOpen(false);await Promise.all([load(),openDetail(selected.MaHoaDon)]); }
    catch(e:any){setError(errorMessage(e));}finally{actionLock.current=false;setSubmitting(false)}
  };

  const runListAction = async (order: Order, action: ActionName, message: string) => {
    if (busyOrderId !== null || actionLock.current) return;
    if (!window.confirm(`${message} ${orderCode(order.MaHoaDon)}?`)) return;
    actionLock.current = true;
    setBusyOrderId(order.MaHoaDon); setError(''); setToast('');
    try {
      const response = await invoicesAPI.action(order.MaHoaDon, { action });
      setToast(response.data.message || 'Cập nhật đơn hàng thành công.');
      await load(true);
      if (selected?.MaHoaDon === order.MaHoaDon) await openDetail(order.MaHoaDon);
    } catch (e) {
      const message = errorMessage(e);
      await load(true);
      setError(message);
      if (selected?.MaHoaDon === order.MaHoaDon) await openDetail(order.MaHoaDon);
    } finally { actionLock.current = false; setBusyOrderId(null); }
  };

  const resetFilters = () => { setSearch(''); setDay(''); setDateFrom(''); setDateTo(''); setPayment(''); setShipping(''); setActiveTab('all'); setPage(1); };
  const statCards = [
    { label: 'Chờ xác nhận', value: stats.ChoXacNhan, icon: ClockIcon, box: 'bg-orange-50 text-orange-600' },
    { label: 'Đang chuẩn bị', value: stats.DangChuanBi, icon: CubeIcon, box: 'bg-blue-50 text-blue-600' },
    { label: 'Đang giao', value: stats.DangGiao, icon: TruckIcon, box: 'bg-indigo-50 text-indigo-600' },
    { label: 'Giao thất bại', value: stats.GiaoThatBai, icon: ExclamationCircleIcon, box: 'bg-rose-50 text-rose-600' },
    { label: 'Doanh thu hôm nay', value: money(stats.DoanhThuHomNay), icon: BanknotesIcon, box: 'bg-emerald-50 text-emerald-600' },
  ];

  if (isStaff) {
    const employeeTabs: Array<{ key:string; label:string; count:number }> = [
      { key:'all', label:'Tất cả', count:Number(stats.TongDon||0) },
      { key:'CHO_XAC_NHAN', label:'Chờ xác nhận', count:Number(stats.ChoXacNhan||0) },
      { key:'CHO_CHUAN_BI', label:'Chờ chuẩn bị / đóng gói', count:Number(stats.ChoChuanBi||0) },
      { key:'CHO_BAN_GIAO', label:'Chờ bàn giao', count:Number(stats.ChoBanGiao||0) },
      { key:'DANG_GIAO', label:'Đang giao', count:Number(stats.DangGiao||0) },
      { key:'HOAN_TAT', label:'Đã giao / hoàn tất', count:Number(stats.DaGiao||0)+Number(stats.HoanThanh||0) },
      { key:'DA_HUY', label:'Đã hủy', count:Number(stats.DaHuy||0) },
    ];
    const staffAction = (order: Order) => {
      if (order.TrangThai==='CHO_XAC_NHAN') return { action:'confirm' as ActionName, text:'Xác nhận', label:'Xác nhận đơn' };
      if (order.TrangThai==='DA_XAC_NHAN') return { action:'start_prepare' as ActionName, text:'Chuẩn bị', label:'Bắt đầu chuẩn bị đơn' };
      if (order.TrangThai==='DANG_CHUAN_BI') return { action:'pack' as ActionName, text:'Đóng gói', label:'Xác nhận đã đóng gói đơn' };
      if (order.TrangThai==='DA_DONG_GOI') return { action:null, text:'Bàn giao', label:'' };
      if (order.TrangThai==='DANG_GIAO') return { action:null, text:'Theo dõi', label:'' };
      if (order.TrangThai==='DA_GIAO') return { action:'complete' as ActionName, text:'Hoàn tất', label:'Xác nhận hoàn tất đơn' };
      return { action:null, text:'Chi tiết', label:'' };
    };
    const staffStatusTone = (status:string) => status==='CHO_XAC_NHAN'?'bg-amber-50 text-amber-800':status==='DA_XAC_NHAN'||status==='DANG_CHUAN_BI'?'bg-blue-50 text-blue-800':status==='DA_DONG_GOI'?'bg-violet-50 text-violet-800':status==='DANG_GIAO'?'bg-cyan-50 text-cyan-800':['DA_GIAO','HOAN_THANH'].includes(status)?'bg-emerald-50 text-emerald-800':status==='DA_HUY'?'bg-slate-100 text-slate-600':'bg-rose-50 text-rose-800';
    const staffStatusText = (status:string) => status==='DA_XAC_NHAN'?'Chờ chuẩn bị':status==='DANG_CHUAN_BI'?'Chờ đóng gói':status==='DA_DONG_GOI'?'Chờ bàn giao':ORDER_LABEL[status]||status;
    const startRowAction = (order:Order) => {
      const action=staffAction(order);
      if (action.action) void runListAction(order,action.action,action.label);
      else if(order.TrangThai==='DA_DONG_GOI') navigate(`/deliveries?createFor=${order.MaHoaDon}`);
      else if(order.TrangThai==='DANG_GIAO') navigate('/deliveries');
      else void openDetail(order.MaHoaDon);
    };

    return <div className="min-h-[calc(100vh-73px)] bg-[#f4f7fb] p-4 text-slate-800 lg:p-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 text-sm text-slate-500">⌂　›　Nhân viên　/　<b className="text-slate-800">Đơn hàng</b></p><h1 className="text-3xl font-extrabold tracking-tight text-[#10213d]">Đơn hàng</h1><p className="mt-1 text-slate-500">Theo dõi và xử lý đơn mua mỹ phẩm</p></div><button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[#182a47] bg-white px-4 py-2.5 text-sm font-semibold text-[#142747] hover:bg-amber-50 disabled:opacity-50"><ClockIcon className="h-5 w-5"/>{loading?'Đang tải…':'Làm mới'}</button></header>
        {error&&<div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button onClick={()=>void load()} className="shrink-0 font-semibold underline">Thử lại</button></div>}
        {toast&&<div role="status" className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><span><CheckCircleIcon className="mr-2 inline h-5 w-5"/>{toast}</span><button onClick={()=>setToast('')}>×</button></div>}
        {customerFilter&&<div className="mb-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"><span>Đang lọc đơn theo mã khách KH{String(customerFilter).padStart(4,'0')}.</span><button onClick={()=>{setSearchParams({});setPage(1)}} className="font-bold underline">Bỏ lọc</button></div>}
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
          { label:'Chờ xác nhận', value:stats.ChoXacNhan, icon:ClockIcon, tone:'bg-orange-50 text-orange-700', tab:'CHO_XAC_NHAN' },
          { label:'Chờ chuẩn bị / đóng gói', value:stats.ChoChuanBi, icon:CubeIcon, tone:'bg-blue-50 text-blue-700', tab:'CHO_CHUAN_BI' },
          { label:'Chờ bàn giao', value:stats.ChoBanGiao, icon:TruckIcon, tone:'bg-violet-50 text-violet-700', tab:'CHO_BAN_GIAO' },
          { label:'Đang giao', value:stats.DangGiao, icon:TruckIcon, tone:'bg-cyan-50 text-cyan-700', tab:'DANG_GIAO' },
        ].map(card=><button key={card.label} onClick={()=>{setActiveTab(card.tab);setPage(1)}} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className={`grid h-14 w-14 place-items-center rounded-xl ${card.tone}`}><card.icon className="h-7 w-7"/></span><span><span className="block text-sm text-slate-500">{card.label}</span><strong className="block text-2xl text-[#10213d]">{hasLoaded?Number(card.value||0).toLocaleString('vi-VN'):loading?'…':'—'}</strong></span></button>)}</div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto border-b"><div className="flex min-w-max px-3">{employeeTabs.map(tab=><button key={tab.key} onClick={()=>{setActiveTab(tab.key);setPage(1)}} className={`border-b-[3px] px-4 py-3.5 text-sm font-semibold ${activeTab===tab.key?'border-amber-400 text-[#10213d]':'border-transparent text-slate-500 hover:text-slate-800'}`}>{tab.label}<span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab===tab.key?'bg-amber-100 text-amber-900':'bg-slate-100'}`}>{hasLoaded?tab.count.toLocaleString('vi-VN'):loading?'…':'—'}</span></button>)}</div></div>
          <div className="flex flex-wrap gap-2 border-b p-3">
            <label className="relative min-w-[250px] flex-1"><MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400"/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Tìm mã đơn, tên hoặc SĐT khách hàng" className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-amber-400"/></label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3"><CalendarDaysIcon className="h-5 w-5 text-slate-500"/><input aria-label="Từ ngày" type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPage(1)}} className="max-w-36 py-2 text-sm outline-none"/><span className="text-slate-400">–</span><input aria-label="Đến ngày" type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPage(1)}} className="max-w-36 py-2 text-sm outline-none"/></label>
            <select value={payment} onChange={e=>{setPayment(e.target.value);setPage(1)}} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"><option value="">Thanh toán: Tất cả</option>{Object.entries(PAYMENT_LABEL).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
            <button onClick={resetFilters} className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-300"><FunnelIcon className="h-5 w-5"/>Bỏ lọc</button>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[1150px] text-sm"><thead className="bg-slate-50 text-left text-xs font-bold text-slate-600"><tr><th className="px-4 py-3">Đơn hàng</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Tổng tiền</th><th className="px-4 py-3">Thanh toán</th><th className="px-4 py-3">Trạng thái đơn</th><th className="px-4 py-3">Vận chuyển</th><th className="px-4 py-3">Thao tác</th><th className="px-4 py-3">Chi tiết</th></tr></thead><tbody>
            {loading&&!orders.length&&Array.from({length:4},(_,i)=><tr key={i} className="border-t"><td colSpan={9} className="p-3"><div className="h-11 animate-pulse rounded bg-slate-100"/></td></tr>)}
            {!loading&&!orders.length&&<tr><td colSpan={9} className="py-16 text-center text-slate-500">{error?'Không tải được đơn hàng. Thử lại sau khi kiểm tra kết nối.':'Không có đơn hàng phù hợp.'}</td></tr>}
            {orders.map(order=>{const action=staffAction(order);return <tr key={order.MaHoaDon} className={`border-t transition hover:bg-amber-50/40 ${selected?.MaHoaDon===order.MaHoaDon?'bg-amber-50/50':''}`}><td className="px-4 py-3"><button onClick={()=>void openDetail(order.MaHoaDon)} className="font-extrabold text-[#10213d] hover:text-amber-700">{orderCode(order.MaHoaDon)}</button><span className="mt-1 block whitespace-nowrap text-xs text-slate-500">{new Date(order.NgayLap).toLocaleDateString('vi-VN')} · {new Date(order.NgayLap).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</span></td><td className="px-4 py-3"><b className="block max-w-40 truncate">{order.HoTen||'Khách lẻ'}</b><span className="text-xs text-slate-500">{order.SoDienThoai||'—'}</span></td><td className="px-4 py-3">{Number(order.TongSoLuong||0)} sản phẩm</td><td className="whitespace-nowrap px-4 py-3 font-bold">{money(order.TongTien)}</td><td className="px-4 py-3"><span className="block text-xs font-semibold">{order.PhuongThucThanhToan||'—'}</span><StatusPill value={order.TrangThaiThanhToan} kind="payment"/></td><td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${staffStatusTone(order.TrangThai)}`}>{staffStatusText(order.TrangThai)}</span></td><td className="px-4 py-3"><StatusPill value={order.TrangThaiVanChuyen} kind="shipping"/>{order.MaVanDon&&<span className="mt-1 block text-[11px] text-slate-500">{order.MaVanDon}</span>}</td><td className="px-4 py-3"><button onClick={()=>startRowAction(order)} disabled={busyOrderId!==null} className={`min-w-24 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${['CHO_XAC_NHAN','DA_GIAO'].includes(order.TrangThai)?'bg-amber-400 text-slate-950 hover:bg-amber-300':'bg-[#10213d] text-white hover:bg-slate-700'}`}>{busyOrderId===order.MaHoaDon?'Đang lưu…':action.text}</button></td><td className="px-4 py-3"><button aria-label={`Xem chi tiết ${orderCode(order.MaHoaDon)}`} onClick={()=>void openDetail(order.MaHoaDon)} className="rounded-lg border border-slate-200 p-2 text-[#10213d] hover:border-amber-400"><UserIcon className="h-5 w-5"/></button></td></tr>})}
            </tbody></table></div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-slate-500"><span>Hiển thị {orders.length?(page-1)*pageSize+1:0}–{Math.min(page*pageSize,total)} / {total.toLocaleString('vi-VN')} đơn</span><div className="flex items-center gap-2"><span>{page} / {totalPages}</span><button disabled={page<=1||loading} onClick={()=>setPage(page-1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronLeftIcon className="h-4 w-4"/></button><button disabled={page>=totalPages||loading} onClick={()=>setPage(page+1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronRightIcon className="h-4 w-4"/></button></div></footer>
        </section>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-800"><span><CheckCircleIcon className="mr-1 inline h-4 w-4"/>Xác nhận đơn không đồng nghĩa với đã thanh toán.</span><span>Đang tự làm mới khi trang hoạt động · cũng có thể bấm Làm mới</span></div>
      </div>
    </div>;
  }

  return <div className="min-h-[calc(100vh-73px)] bg-[#f7f9fc] p-4 text-slate-800 lg:p-6">
    <div className={`mx-auto transition-all ${selected ? 'max-w-none xl:pr-[400px]' : 'max-w-[1500px]'}`}>
      <div className="mb-5"><p className="mb-3 text-sm text-slate-500">⌂　›　Đơn hàng　/　<b className="text-slate-800">Quản lý đơn hàng</b></p><h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Quản lý đơn hàng</h1><p className="mt-1 text-slate-500">Theo dõi và xử lý toàn bộ đơn bán hàng</p></div>

      {error && <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button onClick={() => void load()} className="font-semibold underline">Thử lại</button></div>}
      {toast && <div className="fixed right-5 top-5 z-[90] flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-xl"><CheckCircleIcon className="h-5 w-5" />{toast}</div>}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{statCards.map((card) => <div key={card.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className={`grid h-12 w-12 place-items-center rounded-xl ${card.box}`}><card.icon className="h-6 w-6" /></div><div><p className="text-xs text-slate-500">{card.label}</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{loading ? '…' : card.value}</p></div></div>)}</div>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto border-b"><div className="flex min-w-max px-3">{tabs.map(([key, label, stat]) => <button key={key} onClick={() => { setActiveTab(key); setPage(1); }} className={`border-b-2 px-4 py-4 text-sm font-semibold ${activeTab === key ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}<span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === key ? 'bg-pink-50' : 'bg-slate-100'}`}>{stats[stat] || 0}</span></button>)}</div></div>
        <div className="flex flex-wrap gap-2 border-b bg-white p-3">
          <label className="relative min-w-[260px] flex-1"><MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm mã đơn, tên hoặc số điện thoại" className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-pink-400" /></label>
          <label className="relative"><CalendarDaysIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" /><input type="date" value={day} onChange={(e) => { setDay(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm" /></label>
          <select value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="">Thanh toán</option>{Object.entries(PAYMENT_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={shipping} onChange={(e) => { setShipping(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="">Vận chuyển</option>{Object.entries(SHIPPING_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <button onClick={resetFilters} className="inline-flex items-center gap-2 rounded-lg border border-pink-200 px-4 py-2 text-sm font-semibold text-pink-600 hover:bg-pink-50"><FunnelIcon className="h-5 w-5" />Bỏ lọc</button>
        </div>

        <div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-sm"><thead className="bg-slate-50 text-left text-xs font-bold text-slate-600"><tr><th className="px-3 py-3"><input type="checkbox" checked={orders.length > 0 && orders.every((item) => checked.has(item.MaHoaDon))} onChange={(event) => setChecked(event.target.checked ? new Set(orders.map((item) => item.MaHoaDon)) : new Set())} className="accent-pink-500" aria-label="Chọn tất cả đơn" /></th><th className="px-3 py-3">Mã đơn</th><th className="px-3 py-3">Khách hàng</th><th className="px-3 py-3">Ngày đặt</th><th className="px-3 py-3">Sản phẩm</th><th className="px-3 py-3">Tổng tiền</th><th className="px-3 py-3">Thanh toán</th><th className="px-3 py-3">Vận chuyển</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Thao tác</th></tr></thead><tbody>
          {orders.map((order) => <tr key={order.MaHoaDon} onClick={() => openDetail(order.MaHoaDon)} className={`cursor-pointer border-t transition hover:bg-pink-50/50 ${selected?.MaHoaDon === order.MaHoaDon ? 'bg-pink-50' : 'bg-white'}`}><td className="px-3 py-3"><input type="checkbox" checked={checked.has(order.MaHoaDon)} onClick={(event) => event.stopPropagation()} onChange={(event) => setChecked((current) => { const next = new Set(current); event.target.checked ? next.add(order.MaHoaDon) : next.delete(order.MaHoaDon); return next; })} className="accent-pink-500" aria-label={`Chọn đơn ${orderCode(order.MaHoaDon)}`} /></td><td className="px-3 py-3 font-extrabold text-slate-900">{orderCode(order.MaHoaDon)}</td><td className="px-3 py-3"><b className="block max-w-[150px] truncate">{order.HoTen || 'Khách lẻ'}</b><span className="text-xs text-slate-500">{order.SoDienThoai || '—'}</span></td><td className="px-3 py-3"><span className="block whitespace-nowrap">{new Date(order.NgayLap).toLocaleDateString('vi-VN')}</span><span className="text-xs text-slate-500">{new Date(order.NgayLap).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span></td><td className="px-3 py-3"><div className="flex items-center">{order.SanPhamTomTat.slice(0, 3).map((product, index) => <div key={`${product.MaSanPham}-${index}`} className={`shrink-0 ${index ? '-ml-2' : ''}`}><ProductImage src={product.HinhAnh} className="h-9 w-9" /></div>)}{order.SoDongSanPham > 3 && <span className="-ml-1 grid h-8 min-w-8 place-items-center rounded-lg bg-slate-100 px-1 text-xs font-bold">+{order.SoDongSanPham - 3}</span>}<span className="ml-2 whitespace-nowrap text-xs text-slate-500">{order.TongSoLuong} SP</span></div></td><td className="px-3 py-3 whitespace-nowrap font-extrabold">{money(order.TongTien)}</td><td className="px-3 py-3"><StatusPill value={order.TrangThaiThanhToan} kind="payment" /></td><td className="px-3 py-3"><b className="block text-xs">{order.MaVanDon || 'Chưa có mã vận đơn'}</b><StatusPill value={order.TrangThaiVanChuyen} kind="shipping" /></td><td className="px-3 py-3"><StatusPill value={order.TrangThai} /></td><td className="px-3 py-3"><button onClick={(event) => { event.stopPropagation(); openDetail(order.MaHoaDon); }} className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:border-pink-300 hover:text-pink-600">Xem chi tiết</button></td></tr>)}
          {loading && Array.from({ length: 5 }, (_, index) => <tr key={index} className="border-t"><td colSpan={10} className="px-3 py-3"><div className="h-11 animate-pulse rounded-lg bg-slate-100" /></td></tr>)}{!loading && !orders.length && <tr><td colSpan={10} className="py-16 text-center text-slate-500"><ShoppingCartIcon className="mx-auto mb-2 h-10 w-10 text-slate-300" />Không có đơn hàng phù hợp.</td></tr>}
        </tbody></table></div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-slate-500"><span>Hiển thị {orders.length ? (page - 1) * 8 + 1 : 0} - {Math.min(page * 8, total)} trong {total} đơn hàng</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronLeftIcon className="h-4 w-4" /></button><span className="rounded-lg bg-pink-500 px-3 py-2 font-bold text-white">{page}</span><span>/ {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronRightIcon className="h-4 w-4" /></button></div></footer>
      </section>
    </div>

    {(selected || detailLoading) && <aside className="fixed bottom-0 right-0 top-0 z-50 w-full overflow-y-auto border-l bg-white shadow-2xl sm:w-[430px]">
      {detailLoading && !selected ? <div className="grid h-full place-items-center text-slate-500">Đang tải chi tiết...</div> : selected && <>
        <header className={`sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4 ${isStaff?'border-amber-200':''}`}><h2 className="text-lg font-extrabold">Chi tiết đơn #{orderCode(selected.MaHoaDon)}</h2><button onClick={() => setSelected(null)} className="rounded-lg p-1 hover:bg-slate-100"><XMarkIcon className="h-6 w-6" /></button></header>
        <div className="space-y-4 p-4 pb-28">
          <section className="rounded-xl border p-4"><h3 className="mb-3 font-extrabold">Thông tin khách hàng</h3><p className="mb-2 flex gap-2"><UserIcon className="h-5 w-5 text-slate-500" /><b>{selected.TenNguoiNhan || selected.HoTen}</b></p><p className="mb-2 flex gap-2 text-sm"><PhoneIcon className="h-5 w-5 text-slate-500" />{selected.SoDienThoai || '—'}</p>{selected.Email && <p className="mb-2 text-sm text-slate-600">✉ {selected.Email}</p>}<p className="flex gap-2 text-sm text-slate-600"><MapPinIcon className="h-5 w-5 shrink-0" />{selected.DiaChiGiaoHang || 'Chưa có địa chỉ giao hàng'}</p>{selected.GhiChu && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Ghi chú: {selected.GhiChu}</p>}</section>
          <section className="rounded-xl border p-4"><h3 className="mb-3 font-extrabold">Danh sách sản phẩm</h3><div className="space-y-3">{selected.ChiTiet.map((item) => <div key={item.MaSanPham} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0"><ProductImage src={item.HinhAnh} className="h-14 w-14" /><div className="min-w-0 flex-1"><b className="line-clamp-2 text-sm">{item.TenSanPham}</b><p className="mt-1 text-xs text-slate-500">{item.MaSKU || 'Không có SKU'} {item.BienThe ? ` · ${item.BienThe}` : ''}</p></div><div className="text-right text-sm"><span className="block">x{item.SoLuong}</span><b>{money(item.DonGia)}</b></div></div>)}</div></section>
          <section className="rounded-xl border p-4"><h3 className="mb-3 font-extrabold">Tổng thanh toán</h3><div className="space-y-2 text-sm"><p className="flex justify-between"><span>Tiền hàng</span><b>{money(selected.TamTinh)}</b></p><p className="flex justify-between"><span>Giảm giá sản phẩm</span><b>-{money(selected.GiamGiaSanPham)}</b></p><p className="flex justify-between"><span>Voucher</span><b>-{money(selected.GiamGiaVoucher)}</b></p><p className="flex justify-between"><span>Phí vận chuyển</span><b>{money(selected.PhiVanChuyen)}</b></p><p className="flex justify-between border-t pt-3 text-base"><b>Tổng thanh toán</b><b className="text-amber-700">{money(selected.TongTien)}</b></p></div></section>
          <section className="rounded-xl border p-4"><h3 className="mb-3 font-extrabold">Trạng thái đơn hàng</h3><div className="space-y-3"><div className="flex items-center justify-between rounded-lg bg-slate-50 p-3"><span className="flex items-center gap-2 text-sm font-semibold"><ShoppingCartIcon className="h-5 w-5" />Đơn hàng</span><StatusPill value={selected.TrangThai} /></div><div className="flex items-center justify-between rounded-lg bg-slate-50 p-3"><span className="flex items-center gap-2 text-sm font-semibold"><BanknotesIcon className="h-5 w-5" />Thanh toán</span><StatusPill value={selected.TrangThaiThanhToan} kind="payment" /></div><div className="flex items-center justify-between rounded-lg bg-slate-50 p-3"><span className="flex items-center gap-2 text-sm font-semibold"><TruckIcon className="h-5 w-5" />Vận chuyển</span><StatusPill value={selected.TrangThaiVanChuyen} kind="shipping" /></div>{selected.MaVanDon && <p className="text-xs text-slate-500">{selected.DonViVanChuyen}: <b>{selected.MaVanDon}</b></p>}</div></section>
          <section><h3 className="mb-3 font-extrabold">Lịch sử đơn hàng</h3><div className="space-y-0">{selected.LichSuTrangThai.map((item, index) => <div key={item.MaLichSu} className="relative flex gap-3 pb-5"><div className="relative z-[1] mt-1 h-3 w-3 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />{index < selected.LichSuTrangThai.length - 1 && <i className="absolute left-[5px] top-4 h-full w-px bg-slate-200" />}<div><b className="text-sm">{ORDER_LABEL[item.TrangThaiMoi] || item.TrangThaiMoi}</b><p className="text-xs text-slate-500">{dateTime(item.NgayThayDoi)} · {item.NguoiThayDoi}</p>{item.GhiChu && <p className="mt-1 text-xs text-slate-600">{item.GhiChu}</p>}</div></div>)}{!selected.LichSuTrangThai.length && <p className="text-sm text-slate-400">Chưa có lịch sử.</p>}</div></section>
        </div>
        <div className="fixed bottom-0 right-0 flex w-full flex-wrap justify-end gap-2 border-t bg-white p-4 shadow-[0_-6px_20px_rgba(15,23,42,.08)] sm:w-[430px]">
          {selected.TrangThai === 'CHO_XAC_NHAN' && <><button disabled={submitting} onClick={() => setReasonAction('reject')} className="rounded-lg border px-4 py-2 font-semibold text-slate-700">Từ chối đơn</button><button disabled={submitting} onClick={() => setConfirmAction({ action: 'confirm', label: 'Xác nhận đơn hàng này?' })} className={`rounded-lg px-4 py-2 font-semibold text-white ${isStaff?'bg-amber-500':'bg-amber-500'}`}>✓ Xác nhận đơn</button></>}
          {selected.TrangThai === 'DA_XAC_NHAN' && <><button disabled={submitting} onClick={() => setReasonAction('cancel')} className="rounded-lg border border-rose-200 px-4 py-2 font-semibold text-rose-600">Hủy đơn</button><button disabled={submitting} onClick={() => setConfirmAction({ action: 'start_prepare', label: 'Bắt đầu chuẩn bị đơn hàng này?' })} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">Bắt đầu chuẩn bị</button></>}
          {selected.TrangThai === 'DANG_CHUAN_BI' && <button disabled={submitting} onClick={() => setConfirmAction({ action: 'pack', label: 'Xác nhận đơn đã được đóng gói đầy đủ?' })} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">Xác nhận đã đóng gói</button>}
          {selected.TrangThai === 'DA_DONG_GOI' && <button disabled={submitting} onClick={() => navigate(`/deliveries?createFor=${selected.MaHoaDon}`)} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">Tạo vận đơn</button>}
          {['DANG_GIAO', 'GIAO_THAT_BAI', 'DANG_HOAN_HANG'].includes(selected.TrangThai) && <button disabled={submitting} onClick={() => navigate('/deliveries')} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">Mở quản lý vận chuyển</button>}
          {selected.TrangThai === 'DA_GIAO' && <button disabled={submitting} onClick={() => setConfirmAction({ action: 'complete', label: 'Hoàn tất đơn hàng này?' })} className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">Hoàn tất đơn hàng</button>}
          {!isStaff && !['DA_THANH_TOAN','DA_HOAN_TIEN'].includes(selected.TrangThaiThanhToan || '') && selected.TrangThai !== 'DA_HUY' && <button disabled={submitting} onClick={() => {setReceipt({SoTien:String(selected.TongTien||''),PhuongThuc:'CHUYEN_KHOAN',MaThamChieu:'',ChungTuUrl:'',IdempotencyKey:globalThis.crypto?.randomUUID?.()||`pay-${Date.now()}-${Math.random()}`});setReceiptOpen(true)}} className="rounded-lg border border-emerald-200 px-4 py-2 font-semibold text-emerald-700">Ghi nhận tiền shop thực nhận</button>}
        </div>
      </>}
    </aside>}

    {reasonAction && <Modal title={reasonAction === 'reject' ? 'Lý do từ chối đơn' : 'Lý do hủy đơn'} onClose={() => { setReasonAction(null); setReason(''); }}><textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Nhập lý do bắt buộc..." className="w-full resize-none rounded-xl border p-3 outline-none focus:border-pink-400" /><div className="mt-4 flex justify-end gap-2"><button onClick={() => setReasonAction(null)} className="rounded-lg border px-4 py-2">Đóng</button><button disabled={!reason.trim() || submitting} onClick={() => runAction(reasonAction, { reason })} className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white disabled:opacity-40">Xác nhận</button></div></Modal>}
    {receiptOpen && <Modal title="Ghi nhận tiền cửa hàng thực nhận" onClose={()=>setReceiptOpen(false)}><div className="space-y-3"><p className="rounded-lg bg-amber-50 p-3 text-sm">Chỉ xác nhận sau khi tiền mặt đã nhận hoặc đã kiểm tra tiền vào tài khoản. Ghi nhận này không phải xác nhận tiền hãng chuyển.</p><label className="block text-sm font-bold">Số tiền nhận<input type="number" min="1" value={receipt.SoTien} onChange={e=>setReceipt({...receipt,SoTien:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="block text-sm font-bold">Phương thức<select value={receipt.PhuongThuc} onChange={e=>setReceipt({...receipt,PhuongThuc:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal"><option value="CHUYEN_KHOAN">Chuyển khoản</option><option value="TIEN_MAT">Tiền mặt</option></select></label><label className="block text-sm font-bold">Mã giao dịch / biên nhận<input required value={receipt.MaThamChieu} onChange={e=>setReceipt({...receipt,MaThamChieu:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>{receipt.PhuongThuc==='CHUYEN_KHOAN'&&<label className="block text-sm font-bold">Link chứng từ<input required value={receipt.ChungTuUrl} onChange={e=>setReceipt({...receipt,ChungTuUrl:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>}</div><button disabled={submitting||!Number(receipt.SoTien)||!receipt.MaThamChieu.trim()||(receipt.PhuongThuc==='CHUYEN_KHOAN'&&!receipt.ChungTuUrl.trim())} onClick={submitReceipt} className="mt-5 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:opacity-40">Xác nhận tiền đã thực nhận</button></Modal>}
    {confirmAction && <Modal title="Xác nhận thao tác" onClose={() => setConfirmAction(null)}><p className="text-slate-600">{confirmAction.label}</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setConfirmAction(null)} className="rounded-lg border px-4 py-2">Quay lại</button><button disabled={submitting} onClick={async () => { const action = confirmAction.action; setConfirmAction(null); await runAction(action); }} className="rounded-lg bg-pink-600 px-4 py-2 font-semibold text-white disabled:opacity-40">Xác nhận</button></div></Modal>}
  </div>;
}
