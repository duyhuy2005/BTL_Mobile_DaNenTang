import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const API = 'http://localhost:3000/api';
const IMG = 'http://localhost:3000';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);

const COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#84cc16'];

const PERIOD_OPTIONS = [
  { label: '7 ngày', value: '7' },
  { label: '30 ngày', value: '30' },
  { label: '90 ngày', value: '90' },
];

export default function BaoCao() {
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [tongQuan, setTongQuan] = useState<any>(null);
  const [doanhThu, setDoanhThu] = useState<any[]>([]);
  const [topSanPham, setTopSanPham] = useState<any[]>([]);
  const [donHangTrangThai, setDonHangTrangThai] = useState<any[]>([]);
  const [doanhThuDanhMuc, setDoanhThuDanhMuc] = useState<any[]>([]);
  const [topKhachHang, setTopKhachHang] = useState<any[]>([]);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3, r4, r5, r6] = await Promise.all([
        axios.get(`${API}/baocao/tong-quan`, { headers }),
        axios.get(`${API}/baocao/doanh-thu`, { headers, params: { period } }),
        axios.get(`${API}/baocao/san-pham-ban-chay`, { headers, params: { limit: 10 } }),
        axios.get(`${API}/baocao/don-hang-trang-thai`, { headers }),
        axios.get(`${API}/baocao/doanh-thu-danh-muc`, { headers }),
        axios.get(`${API}/baocao/khach-hang-top`, { headers, params: { limit: 5 } }),
      ]);
      setTongQuan(r1.data.data);
      setDoanhThu(r2.data.data || []);
      setTopSanPham(r3.data.data || []);
      setDonHangTrangThai(r4.data.data || []);
      setDoanhThuDanhMuc(r5.data.data || []);
      setTopKhachHang(r6.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [period]);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
    </div>
  );

  const statCards = [
    { label: 'Tổng doanh thu', value: formatCurrency(tongQuan?.tongDoanhThu), icon: '💰', color: 'from-pink-500 to-rose-500' },
    { label: 'Tổng đơn hàng', value: tongQuan?.tongDonHang, icon: '📦', color: 'from-purple-500 to-indigo-500' },
    { label: 'Đơn hoàn thành', value: tongQuan?.donHoanThanh, icon: '✅', color: 'from-green-500 to-emerald-500' },
    { label: 'Tổng khách hàng', value: tongQuan?.tongKhachHang, icon: '👥', color: 'from-blue-500 to-cyan-500' },
    { label: 'Tổng sản phẩm', value: tongQuan?.tongSanPham, icon: '🛍️', color: 'from-orange-500 to-amber-500' },
    { label: 'SP hết hàng', value: tongQuan?.sanPhamHetHang, icon: '⚠️', color: 'from-red-500 to-pink-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📈 Báo cáo - Thống kê</h1>
          <p className="text-sm text-gray-500 mt-1">Doanh thu, đơn hàng, sản phẩm bán chạy</p>
        </div>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setPeriod(o.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === o.value
                  ? 'bg-teal-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white rounded-xl shadow p-4">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${s.color} flex items-center justify-center text-lg mb-3`}>
              {s.icon}
            </div>
            <div className="text-lg font-bold text-gray-800 leading-tight">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Doanh thu theo ngay */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">📊 Doanh thu {period} ngày gần đây</h2>
        {doanhThu.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Chưa có dữ liệu doanh thu</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={doanhThu}>
              <defs>
                <linearGradient id="colorDT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="nhanNgay" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}tr`} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={(l) => `Ngày ${l}`} />
              <Area type="monotone" dataKey="doanhThu" stroke="#ec4899" strokeWidth={2}
                fill="url(#colorDT)" name="Doanh thu" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trang thai don hang */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">🥧 Trạng thái đơn hàng</h2>
          {donHangTrangThai.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Chưa có dữ liệu</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={donHangTrangThai} dataKey="SoDon" nameKey="TrangThai"
                    cx="50%" cy="50%" outerRadius={80} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {donHangTrangThai.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `${v} đơn`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {donHangTrangThai.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <span className="text-gray-600">{d.TrangThai}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{d.SoDon} đơn</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Doanh thu theo danh muc */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📂 Doanh thu theo danh mục</h2>
          {doanhThuDanhMuc.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={doanhThuDanhMuc.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}tr`} />
                <YAxis dataKey="TenDanhMuc" type="category" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="DoanhThu" name="Doanh thu" radius={[0, 4, 4, 0]}>
                  {doanhThuDanhMuc.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top san pham ban chay */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">🏆 Top 10 sản phẩm bán chạy</h2>
        {topSanPham.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Chưa có dữ liệu</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hạng</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giá bán</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số lượng bán</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topSanPham.map((sp, i) => (
                  <tr key={sp.MaSanPham} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
                        ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {sp.HinhAnh ? (
                          <img src={`${IMG}${sp.HinhAnh}`} alt={sp.TenSanPham}
                            className="w-9 h-9 object-cover rounded-lg border"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-9 h-9 bg-gray-100 rounded-lg"></div>
                        )}
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{sp.TenSanPham}</div>
                          {sp.TenDanhMuc && <div className="text-xs text-gray-400">{sp.TenDanhMuc}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{formatCurrency(sp.GiaBan)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-gray-800">{sp.SoLuongBan}</span>
                      <span className="text-xs text-gray-400 ml-1">sp</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-pink-600">{formatCurrency(sp.DoanhThu)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top khach hang */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">⭐ Top khách hàng chi tiêu nhiều nhất</h2>
        {topKhachHang.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Chưa có dữ liệu</div>
        ) : (
          <div className="space-y-3">
            {topKhachHang.map((kh, i) => (
              <div key={kh.MaKhachHang} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                  ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {i + 1}
                </span>
                <div className="w-9 h-9 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-pink-600 font-bold text-sm">{kh.HoTen?.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm truncate">{kh.HoTen}</div>
                  <div className="text-xs text-gray-400">{kh.SoDienThoai}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-pink-600 text-sm">{formatCurrency(kh.TongChiTieu)}</div>
                  <div className="text-xs text-gray-400">{kh.SoDonHang} đơn</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
