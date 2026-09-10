import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dashboardAPI } from '../../services/api';
import { formatCurrency } from '../../utils/format';

export default function StaffDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, topRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getTopProducts(5),
      ]);

      const statsData = statsRes.data.data;
      setStats(statsData);
      setTopProducts(topRes.data.data);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Data for Pie Chart - Dựa trên dữ liệu thực
  const orderStatusData = [
    { name: 'Chờ xác nhận', value: stats?.pendingOrders || 0, color: '#FCD34D', percentage: stats?.totalOrders > 0 ? ((stats.pendingOrders / stats.totalOrders) * 100).toFixed(1) + '%' : '0%' },
    { name: 'Đang giao', value: stats?.shippingOrders || 0, color: '#A78BFA', percentage: stats?.totalOrders > 0 ? ((stats.shippingOrders / stats.totalOrders) * 100).toFixed(1) + '%' : '0%' },
    { name: 'Hoàn thành', value: stats?.completedOrders || 0, color: '#34D399', percentage: stats?.totalOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) + '%' : '0%' },
    { name: 'Đã hủy', value: stats?.cancelledOrders || 0, color: '#F87171', percentage: stats?.totalOrders > 0 ? ((stats.cancelledOrders / stats.totalOrders) * 100).toFixed(1) + '%' : '0%' },
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900">Tổng quan</h1>
        <p className="text-sm text-pink-600 mt-1">👁 Chế độ xem - Nhân viên</p>
      </div>

      {/* Stats Cards - Row 1 (6 cards) */}
      <div className="grid grid-cols-6 gap-3 mb-3">
        {/* Tổng doanh thu */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
              <span className="text-pink-600 text-xl">💰</span>
            </div>
            <p className="text-xs text-gray-600">Tổng doanh thu</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-1">{formatCurrency(stats?.totalRevenue || 0)}</p>
          <span className="text-green-600 text-xs font-medium">↑ 12.5%</span>
          <span className="text-xs text-gray-500 ml-1">so với tuần trước</span>
        </div>

        {/* Tổng đơn hàng */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">🛒</span>
            </div>
            <p className="text-xs text-gray-600">Tổng đơn hàng</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-1">{stats?.totalOrders || 0}</p>
          <span className="text-green-600 text-xs font-medium">↑ 8.3%</span>
          <span className="text-xs text-gray-500 ml-1">so với tuần trước</span>
        </div>

        {/* Đơn chờ xác nhận */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 text-xl">⏳</span>
            </div>
            <p className="text-xs text-gray-600">Đơn chờ xác nhận</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-1">{stats?.pendingOrders || 0}</p>
          <span className="text-green-600 text-xs font-medium">↑ 2.0%</span>
          <span className="text-xs text-gray-500 ml-1">so với tuần trước</span>
        </div>

        {/* Đơn đang giao */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">🚚</span>
            </div>
            <p className="text-xs text-gray-600">Đơn đang giao</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-1">{stats?.shippingOrders || 0}</p>
          <span className="text-green-600 text-xs font-medium">↑ 14.3%</span>
          <span className="text-xs text-gray-500 ml-1">so với tuần trước</span>
        </div>

        {/* Đơn hoàn thành */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">✅</span>
            </div>
            <p className="text-xs text-gray-600">Đơn hoàn thành</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-1">{stats?.completedOrders || 0}</p>
          <span className="text-green-600 text-xs font-medium">↑ 10.3%</span>
          <span className="text-xs text-gray-500 ml-1">so với tuần trước</span>
        </div>

        {/* Đơn bị hủy */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 text-xl">❌</span>
            </div>
            <p className="text-xs text-gray-600">Đơn bị hủy</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-1">{stats?.cancelledOrders || 0}</p>
          <span className="text-red-600 text-xs font-medium">↓ 50.0%</span>
          <span className="text-xs text-gray-500 ml-1">so với tuần trước</span>
        </div>
      </div>

      {/* Stats Cards - Row 2 (5 cards) */}
      <div className="grid grid-cols-5 gap-3 mb-3">
        {/* Số khách hàng */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">👥</span>
            </div>
            <p className="text-xs text-gray-600">Số khách hàng</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-1">{stats?.totalCustomers || 0}</p>
          <span className="text-green-600 text-xs font-medium">↑ 5.6%</span>
          <span className="text-xs text-gray-500 ml-1">so với tuần trước</span>
        </div>

        {/* Số sản phẩm */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">📦</span>
            </div>
            <p className="text-xs text-gray-600">Số sản phẩm</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-1">{stats?.totalProducts || 0}</p>
          <span className="text-green-600 text-xs font-medium">↑ 3.2%</span>
          <span className="text-xs text-gray-500 ml-1">so với tuần trước</span>
        </div>

        {/* Sản phẩm sắp hết */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 text-xl">⚠️</span>
            </div>
            <p className="text-xs text-gray-600">Sản phẩm sắp hết</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-1">{stats?.lowStockProducts || 0}</p>
          <span className="text-orange-600 text-xs font-medium">↑ 20.0%</span>
          <span className="text-xs text-gray-500 ml-1">so với tuần trước</span>
        </div>

        {/* Sản phẩm hết hàng */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 text-xl">⏸</span>
            </div>
            <p className="text-xs text-gray-600">Sản phẩm hết hàng</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-1">{stats?.outOfStockProducts || 0}</p>
          <span className="text-red-600 text-xs font-medium">↓ 16.7%</span>
          <span className="text-xs text-gray-500 ml-1">so với tuần trước</span>
        </div>

        {/* Đơn hoàn trả */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
              <span className="text-pink-600 text-xl">↩️</span>
            </div>
            <p className="text-xs text-gray-600">Đơn hoàn trả</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-1">{stats?.returnOrders || 0}</p>
          <span className="text-green-600 text-xs font-medium">↓ 25.0%</span>
          <span className="text-xs text-gray-500 ml-1">so với tuần trước</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Doanh thu theo thời gian */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Doanh thu theo thời gian</h2>
            <div className="flex gap-1">
              <button className="px-2 py-1 text-xs bg-pink-500 text-white rounded font-medium">Ngày</button>
              <button className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded font-medium">Tháng</button>
              <button className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded font-medium">Năm</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats?.revenueLast7Days || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="ngay" 
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
              />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="doanhThu" 
                stroke="#ec4899" 
                strokeWidth={2}
                fill="url(#colorRevenue)"
                dot={{ fill: '#ec4899', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tình trạng đơn hàng - Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Tình trạng đơn hàng</h2>
          </div>
          <div className="flex items-center justify-center mb-3">
            <div className="relative w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-gray-900">{stats?.totalOrders || 0}</p>
                <p className="text-xs text-gray-500">đơn hàng</p>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            {orderStatusData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-900">{item.value}</span>
                  <span className="text-gray-500 text-xs">{item.percentage}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sản phẩm bán chạy */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Sản phẩm bán chạy</h2>
          </div>
          <div className="space-y-2.5">
            {topProducts.slice(0, 5).map((product, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-shrink-0 w-6 h-6 bg-pink-50 rounded flex items-center justify-center">
                  <span className="text-xs font-semibold text-pink-600">{idx + 1}</span>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  {product.HinhAnh ? (
                    <img src={`http://localhost:3000${product.HinhAnh}`} alt={product.TenSanPham} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{product.TenSanPham}</p>
                  <p className="text-xs font-semibold text-pink-600">{formatCurrency(product.GiaBan || 0)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
