import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ReturnRequest {
  MaHoanDoiTra: number;
  MaHoaDon: number;
  TenKhachHang: string;
  SoDienThoai: string;
  LoaiYeuCau: string;
  LyDo: string;
  TrangThai: string;
  NgayYeuCau: string;
  SoSanPham: number;
  SoTienHoan: number;
  TenNguoiXuLy: string;
}

interface Invoice {
  MaHoaDon: number;
  TenKhachHang: string;
  MaKhachHang: number;
}

interface InvoiceProduct {
  MaSanPham: number;
  TenSanPham: string;
  SoLuong: number;
  DonGia: number;
}

export default function Returns() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceProducts, setInvoiceProducts] = useState<InvoiceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    MaHoaDon: '',
    MaKhachHang: '',
    LoaiYeuCau: 'Trả hàng',
    LyDo: '',
    MoTaChiTiet: '',
    ChiTiet: [] as Array<{ MaSanPham: number; SoLuong: number; TrangThaiSanPham: string }>
  });
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    MaSanPham: number;
    TenSanPham: string;
    SoLuong: number;
    MaxSoLuong: number;
    TrangThaiSanPham: string;
  }>>([]);

  const fetchReturns = async (page: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = `http://localhost:3000/api/hoandoitra?page=${page}&limit=10`;
      
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (typeFilter) url += `&type=${encodeURIComponent(typeFilter)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setReturns(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setCurrentPage(page);
    } catch (error) {
      console.error('Lỗi tải danh sách hoàn/đổi trả:', error);
      alert('Không thể tải danh sách hoàn/đổi trả');
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

  const fetchInvoiceProducts = async (invoiceId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/hoandoitra/invoice/${invoiceId}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoiceProducts(response.data.data);
    } catch (error) {
      console.error('Lỗi tải sản phẩm:', error);
      alert('Không thể tải sản phẩm từ hóa đơn');
    }
  };

  const handleSearch = () => {
    fetchReturns(1);
  };

  const handleOpenModal = () => {
    setFormData({
      MaHoaDon: '',
      MaKhachHang: '',
      LoaiYeuCau: 'Trả hàng',
      LyDo: '',
      MoTaChiTiet: '',
      ChiTiet: []
    });
    setSelectedProducts([]);
    setInvoiceProducts([]);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleInvoiceChange = async (maHoaDon: string) => {
    const invoice = invoices.find(inv => inv.MaHoaDon === Number(maHoaDon));
    if (invoice) {
      setFormData(prev => ({
        ...prev,
        MaHoaDon: maHoaDon,
        MaKhachHang: invoice.MaKhachHang.toString()
      }));
      await fetchInvoiceProducts(Number(maHoaDon));
      setSelectedProducts([]);
    }
  };

  const handleAddProduct = () => {
    if (invoiceProducts.length === 0) {
      alert('Vui lòng chọn hóa đơn trước');
      return;
    }
    
    setSelectedProducts([...selectedProducts, {
      MaSanPham: 0,
      TenSanPham: '',
      SoLuong: 1,
      MaxSoLuong: 0,
      TrangThaiSanPham: ''
    }]);
  };

  const handleProductChange = (index: number, field: string, value: any) => {
    const newProducts = [...selectedProducts];
    
    if (field === 'MaSanPham') {
      const product = invoiceProducts.find(p => p.MaSanPham === Number(value));
      if (product) {
        newProducts[index] = {
          ...newProducts[index],
          MaSanPham: product.MaSanPham,
          TenSanPham: product.TenSanPham,
          MaxSoLuong: product.SoLuong,
          SoLuong: 1
        };
      }
    } else {
      newProducts[index] = { ...newProducts[index], [field]: value };
    }
    
    setSelectedProducts(newProducts);
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedProducts.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }
    
    // Validate products
    for (const product of selectedProducts) {
      if (!product.MaSanPham) {
        alert('Vui lòng chọn sản phẩm');
        return;
      }
      if (product.SoLuong <= 0 || product.SoLuong > product.MaxSoLuong) {
        alert(`Số lượng ${product.TenSanPham} không hợp lệ (tối đa: ${product.MaxSoLuong})`);
        return;
      }
    }
    
    try {
      const token = localStorage.getItem('token');
      const data = {
        MaHoaDon: Number(formData.MaHoaDon),
        MaKhachHang: Number(formData.MaKhachHang),
        LoaiYeuCau: formData.LoaiYeuCau,
        LyDo: formData.LyDo,
        MoTaChiTiet: formData.MoTaChiTiet,
        ChiTiet: selectedProducts.map(p => ({
          MaSanPham: p.MaSanPham,
          SoLuong: p.SoLuong,
          TrangThaiSanPham: p.TrangThaiSanPham
        }))
      };
      
      await axios.post('http://localhost:3000/api/hoandoitra', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Tạo yêu cầu hoàn/đổi trả thành công');
      handleCloseModal();
      fetchReturns(currentPage);
    } catch (error: any) {
      console.error('Lỗi tạo yêu cầu:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn duyệt yêu cầu này?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      await axios.put(`http://localhost:3000/api/hoandoitra/${id}/approve`, {
        NguoiXuLy: user.MaNhanVien || null,
        GhiChuNguoiXuLy: 'Đã duyệt yêu cầu'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Duyệt yêu cầu thành công');
      fetchReturns(currentPage);
    } catch (error: any) {
      console.error('Lỗi duyệt yêu cầu:', error);
      alert(error.response?.data?.message || 'Không thể duyệt yêu cầu');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Nhập lý do từ chối:');
    if (!reason) return;
    
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      await axios.put(`http://localhost:3000/api/hoandoitra/${id}/reject`, {
        NguoiXuLy: user.MaNhanVien || null,
        GhiChuNguoiXuLy: reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Từ chối yêu cầu thành công');
      fetchReturns(currentPage);
    } catch (error: any) {
      console.error('Lỗi từ chối yêu cầu:', error);
      alert(error.response?.data?.message || 'Không thể từ chối yêu cầu');
    }
  };

  const handleComplete = async (id: number) => {
    if (!confirm('Xác nhận hoàn tất xử lý? Tồn kho sẽ được cập nhật.')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3000/api/hoandoitra/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Hoàn tất xử lý thành công. Tồn kho đã được cập nhật.');
      fetchReturns(currentPage);
    } catch (error: any) {
      console.error('Lỗi hoàn tất yêu cầu:', error);
      alert(error.response?.data?.message || 'Không thể hoàn tất yêu cầu');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa yêu cầu này?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/hoandoitra/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Xóa yêu cầu thành công');
      fetchReturns(currentPage);
    } catch (error: any) {
      console.error('Lỗi xóa:', error);
      alert(error.response?.data?.message || 'Không thể xóa yêu cầu');
    }
  };

  const handleViewDetail = (id: number) => {
    navigate(`/returns/${id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hoàn tất':
        return 'bg-green-100 text-green-800';
      case 'Đã duyệt':
        return 'bg-blue-100 text-blue-800';
      case 'Đang xử lý':
        return 'bg-yellow-100 text-yellow-800';
      case 'Chờ xử lý':
        return 'bg-orange-100 text-orange-800';
      case 'Từ chối':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'Trả hàng' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700';
  };

  useEffect(() => {
    fetchReturns(1);
    fetchInvoices();
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý hoàn/đổi trả</h1>
        <p className="text-gray-600 mt-1">Xử lý các yêu cầu hoàn trả và đổi hàng</p>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Tìm mã hóa đơn, khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="">Tất cả loại</option>
            <option value="Trả hàng">Trả hàng</option>
            <option value="Đổi hàng">Đổi hàng</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Chờ xử lý">Chờ xử lý</option>
            <option value="Đã duyệt">Đã duyệt</option>
            <option value="Đang xử lý">Đang xử lý</option>
            <option value="Hoàn tất">Hoàn tất</option>
            <option value="Từ chối">Từ chối</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors"
            >
              Tìm kiếm
            </button>
            <button
              onClick={handleOpenModal}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lý do</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày yêu cầu</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Số SP</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center">Đang tải...</td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                    Không có yêu cầu hoàn/đổi trả
                  </td>
                </tr>
              ) : (
                returns.map((returnReq, index) => (
                  <tr key={returnReq.MaHoanDoiTra} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{(currentPage - 1) * 10 + index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-pink-600">
                      #{returnReq.MaHoaDon}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>
                        <div className="font-medium">{returnReq.TenKhachHang}</div>
                        <div className="text-gray-500 text-xs">{returnReq.SoDienThoai}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(returnReq.LoaiYeuCau)}`}>
                        {returnReq.LoaiYeuCau}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate" title={returnReq.LyDo}>
                      {returnReq.LyDo || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(returnReq.NgayYeuCau).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">{returnReq.SoSanPham}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-pink-600">
                      {returnReq.SoTienHoan?.toLocaleString('vi-VN') || 0} đ
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(returnReq.TrangThai)}`}>
                        {returnReq.TrangThai}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleViewDetail(returnReq.MaHoanDoiTra)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Xem chi tiết"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        
                        {returnReq.TrangThai === 'Chờ xử lý' && (
                          <>
                            <button
                              onClick={() => handleApprove(returnReq.MaHoanDoiTra)}
                              className="text-green-600 hover:text-green-800"
                              title="Duyệt"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleReject(returnReq.MaHoanDoiTra)}
                              className="text-red-600 hover:text-red-800"
                              title="Từ chối"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}
                        
                        {returnReq.TrangThai === 'Đã duyệt' && (
                          <button
                            onClick={() => handleComplete(returnReq.MaHoanDoiTra)}
                            className="text-purple-600 hover:text-purple-800"
                            title="Hoàn tất"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        
                        {returnReq.TrangThai === 'Chờ xử lý' && (
                          <button
                            onClick={() => handleDelete(returnReq.MaHoanDoiTra)}
                            className="text-gray-600 hover:text-gray-800"
                            title="Xóa"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
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
                onClick={() => fetchReturns(page)}
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
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Thêm yêu cầu hoàn/đổi trả</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hóa đơn <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.MaHoaDon}
                      onChange={(e) => handleInvoiceChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      required
                    >
                      <option value="">-- Chọn hóa đơn --</option>
                      {invoices.map(inv => (
                        <option key={inv.MaHoaDon} value={inv.MaHoaDon}>
                          HD #{inv.MaHoaDon} - {inv.TenKhachHang}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại yêu cầu <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.LoaiYeuCau}
                      onChange={(e) => setFormData({ ...formData, LoaiYeuCau: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      required
                    >
                      <option value="Trả hàng">Trả hàng</option>
                      <option value="Đổi hàng">Đổi hàng</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lý do <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.LyDo}
                    onChange={(e) => setFormData({ ...formData, LyDo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    required
                  >
                    <option value="">-- Chọn lý do --</option>
                    <option value="Sản phẩm bị lỗi">Sản phẩm bị lỗi</option>
                    <option value="Sản phẩm bị hư hỏng">Sản phẩm bị hư hỏng</option>
                    <option value="Giao sai sản phẩm">Giao sai sản phẩm</option>
                    <option value="Không đúng mô tả">Không đúng mô tả</option>
                    <option value="Không phù hợp">Không phù hợp</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả chi tiết
                  </label>
                  <textarea
                    value={formData.MoTaChiTiet}
                    onChange={(e) => setFormData({ ...formData, MoTaChiTiet: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={2}
                    placeholder="Mô tả chi tiết vấn đề..."
                  />
                </div>

                {/* Products Selection */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Sản phẩm <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddProduct}
                      className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      disabled={!formData.MaHoaDon}
                    >
                      + Thêm sản phẩm
                    </button>
                  </div>

                  <div className="space-y-2">
                    {selectedProducts.map((product, index) => (
                      <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <select
                            value={product.MaSanPham}
                            onChange={(e) => handleProductChange(index, 'MaSanPham', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            required
                          >
                            <option value="">Chọn SP</option>
                            {invoiceProducts.map(p => (
                              <option key={p.MaSanPham} value={p.MaSanPham}>
                                {p.TenSanPham} (Max: {p.SoLuong})
                              </option>
                            ))}
                          </select>
                          
                          <input
                            type="number"
                            value={product.SoLuong}
                            onChange={(e) => handleProductChange(index, 'SoLuong', Number(e.target.value))}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            min="1"
                            max={product.MaxSoLuong}
                            placeholder="Số lượng"
                            required
                          />
                          
                          <input
                            type="text"
                            value={product.TrangThaiSanPham}
                            onChange={(e) => handleProductChange(index, 'TrangThaiSanPham', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Trạng thái SP"
                          />
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    
                    {selectedProducts.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Chưa có sản phẩm nào. Nhấn "Thêm sản phẩm" để thêm.
                      </p>
                    )}
                  </div>
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
                    Gửi yêu cầu
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
