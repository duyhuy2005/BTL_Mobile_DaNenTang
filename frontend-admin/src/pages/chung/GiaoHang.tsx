import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Delivery {
  MaGiaoHang: number;
  MaHoaDon: number;
  TenKhachHang: string;
  SoDienThoai: string;
  DiaChiGiaoHang: string;
  DonViVanChuyen: string;
  MaVanDon: string;
  NgayGiao: string;
  PhiVanChuyen: number;
  TrangThai: string;
}

interface Invoice {
  MaHoaDon: number;
  TenKhachHang: string;
  SoDienThoai: string;
  DiaChi: string;
}

export default function Deliveries() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    MaHoaDon: '',
    DiaChiGiaoHang: '',
    SoDienThoai: '',
    DonViVanChuyen: '',
    MaVanDon: '',
    NgayGiao: '',
    PhiVanChuyen: '',
    GhiChu: ''
  });

  const fetchDeliveries = async (page: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = `http://localhost:3000/api/giaohang?page=${page}&limit=10`;
      
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDeliveries(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setCurrentPage(page);
    } catch (error) {
      console.error('Lỗi tải danh sách giao hàng:', error);
      alert('Không thể tải danh sách giao hàng');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/hoadon?page=1&limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data.data);
    } catch (error) {
      console.error('Lỗi tải danh sách hóa đơn:', error);
    }
  };

  const handleSearch = () => {
    fetchDeliveries(1);
  };

  const handleOpenModal = (delivery?: Delivery) => {
    if (delivery) {
      setEditingId(delivery.MaGiaoHang);
      setFormData({
        MaHoaDon: delivery.MaHoaDon.toString(),
        DiaChiGiaoHang: delivery.DiaChiGiaoHang,
        SoDienThoai: delivery.SoDienThoai || '',
        DonViVanChuyen: delivery.DonViVanChuyen || '',
        MaVanDon: delivery.MaVanDon || '',
        NgayGiao: delivery.NgayGiao ? new Date(delivery.NgayGiao).toISOString().split('T')[0] : '',
        PhiVanChuyen: delivery.PhiVanChuyen?.toString() || '0',
        GhiChu: ''
      });
    } else {
      setEditingId(null);
      setFormData({
        MaHoaDon: '',
        DiaChiGiaoHang: '',
        SoDienThoai: '',
        DonViVanChuyen: '',
        MaVanDon: '',
        NgayGiao: '',
        PhiVanChuyen: '0',
        GhiChu: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const data = {
        ...formData,
        MaHoaDon: Number(formData.MaHoaDon),
        PhiVanChuyen: Number(formData.PhiVanChuyen) || 0,
        NgayGiao: formData.NgayGiao || null
      };
      
      if (editingId) {
        await axios.put(`http://localhost:3000/api/giaohang/${editingId}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Cập nhật thông tin giao hàng thành công');
      } else {
        await axios.post('http://localhost:3000/api/giaohang', data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Thêm thông tin giao hàng thành công');
      }
      
      handleCloseModal();
      fetchDeliveries(currentPage);
    } catch (error: any) {
      console.error('Lỗi lưu thông tin:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thông tin giao hàng này?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/giaohang/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Xóa thông tin giao hàng thành công');
      fetchDeliveries(currentPage);
    } catch (error) {
      console.error('Lỗi xóa:', error);
      alert('Không thể xóa thông tin giao hàng');
    }
  };

  const handleViewDetail = (id: number) => {
    navigate(`/deliveries/${id}`);
  };

  const handleInvoiceChange = (maHoaDon: string) => {
    setFormData({ ...formData, MaHoaDon: maHoaDon });
    
    const invoice = invoices.find(inv => inv.MaHoaDon === Number(maHoaDon));
    if (invoice) {
      setFormData(prev => ({
        ...prev,
        MaHoaDon: maHoaDon,
        DiaChiGiaoHang: invoice.DiaChi || '',
        SoDienThoai: invoice.SoDienThoai || ''
      }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đã giao':
        return 'bg-green-100 text-green-800';
      case 'Đang giao':
        return 'bg-blue-100 text-blue-800';
      case 'Chờ giao':
        return 'bg-yellow-100 text-yellow-800';
      case 'Giao thất bại':
        return 'bg-red-100 text-red-800';
      case 'Đã hủy':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchDeliveries(1);
    fetchInvoices();
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý giao hàng</h1>
        <p className="text-gray-600 mt-1">Theo dõi và quản lý thông tin giao hàng</p>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Tìm mã hóa đơn, khách hàng, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Chờ giao">Chờ giao</option>
            <option value="Đang giao">Đang giao</option>
            <option value="Đã giao">Đã giao</option>
            <option value="Giao thất bại">Giao thất bại</option>
            <option value="Đã hủy">Đã hủy</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors"
            >
              Tìm kiếm
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              + Thêm mới
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã HD</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số điện thoại</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Địa chỉ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn vị VC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã vận đơn</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Phí VC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center">Đang tải...</td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                    Không có dữ liệu giao hàng
                  </td>
                </tr>
              ) : (
                deliveries.map((delivery, index) => (
                  <tr key={delivery.MaGiaoHang} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{(currentPage - 1) * 10 + index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-pink-600">
                      #{delivery.MaHoaDon}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{delivery.TenKhachHang || 'Khách lẻ'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{delivery.SoDienThoai || '-'}</td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate" title={delivery.DiaChiGiaoHang}>
                      {delivery.DiaChiGiaoHang}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{delivery.DonViVanChuyen || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{delivery.MaVanDon || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {delivery.PhiVanChuyen?.toLocaleString('vi-VN') || 0} đ
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(delivery.TrangThai)}`}>
                        {delivery.TrangThai}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleViewDetail(delivery.MaGiaoHang)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                        title="Xem chi tiết"
                      >
                        <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleOpenModal(delivery)}
                        className="text-yellow-600 hover:text-yellow-800 mr-2"
                        title="Sửa"
                      >
                        <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(delivery.MaGiaoHang)}
                        className="text-red-600 hover:text-red-800"
                        title="Xóa"
                      >
                        <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 flex justify-center space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => fetchDeliveries(page)}
                className={`px-3 py-1 rounded ${
                  page === currentPage
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingId ? 'Sửa thông tin giao hàng' : 'Thêm thông tin giao hàng'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hóa đơn <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.MaHoaDon}
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    required
                    disabled={!!editingId}
                  >
                    <option value="">-- Chọn hóa đơn --</option>
                    {invoices.map(inv => (
                      <option key={inv.MaHoaDon} value={inv.MaHoaDon}>
                        HD #{inv.MaHoaDon} - {inv.TenKhachHang}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={formData.SoDienThoai}
                      onChange={(e) => setFormData({ ...formData, SoDienThoai: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="0123456789"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày giao
                    </label>
                    <input
                      type="date"
                      value={formData.NgayGiao}
                      onChange={(e) => setFormData({ ...formData, NgayGiao: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Địa chỉ giao hàng <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.DiaChiGiaoHang}
                    onChange={(e) => setFormData({ ...formData, DiaChiGiaoHang: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đơn vị vận chuyển
                    </label>
                    <input
                      type="text"
                      value={formData.DonViVanChuyen}
                      onChange={(e) => setFormData({ ...formData, DonViVanChuyen: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="VD: Giao hàng nhanh, J&T..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã vận đơn
                    </label>
                    <input
                      type="text"
                      value={formData.MaVanDon}
                      onChange={(e) => setFormData({ ...formData, MaVanDon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="VD: GHN123456"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phí vận chuyển (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={formData.PhiVanChuyen}
                    onChange={(e) => setFormData({ ...formData, PhiVanChuyen: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    value={formData.GhiChu}
                    onChange={(e) => setFormData({ ...formData, GhiChu: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                  >
                    {editingId ? 'Cập nhật' : 'Lưu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
