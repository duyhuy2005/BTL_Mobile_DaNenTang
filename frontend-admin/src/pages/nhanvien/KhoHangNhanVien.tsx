import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { API_ORIGIN, categoriesAPI, productsAPI } from '../../services/api';

type Tab = 'items' | 'lots' | 'moves' | 'requests';
type RefillLine = { MaSanPham: string; SoLuongDeNghi: string };
const PAGE_SIZE = 6;
const SOON_DAYS = 90;
const imageUrl = (value?: string) => !value ? '' : /^https?:\/\//i.test(value) ? value : `${API_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
const fmt = (value?: string) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const qty = (value: unknown) => Number(value || 0).toLocaleString('vi-VN');
const apiError = (error: any) => {
  const status = error?.response?.status;
  if (!status) return 'Không thể kết nối Backend. Kiểm tra mạng và địa chỉ máy chủ.';
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Tài khoản nhân viên không có quyền xem phần dữ liệu này.';
  if (status === 404) return 'Không tìm thấy API hoặc dữ liệu đã bị thay đổi. Hãy tải lại.';
  if (status === 409) return error.response?.data?.message || 'Dữ liệu vừa được cập nhật ở nơi khác. Hãy tải lại.';
  if (status >= 500) return `Lỗi Backend/database: ${error.response?.data?.message || 'không có chi tiết'}`;
  return error.response?.data?.message || `Yêu cầu thất bại (HTTP ${status}).`;
};
const statusTone = (value: string) => value === 'Hết hàng' || value === 'Đã hết hạn' ? 'bg-rose-100 text-rose-700' : value === 'Sắp hết' || value === 'Sắp hết hạn' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700';
const requestStatus: Record<string, string> = { CHO_DUYET: 'Chờ duyệt', DA_DUYET: 'Đã duyệt', TU_CHOI: 'Từ chối', DA_HUY: 'Đã hủy' };

