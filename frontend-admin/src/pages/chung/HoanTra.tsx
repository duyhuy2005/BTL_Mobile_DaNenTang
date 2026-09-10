import axios from 'axios';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';

const API = 'http://localhost:3000/api';
const getToken = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ─── helpers ─────────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  'Cho xu ly':    { label: 'Chờ xử lý',        color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  'Chờ xử lý':   { label: 'Chờ xử lý',        color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  'Tiep nhan':    { label: 'Đang tiếp nhận',   color: 'bg-blue-100   text-blue-700   border-blue-200'   },
  'Đang xử lý':  { label: 'Đang tiếp nhận',   color: 'bg-blue-100   text-blue-700   border-blue-200'   },
  'Kiem tra':     { label: 'Đang kiểm tra',    color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  'Cho duyet':    { label: 'Chờ Admin duyệt',  color: 'bg-orange-100 text-orange-700 border-orange-200' },
  'Da duyet':     { label: 'Đã duyệt',         color: 'bg-green-100  text-green-700  border-green-200'  },
  'Đã duyệt':    { label: 'Đã duyệt',         color: 'bg-green-100  text-green-700  border-green-200'  },
  'Tu choi':      { label: 'Từ chối',          color: 'bg-red-100    text-red-700    border-red-200'    },
  'Từ chối':     { label: 'Từ chối',          color: 'bg-red-100    text-red-700    border-red-200'    },
  'Hoan tien':    { label: 'Đã hoàn tiền',     color: 'bg-purple-100 text-purple-700 border-purple-200' },
  'Hoan tat':     { label: 'Hoàn tất',         color: 'bg-gray-100   text-gray-600   border-gray-200'   },
  'Hoàn tất':    { label: 'Hoàn tất',         color: 'bg-gray-100   text-gray-600   border-gray-200'   },
  'Huy':          { label: 'Đã hủy',           color: 'bg-gray-200   text-gray-500   border-gray-300'   },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>
      {s.label}
    </span>
  );
}

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '-';

interface Stats { choXuLy: number; tiepNhan: number; kiemTra: number; choDuyet: number; daDuyet: number; tuChoi: number; hoanTien: number; hoanTat: number; tongYeuCau: number; tongTienHoan: number; }
interface ReturnRow { MaHoanDoiTra: number; MaYeuCau: string; MaHoaDonHienThi: string; TenKhachHang: string; SoDienThoai: string; LoaiYeuCau: string; LyDo: string; TrangThai: string; NgayYeuCau: string; SoTienHoan: number; TenSanPhamDau: string; SoSanPham: number; }

// ══════════════════════════════════════════════════════════════════════════════
export default function HoanTra() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.VaiTro === 'Admin';

  const [stats, setStats]             = useState<Stats | null>(null);
  const [rows, setRows]               = useState<ReturnRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [pagination, setPagination]   = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Đọc filter từ URL query params (từ Dashboard)
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [filterLoai, setFilterLoai]   = useState('');
  const [filterTuNgay, setFilterTuNgay] = useState('');
  const [filterDenNgay, setFilterDenNgay] = useState('');

  // ── load ──────────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/hoandoitra/statistics`, { headers: getToken() });
      setStats(r.data.data);
    } catch {}
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page, limit: pagination.limit };
      if (search)         params.search   = search;
      if (filterStatus)   params.status   = filterStatus;
      if (filterLoai)     params.loai     = filterLoai;
      if (filterTuNgay)   params.tuNgay   = filterTuNgay;
      if (filterDenNgay)  params.denNgay  = filterDenNgay;
      const r = await axios.get(`${API}/hoandoitra`, { headers: getToken(), params });
      setRows(r.data.data || []);
      if (r.data.pagination) setPagination(r.data.pagination);
    } catch {}
    finally { setLoading(false); }
  }, [pagination.page, pagination.limit, search, filterStatus, filterLoai, filterTuNgay, filterDenNgay]);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadRows(); }, [pagination.page, pagination.limit]);

  const handleSearch = () => { setPagination(p => ({ ...p, page: 1 })); loadRows(); };
  const handleReset  = () => {
    setSearch(''); setFilterStatus(''); setFilterLoai('');
    setFilterTuNgay(''); setFilterDenNgay('');
    setPagination(p => ({ ...p, page: 1 }));
    setTimeout(loadRows, 100);
  };

  // Quick action trực tiếp từ bảng
  const handleQuickAction = async (id: number, action: string, body: object) => {
    try {
      await axios.post(`${API}/hoandoitra/${id}/${action}`, body, { headers: getToken() });
      loadRows(); loadStats();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  // ── stat cards ────────────────────────────────────────────────────────────
  const statCards = [
    { label: 'Chờ xử lý',     value: stats?.choXuLy   ?? '-', color: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-400', filter: 'Cho xu ly' },
    { label: 'Đang kiểm tra', value: stats?.kiemTra    ?? '-', color: 'bg-blue-50   border-blue-200',   dot: 'bg-blue-400',   filter: 'Kiem tra'  },
    { label: 'Chờ Admin duyệt',value: stats?.choDuyet  ?? '-', color: 'bg-orange-50 border-orange-200', dot: 'bg-orange-400', filter: 'Cho duyet' },
    { label: 'Đã từ chối',    value: stats?.tuChoi     ?? '-', color: 'bg-red-50    border-red-200',    dot: 'bg-red-400',    filter: 'Tu choi'   },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Quản lý hoàn trả</h1>
            <p className="text-sm text-gray-500 mt-1">Tiếp nhận, kiểm tra và xử lý yêu cầu hoàn trả sản phẩm</p>
          </div>
          <button className="px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium shadow-sm">
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(c => (
          <button key={c.label} onClick={() => { setFilterStatus(c.filter); handleSearch(); }}
            className={`bg-white border ${c.color} rounded-xl p-5 text-left hover:shadow-md transition-shadow`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`}></span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{c.label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{c.value}</p>
          </button>
        ))}
      </div>

      {/* Tổng hoàn tiền */}
      {stats && (
        <div className="bg-white border border-pink-100 rounded-xl p-4 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center text-pink-600 font-bold text-lg">₫</div>
          <div>
            <p className="text-xs text-gray-500">Tổng tiền đã hoàn trả</p>
            <p className="text-xl font-bold text-pink-600">{formatCurrency(stats.tongTienHoan)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-500">Tổng yêu cầu</p>
            <p className="text-xl font-bold text-gray-800">{stats.tongYeuCau}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Tìm mã đơn, khách hàng, sản phẩm..."
            className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
            <option value="">Tất cả trạng thái</option>
            <option value="Cho xu ly">Chờ xử lý</option>
            <option value="Tiep nhan">Đang tiếp nhận</option>
            <option value="Kiem tra">Đang kiểm tra</option>
            <option value="Cho duyet">Chờ Admin duyệt</option>
            <option value="Da duyet">Đã duyệt</option>
            <option value="Tu choi">Từ chối</option>
            <option value="Hoan tien">Đã hoàn tiền</option>
            <option value="Hoan tat">Hoàn tất</option>
          </select>
          <select value={filterLoai} onChange={e => setFilterLoai(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
            <option value="">Tất cả loại</option>
            <option value="Trả hàng">Hoàn trả</option>
            <option value="Đổi hàng">Đổi sản phẩm</option>
          </select>
          <input type="date" value={filterTuNgay} onChange={e => setFilterTuNgay(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          <input type="date" value={filterDenNgay} onChange={e => setFilterDenNgay(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          <button onClick={handleSearch}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600">
            Tìm kiếm
          </button>
          <button onClick={handleReset}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
            Đặt lại
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-10">STT</th>
                <th className="px-4 py-3 text-left   text-xs font-medium text-gray-500 uppercase">Mã yêu cầu</th>
                <th className="px-4 py-3 text-left   text-xs font-medium text-gray-500 uppercase">Mã đơn hàng</th>
                <th className="px-4 py-3 text-left   text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                <th className="px-4 py-3 text-left   text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                <th className="px-4 py-3 text-left   text-xs font-medium text-gray-500 uppercase">Loại</th>
                <th className="px-4 py-3 text-left   text-xs font-medium text-gray-500 uppercase">Lý do</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ngày YC</th>
                <th className="px-4 py-3 text-right  text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={11} className="py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-400">Đang tải...</p>
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={11} className="py-16 text-center">
                  <div className="text-5xl mb-3 opacity-30">📦</div>
                  <p className="text-gray-500 font-medium">Không có yêu cầu hoàn trả</p>
                  <p className="text-gray-400 text-xs mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                </td></tr>
              ) : rows.map((row, idx) => (
                <tr key={row.MaHoanDoiTra} className="hover:bg-pink-50 transition-colors">
                  <td className="px-4 py-3 text-center text-gray-500">{(pagination.page-1)*pagination.limit+idx+1}</td>
                  <td className="px-4 py-3 font-semibold text-pink-600">{row.MaYeuCau}</td>
                  <td className="px-4 py-3 text-blue-600 font-medium">{row.MaHoaDonHienThi}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{row.TenKhachHang}</p>
                    <p className="text-xs text-gray-400">{row.SoDienThoai}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-800 max-w-36 truncate">{row.TenSanPhamDau || '-'}</p>
                    {row.SoSanPham > 1 && <p className="text-xs text-gray-400">+{row.SoSanPham - 1} sản phẩm</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.LoaiYeuCau?.includes('Đổi') || row.LoaiYeuCau?.includes('doi') ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                      {row.LoaiYeuCau?.includes('Đổi') || row.LoaiYeuCau?.includes('doi') ? 'Đổi SP' : 'Hoàn trả'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-32 truncate" title={row.LyDo}>{row.LyDo || '-'}</td>
                  <td className="px-4 py-3 text-center text-gray-500 whitespace-nowrap">{fmtDate(row.NgayYeuCau)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {row.SoTienHoan ? formatCurrency(row.SoTienHoan) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={row.TrangThai} /></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1 flex-wrap">
                      <button onClick={() => navigate(`/returns/${row.MaHoanDoiTra}`)}
                        className="px-3 py-1.5 bg-pink-50 text-pink-600 border border-pink-200 rounded-lg text-xs font-medium hover:bg-pink-100 transition-colors">
                        Chi tiết
                      </button>
                      {/* Quick actions theo trạng thái */}
                      {['Cho xu ly','Chờ xử lý'].includes(row.TrangThai) && (
                        <button onClick={() => handleQuickAction(row.MaHoanDoiTra, 'receive', {})}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                          Tiếp nhận
                        </button>
                      )}
                      {isAdmin && ['Cho duyet','Chờ Admin duyệt'].includes(row.TrangThai) && (
                        <button onClick={() => navigate(`/returns/${row.MaHoanDoiTra}`)}
                          className="px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors">
                          Duyệt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-500">
              Hiển thị {rows.length === 0 ? 0 : (pagination.page-1)*pagination.limit+1}–{Math.min(pagination.page*pagination.limit, pagination.total)} / {pagination.total} yêu cầu
            </p>
            <div className="flex items-center gap-2">
              <button disabled={pagination.page===1} onClick={() => setPagination(p => ({...p, page: p.page-1}))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-white">‹</button>
              {Array.from({length: Math.min(pagination.totalPages, 7)}, (_, i) => i+1).map(pg => (
                <button key={pg} onClick={() => setPagination(p => ({...p, page: pg}))}
                  className={`px-3 py-1.5 border rounded-lg text-sm ${pg===pagination.page ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 hover:bg-white'}`}>
                  {pg}
                </button>
              ))}
              <button disabled={pagination.page===pagination.totalPages} onClick={() => setPagination(p => ({...p, page: p.page+1}))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-white">›</button>
            </div>
            <select value={pagination.limit} onChange={e => setPagination(p => ({...p, limit: +e.target.value, page: 1}))}
              className="border border-gray-300 rounded-lg text-sm px-2 py-1.5 bg-white">
              {[10,20,50,100].map(n => <option key={n} value={n}>{n}/trang</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
