import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowPathIcon, CalendarDaysIcon, ChatBubbleLeftRightIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardDocumentListIcon, EyeIcon, LockClosedIcon, MagnifyingGlassIcon, PhoneIcon, ShoppingBagIcon, UserCircleIcon, UserGroupIcon, UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { customersAPI } from '../../services/api';

type Customer = { MaKhachHang: number; MaKhachHangHienThi: string; HoTen: string; SoDienThoaiMasked?: string; EmailMasked?: string; NgayTao?: string | null; SoDonHoanTat: number; LanMuaGanNhat?: string | null; NhomKhach: string; TrangThai: boolean };
type Order = { MaHoaDon: number; NgayLap: string; TrangThai: string; TrangThaiThanhToan?: string; TrangThaiVanChuyen?: string; TongTien: number; SoDongSanPham?: number; SoSanPham?: number };
type ReturnRow = { Id: number; MaHoaDon: number; TrangThai: string; LyDo?: string; NgayYeuCau?: string; SoTienDuKien?: number };
type Detail = Customer & { DiaChi?: string; SoDonDangXuLy: number; SoYeuCauHoanTra: number; TongYeuCauHoanTra: number; DonGanDay: Order[]; HoanTraGanDay: ReturnRow[] };
type Note = { Id: number; NoiDung: string; NgayTao: string; NguoiTao: string };
type RecentNote = Note & { MaKhachHang: number; HoTen: string };
type Contact = { SoDienThoai?: string; Email?: string; DiaChi?: string };
type PageResponse<T> = { data: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

const PAGE_SIZE = 6;
const money = (value?: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa có';
const dateTime = (value?: string) => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const orderCode = (id: number) => `DH${String(id).padStart(8, '0')}`;
const returnCode = (id: number) => `HT${String(id).padStart(6, '0')}`;

function errorText(error: any) {
  const status = error?.response?.status;
  if (!status) return 'Không thể kết nối máy chủ. Kiểm tra Backend và mạng rồi thử lại.';
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Tài khoản nhân viên không có quyền tra cứu khách hàng.';
  if (status === 404) return 'Không tìm thấy dữ liệu hoặc API. Hãy tải lại trang.';
  if (status === 409) return error.response?.data?.message || 'Dữ liệu vừa thay đổi. Hãy tải lại.';
  if (status >= 500) return `Lỗi Backend/database: ${error.response?.data?.message || 'không có chi tiết'}`;
  return error.response?.data?.message || `Yêu cầu thất bại (HTTP ${status}).`;
}

function stateLabel(status?: string) {
  const labels: Record<string, string> = { CHO_XAC_NHAN: 'Chờ xác nhận', DA_XAC_NHAN: 'Đã xác nhận', DANG_CHUAN_BI: 'Đang chuẩn bị', DA_DONG_GOI: 'Đã đóng gói', DANG_GIAO: 'Đang giao', DA_GIAO: 'Đã giao', HOAN_THANH: 'Hoàn tất', DA_HUY: 'Đã hủy', GIAO_THAT_BAI: 'Giao thất bại', DANG_HOAN_HANG: 'Đang hoàn hàng', DA_HOAN_HANG: 'Đã hoàn hàng' };
  return labels[status || ''] || status || '—';
}

function Avatar({ name, selected = false }: { name: string; selected?: boolean }) {
  const initials = name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase();
  return <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-black ${selected ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'}`}>{initials || 'KH'}</span>;
}

function StatCard({ icon: Icon, label, value, tone, active, onClick }: { icon: typeof UserGroupIcon; label: string; value: number | null; tone: string; active?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} className={`flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${active ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'}`}><span className={`grid h-14 w-14 place-items-center rounded-full ${tone}`}><Icon className="h-7 w-7" /></span><span><span className="block text-sm text-slate-500">{label}</span><strong className="block text-2xl font-black text-[#10213d]">{value === null ? '—' : value.toLocaleString('vi-VN')}</strong></span></button>;
}

export default function KhachHangNhanVien() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<{ TongKhach: number; KhachMoiThang: number; KhachMuaLai: number } | null>(null);
  const [rows, setRows] = useState<Customer[]>([]);
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [group, setGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderPages, setOrderPages] = useState(1);
  const [returnsOpen, setReturnsOpen] = useState(false);
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [returnPage, setReturnPage] = useState(1);
  const [returnTotal, setReturnTotal] = useState(0);
  const [returnPages, setReturnPages] = useState(1);
  const generation = useRef(0);
  const listGeneration = useRef(0);
  const noteLock = useRef(false);

  const load = useCallback(async (quiet = false) => {
    const current = ++listGeneration.current;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const [listResponse, summaryResponse, recentResponse] = await Promise.all([
        customersAPI.staffList({ page, limit: PAGE_SIZE, search: appliedSearch || undefined, group: group || undefined }),
        customersAPI.staffSummary(),
        customersAPI.staffRecentNotes(),
      ]);
      if (listGeneration.current !== current) return;
      const list = listResponse.data as PageResponse<Customer>;
      setRows(list.data || []); setTotal(list.pagination.total); setPages(Math.max(1, list.pagination.totalPages));
      setSummary(summaryResponse.data.data);
      setRecentNotes(recentResponse.data.data || []);
    } catch (e) { if (listGeneration.current === current) { setError(errorText(e)); if (!quiet) setRows([]); } }
    finally { if (listGeneration.current === current) setLoading(false); }
  }, [page, appliedSearch, group]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    const refresh = () => { if (!document.hidden) void load(true); };
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);

  const openCustomer = async (id: number) => {
    const current = ++generation.current;
    setSelectedId(id); setDetail(null); setContact(null); setNotes([]); setDetailLoading(true); setContactLoading(false); setHistoryOpen(false); setReturnsOpen(false);
    try {
      const [profile, supportNotes] = await Promise.all([customersAPI.staffDetail(id), customersAPI.staffNotes(id)]);
      if (generation.current !== current) return;
      setDetail(profile.data.data); setNotes(supportNotes.data.data || []);
    } catch (e) { if (generation.current === current) setError(errorText(e)); }
    finally { if (generation.current === current) setDetailLoading(false); }
  };

  const closeCustomer = () => { generation.current++; setSelectedId(null); setDetail(null); setContact(null); setNotes([]); setHistoryOpen(false); setReturnsOpen(false); };

  const revealContact = async () => {
    if (!selectedId) return;
    const customerId = selectedId;
    const current = generation.current;
    setContactLoading(true);
    try { const result = await customersAPI.staffContact(customerId); if (generation.current === current && Number(detail?.MaKhachHang) === customerId) setContact(result.data.data); }
    catch (e) { setError(errorText(e)); }
    finally { setContactLoading(false); }
  };

  const loadOrders = async (id: number, nextPage: number) => {
    const current = generation.current;
    try { const result = await customersAPI.staffOrders(id, { page: nextPage, limit: 8 }); if (generation.current !== current) return; const data = result.data as PageResponse<Order>; setOrders(data.data || []); setOrderTotal(data.pagination.total); setOrderPages(Math.max(1, data.pagination.totalPages)); setOrderPage(nextPage); }
    catch (e) { setError(errorText(e)); }
  };
  const loadReturns = async (id: number, nextPage: number) => {
    const current = generation.current;
    try { const result = await customersAPI.staffReturns(id, { page: nextPage, limit: 8 }); if (generation.current !== current) return; const data = result.data as PageResponse<ReturnRow>; setReturns(data.data || []); setReturnTotal(data.pagination.total); setReturnPages(Math.max(1, data.pagination.totalPages)); setReturnPage(nextPage); }
    catch (e) { setError(errorText(e)); }
  };

  const saveNote = async () => {
    const content = noteText.trim();
    if (!selectedId || !content || noteLock.current) return;
    const customerId = selectedId;
    const current = generation.current;
    noteLock.current = true;
    setNoteSaving(true);
    try { await customersAPI.addStaffNote(customerId, content); if (generation.current !== current) return; setNoteText(''); const result = await customersAPI.staffNotes(customerId); if (generation.current === current && Number(detail?.MaKhachHang) === customerId) setNotes(result.data.data || []); await load(true); }
    catch (e) { setError(errorText(e)); }
    finally { noteLock.current = false; setNoteSaving(false); }
  };

  const applyGroup = (value: string) => { setGroup(value); setPage(1); };

  return <main className="min-h-[calc(100vh-64px)] bg-[#f6f8fc] p-4 text-slate-800 lg:p-6">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-3 text-sm text-slate-500">Nhân viên　/　<b className="text-slate-800">Khách hàng</b></p><h1 className="text-3xl font-black tracking-tight text-[#10213d]">Khách hàng</h1><p className="mt-1 text-slate-500">Tra cứu thông tin và hỗ trợ khách mua hàng</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-bold text-[#10213d] disabled:opacity-50"><ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />Làm mới</button></header>
    {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button onClick={() => void load()} className="shrink-0 font-bold underline">Thử lại</button></div>}
    <section className="mb-5 grid gap-3 md:grid-cols-3">
      <StatCard icon={UserGroupIcon} label="Khách trong phạm vi hỗ trợ" value={summary?.TongKhach ?? null} tone="bg-blue-50 text-blue-600" active={!group} onClick={() => applyGroup('')} />
      <StatCard icon={UserPlusIcon} label="Khách mới tháng này" value={summary?.KhachMoiThang ?? null} tone="bg-emerald-50 text-emerald-600" active={group === 'MOI'} onClick={() => applyGroup(group === 'MOI' ? '' : 'MOI')} />
      <StatCard icon={ArrowPathIcon} label="Khách mua lại · từ 2 đơn hoàn tất" value={summary?.KhachMuaLai ?? null} tone="bg-orange-50 text-orange-600" active={group === 'MUA_LAI'} onClick={() => applyGroup(group === 'MUA_LAI' ? '' : 'MUA_LAI')} />
    </section>
    <div className={`grid gap-4 ${selectedId ? 'xl:grid-cols-[minmax(0,1.15fr)_minmax(430px,0.85fr)]' : 'grid-cols-1'}`}>
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black text-[#10213d]">Danh sách khách hàng</h2><span className="text-sm text-slate-500">Dữ liệu từ hồ sơ và đơn hàng</span></div>
        <div className="mb-3 grid gap-2 md:grid-cols-[1fr_230px_auto]">
          <form onSubmit={e => { e.preventDefault(); setPage(1); setAppliedSearch(search.trim()); }} className="relative"><MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên, mã khách hoặc số điện thoại" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 outline-none focus:border-amber-400" /></form>
          <select value={group} onChange={e => applyGroup(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Nhóm khách: Tất cả</option><option value="MOI">Khách mới tháng này</option><option value="MUA_LAI">Khách mua lại</option><option value="CHUA_MUA">Chưa có đơn hoàn tất</option></select>
          <button onClick={() => { setPage(1); setAppliedSearch(search.trim()); }} className="rounded-xl bg-amber-400 px-5 py-2.5 font-bold text-slate-950 hover:bg-amber-300">Lọc</button>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs font-bold text-slate-600"><tr>{['Khách hàng','Liên hệ','Đơn hoàn tất','Lần mua gần nhất',''].map(x=><th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody>
          {loading ? Array.from({length:6},(_,i)=><tr key={i} className="border-b"><td colSpan={5} className="p-3"><div className="h-10 animate-pulse rounded-lg bg-slate-100"/></td></tr>) : rows.map(row=><tr key={row.MaKhachHang} onClick={() => void openCustomer(row.MaKhachHang)} className={`cursor-pointer border-b border-slate-100 hover:bg-amber-50 ${selectedId===row.MaKhachHang?'bg-amber-50':''}`}><td className="px-3 py-2.5"><div className="flex items-center gap-3"><Avatar name={row.HoTen} selected={selectedId===row.MaKhachHang}/><span><b className="block text-slate-900">{row.HoTen}</b><span className="text-xs text-slate-500">{row.MaKhachHangHienThi}</span></span></div></td><td className="px-3 py-2.5"><span className="block">{row.SoDienThoaiMasked || '—'}</span><span className="text-xs text-slate-500">{row.EmailMasked || '—'}</span></td><td className="px-3 py-2.5">{row.SoDonHoanTat}</td><td className="px-3 py-2.5">{row.LanMuaGanNhat ? date(row.LanMuaGanNhat) : 'Chưa có'}</td><td className="px-3 py-2.5 text-right"><button aria-label={`Xem ${row.HoTen}`} onClick={e=>{e.stopPropagation();void openCustomer(row.MaKhachHang)}} className="rounded-lg border border-slate-200 p-2 hover:border-amber-400"><EyeIcon className="h-5 w-5"/></button></td></tr>)}
          {!loading && !rows.length && <tr><td colSpan={5} className="p-10 text-center text-slate-500">{error ? 'Không thể tải danh sách.' : 'Chưa có khách hàng phù hợp.'}</td></tr>}
        </tbody></table></div>
        <footer className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>Hiển thị {total ? (page-1)*PAGE_SIZE+1 : 0}–{Math.min(page*PAGE_SIZE,total)} / {total} khách hàng</span><div className="flex items-center gap-2"><button disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronLeftIcon className="h-4 w-4"/></button><span>{page} / {pages}</span><button disabled={page>=pages||loading} onClick={()=>setPage(p=>p+1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronRightIcon className="h-4 w-4"/></button></div></footer>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black text-[#10213d]">Thông tin khách hàng</h2>{selectedId&&<button aria-label="Đóng chi tiết" onClick={closeCustomer} className="rounded-lg p-1 hover:bg-slate-100"><XMarkIcon className="h-5 w-5"/></button>}</div>
        {!selectedId ? <div className="grid min-h-[360px] place-items-center text-center text-slate-400"><div><UserCircleIcon className="mx-auto h-16 w-16"/><p className="mt-2">Chọn khách hàng để xem hồ sơ, đơn mua và ghi chú hỗ trợ.</p></div></div> : detailLoading||!detail ? <div className="space-y-4">{[1,2,3].map(x=><div key={x} className="h-16 animate-pulse rounded-xl bg-slate-100"/> )}</div> : <>
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3"><Avatar name={detail.HoTen} selected/><div className="min-w-0 flex-1"><b className="block truncate text-lg text-slate-900">{detail.HoTen}</b><span className="text-sm text-slate-500">{detail.MaKhachHangHienThi}</span></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${detail.SoDonHoanTat>=2?'bg-emerald-100 text-emerald-800':'bg-slate-100 text-slate-600'}`}>{detail.SoDonHoanTat>=2?'Khách mua lại':'Khách hàng'}</span></div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 py-3 text-sm"><PhoneIcon className="h-5 w-5 text-slate-500"/><span>{contact?.SoDienThoai || detail.SoDienThoaiMasked || 'Chưa có số điện thoại'}</span><span className="text-center text-slate-500">@</span><span className="break-all">{contact?.Email || detail.EmailMasked || 'Chưa có email'}</span><CalendarDaysIcon className="h-5 w-5 text-slate-500"/><span>Ngày tạo: {date(detail.NgayTao)}</span>{contact?.DiaChi&&<><span className="text-center text-slate-500">⌖</span><span>{contact.DiaChi}</span></>}</div>
          {!contact&&<button onClick={()=>void revealContact()} disabled={contactLoading} className="w-full rounded-lg border border-amber-400 px-3 py-2 text-sm font-bold text-amber-700 disabled:opacity-50"><LockClosedIcon className="mr-2 inline h-4 w-4"/>{contactLoading?'Đang tải…':'Xem thông tin liên hệ'}</button>}
          <p className="mt-1 text-center text-xs text-slate-400">Thông tin đầy đủ chỉ tải khi nhân viên yêu cầu hỗ trợ.</p>
          <div className="my-3 grid grid-cols-3 divide-x rounded-xl border border-slate-100 py-2 text-center"><div><b className="block text-lg">{detail.SoDonHoanTat}</b><span className="text-xs text-slate-500">Đơn hoàn tất</span></div><div><b className="block text-lg">{detail.SoDonDangXuLy}</b><span className="text-xs text-slate-500">Đơn đang xử lý</span></div><div><b className="block text-lg">{detail.SoYeuCauHoanTra}</b><span className="text-xs text-slate-500">Hoàn trả đang mở</span></div></div>
          <div className="mb-2 flex items-center justify-between"><h3 className="font-black">Đơn hàng gần đây</h3><button onClick={()=>{setHistoryOpen(true);void loadOrders(detail.MaKhachHang,1)}} className="text-xs font-semibold text-blue-700">Xem lịch sử mua hàng →</button></div>
          <div className="space-y-2">{detail.DonGanDay.length ? detail.DonGanDay.map(order=><button key={order.MaHoaDon} onClick={()=>navigate(`/invoices/${order.MaHoaDon}`)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2.5 text-left hover:border-amber-300"><span><b>{orderCode(order.MaHoaDon)} · {money(order.TongTien)}</b><small className="block text-slate-500">{date(order.NgayLap)}</small></span><span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-800">{stateLabel(order.TrangThai)}</span></button>) : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Khách chưa có đơn hàng.</p>}</div>
          {detail.HoanTraGanDay.length>0&&<div className="mt-3"><div className="mb-2 flex items-center justify-between"><h3 className="font-black">Yêu cầu hoàn trả</h3><button onClick={()=>{setReturnsOpen(true);void loadReturns(detail.MaKhachHang,1)}} className="text-xs font-semibold text-blue-700">Xem tất cả →</button></div>{detail.HoanTraGanDay.slice(0,2).map(r=><Link key={r.Id} to={`/returns/${r.Id}`} className="mb-2 flex justify-between rounded-lg border p-2 text-sm"><span>{returnCode(r.Id)} · {orderCode(r.MaHoaDon)}</span><span className="text-slate-500">{r.TrangThai}</span></Link>)}</div>}
          <div className="mt-3 border-t border-slate-100 pt-3"><div className="mb-2 flex items-center gap-2"><ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600"/><h3 className="font-black">Ghi chú hỗ trợ · nội bộ</h3></div><div className="max-h-32 space-y-2 overflow-auto">{notes.map(item=><article key={item.Id} className="rounded-lg bg-slate-50 p-2.5 text-sm"><p className="whitespace-pre-wrap">{item.NoiDung}</p><small className="text-slate-500">{item.NguoiTao} · {dateTime(item.NgayTao)}</small></article>)}{!notes.length&&<p className="text-sm text-slate-400">Chưa có ghi chú hỗ trợ.</p>}</div><div className="mt-2 flex gap-2"><input value={noteText} maxLength={1000} onChange={e=>setNoteText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void saveNote()}}} placeholder="Thêm ghi chú nội bộ (tối đa 1000 ký tự)" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"/><button disabled={!noteText.trim()||noteSaving} onClick={()=>void saveNote()} className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{noteSaving?'Đang lưu…':'Lưu ghi chú'}</button></div><p className="mt-1 text-xs text-slate-400">Không ghi mật khẩu, dữ liệu thanh toán hoặc thông tin chẩn đoán sức khỏe.</p></div>
          <button onClick={()=>navigate(`/invoices?maKhachHang=${detail.MaKhachHang}`)} className="mt-3 w-full rounded-lg bg-[#10213d] px-4 py-3 font-bold text-white"><ClipboardDocumentListIcon className="mr-2 inline h-5 w-5"/>Xem đơn hàng của khách</button>
        </>}
      </section>
    </div>
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center gap-2"><ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600"/><h2 className="font-black text-[#10213d]">Hỗ trợ gần đây</h2><span className="text-xs text-slate-400">Ghi chú nội bộ đã lưu</span></div>{loading&&!recentNotes.length?<div className="h-12 animate-pulse rounded-lg bg-slate-100"/>:recentNotes.length?<div className="space-y-2">{recentNotes.map(note=><button key={note.Id} onClick={()=>void openCustomer(note.MaKhachHang)} className="flex w-full items-start justify-between gap-3 rounded-lg border border-slate-100 p-3 text-left hover:border-amber-300"><span className="min-w-0"><b className="mr-2">{`KH${String(note.MaKhachHang).padStart(4,'0')}`} · {note.HoTen}</b><span className="text-sm">{note.NoiDung}</span><small className="block text-slate-500">{note.NguoiTao} · {dateTime(note.NgayTao)}</small></span><span className="shrink-0 text-sm text-blue-700">Mở hồ sơ →</span></button>)}</div>:<p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Chưa có ghi chú hỗ trợ được lưu.</p>}</section>
    {historyOpen&&selectedId&&<div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4"><section className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-xl"><header className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">Lịch sử mua hàng · {detail?.MaKhachHangHienThi}</h2><button onClick={()=>setHistoryOpen(false)}><XMarkIcon className="h-6 w-6"/></button></header><div className="space-y-2">{orders.map(order=><button key={order.MaHoaDon} onClick={()=>navigate(`/invoices/${order.MaHoaDon}`)} className="flex w-full items-center justify-between rounded-xl border p-3 text-left"><span><b>{orderCode(order.MaHoaDon)} · {money(order.TongTien)}</b><small className="block text-slate-500">{dateTime(order.NgayLap)} · {order.SoDongSanPham||0} dòng hàng</small></span><span className="text-sm">{stateLabel(order.TrangThai)} · {order.TrangThaiThanhToan}</span></button>)}</div><footer className="mt-4 flex items-center justify-between text-sm text-slate-500"><span>{orderTotal} đơn · trang {orderPage}/{orderPages}</span><span className="flex gap-2"><button disabled={orderPage<=1} onClick={()=>void loadOrders(selectedId,orderPage-1)} className="rounded border p-2 disabled:opacity-40"><ChevronLeftIcon className="h-4 w-4"/></button><button disabled={orderPage>=orderPages} onClick={()=>void loadOrders(selectedId,orderPage+1)} className="rounded border p-2 disabled:opacity-40"><ChevronRightIcon className="h-4 w-4"/></button></span></footer></section></div>}
    {returnsOpen&&selectedId&&<div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4"><section className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 shadow-xl"><header className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">Lịch sử hoàn trả · {detail?.MaKhachHangHienThi}</h2><button onClick={()=>setReturnsOpen(false)}><XMarkIcon className="h-6 w-6"/></button></header><div className="space-y-2">{returns.map(item=><Link key={item.Id} to={`/returns/${item.Id}`} className="flex items-center justify-between rounded-xl border p-3"><span><b>{returnCode(item.Id)} · {orderCode(item.MaHoaDon)}</b><small className="block text-slate-500">{item.LyDo} · {dateTime(item.NgayYeuCau)}</small></span><span>{item.TrangThai}</span></Link>)}</div><footer className="mt-4 flex items-center justify-between text-sm text-slate-500"><span>{returnTotal} yêu cầu · trang {returnPage}/{returnPages}</span><span className="flex gap-2"><button disabled={returnPage<=1} onClick={()=>void loadReturns(selectedId,returnPage-1)} className="rounded border p-2 disabled:opacity-40"><ChevronLeftIcon className="h-4 w-4"/></button><button disabled={returnPage>=returnPages} onClick={()=>void loadReturns(selectedId,returnPage+1)} className="rounded border p-2 disabled:opacity-40"><ChevronRightIcon className="h-4 w-4"/></button></span></footer></section></div>}
  </main>;
}