export default function KhoHangNhanVien() {
  const [tab, setTab] = useState<Tab>('items');
  const [summary, setSummary] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [recentLots, setRecentLots] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [expiryState, setExpiryState] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<RefillLine[]>([{ MaSanPham: '', SoLuongDeNghi: '' }]);
  const [productSearch, setProductSearch] = useState('');
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [requestDetail, setRequestDetail] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadRows = useCallback(async () => {
    const endpoint = tab === 'items' ? '/khohang/items' : tab === 'lots' ? '/khohang/lots' : tab === 'moves' ? '/khohang/transactions' : '/khohang/my-replenishment-requests';
    const params: any = { page, limit: PAGE_SIZE, search };
    if (category && (tab === 'items' || tab === 'lots')) params.category = Number(category);
    if (tab === 'items') params.status = stockStatus;
    if (tab === 'lots') { params.expiry = expiryState; if (expiryState === 'soon') params.expiryDays = SOON_DAYS; }
    const response = await api.get(endpoint, { params });
    setRows(response.data.data || []);
    setTotal(Number(response.data.pagination?.total || 0));
    setPages(Math.max(1, Number(response.data.pagination?.totalPages || 1)));
  }, [tab, page, search, category, stockStatus, expiryState]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [summaryResponse] = await Promise.all([api.get('/khohang/staff-summary'), loadRows()]);
      setSummary(summaryResponse.data.data);
      if (tab === 'items' && page === 1 && !search && !category && !stockStatus) {
        const [lots, requests] = await Promise.all([
          api.get('/khohang/lots', { params: { page: 1, limit: 3, expiry: 'soon', expiryDays: SOON_DAYS } }),
          api.get('/khohang/my-replenishment-requests', { params: { page: 1, limit: 3 } }),
        ]);
        setRecentLots(lots.data.data || []); setRecentRequests(requests.data.data || []);
      }
    } catch (e) { setError(apiError(e)); }
    finally { setLoading(false); }
  }, [loadRows, tab, page, search, category, stockStatus]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let active = true;
    categoriesAPI.getAll().then(r => { if (active) setCategories(r.data.data || []); }).catch(e => { if (active) setError(apiError(e)); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [load]);
  useEffect(() => {
    if (!requestOpen) return;
    let active = true;
    const timer = window.setTimeout(() => {
      productsAPI.getAll({ page: 1, limit: 100, search: productSearch.trim() || undefined }).then(r => {
        if (active) setProductOptions(r.data.data || []);
      }).catch(e => { if (active) setError(apiError(e)); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [requestOpen, productSearch]);

  const switchTab = (value: Tab) => { setTab(value); setPage(1); setSearch(''); setExpiryState(''); };
  const chooseStock = (value: string) => { setTab('items'); setPage(1); setSearch(''); setCategory(''); setStockStatus(value); };
  const openDetail = async (productId: number) => {
    setDetailLoading(true); setDetail(null);
    try { const r = await api.get(`/khohang/items/${productId}`); setDetail(r.data.data); }
    catch (e) { setError(apiError(e)); }
    finally { setDetailLoading(false); }
  };
  const submitRequest = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      const payload = { LyDo: reason.trim(), GhiChu: note.trim(), items: lines.map(x => ({ MaSanPham: Number(x.MaSanPham), SoLuongDeNghi: Number(x.SoLuongDeNghi) })) };
      if (!payload.LyDo) throw new Error('Vui lòng ghi lý do đề nghị nhập hàng.');
      if (!payload.items.length || payload.items.some(x => !Number.isInteger(x.MaSanPham) || x.MaSanPham <= 0 || !Number.isInteger(x.SoLuongDeNghi) || x.SoLuongDeNghi <= 0)) throw new Error('Chọn sản phẩm và nhập số lượng nguyên lớn hơn 0 cho từng dòng.');
      if (new Set(payload.items.map(x => x.MaSanPham)).size !== payload.items.length) throw new Error('Mỗi sản phẩm chỉ được thêm một lần.');
      const response = await api.post('/khohang/my-replenishment-requests', payload);
      setNotice(`Đã gửi yêu cầu #${response.data.data.Id} chờ Admin duyệt. Tồn kho chưa thay đổi.`);
      setRequestOpen(false); setReason(''); setNote(''); setLines([{ MaSanPham: '', SoLuongDeNghi: '' }]); setTab('requests'); setPage(1);
      await load();
    } catch (e: any) { setError(e.message && !e.response ? e.message : apiError(e)); }
    finally { setSaving(false); }
  };
  const showRequest = async (id: number) => {
    try { const r = await api.get(`/khohang/my-replenishment-requests/${id}`); setRequestDetail(r.data.data); }
    catch (e) { setError(apiError(e)); }
  };
  const cancelRequest = async (id: number) => {
    try { await api.post(`/khohang/my-replenishment-requests/${id}/cancel`); setNotice('Đã hủy yêu cầu đang chờ duyệt.'); setRequestDetail(null); await load(); }
    catch (e) { setError(apiError(e)); }
  };

  const cards = [
    { title: 'Mặt hàng theo dõi', value: summary?.MatHangTheoDoi, icon: '⬡', tone: 'bg-blue-50 text-blue-600', action: () => { setCategory(''); setStockStatus(''); switchTab('items'); } },
    { title: 'Sắp hết hàng', value: summary?.SapHetHang, icon: '△', tone: 'bg-amber-50 text-amber-600', action: () => chooseStock('Sắp hết') },
    { title: 'Hết hàng', value: summary?.HetHang, icon: '⊗', tone: 'bg-rose-50 text-rose-600', action: () => chooseStock('Hết hàng') },
    { title: `Lô sắp hết hạn · ${SOON_DAYS} ngày`, value: summary?.LoSapHetHan, icon: '▣', tone: 'bg-violet-50 text-violet-600', action: () => { setTab('lots'); setPage(1); setSearch(''); setCategory(''); setExpiryState('soon'); } },
  ];
  const date = (v?: string) => v ? new Date(v).toLocaleString('vi-VN') : '—';

  return <main className="space-y-4 text-[#142747]">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 text-sm text-slate-500">Nhân viên　/　Kho hàng</p><h1 className="text-3xl font-extrabold">Kho hàng</h1><p className="mt-1 text-slate-600">Theo dõi tồn kho và tra cứu lô mỹ phẩm</p></div><div className="flex gap-2"><button onClick={() => void load()} disabled={loading} className="rounded-lg border border-amber-400 px-4 py-2 font-semibold text-amber-800 disabled:opacity-50">⟳　Làm mới</button><button onClick={() => { setRequestOpen(true); setProductSearch(''); setProductOptions([]); }} className="rounded-lg bg-amber-400 px-4 py-2 font-bold text-slate-950">＋ Tạo yêu cầu nhập</button></div></header>
    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}<button onClick={() => void load()} className="font-bold underline">Thử lại</button></div>}
    {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}<button onClick={() => setNotice('')} className="float-right">✕</button></div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <button key={card.title} onClick={card.action} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:shadow-md"><span className={`grid h-14 w-14 place-items-center rounded-full text-2xl ${card.tone}`}>{card.icon}</span><span><small className="block text-slate-500">{card.title}</small><b className="text-2xl">{loading ? '…' : summary ? qty(card.value) : '—'}</b>{card.title.startsWith('Lô') && <small className="block text-slate-400">Trong 90 ngày tới</small>}</span></button>)}</section>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><nav className="flex flex-wrap gap-6 border-b px-5 pt-3">{([['items','Tồn kho'],['lots','Lô & hạn sử dụng'],['moves','Lịch sử kho'],['requests','Yêu cầu của tôi']] as [Tab,string][]).map(([key,label]) => <button key={key} onClick={() => switchTab(key)} className={`border-b-[3px] pb-3 font-medium ${tab === key ? 'border-amber-400 text-slate-950' : 'border-transparent text-slate-500'}`}>{label}</button>)}</nav>
      <div className="flex flex-wrap gap-2 p-3"><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={tab === 'requests' ? 'Tìm lý do yêu cầu…' : 'Tìm tên, mã sản phẩm hoặc mã lô'} className="min-w-56 flex-1 rounded-lg border px-3 py-2.5" />{(tab === 'items' || tab === 'lots') && <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="rounded-lg border px-3 py-2.5"><option value="">Danh mục: Tất cả</option>{categories.map(c => <option key={c.MaDanhMuc} value={c.MaDanhMuc}>{c.TenDanhMuc}</option>)}</select>}{tab === 'items' && <select value={stockStatus} onChange={e => { setStockStatus(e.target.value); setPage(1); }} className="rounded-lg border px-3 py-2.5"><option value="">Tình trạng tồn: Tất cả</option><option value="Ổn định">Đủ hàng</option><option value="Sắp hết">Sắp hết</option><option value="Hết hàng">Hết hàng</option></select>}{tab === 'lots' && <select value={expiryState} onChange={e => { setExpiryState(e.target.value); setPage(1); }} className="rounded-lg border px-3 py-2.5"><option value="">Hạn sử dụng: Tất cả</option><option value="soon">Sắp hết hạn (90 ngày)</option><option value="expired">Đã hết hạn</option></select>}<button onClick={() => void load()} className="rounded-lg bg-amber-400 px-5 py-2.5 font-bold">⌕　Lọc</button></div>
      {loading ? <div className="p-12 text-center text-slate-500">Đang tải dữ liệu kho…</div> : !error && rows.length === 0 ? <div className="p-12 text-center text-slate-500">{tab === 'requests' ? 'Bạn chưa có yêu cầu nhập nào.' : 'Không có dữ liệu phù hợp.'}</div> : !loading && rows.length > 0 && <div className="overflow-x-auto">
        {tab === 'items' && <table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-slate-600"><tr>{['Sản phẩm','Tồn thực tế','Đã giữ','Khả dụng','Cảnh báo','Thao tác'].map(x => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(p => <tr key={p.MaSanPham} className="hover:bg-amber-50/30"><td className="px-4 py-2"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-rose-50 text-rose-300">{p.HinhAnh ? <img src={imageUrl(p.HinhAnh)} alt="" className="h-full w-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} /> : '♧'}</span><span><b className="block">{p.TenSanPham}</b><small className="text-slate-500">{p.MaSKU || `SP${p.MaSanPham}`}{p.DungTich ? ` · ${p.DungTich}` : ''}</small></span></div></td><td className="px-4 py-3 text-center">{qty(p.TonThucTe)}</td><td className="px-4 py-3 text-center">{qty(p.DaGiu)}</td><td className="px-4 py-3 text-center font-bold">{qty(p.CoTheBan)}</td><td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(p.TrangThai)}`}>{p.TrangThai}</span></td><td className="px-4 py-3"><button onClick={() => void openDetail(p.MaSanPham)} className="font-semibold text-blue-700">◎　Chi tiết</button></td></tr>)}</tbody></table>}
        {tab === 'lots' && <table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50 text-left text-slate-600"><tr>{['Mã lô','Sản phẩm','Ngày sản xuất','Hạn sử dụng','Tồn','Khả dụng','Vị trí','Tình trạng'].map(x => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(lot => <tr key={lot.MaLo}><td className="px-4 py-3 font-semibold">{lot.MaLoCode}</td><td>{lot.TenSanPham}<small className="block text-slate-500">{lot.MaSKU || `SP${lot.MaSanPham}`}</small></td><td>{fmt(lot.NgaySanXuat)}</td><td>{fmt(lot.HanSuDung)}</td><td className="text-center">{qty(lot.SoLuongTon)}</td><td className="text-center">{qty(lot.CoTheBan)}</td><td>{lot.ViTri || 'Chưa cập nhật'}</td><td><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(lot.TrangThaiHan)}`}>{lot.TrangThaiHan}</span></td></tr>)}</tbody></table>}
        {tab === 'moves' && <table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50 text-left text-slate-600"><tr>{['Thời gian','Sản phẩm','Mã lô','Nghiệp vụ','Số lượng','Trước → sau','Ghi chú'].map(x => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(move => <tr key={move.MaBienDong}><td className="px-4 py-3">{date(move.NgayTao)}</td><td>{move.TenSanPham}<small className="block text-slate-500">{move.MaSKU || `SP${move.MaSanPham}`}</small></td><td>{move.MaLoCode || '—'}</td><td>{move.Loai}</td><td className={move.SoLuong < 0 ? 'font-semibold text-rose-700' : 'font-semibold text-emerald-700'}>{Number(move.SoLuong) > 0 ? '+' : ''}{qty(move.SoLuong)}</td><td>{qty(move.TonTruoc)} → {qty(move.TonSau)}</td><td>{move.GhiChu || '—'}</td></tr>)}</tbody></table>}
        {tab === 'requests' && <table className="w-full min-w-[750px] text-sm"><thead className="bg-slate-50 text-left text-slate-600"><tr>{['Yêu cầu','Mặt hàng','Lý do','Ngày gửi','Trạng thái','Thao tác'].map(x => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(r => <tr key={r.Id}><td className="px-4 py-3 font-semibold">YC#{r.Id}</td><td>{r.SanPhamDau || '—'}{Number(r.SoDong) > 1 ? ` +${Number(r.SoDong) - 1}` : ''}</td><td className="max-w-56 truncate">{r.LyDo}</td><td>{date(r.NgayTao)}</td><td><span className={`rounded-full px-3 py-1 text-xs font-semibold ${r.TrangThai === 'CHO_DUYET' ? 'bg-amber-100 text-amber-800' : r.TrangThai === 'DA_DUYET' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{requestStatus[r.TrangThai] || r.TrangThai}</span></td><td className="space-x-3"><button onClick={() => void showRequest(r.Id)} className="text-blue-700">Chi tiết</button>{r.TrangThai === 'CHO_DUYET' && <button onClick={() => void cancelRequest(r.Id)} className="text-rose-700">Hủy</button>}</td></tr>)}</tbody></table>}
      </div>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm text-slate-500"><span>Hiển thị {summary ? (total ? (page - 1) * PAGE_SIZE + 1 : 0) : '—'}–{summary ? Math.min(page * PAGE_SIZE, total) : '—'} / {summary ? qty(total) : '—'} kết quả</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-2 disabled:opacity-40">‹</button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-2 disabled:opacity-40">›</button></div></footer>
    </section>

    {tab === 'items' && <section className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-3 flex justify-between"><h2 className="font-bold">▣　Lô cần chú ý</h2><button onClick={() => { setTab('lots'); setExpiryState('soon'); setPage(1); }} className="text-sm font-semibold text-blue-700">Xem tất cả ›</button></div>{recentLots.length ? recentLots.map(l => <div key={l.MaLo} className="flex justify-between border-t py-2 text-sm"><span><b>{l.MaLoCode}</b> · {l.TenSanPham}<small className="block text-slate-500">Hạn {fmt(l.HanSuDung)}</small></span><span className="self-center rounded-full bg-amber-100 px-3 py-1 text-amber-800">Sắp hết hạn</span></div>) : <p className="text-sm text-slate-500">Không có lô sắp hết hạn trong 90 ngày.</p>}<p className="mt-2 text-xs text-rose-700">ⓘ Lô đã hết hạn không được tính vào lượng khả dụng để bán.</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-3 flex justify-between"><h2 className="font-bold">▣　Yêu cầu gần đây</h2><button onClick={() => switchTab('requests')} className="text-sm font-semibold text-blue-700">Xem tất cả ›</button></div>{recentRequests.length ? recentRequests.map(r => <button onClick={() => void showRequest(r.Id)} key={r.Id} className="flex w-full justify-between border-t py-2 text-left text-sm"><span><b>YC#{r.Id}</b> · {r.LyDo}<small className="block text-slate-500">{date(r.NgayTao)}</small></span><span className="self-center rounded-full bg-amber-100 px-3 py-1 text-amber-800">{requestStatus[r.TrangThai] || r.TrangThai}</span></button>) : <p className="text-sm text-slate-500">Chưa có đề nghị nhập gần đây.</p>}</div></section>}
    <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">ⓘ Số đã giữ lấy từ đơn đang giữ theo lô. Đề nghị nhập được Admin duyệt không làm tăng tồn; chỉ phiếu nhận hàng hoàn tất mới cập nhật kho.</p>

    {requestOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><section className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl"><header className="sticky top-0 flex justify-between border-b bg-white p-5"><div><h2 className="text-xl font-bold">Tạo yêu cầu nhập hàng</h2><p className="text-sm text-slate-500">Gửi đề nghị bổ sung; yêu cầu được duyệt không thay đổi tồn kho.</p></div><button onClick={() => setRequestOpen(false)}>✕</button></header><div className="space-y-4 p-5"><label className="block text-sm font-semibold">Tìm sản phẩm<input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Nhập tên hoặc mã sản phẩm" className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label>{lines.map((line,index) => <div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_150px_auto]"><label className="text-sm">Sản phẩm<select value={line.MaSanPham} onChange={e => setLines(old => old.map((x,i) => i === index ? { ...x, MaSanPham:e.target.value } : x))} className="mt-1 w-full rounded-lg border p-2"><option value="">Chọn sản phẩm</option>{productOptions.map(p => <option key={p.MaSanPham} value={p.MaSanPham}>{p.TenSanPham} · {p.MaSKU || `SP${p.MaSanPham}`}{p.DungTich ? ` · ${p.DungTich}` : ''}</option>)}</select></label><label className="text-sm">Số lượng đề nghị<input type="number" min="1" step="1" value={line.SoLuongDeNghi} onChange={e => setLines(old => old.map((x,i) => i === index ? { ...x, SoLuongDeNghi:e.target.value } : x))} className="mt-1 w-full rounded-lg border p-2" /></label><button disabled={lines.length === 1} onClick={() => setLines(old => old.filter((_,i) => i !== index))} className="self-end rounded-lg border px-3 py-2 disabled:opacity-40">Bỏ</button></div>)}<button onClick={() => setLines(old => [...old,{MaSanPham:'',SoLuongDeNghi:''}])} className="text-sm font-semibold text-blue-700">＋ Thêm mặt hàng</button><label className="block text-sm font-semibold">Lý do đề nghị<input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} className="mt-1 w-full rounded-lg border p-2.5" placeholder="Ví dụ: tồn kho thấp so với nhu cầu bán" /></label><label className="block text-sm font-semibold">Ghi chú<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} className="mt-1 min-h-20 w-full rounded-lg border p-2.5" /></label><div className="flex justify-end gap-2"><button onClick={() => setRequestOpen(false)} className="rounded-lg border px-4 py-2">Hủy</button><button disabled={saving} onClick={() => void submitRequest()} className="rounded-lg bg-amber-400 px-5 py-2 font-bold disabled:opacity-50">{saving ? 'Đang gửi…' : 'Gửi Admin duyệt'}</button></div></div></section></div>}

    {(detailLoading || detail) && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onMouseDown={e => { if (e.target === e.currentTarget) setDetail(null); }}><aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl"><div className="flex justify-between"><h2 className="text-xl font-bold">Chi tiết tồn kho</h2><button onClick={() => setDetail(null)}>✕</button></div>{detailLoading ? <p className="py-10 text-center">Đang tải chi tiết…</p> : <><h3 className="mt-5 font-semibold">{detail.product.TenSanPham} · {detail.product.MaSKU || `SP${detail.product.MaSanPham}`}</h3><div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-4 text-center text-sm"><span>Tồn thực tế<b className="block text-lg">{qty(detail.product.TonThucTe)}</b></span><span>Đã giữ<b className="block text-lg">{qty(detail.product.DaGiu)}</b></span><span>Khả dụng<b className="block text-lg">{qty(detail.product.CoTheBan)}</b></span></div><h3 className="mb-2 mt-5 font-bold">Lô và hạn sử dụng</h3>{detail.lots.length ? detail.lots.map((l:any) => <p key={l.MaLo} className="border-t py-3 text-sm">{l.MaLoCode} · tồn {qty(l.SoLuongTon)} · giữ {qty(l.SoLuongDaGiu)} · HSD {fmt(l.HanSuDung)} · {l.ViTri || 'Chưa cập nhật vị trí'}</p>) : <p className="text-sm text-slate-500">Chưa có lô tồn kho.</p>}<h3 className="mb-2 mt-5 font-bold">Lịch sử gần đây</h3>{detail.transactions.map((x:any) => <p key={x.MaBienDong} className="border-t py-2 text-sm">{date(x.NgayTao)} · {x.Loai} · {Number(x.SoLuong)>0?'+':''}{qty(x.SoLuong)} · {x.GhiChu || '—'}</p>)}</>}</aside></div>}
    {requestDetail && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onMouseDown={e => { if (e.target === e.currentTarget) setRequestDetail(null); }}><aside className="h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-2xl"><div className="flex justify-between"><h2 className="text-xl font-bold">Yêu cầu nhập #{requestDetail.Id}</h2><button onClick={() => setRequestDetail(null)}>✕</button></div><p className="mt-2"><b>Trạng thái:</b> {requestStatus[requestDetail.TrangThai]}</p><p className="mt-2"><b>Lý do:</b> {requestDetail.LyDo}</p>{requestDetail.GhiChu && <p className="mt-1"><b>Ghi chú:</b> {requestDetail.GhiChu}</p>}<h3 className="mb-2 mt-5 font-bold">Mặt hàng đề nghị</h3>{requestDetail.items.map((x:any) => <p key={x.MaSanPham} className="border-t py-2">{x.TenSanPham} · {x.MaSKU || `SP${x.MaSanPham}`} · đề nghị {qty(x.SoLuongDeNghi)} {x.DonVi || ''}</p>)}<h3 className="mb-2 mt-5 font-bold">Lịch sử</h3>{requestDetail.history.map((x:any,index:number) => <p key={index} className="border-t py-2 text-sm">{date(x.NgayTao)} · {requestStatus[x.TrangThaiMoi] || x.TrangThaiMoi} · {x.LyDo || ''}</p>)}{requestDetail.TrangThai === 'CHO_DUYET' && <button onClick={() => void cancelRequest(requestDetail.Id)} className="mt-5 rounded-lg border border-rose-300 px-4 py-2 text-rose-700">Hủy yêu cầu</button>}</aside></div>}
  </main>;
}
