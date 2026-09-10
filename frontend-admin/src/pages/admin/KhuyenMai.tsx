import { useEffect, useState } from 'react';
import axios from 'axios';
import { PencilIcon, TrashIcon, XMarkIcon, TagIcon } from '@heroicons/react/24/outline';

const API = 'http://localhost:3000/api';
const IMG = 'http://localhost:3000';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);

interface Product {
  MaKhuyenMai: number;
  TenSanPham: string;
  GiaBan: number;
  GiaKhuyenMai: number;
  PhanTramGiam: number;
  HinhAnh: string;
  TrangThai: string;
}

interface Stats {
  tongSanPhamKhuyenMai: number;
  giaGiamTrungBinh: number;
  giaGiamCaoNhat: number;
}

export default function KhuyenMai() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [giaKhuyenMai, setGiaKhuyenMai] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resKM, resStats] = await Promise.all([
        axios.get(`${API}/khuyenmai`, { headers, params: { page: pagination.page, limit: pagination.limit, search } }),
        axios.get(`${API}/khuyenmai/stats`, { headers })
      ]);
      setProducts(resKM.data.data || []);
      if (resKM.data.pagination) setPagination(resKM.data.pagination);
      setStats(resStats.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [pagination.page, search]);

  const handleEdit = (p: Product) => {
    setEditing(p);
    setGiaKhuyenMai(p.GiaKhuyenMai?.toString() || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!giaKhuyenMai || Number(giaKhuyenMai) <= 0) {
      alert('Vui lòng nhập giá khuyến mãi hợp lệ');
      return;
    }
    if (Number(giaKhuyenMai) >= editing.GiaBan) {
      alert('Giá khuyến mãi phải nhỏ hơn giá bán!');
      return;
    }
    try {
      await axios.put(`${API}/khuyenmai/${editing.MaKhuyenMai}`, { GiaKhuyenMai: Number(giaKhuyenMai) }, { headers });
      alert('Cập nhật thành công!');
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi cập nhật');
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Xóa khuyến mãi của "${p.TenSanPham}"?`)) return;
    try {
      await axios.delete(`${API}/khuyenmai/${p.MaKhuyenMai}`, { headers });
      alert('Đã xóa khuyến mãi!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi xóa');
    }
  };

  const phanTramGiam = editing
    ? Math.round(((editing.GiaBan - Number(giaKhuyenMai)) / editing.GiaBan) * 100)
    : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-50 to-red-50 rounded-xl p-6 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🎁 Quản lý Khuyến mãi</h1>
          <p className="text-sm text-gray-500 mt-1">Thiết lập giá khuyến mãi cho sản phẩm</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <TagIcon className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{stats?.tongSanPhamKhuyenMai || 0}</div>
            <div className="text-sm text-gray-500">Sản phẩm đang KM</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <span className="text-orange-500 font-bold text-lg">%</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{stats?.giaGiamTrungBinh || 0}%</div>
            <div className="text-sm text-gray-500">Giảm giá trung bình</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
            <span className="text-pink-500 font-bold text-lg">↑</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{stats?.giaGiamCaoNhat || 0}%</div>
            <div className="text-sm text-gray-500">Giảm giá cao nhất</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <input
          type="text"
          placeholder="Tìm kiếm sản phẩm khuyến mãi..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giá gốc</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giá KM</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">% Giảm</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tiết kiệm</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">Không có sản phẩm khuyến mãi</td></tr>
              ) : products.map((p) => (
                <tr key={p.MaKhuyenMai} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.HinhAnh ? (
                        <img src={`${IMG}${p.HinhAnh}`} alt={p.TenSanPham}
                          className="w-10 h-10 object-cover rounded-lg border"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }} />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">N/A</div>
                      )}
                      <span className="font-medium text-gray-800 text-sm">{p.TenSanPham}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500 line-through">{formatCurrency(p.GiaBan)}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-600">{formatCurrency(p.GiaKhuyenMai)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                      -{p.PhanTramGiam}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                    {formatCurrency(p.GiaBan - p.GiaKhuyenMai)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleEdit(p)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t">
            <div className="text-sm text-gray-700">Tổng: <span className="font-medium">{pagination.total}</span> sản phẩm KM</div>
            <div className="flex gap-2">
              <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-100 text-sm">Trước</button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pg => (
                <button key={pg} onClick={() => setPagination(p => ({ ...p, page: pg }))}
                  className={`px-3 py-1 border rounded-md text-sm ${pg === pagination.page ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 hover:bg-gray-100'}`}>
                  {pg}
                </button>
              ))}
              <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-100 text-sm">Sau</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal sửa giá KM */}
      {showModal && editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">✏️ Cập nhật giá khuyến mãi</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-800">{editing.TenSanPham}</div>
                <div className="text-sm text-gray-500 mt-1">Giá gốc: <span className="font-semibold text-gray-700">{formatCurrency(editing.GiaBan)}</span></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giá khuyến mãi <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={giaKhuyenMai}
                  onChange={(e) => setGiaKhuyenMai(e.target.value)}
                  min={1000}
                  max={editing.GiaBan - 1}
                  step={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Nhập giá khuyến mãi..."
                />
              </div>

              {giaKhuyenMai && Number(giaKhuyenMai) > 0 && Number(giaKhuyenMai) < editing.GiaBan && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Giảm:</span>
                    <span className="font-bold text-red-600">-{phanTramGiam}%</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Tiết kiệm:</span>
                    <span className="font-bold text-green-600">{formatCurrency(editing.GiaBan - Number(giaKhuyenMai))}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Hủy
                </button>
                <button onClick={handleSave}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 font-medium">
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
