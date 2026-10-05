import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { API_ORIGIN, categoriesAPI, productsAPI } from '../../services/api';
import { formatCurrency } from '../../utils/format';

type Product = Record<string, any> & { MaSanPham: number; TenSanPham: string; GiaBan: number };
type Stats = { TongSanPham: number; DangBan: number; SapHetHang: number; HetHang: number };
const emptyStats: Stats = { TongSanPham: 0, DangBan: 0, SapHetHang: 0, HetHang: 0 };
const imageUrl = (path?: string) => !path ? '' : /^https?:\/\//i.test(path) ? path : `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
const errorText = (error: any) => {
  const status = error?.response?.status;
  if (!status) return 'Không thể kết nối Backend. Kiểm tra URL API và trạng thái máy chủ.';
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Tài khoản nhân viên không có quyền xem sản phẩm.';
  if (status === 404) return 'Không tìm thấy API sản phẩm. Hãy khởi động lại Backend.';
  if (status >= 500) return `Backend hoặc database gặp lỗi: ${error.response?.data?.message || 'không có chi tiết'}`;
  return error.response?.data?.message || `Không thể tải sản phẩm (HTTP ${status}).`;
};
const missing = (value: unknown) => value === null || value === undefined || String(value).trim() === '' ? 'Chưa cập nhật' : String(value);

