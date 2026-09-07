import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface ReturnDetail {
  MaHoanDoiTra: number;
  MaHoaDon: number;
  MaKhachHang: number;
  TenKhachHang: string;
  SoDienThoai: string;
  DiaChi: string;
  LoaiYeuCau: string;
  LyDo: string;
  MoTaChiTiet: string;
  TrangThai: string;
  NgayYeuCau: string;
  NgayXuLy: string;
  TenNguoiXuLy: string;
  GhiChuNguoiXuLy: string;
  SoTienHoan: number;
  NgayLap: string;
  chiTiet: Array<{
    MaSanPham: number;
    TenSanPham: string;
    SoLuong: number;
    SoLuongTonKho: number;
    DonGia: number;
    ThanhTien: number;
    TrangThaiSanPham: string;
  }>;
}

export default function ReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [returnDetail, setReturnDetail] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReturnDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/hoandoitra/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReturnDetail(response.data.data);
    } catch (error) {
      console.error('Lỗi tải chi tiết yêu cầu:', error);
      alert('Không thể tải thông tin yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
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
      fetchReturnDetail();
    } catch (error: any) {
      console.error('Lỗi duyệt yêu cầu:', error);
      alert(error.response?.data?.message || 'Không thể duyệt yêu cầu');
    }
  };

  const handleReject = async () => {
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
      fetchReturnDetail();
    } catch (error: any) {
      console.error('Lỗi từ chối yêu cầu:', error);
      alert(error.response?.data?.message || 'Không thể từ chối yêu cầu');
    }
  };

  const handleComplete = async () => {
    if (!confirm('Xác nhận hoàn tất xử lý? Tồn kho sẽ được cập nhật tự động.')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3000/api/hoandoitra/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Hoàn tất xử lý thành công. Tồn kho đã được cập nhật.');
      fetchReturnDetail();
    } catch (error: any) {
      console.error('Lỗi hoàn tất yêu cầu:', error);
      alert(error.response?.data?.message || 'Không thể hoàn tất yêu cầu');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hoàn tất':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Đã duyệt':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Đang xử lý':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Chờ xử lý':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Từ chối':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'Trả hàng' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Hoàn tất':
        return '✅';
      case 'Đã duyệt':
        return '👍';
      case 'Đang xử lý':
        return '⏳';
      case 'Chờ xử lý':
        return '📝';
      case 'Từ chối':
        return '❌';
      default:
        return '❓';
    }
  };

  useEffect(() => {
    fetchReturnDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Đang tải...</div>
        </div>
      </div>
    );
  }

  if (!returnDetail) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">Không tìm thấy yêu cầu hoàn/đổi trả</p>
          <button
            onClick={() => navigate('/returns')}
            className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/returns')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Quay lại danh sách
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Chi tiết yêu cầu hoàn/đổi trả</h1>
            <p className="text-gray-600 mt-1">Mã yêu cầu: #{returnDetail.MaHoanDoiTra}</p>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            {returnDetail.TrangThai === 'Chờ xử lý' && (
              <>
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Duyệt
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Từ chối
                </button>
              </>
            )}
            
            {returnDetail.TrangThai === 'Đã duyệt' && (
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Hoàn tất
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-6">Trạng thái xử lý</h2>
        
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200" style={{ left: '2rem', right: '2rem' }} />
          
          {/* Status steps */}
          <div className="relative flex justify-between">
            {/* Chờ xử lý */}
            <div className="flex flex-col items-center" style={{ width: '25%' }}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-4 ${
                ['Chờ xử lý', 'Đã duyệt', 'Đang xử lý', 'Hoàn tất'].includes(returnDetail.TrangThai)
                  ? 'bg-green-500 border-green-500'
                  : 'bg-white border-gray-300'
              } shadow-lg mb-3`}>
                {['Chờ xử lý', 'Đã duyệt', 'Đang xử lý', 'Hoàn tất'].includes(returnDetail.TrangThai) ? '✓' : '📝'}
              </div>
              <p className={`text-sm font-medium text-center ${
                ['Chờ xử lý', 'Đã duyệt', 'Đang xử lý', 'Hoàn tất'].includes(returnDetail.TrangThai) ? 'text-green-600' : 'text-gray-500'
              }`}>
                Chờ xử lý
              </p>
              {returnDetail.TrangThai === 'Chờ xử lý' && (
                <span className="mt-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                  Hiện tại
                </span>
              )}
            </div>

            {/* Đã duyệt / Từ chối */}
            <div className="flex flex-col items-center" style={{ width: '25%' }}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-4 ${
                returnDetail.TrangThai === 'Từ chối'
                  ? 'bg-red-500 border-red-500'
                  : ['Đã duyệt', 'Đang xử lý', 'Hoàn tất'].includes(returnDetail.TrangThai)
                  ? 'bg-green-500 border-green-500'
                  : 'bg-white border-gray-300'
              } shadow-lg mb-3`}>
                {returnDetail.TrangThai === 'Từ chối' ? '❌' : 
                 ['Đã duyệt', 'Đang xử lý', 'Hoàn tất'].includes(returnDetail.TrangThai) ? '✓' : '👍'}
              </div>
              <p className={`text-sm font-medium text-center ${
                returnDetail.TrangThai === 'Từ chối' ? 'text-red-600' :
                ['Đã duyệt', 'Đang xử lý', 'Hoàn tất'].includes(returnDetail.TrangThai) ? 'text-green-600' : 'text-gray-500'
              }`}>
                {returnDetail.TrangThai === 'Từ chối' ? 'Từ chối' : 'Đã duyệt'}
              </p>
              {(returnDetail.TrangThai === 'Đã duyệt' || returnDetail.TrangThai === 'Từ chối') && (
                <span className={`mt-1 px-2 py-1 text-xs rounded-full ${
                  returnDetail.TrangThai === 'Từ chối' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  Hiện tại
                </span>
              )}
            </div>

            {/* Đang xử lý */}
            <div className="flex flex-col items-center" style={{ width: '25%' }}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-4 ${
                ['Đang xử lý', 'Hoàn tất'].includes(returnDetail.TrangThai)
                  ? 'bg-green-500 border-green-500'
                  : 'bg-white border-gray-300'
              } shadow-lg mb-3`}>
                {['Đang xử lý', 'Hoàn tất'].includes(returnDetail.TrangThai) ? '✓' : '⏳'}
              </div>
              <p className={`text-sm font-medium text-center ${
                ['Đang xử lý', 'Hoàn tất'].includes(returnDetail.TrangThai) ? 'text-green-600' : 'text-gray-500'
              }`}>
                Đang xử lý
              </p>
              {returnDetail.TrangThai === 'Đang xử lý' && (
                <span className="mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  Hiện tại
                </span>
              )}
            </div>

            {/* Hoàn tất */}
            <div className="flex flex-col items-center" style={{ width: '25%' }}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-4 ${
                returnDetail.TrangThai === 'Hoàn tất'
                  ? 'bg-green-500 border-green-500'
                  : 'bg-white border-gray-300'
              } shadow-lg mb-3`}>
                {returnDetail.TrangThai === 'Hoàn tất' ? '✓' : '✅'}
              </div>
              <p className={`text-sm font-medium text-center ${
                returnDetail.TrangThai === 'Hoàn tất' ? 'text-green-600' : 'text-gray-500'
              }`}>
                Hoàn tất
              </p>
              {returnDetail.TrangThai === 'Hoàn tất' && (
                <span className="mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Hiện tại
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Thông tin yêu cầu
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Hóa đơn:</span>
              <button
                onClick={() => navigate(`/invoices/${returnDetail.MaHoaDon}`)}
                className="text-pink-600 hover:text-pink-800 font-medium"
              >
                #{returnDetail.MaHoaDon}
              </button>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Loại yêu cầu:</span>
              <span className={`px-3 py-1 rounded-full text-sm border ${getTypeColor(returnDetail.LoaiYeuCau)}`}>
                {returnDetail.LoaiYeuCau}
              </span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Trạng thái:</span>
              <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(returnDetail.TrangThai)}`}>
                {getStatusIcon(returnDetail.TrangThai)} {returnDetail.TrangThai}
              </span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Ngày yêu cầu:</span>
              <span className="font-medium">
                {new Date(returnDetail.NgayYeuCau).toLocaleString('vi-VN')}
              </span>
            </div>
            
            {returnDetail.NgayXuLy && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Ngày xử lý:</span>
                <span className="font-medium">
                  {new Date(returnDetail.NgayXuLy).toLocaleString('vi-VN')}
                </span>
              </div>
            )}
            
            <div className="py-2 border-b border-gray-100">
              <span className="text-gray-600 block mb-1">Lý do:</span>
              <span className="font-medium">{returnDetail.LyDo}</span>
            </div>
            
            {returnDetail.MoTaChiTiet && (
              <div className="py-2 border-b border-gray-100">
                <span className="text-gray-600 block mb-1">Mô tả chi tiết:</span>
                <p className="text-gray-800 bg-gray-50 p-3 rounded">{returnDetail.MoTaChiTiet}</p>
              </div>
            )}
            
            {returnDetail.TenNguoiXuLy && (
              <div className="py-2 border-b border-gray-100">
                <span className="text-gray-600 block mb-1">Người xử lý:</span>
                <span className="font-medium">{returnDetail.TenNguoiXuLy}</span>
              </div>
            )}
            
            {returnDetail.GhiChuNguoiXuLy && (
              <div className="py-2">
                <span className="text-gray-600 block mb-1">Ghi chú xử lý:</span>
                <p className="text-gray-800 bg-yellow-50 p-3 rounded border border-yellow-200">
                  {returnDetail.GhiChuNguoiXuLy}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Thông tin khách hàng
          </h2>
          
          <div className="space-y-3">
            <div className="py-2 border-b border-gray-100">
              <span className="text-gray-600 block mb-1">Tên khách hàng:</span>
              <span className="font-medium text-lg">{returnDetail.TenKhachHang}</span>
            </div>
            
            <div className="py-2 border-b border-gray-100">
              <span className="text-gray-600 block mb-1">Số điện thoại:</span>
              <span className="font-medium">{returnDetail.SoDienThoai || '-'}</span>
            </div>
            
            <div className="py-2">
              <span className="text-gray-600 block mb-1">Địa chỉ:</span>
              <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded">
                {returnDetail.DiaChi || '-'}
              </p>
            </div>
          </div>

          {/* Financial Info */}
          {returnDetail.LoaiYeuCau === 'Trả hàng' && returnDetail.SoTienHoan > 0 && (
            <div className="mt-6 p-4 bg-pink-50 border border-pink-200 rounded-lg">
              <h3 className="text-sm font-semibold text-pink-800 mb-2">Thông tin hoàn tiền</h3>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Số tiền hoàn:</span>
                <span className="text-2xl font-bold text-pink-600">
                  {returnDetail.SoTienHoan.toLocaleString('vi-VN')} đ
                </span>
              </div>
              {returnDetail.TrangThai === 'Hoàn tất' && (
                <p className="text-xs text-green-600 mt-2">✓ Đã hoàn tiền cho khách hàng</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Sản phẩm {returnDetail.LoaiYeuCau.toLowerCase()}
        </h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Đơn giá</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái SP</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tồn kho</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {returnDetail.chiTiet?.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium">{item.TenSanPham}</td>
                  <td className="px-4 py-3 text-sm text-right">{item.SoLuong}</td>
                  <td className="px-4 py-3 text-sm text-right">{item.DonGia.toLocaleString('vi-VN')} đ</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-pink-600">
                    {item.ThanhTien.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="px-4 py-3 text-sm">{item.TrangThaiSanPham || '-'}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.SoLuongTonKho > 10 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.SoLuongTonKho}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="bg-pink-50 font-bold text-lg">
                <td colSpan={4} className="px-4 py-3 text-right">Tổng số tiền:</td>
                <td colSpan={3} className="px-4 py-3 text-right text-pink-600">
                  {returnDetail.SoTienHoan.toLocaleString('vi-VN')} đ
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Inventory update notice */}
        {returnDetail.TrangThai === 'Hoàn tất' && returnDetail.LoaiYeuCau === 'Trả hàng' && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Tồn kho đã được cập nhật</p>
              <p className="text-xs text-green-600 mt-1">
                Số lượng sản phẩm đã được cộng lại vào kho khi hoàn tất yêu cầu trả hàng.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
