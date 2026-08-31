import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { dashboardAPI } from '../services/api';
import { formatCurrency } from '../utils/format';

export default function Dashboard() {
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

      setStats(statsRes.data.data);
      setTopProducts(topRes.data.data);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Trang chủ</h1>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span></span>
          <span></span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
              <span className="text-blue-600 text-xl">📊</span>
            </div>
            <div>
              <div className="text-xs text-gray-600">Tổng doanh thu</div>
              <div className="text-lg font-bold text-gray-900">{formatCurrency(stats?.totalRevenue || 0)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 rounded flex items-center justify-center">
              <span className="text-pink-600 text-xl">🧾</span>
            </div>
            <div>
              <div className="text-xs text-gray-600">Tổng hóa đơn</div>
              <div className="text-lg font-bold text-gray-900">{stats?.totalInvoices || 0}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded flex items-center justify-center">
              <span className="text-orange-600 text-xl">💄</span>
            </div>
            <div>
              <div className="text-xs text-gray-600">Tổng sản phẩm</div>
              <div className="text-lg font-bold text-gray-900">{stats?.totalProducts || 0}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center">
              <span className="text-green-600 text-xl">👥</span>
            </div>
            <div>
              <div className="text-xs text-gray-600">Khách hàng</div>
              <div className="text-lg font-bold text-gray-900">{stats?.totalCustomers || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart - 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Doanh thu 7 ngày qua</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats?.revenueLast7Days || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="ngay" 
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <Line 
                type="monotone" 
                dataKey="doanhThu" 
                stroke="#ec4899" 
                strokeWidth={2}
                dot={{ fill: '#ec4899', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products - 1 col */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sản phẩm bán chạy</h2>
          <div className="space-y-3">
            {topProducts.map((product, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="text-gray-500 font-medium text-sm min-w-[20px]">{idx + 1}.</div>
                <div className="flex-1">
                  <div className="text-sm text-gray-900">{product.TenSanPham}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