export default function SanPhamNhanVien() {
  const [rows, setRows] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [stock, setStock] = useState('');
  const [business, setBusiness] = useState('');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page, limit };
      if (query) params.search = query;
      if (category) params.maDanhMuc = Number(category);
      if (brand) params.thuongHieu = brand;
      if (stock) params.tonKho = stock;
      if (business !== '') params.trangThai = Number(business);
      const [products, summary] = await Promise.all([productsAPI.getAll(params), productsAPI.stats()]);
      setRows(products.data.data || []);
      setTotal(Number(products.data.pagination?.total || 0));
      setTotalPages(Math.max(1, Number(products.data.pagination?.totalPages || 1)));
      setStats({ ...emptyStats, ...(summary.data.data || {}) });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [page, limit, query, category, brand, stock, business]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let active = true;
    Promise.all([categoriesAPI.getAll(), productsAPI.filters()]).then(([cats, filterData]) => {
      if (!active) return;
      setCategories(cats.data.data || []);
      setBrands(filterData.data.data?.brands || []);
    }).catch(e => { if (active && !error) setError(errorText(e)); });
    return () => { active = false; };
    // Filter facets are loaded once; `load` handles the catalog refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [load]);

  const setFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };
  const firstRow = total ? (page - 1) * limit + 1 : 0;
  const lastRow = Math.min(page * limit, total);
  const selectStockCard = (value: string) => { setSearch(''); setQuery(''); setCategory(''); setBrand(''); setBusiness(''); setStock(value); setPage(1); };
  const selectBusinessCard = (value: string) => { setSearch(''); setQuery(''); setCategory(''); setBrand(''); setStock(''); setBusiness(value); setPage(1); };
  const openDetail = async (product: Product) => {
    setDetailLoading(true);
    setDetail({ product, inventory: null });
    try {
      const [productResult, inventoryResult] = await Promise.all([
        productsAPI.getById(product.MaSanPham),
        api.get(`/khohang/items/${product.MaSanPham}`),
      ]);
      setDetail({ product: productResult.data.data, inventory: inventoryResult.data.data });
    } catch (e) {
      // Product details remain useful even if the inventory endpoint fails; report the actual failure.
      setDetail((previous: any) => ({ ...previous, inventoryError: errorText(e) }));
    } finally { setDetailLoading(false); }
  };

  const stockBadge = (p: Product) => {
    const available = Number(p.CoTheBan ?? 0);
    if (available <= 0) return <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Hết hàng</span>;
    if (available <= Number(p.NguongCanhBaoTonKho ?? 10)) return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Sắp hết</span>;
    return <span className="text-sm font-medium text-slate-700">{available.toLocaleString('vi-VN')}</span>;
  };
  const price = (p: Product) => Number(p.GiaKhuyenMaiHienTai ?? p.GiaBan);

  const statCards = [
    { icon: '⬡', title: 'Tổng sản phẩm', value: stats.TongSanPham, subtitle: 'Sản phẩm trong cửa hàng', onClick: () => { setCategory(''); setBrand(''); setStock(''); setBusiness(''); setSearch(''); setQuery(''); setPage(1); } },
    { icon: '▣', title: 'Đang kinh doanh', value: stats.DangBan, subtitle: 'Sản phẩm đang mở bán', onClick: () => selectBusinessCard('1') },
    { icon: '△', title: 'Sắp hết hàng', value: stats.SapHetHang, subtitle: 'Khả dụng trên 0, trong ngưỡng', onClick: () => selectStockCard('sapHet') },
    { icon: '⊗', title: 'Hết hàng', value: stats.HetHang, subtitle: 'Số lượng khả dụng bằng 0', onClick: () => selectStockCard('het') },
  ];

  return <main className="space-y-4 text-[#142747]">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><div className="mb-2 text-sm text-slate-500">Nhân viên　/　Sản phẩm</div><h1 className="text-3xl font-extrabold">Sản phẩm</h1><p className="mt-1 text-slate-600">Tra cứu sản phẩm và tư vấn cho khách hàng</p></div>
      <button onClick={() => void load()} disabled={loading} className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-60">⟳　Làm mới</button>
    </header>

    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}<button onClick={() => void load()} className="font-bold underline">Thử lại</button></div>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map((card, index) => <button key={card.title} onClick={card.onClick} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <span className={`grid h-14 w-14 place-items-center rounded-xl text-2xl ${['bg-blue-50 text-blue-600','bg-emerald-50 text-emerald-700','bg-amber-50 text-amber-600','bg-rose-50 text-rose-600'][index]}`}>{card.icon}</span>
        <span><span className="block text-sm text-slate-600">{card.title}</span><b className="block text-2xl leading-8">{loading ? '…' : Number(card.value).toLocaleString('vi-VN')}</b><small className="text-slate-500">{card.subtitle}</small></span>
      </button>)}
    </section>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <input aria-label="Tìm sản phẩm" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="⌕  Tìm tên, mã sản phẩm hoặc thương hiệu…" className="min-w-56 flex-1 rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-amber-400" />
        <select aria-label="Lọc danh mục" value={category} onChange={e => setFilter(setCategory, e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5"><option value="">Danh mục: Tất cả</option>{categories.map(c => <option key={c.MaDanhMuc} value={c.MaDanhMuc}>{c.TenDanhMuc}</option>)}</select>
        <select aria-label="Lọc thương hiệu" value={brand} onChange={e => setFilter(setBrand, e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5"><option value="">Thương hiệu: Tất cả</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}</select>
        <select aria-label="Lọc tồn kho" value={stock} onChange={e => setFilter(setStock, e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5"><option value="">Tồn kho: Tất cả</option><option value="con">Còn hàng</option><option value="sapHet">Sắp hết</option><option value="het">Hết hàng</option></select>
        <select aria-label="Lọc trạng thái kinh doanh" value={business} onChange={e => setFilter(setBusiness, e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5"><option value="">Trạng thái: Tất cả</option><option value="1">Đang bán</option><option value="0">Ngừng bán</option></select>
        <button onClick={() => void load()} className="rounded-lg bg-amber-400 px-4 py-2.5 font-bold text-slate-900 hover:bg-amber-300">⌕　Lọc</button>
        <div className="flex rounded-lg border border-slate-300 p-1"><button aria-label="Dạng bảng" onClick={() => setView('table')} className={`rounded px-3 py-1 ${view === 'table' ? 'bg-amber-300' : ''}`}>☷</button><button aria-label="Dạng lưới" onClick={() => setView('grid')} className={`rounded px-3 py-1 ${view === 'grid' ? 'bg-amber-300' : ''}`}>▦</button></div>
      </div>

      {loading && <div className="p-14 text-center text-slate-500">Đang tải danh sách sản phẩm…</div>}
      {!loading && !error && rows.length === 0 && <div className="p-14 text-center text-slate-500"><div className="mb-2 text-3xl">⌕</div>Không có sản phẩm phù hợp bộ lọc.</div>}
      {!loading && rows.length > 0 && view === 'table' && <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="bg-slate-50 text-left text-slate-600"><tr>{['Sản phẩm','Danh mục','Thương hiệu','Giá bán','Tồn kho khả dụng','Trạng thái kinh doanh','Thao tác'].map(x => <th key={x} className="px-4 py-3 font-semibold">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(p => <tr key={p.MaSanPham} className="hover:bg-amber-50/30"><td className="px-4 py-2"><button onClick={() => void openDetail(p)} className="flex items-center gap-3 text-left"><span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-xl text-slate-400">{p.HinhAnh ? <img src={imageUrl(p.HinhAnh)} alt="" className="h-full w-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} /> : '♧'}</span><span><b className="block max-w-64 truncate text-[#142747]">{p.TenSanPham}</b><small className="text-slate-500">{p.MaSKU || `SP${p.MaSanPham}`}</small></span></button></td><td className="px-4 py-2">{p.TenDanhMuc || 'Chưa cập nhật'}</td><td className="px-4 py-2">{missing(p.ThuongHieu)}</td><td className="whitespace-nowrap px-4 py-2 font-semibold">{formatCurrency(price(p))}{p.DangKhuyenMai && <small className="ml-2 text-rose-600">KM</small>}</td><td className="px-4 py-2">{stockBadge(p)}</td><td className="px-4 py-2">{p.TrangThai ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">● Đang bán</span> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">● Ngừng bán</span>}</td><td className="px-4 py-2"><button onClick={() => void openDetail(p)} className="rounded-lg border border-slate-300 px-3 py-2 hover:border-amber-400">◎　Chi tiết</button></td></tr>)}</tbody></table></div>}
      {!loading && rows.length > 0 && view === 'grid' && <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map(p => <article key={p.MaSanPham} className="overflow-hidden rounded-xl border border-slate-200"><button onClick={() => void openDetail(p)} className="grid h-44 w-full place-items-center bg-slate-50 text-4xl text-slate-300">{p.HinhAnh ? <img src={imageUrl(p.HinhAnh)} alt={p.TenSanPham} className="h-full w-full object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} /> : '♧'}</button><div className="space-y-2 p-4"><b className="block truncate">{p.TenSanPham}</b><p className="text-xs text-slate-500">{p.MaSKU || `SP${p.MaSanPham}`} · {p.TenDanhMuc || 'Chưa cập nhật'} · {missing(p.ThuongHieu)}</p><div className="flex items-center justify-between"><b>{formatCurrency(price(p))}</b>{stockBadge(p)}</div><button onClick={() => void openDetail(p)} className="w-full rounded-lg border p-2">Chi tiết</button></div></article>)}</div>}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm text-slate-600"><span>Hiển thị {firstRow}–{lastRow} / {total.toLocaleString('vi-VN')} sản phẩm</span><div className="flex items-center gap-2"><select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} className="rounded-lg border px-3 py-2"><option value={6}>6 / trang</option><option value={12}>12 / trang</option><option value={24}>24 / trang</option><option value={50}>50 / trang</option></select><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-2 disabled:opacity-40">‹</button><span className="min-w-20 text-center">{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-2 disabled:opacity-40">›</button></div></footer>
    </section>
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500"><span>ⓘ Giá và tồn kho lấy từ dữ liệu cửa hàng; tồn khả dụng được tổng hợp theo lô hợp lệ trừ số đã giữ.</span><Link to="/warehouse" className="rounded-lg border px-3 py-2 text-[#142747] hover:border-amber-400">⌂　Xem kho hàng</Link></div>

    {detail && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onMouseDown={e => { if (e.target === e.currentTarget) setDetail(null); }}><aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5"><div><small className="text-slate-500">Thông tin sản phẩm</small><h2 className="text-xl font-extrabold">{detail.product.TenSanPham}</h2></div><button onClick={() => setDetail(null)} aria-label="Đóng">✕</button></div><div className="space-y-5 p-5">{detailLoading && <p className="text-sm text-slate-500">Đang tải chi tiết và tồn kho…</p>}{detail.inventoryError && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{detail.inventoryError}</p>}<div className="flex gap-4"><div className="grid h-32 w-32 shrink-0 place-items-center rounded-xl bg-slate-50 text-3xl text-slate-300">{detail.product.HinhAnh ? <img src={imageUrl(detail.product.HinhAnh)} alt="" className="h-full w-full rounded-xl object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} /> : '♧'}</div><div><h3 className="font-bold">{detail.product.TenSanPham}</h3><p className="text-sm text-slate-500">{detail.product.MaSKU || `SP${detail.product.MaSanPham}`}</p><p className="mt-2 text-lg font-bold text-rose-700">{formatCurrency(Number(detail.product.GiaKhuyenMaiHienTai ?? detail.product.GiaBan))}</p>{detail.product.DangKhuyenMai && <p className="text-xs text-rose-600">{detail.product.TenKhuyenMai || 'Đang có khuyến mãi'}</p>}</div></div><dl className="grid grid-cols-2 gap-3 text-sm">{[['Danh mục', detail.product.TenDanhMuc],['Thương hiệu',detail.product.ThuongHieu],['Xuất xứ',detail.product.XuatXu],['Đơn vị tính',detail.product.DonVi],['Dung tích / quy cách',detail.product.DungTich || detail.product.QuyCachDongGoi],['Trạng thái kinh doanh',detail.product.TrangThai ? 'Đang bán' : 'Ngừng bán']].map(([label,value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{missing(value)}</dd></div>)}</dl><section className="rounded-xl border p-4"><h3 className="mb-3 font-bold">Tồn kho</h3><div className="grid grid-cols-3 gap-2 text-center text-sm"><div><small className="block text-slate-500">Tồn thực tế</small><b>{detail.inventory?.product?.TonThucTe ?? '—'}</b></div><div><small className="block text-slate-500">Đã giữ</small><b>{detail.inventory?.product?.DaGiu ?? '—'}</b></div><div><small className="block text-slate-500">Có thể bán</small><b>{detail.inventory?.product?.CoTheBan ?? '—'}</b></div></div><h4 className="mb-1 mt-4 text-sm font-semibold">Lô và hạn sử dụng</h4>{detail.inventory?.lots?.length ? detail.inventory.lots.map((lot:any) => <p key={lot.MaLo} className="border-t py-2 text-sm">{lot.MaLoCode} · còn {lot.SoLuongTon} · HSD {lot.HanSuDung ? new Date(lot.HanSuDung).toLocaleDateString('vi-VN') : 'Không quản lý'} · {lot.ViTri || 'Chưa cập nhật vị trí'}</p>) : <p className="text-sm text-slate-500">Chưa có lô tồn kho.</p>}</section>{[['Mô tả',detail.product.MoTa],['Thành phần',detail.product.ThanhPhan],['Công dụng',detail.product.CongDung],['Hướng dẫn sử dụng',detail.product.HuongDanSuDung],['Loại da phù hợp',detail.product.LoaiDaPhuHop],['Lưu ý sử dụng',detail.product.CanhBaoKichUng]].map(([label,value]) => <section key={label}><h3 className="text-sm font-bold">{label}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{missing(value)}</p></section>)}<Link to={`/warehouse?productId=${detail.product.MaSanPham}`} className="block rounded-lg bg-[#142747] px-4 py-3 text-center font-semibold text-white">Mở tồn kho của sản phẩm này</Link></div></aside></div>}
  </main>;
}
