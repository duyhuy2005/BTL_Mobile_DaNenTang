import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { formatCurrency } from '../../utils/format';

const API = 'http://localhost:3000/api';
const IMG = 'http://localhost:3000';

// ─── helpers ───────────────────────────────────────────────────────────────
const getToken = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('vi-VN') : '-';
const fmtDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString('vi-VN') : '-';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    con_hang: 'bg-green-100 text-green-700',
    sap_het:  'bg-yellow-100 text-yellow-700',
    het_hang: 'bg-red-100   text-red-700',
  };
  const label: Record<string, string> = {
    con_hang: 'Còn hàng', sap_het: 'Sắp hết', het_hang: 'Hết hàng',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label[status] ?? status}
    </span>
  );
}

// ─── types ──────────────────────────────────────────────────────────────────
interface Product {
  MaSanPham: number; TenSanPham: string; ThuongHieu: string;
  GiaNhap: number; GiaBan: number; SoLuong: number;
  HinhAnh: string; TrangThai: string; TrangThaiKho: string; TenDanhMuc: string;
  GiaKhuyenMai?: number;
}
interface Stats { tongSanPham: number; hetHang: number; sapHet: number; conHang: number; giaTriTonKho: number; }
interface NCC { MaNCC: number; TenNCC: string; SoDienThoai: string; Email: string; DiaChi: string; TrangThai: number; SoPhieuNhap: number; TongTienNhap: number; }
interface PhieuNhap { MaPhieuNhap: number; TenNCC: string; NgayNhap: string; TongTien: number; TrangThai: string; NguoiTao: string; SoDongCT: number; }
interface PhieuXuat { MaPhieuXuat: number; LoaiXuat: string; NgayXuat: string; TongSoLuong: number; GhiChu: string; NguoiTao: string; }
interface GiaoDich { MaGiaoDich: number; LoaiGiaoDich: string; SoLuong: number; SoLuongTruoc: number; SoLuongSau: number; GhiChu: string; NgayGiaoDich: string; NguoiThucHien: string; }
interface CartItem { MaSanPham: number; TenSanPham: string; SoLuong: number; GiaNhap: number; GiaBan?: number; }

// ══════════════════════════════════════════════════════════════════════════════
export default function KhoHang() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.VaiTro === 'Admin';

  const [tab, setTab]             = useState<'tonkho'|'nhapkho'|'xuatkho'|'nhacungcap'>('tonkho');
  const [loading, setLoading]     = useState(false);

  // ── Tồn kho ─────────────────────────────────────────────────────────────
  const [products, setProducts]   = useState<Product[]>([]);
  const [stats, setStats]         = useState<Stats|null>(null);
  const [alerts, setAlerts]       = useState<Product[]>([]);
  const [activity, setActivity]   = useState<GiaoDich[]>([]);
  const [pagination, setPagination] = useState({ page:1, limit:10, total:0, totalPages:1 });
  const [search, setSearch]       = useState('');
  const [filterDM, setFilterDM]   = useState('');
  const [filterTH, setFilterTH]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [categories, setCategories] = useState<{MaDanhMuc:number;TenDanhMuc:string}[]>([]);
  const [brands, setBrands]       = useState<string[]>([]);

  // ── Detail modal ─────────────────────────────────────────────────────────
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [showDetail, setShowDetail]       = useState(false);

  // ── Nhập kho ─────────────────────────────────────────────────────────────
  const [phieuNhaps, setPhieuNhaps]   = useState<PhieuNhap[]>([]);
  const [showNhapForm, setShowNhapForm] = useState(false);
  const [nhapNCC, setNhapNCC]         = useState('');
  const [nhapNgay, setNhapNgay]       = useState(new Date().toISOString().split('T')[0]);
  const [nhapGhiChu, setNhapGhiChu]   = useState('');
  const [nhapCart, setNhapCart]       = useState<CartItem[]>([]);
  const [nhapSearch, setNhapSearch]   = useState('');
  const [nhapProducts, setNhapProducts] = useState<Product[]>([]);

  // ── Xuất kho ─────────────────────────────────────────────────────────────
  const [phieuXuats, setPhieuXuats]   = useState<PhieuXuat[]>([]);
  const [showXuatForm, setShowXuatForm] = useState(false);
  const [xuatLoai, setXuatLoai]       = useState('Xuat ban hang');
  const [xuatGhiChu, setXuatGhiChu]   = useState('');
  const [xuatCart, setXuatCart]       = useState<CartItem[]>([]);
  const [xuatSearch, setXuatSearch]   = useState('');
  const [xuatProducts, setXuatProducts] = useState<Product[]>([]);

  // ── NCC ─────────────────────────────────────────────────────────────────
  const [nccs, setNccs]             = useState<NCC[]>([]);
  const [showNccForm, setShowNccForm] = useState(false);
  const [editingNcc, setEditingNcc]  = useState<NCC|null>(null);
  const [nccForm, setNccForm]        = useState({ TenNCC:'', SoDienThoai:'', Email:'', DiaChi:'', GhiChu:'' });

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/inventory/statistics`, { headers: getToken() });
      setStats(r.data.data);
    } catch {}
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/inventory/alerts`, { headers: getToken() });
      setAlerts(r.data.data || []);
    } catch {}
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/inventory/transactions?limit=8`, { headers: getToken() });
      setActivity(r.data.data || []);
    } catch {}
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/danhmuc`, { headers: getToken() });
      setCategories(r.data.data || []);
    } catch {}
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page), limit: String(pagination.limit),
        ...(search      ? { search }      : {}),
        ...(filterDM    ? { maDanhMuc: filterDM } : {}),
        ...(filterTH    ? { thuongHieu: filterTH } : {}),
        ...(filterStatus? { trangThai: filterStatus } : {}),
      });
      const r = await axios.get(`${API}/inventory?${params}`, { headers: getToken() });
      setProducts(r.data.data || []);
      if (r.data.pagination) setPagination(r.data.pagination);

      // extract brands từ sản phẩm
      const bSet = new Set<string>((r.data.data || []).map((p: Product) => p.ThuongHieu).filter(Boolean));
      setBrands(Array.from(bSet).sort());
    } catch {}
    finally { setLoading(false); }
  }, [pagination.page, pagination.limit, search, filterDM, filterTH, filterStatus]);

  const loadPhieuNhap = useCallback(async () => {
    try { const r = await axios.get(`${API}/phieunhap`, { headers: getToken() }); setPhieuNhaps(r.data.data||[]); } catch {}
  }, []);

  const loadPhieuXuat = useCallback(async () => {
    try { const r = await axios.get(`${API}/phieuxuat`, { headers: getToken() }); setPhieuXuats(r.data.data||[]); } catch {}
  }, []);

  const loadNcc = useCallback(async () => {
    try { const r = await axios.get(`${API}/nhacungcap`, { headers: getToken() }); setNccs(r.data.data||[]); } catch {}
  }, []);

  useEffect(() => {
    loadStats(); loadAlerts(); loadActivity(); loadCategories();
  }, []);

  useEffect(() => { if (tab === 'tonkho')    loadProducts();   }, [tab, pagination.page, search, filterDM, filterTH, filterStatus]);
  useEffect(() => { if (tab === 'nhapkho')   loadPhieuNhap(); }, [tab]);
  useEffect(() => { if (tab === 'xuatkho')   loadPhieuXuat(); }, [tab]);
  useEffect(() => { if (tab === 'nhacungcap') loadNcc();       }, [tab]);

  // Tìm sản phẩm khi nhập/xuất kho
  const searchForCart = async (keyword: string, setter: (d: Product[]) => void) => {
    if (!keyword.trim()) { setter([]); return; }
    try {
      const r = await axios.get(`${API}/inventory?search=${encodeURIComponent(keyword)}&limit=10`, { headers: getToken() });
      setter(r.data.data || []);
    } catch {}
  };

  // Xem chi tiết sản phẩm
  const viewDetail = async (maSP: number) => {
    try {
      const r = await axios.get(`${API}/inventory/${maSP}`, { headers: getToken() });
      setDetailProduct(r.data.data);
      setShowDetail(true);
    } catch {}
  };

  // ── Submit nhập kho ──────────────────────────────────────────────────────
  const submitNhapKho = async () => {
    if (nhapCart.length === 0) { alert('Chưa có sản phẩm nào trong phiếu!'); return; }
    try {
      await axios.post(`${API}/phieunhap`, {
        MaNCC: nhapNCC || null,
        NgayNhap: nhapNgay,
        GhiChu: nhapGhiChu,
        chiTiet: nhapCart.map(i => ({ MaSanPham: i.MaSanPham, SoLuong: i.SoLuong, GiaNhap: i.GiaNhap }))
      }, { headers: getToken() });
      alert('Nhập kho thành công!');
      setShowNhapForm(false); setNhapCart([]); setNhapNCC(''); setNhapGhiChu('');
      loadPhieuNhap(); loadStats(); loadProducts();
    } catch (e: any) { alert(e.response?.data?.message || 'Lỗi nhập kho'); }
  };

  // ── Submit xuất kho ──────────────────────────────────────────────────────
  const submitXuatKho = async () => {
    if (xuatCart.length === 0) { alert('Chưa có sản phẩm nào trong phiếu!'); return; }
    try {
      await axios.post(`${API}/phieuxuat`, {
        LoaiXuat: xuatLoai,
        GhiChu: xuatGhiChu,
        chiTiet: xuatCart.map(i => ({ MaSanPham: i.MaSanPham, SoLuong: i.SoLuong, GiaBan: i.GiaBan || 0 }))
      }, { headers: getToken() });
      alert('Xuất kho thành công!');
      setShowXuatForm(false); setXuatCart([]);
      loadPhieuXuat(); loadStats(); loadProducts();
    } catch (e: any) { alert(e.response?.data?.message || 'Lỗi xuất kho'); }
  };

  // ── Submit NCC ───────────────────────────────────────────────────────────
  const submitNcc = async () => {
    try {
      if (editingNcc) {
        await axios.put(`${API}/nhacungcap/${editingNcc.MaNCC}`, { ...nccForm, TrangThai: editingNcc.TrangThai }, { headers: getToken() });
        alert('Cập nhật thành công!');
      } else {
        await axios.post(`${API}/nhacungcap`, nccForm, { headers: getToken() });
        alert('Thêm thành công!');
      }
      setShowNccForm(false); setEditingNcc(null); setNccForm({ TenNCC:'', SoDienThoai:'', Email:'', DiaChi:'', GhiChu:'' });
      loadNcc();
    } catch (e: any) { alert(e.response?.data?.message || 'Lỗi'); }
  };

  const deleteNcc = async (id: number) => {
    if (!confirm('Ngừng sử dụng nhà cung cấp này?')) return;
    try { await axios.delete(`${API}/nhacungcap/${id}`, { headers: getToken() }); loadNcc(); } catch (e: any) { alert(e.response?.data?.message); }
  };

  // ── Helpers Cart ─────────────────────────────────────────────────────────
  const addToCart = (p: Product, cart: CartItem[], setCart: (c: CartItem[]) => void) => {
    if (cart.find(i => i.MaSanPham === p.MaSanPham)) return;
    setCart([...cart, { MaSanPham: p.MaSanPham, TenSanPham: p.TenSanPham, SoLuong: 1, GiaNhap: p.GiaNhap, GiaBan: p.GiaBan }]);
  };
  const updateCart = (idx: number, field: 'SoLuong'|'GiaNhap'|'GiaBan', val: number, cart: CartItem[], setCart: (c: CartItem[]) => void) => {
    const c = [...cart]; c[idx] = { ...c[idx], [field]: val }; setCart(c);
  };
  const removeCart = (idx: number, cart: CartItem[], setCart: (c: CartItem[]) => void) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  // ── UI: Card thống kê ────────────────────────────────────────────────────
  const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: string|number; color: string }) => (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 border border-gray-100">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );

  // ── Tabs header ──────────────────────────────────────────────────────────
  const tabs = [
    { key: 'tonkho', label: 'Tồn kho' },
    { key: 'nhapkho', label: 'Nhập kho' },
    { key: 'xuatkho', label: 'Xuất kho' },
    { key: 'nhacungcap', label: 'Nhà cung cấp' },
  ] as const;

  // ── Render cart table ─────────────────────────────────────────────────────
  const CartTable = ({ cart, setCart, priceField }: { cart: CartItem[]; setCart: (c: CartItem[]) => void; priceField: 'GiaNhap'|'GiaBan' }) => (
    <table className="min-w-full text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-2 text-left">Sản phẩm</th>
          <th className="px-3 py-2 text-right w-24">Số lượng</th>
          <th className="px-3 py-2 text-right w-32">{priceField === 'GiaNhap' ? 'Giá nhập' : 'Giá bán'}</th>
          <th className="px-3 py-2 text-right w-32">Thành tiền</th>
          <th className="px-3 py-2 w-10"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {cart.map((item, idx) => (
          <tr key={item.MaSanPham}>
            <td className="px-3 py-2 font-medium">{item.TenSanPham}</td>
            <td className="px-3 py-2">
              <input type="number" min={1} value={item.SoLuong}
                onChange={e => updateCart(idx, 'SoLuong', +e.target.value, cart, setCart)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-right text-sm" />
            </td>
            <td className="px-3 py-2">
              <input type="number" min={0} value={priceField === 'GiaNhap' ? item.GiaNhap : (item.GiaBan||0)}
                onChange={e => updateCart(idx, priceField === 'GiaNhap' ? 'GiaNhap' : 'GiaBan', +e.target.value, cart, setCart)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-right text-sm" />
            </td>
            <td className="px-3 py-2 text-right font-medium text-pink-600">
              {formatCurrency((priceField === 'GiaNhap' ? item.GiaNhap : (item.GiaBan||0)) * item.SoLuong)}
            </td>
            <td className="px-3 py-2 text-center">
              <button onClick={() => removeCart(idx, cart, setCart)} className="text-red-400 hover:text-red-600 font-bold">×</button>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot className="bg-pink-50">
        <tr>
          <td colSpan={3} className="px-3 py-2 text-right font-semibold">Tổng tiền:</td>
          <td className="px-3 py-2 text-right font-bold text-pink-700">
            {formatCurrency(cart.reduce((s, i) => s + (priceField === 'GiaNhap' ? i.GiaNhap : (i.GiaBan||0)) * i.SoLuong, 0))}
          </td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  );

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🏬 Kho hàng</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý tồn kho, nhập xuất kho và theo dõi hàng hóa</p>
          </div>
          {isAdmin && (
            <button onClick={() => { setTab('nhapkho'); setShowNhapForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 font-medium shadow-sm">
              + Nhập kho
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="📦" label="Tổng sản phẩm"     value={stats?.tongSanPham ?? '-'}     color="bg-blue-50" />
        <StatCard icon="💰" label="Giá trị tồn kho"   value={stats ? formatCurrency(stats.giaTriTonKho) : '-'} color="bg-green-50" />
        <StatCard icon="⚠️" label="Sắp hết hàng"      value={stats?.sapHet ?? '-'}          color="bg-yellow-50" />
        <StatCard icon="🚫" label="Hết hàng"           value={stats?.hetHang ?? '-'}         color="bg-red-50" />
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-200">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    tab === t.key
                      ? 'border-b-2 border-pink-500 text-pink-600 bg-pink-50'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ─── TAB TỒN KHO ─────────────────────────────────────────── */}
            {tab === 'tonkho' && (
              <div className="p-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <input placeholder="Tìm sản phẩm, thương hiệu..." value={search}
                    onChange={e => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                    className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                  <select value={filterDM} onChange={e => { setFilterDM(e.target.value); setPagination(p=>({...p,page:1})); }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                    <option value="">Tất cả danh mục</option>
                    {categories.map(c => <option key={c.MaDanhMuc} value={c.MaDanhMuc}>{c.TenDanhMuc}</option>)}
                  </select>
                  <select value={filterTH} onChange={e => { setFilterTH(e.target.value); setPagination(p=>({...p,page:1})); }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                    <option value="">Tất cả thương hiệu</option>
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPagination(p=>({...p,page:1})); }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                    <option value="">Tất cả trạng thái</option>
                    <option value="con_hang">Còn hàng</option>
                    <option value="sap_het">Sắp hết</option>
                    <option value="het_hang">Hết hàng</option>
                  </select>
                  <button onClick={() => { setSearch(''); setFilterDM(''); setFilterTH(''); setFilterStatus(''); }}
                    className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Reset
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-10">STT</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">Ảnh</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên sản phẩm</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thương hiệu</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tồn kho</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giá nhập</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giá bán</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {loading ? (
                        <tr><td colSpan={10} className="py-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
                        </td></tr>
                      ) : products.length === 0 ? (
                        <tr><td colSpan={10} className="py-8 text-center text-gray-400">Không có sản phẩm</td></tr>
                      ) : products.map((p, idx) => (
                        <tr key={p.MaSanPham} className="hover:bg-pink-50 transition-colors">
                          <td className="px-3 py-3 text-center text-gray-500">{(pagination.page-1)*pagination.limit+idx+1}</td>
                          <td className="px-3 py-3">
                            {p.HinhAnh
                              ? <img src={`${IMG}${p.HinhAnh}`} alt="" className="w-10 h-10 object-cover rounded-lg border"
                                  onError={e=>(e.currentTarget.style.display='none')} />
                              : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-xs">N/A</div>
                            }
                          </td>
                          <td className="px-3 py-3 font-medium text-gray-800">{p.TenSanPham}</td>
                          <td className="px-3 py-3 text-gray-600">{p.TenDanhMuc||'-'}</td>
                          <td className="px-3 py-3 text-gray-600">{p.ThuongHieu||'-'}</td>
                          <td className="px-3 py-3 text-right font-semibold text-gray-800">{p.SoLuong}</td>
                          <td className="px-3 py-3 text-right text-gray-600">{formatCurrency(p.GiaNhap)}</td>
                          <td className="px-3 py-3 text-right text-pink-600 font-medium">{formatCurrency(p.GiaBan)}</td>
                          <td className="px-3 py-3 text-center"><StatusBadge status={p.TrangThaiKho} /></td>
                          <td className="px-3 py-3 text-center">
                            <button onClick={() => viewDetail(p.MaSanPham)}
                              className="text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 text-xs font-medium">
                              Chi tiết
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-500">
                      Hiển thị {(pagination.page-1)*pagination.limit+1} - {Math.min(pagination.page*pagination.limit, pagination.total)} / {pagination.total} sản phẩm
                    </span>
                    <div className="flex gap-1 items-center">
                      <button disabled={pagination.page===1} onClick={() => setPagination(p=>({...p,page:p.page-1}))}
                        className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50">‹</button>
                      {Array.from({length:Math.min(pagination.totalPages,5)},(_,i)=>i+1).map(pg=>(
                        <button key={pg} onClick={() => setPagination(p=>({...p,page:pg}))}
                          className={`px-3 py-1.5 border rounded text-sm ${pg===pagination.page?'bg-pink-500 text-white border-pink-500':'border-gray-300 hover:bg-gray-50'}`}>
                          {pg}
                        </button>
                      ))}
                      <button disabled={pagination.page===pagination.totalPages} onClick={() => setPagination(p=>({...p,page:p.page+1}))}
                        className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50">›</button>
                    </div>
                    <select value={pagination.limit} onChange={e => setPagination(p=>({...p,limit:+e.target.value,page:1}))}
                      className="border border-gray-300 rounded text-sm px-2 py-1.5">
                      {[10,20,50,100].map(n=><option key={n} value={n}>{n}/trang</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB NHẬP KHO ─────────────────────────────────────────── */}
            {tab === 'nhapkho' && (
              <div className="p-4">
                {isAdmin && !showNhapForm && (
                  <div className="flex justify-end mb-4">
                    <button onClick={() => setShowNhapForm(true)}
                      className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 font-medium text-sm">
                      + Tạo phiếu nhập
                    </button>
                  </div>
                )}

                {showNhapForm && isAdmin && (
                  <div className="bg-pink-50 border border-pink-200 rounded-xl p-5 mb-6">
                    <h3 className="font-bold text-gray-800 mb-4">📋 Tạo phiếu nhập kho</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nhà cung cấp</label>
                        <select value={nhapNCC} onChange={e => setNhapNCC(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 focus:outline-none">
                          <option value="">-- Chọn NCC --</option>
                          {nccs.filter(n => n.TrangThai).map(n => <option key={n.MaNCC} value={n.MaNCC}>{n.TenNCC}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Ngày nhập</label>
                        <input type="date" value={nhapNgay} onChange={e => setNhapNgay(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú</label>
                        <input value={nhapGhiChu} onChange={e => setNhapGhiChu(e.target.value)} placeholder="Ghi chú phiếu..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 focus:outline-none" />
                      </div>
                    </div>

                    {/* Tìm sản phẩm */}
                    <div className="mb-3">
                      <input value={nhapSearch} onChange={e => { setNhapSearch(e.target.value); searchForCart(e.target.value, setNhapProducts); }}
                        placeholder="Tìm sản phẩm để thêm vào phiếu..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 focus:outline-none" />
                      {nhapProducts.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                          {nhapProducts.map(p => (
                            <div key={p.MaSanPham} onClick={() => { addToCart(p, nhapCart, setNhapCart); setNhapSearch(''); setNhapProducts([]); }}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-pink-50 cursor-pointer text-sm">
                              <span className="font-medium">{p.TenSanPham}</span>
                              <span className="text-gray-400 text-xs">Tồn: {p.SoLuong}</span>
                              <span className="text-gray-400 text-xs ml-auto">{formatCurrency(p.GiaNhap)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {nhapCart.length > 0 && <CartTable cart={nhapCart} setCart={setNhapCart} priceField="GiaNhap" />}

                    <div className="flex gap-3 mt-4">
                      <button onClick={() => { setShowNhapForm(false); setNhapCart([]); }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
                      <button onClick={submitNhapKho} disabled={nhapCart.length===0}
                        className="px-6 py-2 bg-pink-500 text-white rounded-lg font-medium text-sm hover:bg-pink-600 disabled:opacity-40">
                        Hoàn thành nhập kho
                      </button>
                    </div>
                  </div>
                )}

                {/* Bảng lịch sử nhập kho */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">STT</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã phiếu</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nhà cung cấp</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày nhập</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng tiền</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người tạo</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {phieuNhaps.length === 0
                        ? <tr><td colSpan={7} className="py-8 text-center text-gray-400">Chưa có phiếu nhập kho</td></tr>
                        : phieuNhaps.map((pn, idx) => (
                          <tr key={pn.MaPhieuNhap} className="hover:bg-gray-50">
                            <td className="px-3 py-3 text-center">{idx+1}</td>
                            <td className="px-3 py-3 font-medium text-pink-600">#PN{String(pn.MaPhieuNhap).padStart(3,'0')}</td>
                            <td className="px-3 py-3">{pn.TenNCC||'Không xác định'}</td>
                            <td className="px-3 py-3 text-gray-500">{fmtDate(pn.NgayNhap)}</td>
                            <td className="px-3 py-3 text-right font-medium text-green-600">{formatCurrency(pn.TongTien)}</td>
                            <td className="px-3 py-3 text-center">
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">{pn.TrangThai}</span>
                            </td>
                            <td className="px-3 py-3 text-gray-500">{pn.NguoiTao||'-'}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── TAB XUẤT KHO ─────────────────────────────────────────── */}
            {tab === 'xuatkho' && (
              <div className="p-4">
                {isAdmin && !showXuatForm && (
                  <div className="flex justify-end mb-4">
                    <button onClick={() => setShowXuatForm(true)}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium text-sm">
                      + Tạo phiếu xuất
                    </button>
                  </div>
                )}

                {showXuatForm && isAdmin && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-6">
                    <h3 className="font-bold text-gray-800 mb-4">📤 Tạo phiếu xuất kho</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Loại xuất</label>
                        <select value={xuatLoai} onChange={e => setXuatLoai(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none">
                          <option value="Xuat ban hang">Xuất bán hàng</option>
                          <option value="Xuat doi tra">Xuất đổi trả</option>
                          <option value="Xuat huy">Xuất hủy</option>
                          <option value="Khac">Khác</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú</label>
                        <input value={xuatGhiChu} onChange={e => setXuatGhiChu(e.target.value)} placeholder="Ghi chú..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none" />
                      </div>
                    </div>

                    <div className="mb-3">
                      <input value={xuatSearch} onChange={e => { setXuatSearch(e.target.value); searchForCart(e.target.value, setXuatProducts); }}
                        placeholder="Tìm sản phẩm để thêm vào phiếu..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none" />
                      {xuatProducts.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                          {xuatProducts.map(p => (
                            <div key={p.MaSanPham} onClick={() => { addToCart(p, xuatCart, setXuatCart); setXuatSearch(''); setXuatProducts([]); }}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-orange-50 cursor-pointer text-sm">
                              <span className="font-medium">{p.TenSanPham}</span>
                              <span className="text-gray-400 text-xs">Tồn: {p.SoLuong}</span>
                              <span className="text-gray-400 text-xs ml-auto">{formatCurrency(p.GiaBan)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {xuatCart.length > 0 && <CartTable cart={xuatCart} setCart={setXuatCart} priceField="GiaBan" />}

                    <div className="flex gap-3 mt-4">
                      <button onClick={() => { setShowXuatForm(false); setXuatCart([]); }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
                      <button onClick={submitXuatKho} disabled={xuatCart.length===0}
                        className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 disabled:opacity-40">
                        Hoàn thành xuất kho
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">STT</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã phiếu</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại xuất</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày xuất</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng SL</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người tạo</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {phieuXuats.length === 0
                        ? <tr><td colSpan={7} className="py-8 text-center text-gray-400">Chưa có phiếu xuất kho</td></tr>
                        : phieuXuats.map((px, idx) => (
                          <tr key={px.MaPhieuXuat} className="hover:bg-gray-50">
                            <td className="px-3 py-3 text-center">{idx+1}</td>
                            <td className="px-3 py-3 font-medium text-orange-600">#PX{String(px.MaPhieuXuat).padStart(3,'0')}</td>
                            <td className="px-3 py-3">{px.LoaiXuat}</td>
                            <td className="px-3 py-3 text-gray-500">{fmtDate(px.NgayXuat)}</td>
                            <td className="px-3 py-3 text-right font-medium">{px.TongSoLuong}</td>
                            <td className="px-3 py-3 text-gray-500 truncate max-w-xs">{px.GhiChu||'-'}</td>
                            <td className="px-3 py-3 text-gray-500">{px.NguoiTao||'-'}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── TAB NHÀ CUNG CẤP ───────────────────────────────────────── */}
            {tab === 'nhacungcap' && (
              <div className="p-4">
                {isAdmin && !showNccForm && (
                  <div className="flex justify-end mb-4">
                    <button onClick={() => { setShowNccForm(true); setEditingNcc(null); setNccForm({ TenNCC:'', SoDienThoai:'', Email:'', DiaChi:'', GhiChu:'' }); }}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium text-sm">
                      + Thêm nhà cung cấp
                    </button>
                  </div>
                )}

                {showNccForm && isAdmin && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-6">
                    <h3 className="font-bold text-gray-800 mb-4">{editingNcc ? '✏️ Sửa nhà cung cấp' : '➕ Thêm nhà cung cấp'}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label:'Tên nhà cung cấp *', key:'TenNCC', placeholder:'Công ty TNHH...' },
                        { label:'Số điện thoại',      key:'SoDienThoai', placeholder:'0901234567' },
                        { label:'Email',              key:'Email',       placeholder:'email@company.vn' },
                        { label:'Địa chỉ',            key:'DiaChi',      placeholder:'123 Đường ABC...' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                          <input value={(nccForm as any)[f.key]} placeholder={f.placeholder}
                            onChange={e => setNccForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none" />
                        </div>
                      ))}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú</label>
                        <input value={nccForm.GhiChu} onChange={e => setNccForm(p => ({ ...p, GhiChu: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => { setShowNccForm(false); setEditingNcc(null); }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
                      <button onClick={submitNcc}
                        className="px-6 py-2 bg-purple-500 text-white rounded-lg font-medium text-sm hover:bg-purple-600">
                        {editingNcc ? 'Cập nhật' : 'Thêm mới'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">STT</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên NCC</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">SĐT</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Địa chỉ</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Phiếu nhập</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng tiền</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">TT</th>
                        {isAdmin && <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {nccs.length === 0
                        ? <tr><td colSpan={9} className="py-8 text-center text-gray-400">Chưa có nhà cung cấp</td></tr>
                        : nccs.map((ncc, idx) => (
                          <tr key={ncc.MaNCC} className={`hover:bg-gray-50 ${!ncc.TrangThai ? 'opacity-50' : ''}`}>
                            <td className="px-3 py-3 text-center">{idx+1}</td>
                            <td className="px-3 py-3 font-medium text-gray-800">{ncc.TenNCC}</td>
                            <td className="px-3 py-3 text-gray-600">{ncc.SoDienThoai||'-'}</td>
                            <td className="px-3 py-3 text-blue-600">{ncc.Email||'-'}</td>
                            <td className="px-3 py-3 text-gray-500 truncate max-w-xs">{ncc.DiaChi||'-'}</td>
                            <td className="px-3 py-3 text-right font-medium">{ncc.SoPhieuNhap}</td>
                            <td className="px-3 py-3 text-right text-green-600 font-medium">{formatCurrency(ncc.TongTienNhap)}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ncc.TrangThai ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {ncc.TrangThai ? 'Hoạt động' : 'Ngừng'}
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="px-3 py-3 text-center">
                                <div className="flex justify-center gap-2">
                                  <button onClick={() => { setEditingNcc(ncc); setNccForm({ TenNCC:ncc.TenNCC, SoDienThoai:ncc.SoDienThoai||'', Email:ncc.Email||'', DiaChi:ncc.DiaChi||'', GhiChu:'' }); setShowNccForm(true); }}
                                    className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded hover:bg-blue-50">Sửa</button>
                                  <button onClick={() => deleteNcc(ncc.MaNCC)}
                                    className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50">Ngừng</button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Sidebar phải ─────────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 space-y-4">

          {/* Cảnh báo tồn kho */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
              Cảnh báo tồn kho
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.length === 0
                ? <p className="text-xs text-gray-400 text-center py-4">Tất cả sản phẩm đều còn hàng</p>
                : alerts.map(p => (
                  <div key={p.MaSanPham} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                    {p.HinhAnh
                      ? <img src={`${IMG}${p.HinhAnh}`} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0"
                          onError={e=>(e.currentTarget.style.display='none')} />
                      : <div className="w-8 h-8 bg-gray-200 rounded flex-shrink-0"></div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{p.TenSanPham}</p>
                      <p className="text-xs text-gray-500">Tồn: {p.SoLuong}</p>
                    </div>
                    <StatusBadge status={p.TrangThaiKho} />
                  </div>
                ))
              }
            </div>
            {alerts.length > 0 && (
              <button onClick={() => { setTab('tonkho'); setFilterStatus('sap_het'); }}
                className="w-full mt-3 text-xs text-pink-600 font-medium hover:text-pink-800">
                Xem tất cả →
              </button>
            )}
          </div>

          {/* Hoạt động gần đây */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              Hoạt động gần đây
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {activity.length === 0
                ? <p className="text-xs text-gray-400 text-center py-4">Chưa có hoạt động nào</p>
                : activity.map(a => (
                  <div key={a.MaGiaoDich} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${a.LoaiGiaoDich==='IMPORT'?'bg-green-100 text-green-600':'bg-orange-100 text-orange-600'}`}>
                      {a.LoaiGiaoDich==='IMPORT'?'↓':'↑'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{a.GhiChu||a.LoaiGiaoDich}</p>
                      <p className="text-xs text-gray-400">{fmtDateTime(a.NgayGiaoDich)}</p>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modal chi tiết sản phẩm ───────────────────────────────────────── */}
      {showDetail && detailProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="font-bold text-gray-800 text-lg">📦 Chi tiết sản phẩm</h2>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-light">×</button>
            </div>
            <div className="p-5">
              <div className="flex gap-5 mb-5">
                {detailProduct.HinhAnh
                  ? <img src={`${IMG}${detailProduct.HinhAnh}`} alt="" className="w-32 h-32 object-cover rounded-xl border flex-shrink-0" />
                  : <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300 flex-shrink-0">No img</div>
                }
                <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Tên sản phẩm', detailProduct.TenSanPham],
                    ['Danh mục', detailProduct.TenDanhMuc||'-'],
                    ['Thương hiệu', detailProduct.ThuongHieu||'-'],
                    ['Giá nhập', formatCurrency(detailProduct.GiaNhap)],
                    ['Giá bán', formatCurrency(detailProduct.GiaBan)],
                    ['Tồn kho', <span className="font-bold text-pink-600">{detailProduct.SoLuong}</span>],
                  ].map(([label, val]) => (
                    <div key={String(label)}>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="font-medium text-gray-800">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lịch sử nhập xuất */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-sm">Lịch sử nhập xuất</h3>
                {(!detailProduct.lichSu || detailProduct.lichSu.length === 0)
                  ? <p className="text-xs text-gray-400 py-4 text-center">Chưa có lịch sử giao dịch</p>
                  : <div className="overflow-x-auto">
                      <table className="min-w-full text-xs divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Ngày</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Loại</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-500">Số lượng</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-500">Trước</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-500">Sau</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {detailProduct.lichSu.map((gd: GiaoDich) => (
                            <tr key={gd.MaGiaoDich} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-500">{fmtDateTime(gd.NgayGiaoDich)}</td>
                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${gd.LoaiGiaoDich==='IMPORT'?'bg-green-100 text-green-700':'bg-orange-100 text-orange-700'}`}>
                                  {gd.LoaiGiaoDich==='IMPORT'?'Nhập':'Xuất'}
                                </span>
                              </td>
                              <td className={`px-3 py-2 text-right font-bold ${gd.SoLuong>0?'text-green-600':'text-orange-600'}`}>
                                {gd.SoLuong>0?'+':''}{gd.SoLuong}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-500">{gd.SoLuongTruoc}</td>
                              <td className="px-3 py-2 text-right text-gray-800 font-medium">{gd.SoLuongSau}</td>
                              <td className="px-3 py-2 text-gray-500 truncate max-w-32">{gd.GhiChu||'-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
