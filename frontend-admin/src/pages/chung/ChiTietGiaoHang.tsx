import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface DeliveryDetail {
  MaGiaoHang: number;
  MaHoaDon: number;
  TenKhachHang: string;
  SoDienThoai: string;
  SoDienThoaiKH: string;
  DiaChi: string;
  DiaChiGiaoHang: string;
  DonViVanChuyen: string;
  MaVanDon: string;
  NgayGiao: string;
  PhiVanChuyen: number;
  TrangThai: string;
  GhiChu: string;
  NgayLap: string;
  TongTien: number;
  chiTiet: Array<{
    TenSanPham: string;
    SoLuong: number;
    DonGia: number;
    ThanhTien: number;
  }>;
}

export default function DeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const fetchDeliveryDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/giaohang/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDelivery(response.data.data);
      setNewStatus(response.data.data.TrangThai);
    } catch (error) {
      console.error('Lỗi tải chi tiết giao hàng:', error);
      alert('Không thể tải thông tin giao hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) {
      alert('Vui lòng chọn trạng thái');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:3000/api/giaohang/${id}/status`,
        { TrangThai: newStatus, GhiChu: statusNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Cập nhật trạng thái thành công');
      setShowStatusModal(false);
      fetchDeliveryDetail();
    } catch (error: any) {
      console.error('Lỗi cập nhật trạng thái:', error);
      alert(error.response?.data?.message || 'Không thể cập nhật trạng thái');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đã giao':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Đang giao':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Chờ giao':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Giao thất bại':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Đã hủy':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTimelineSteps = () => {
    const steps = [
      { status: 'Chờ giao', label: 'Chờ giao', icon: '📦' },
      { status: 'Đang giao', label: 'Đang giao', icon: '🚚' },
      { status: 'Đã giao', label: 'Đã giao', icon: '✅' }
    ];

    const currentStatus = delivery?.TrangThai || '';
    const statusIndex = steps.findIndex(s => s.status === currentStatus);

    return steps.map((step, index) => ({
      ...step,
      completed: index <= statusIndex,
      current: step.status === currentStatus,
      failed: currentStatus === 'Giao thất bại' || currentStatus === 'Đã hủy'
    }));
  };

  useEffect(() => {
    fetchDeliveryDetail();
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

  if (!delivery) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">Không tìm thấy thông tin giao hàng</p>
          <button
            onClick={() => navigate('/deliveries')}
            className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const timelineSteps = getTimelineSteps();
  const isFailed = delivery.TrangThai === 'Giao thất bại' || delivery.TrangThai === 'Đã hủy';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/deliveries')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Quay lại danh sách
        </button>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Chi tiết giao hàng</h1>
            <p className="text-gray-600 mt-1">Mã giao hàng: #{delivery.MaGiaoHang}</p>
          </div>
          <button
            onClick={() => setShowStatusModal(true)}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Cập nhật trạng thái
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-6">Trạng thái giao hàng</h2>
        
        {isFailed ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <span className="text-4xl mb-2 block">❌</span>
            <p className="text-red-800 font-semibold text-lg">{delivery.TrangThai}</p>
            {delivery.GhiChu && (
              <p className="text-red-600 text-sm mt-2">Lý do: {delivery.GhiChu}</p>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200" style={{ left: '2rem', right: '2rem' }} />
            <div 
              className="absolute top-8 left-0 h-1 bg-green-500 transition-all duration-500"
              style={{ 
                left: '2rem',
                width: `calc(${(timelineSteps.filter(s => s.completed).length - 1) * 50}% - 2rem)`
              }}
            />
            
            {/* Steps */}
            <div className="relative flex justify-between">
              {timelineSteps.map((step, index) => (
                <div key={index} className="flex flex-col items-center" style={{ width: '33.33%' }}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-4 ${
                    step.completed 
                      ? 'bg-green-500 border-green-500' 
                      : 'bg-white border-gray-300'
                  } transition-all duration-300 mb-3 shadow-lg`}>
                    {step.completed ? '✓' : step.icon}
                  </div>
                  <p className={`text-sm font-medium text-center ${
                    step.completed ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                  {step.current && (
                    <span className="mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Hiện tại
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Thông tin giao hàng
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Hóa đơn:</span>
              <button
                onClick={() => navigate(`/invoices/${delivery.MaHoaDon}`)}
                className="text-pink-600 hover:text-pink-800 font-medium"
              >
                #{delivery.MaHoaDon}
              </button>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Trạng thái:</span>
              <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(delivery.TrangThai)}`}>
                {delivery.TrangThai}
              </span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Đơn vị vận chuyển:</span>
              <span className="font-medium">{delivery.DonViVanChuyen || '-'}</span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Mã vận đơn:</span>
              <span className="font-mono font-medium">{delivery.MaVanDon || '-'}</span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Ngày giao:</span>
              <span className="font-medium">
                {delivery.NgayGiao ? new Date(delivery.NgayGiao).toLocaleDateString('vi-VN') : '-'}
              </span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Phí vận chuyển:</span>
              <span className="font-semibold text-pink-600">
                {delivery.PhiVanChuyen?.toLocaleString('vi-VN') || 0} đ
              </span>
            </div>
            
            {delivery.GhiChu && (
              <div className="py-2">
                <span className="text-gray-600 block mb-1">Ghi chú:</span>
                <p className="text-gray-800 bg-gray-50 p-2 rounded">{delivery.GhiChu}</p>
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
              <span className="font-medium text-lg">{delivery.TenKhachHang || 'Khách lẻ'}</span>
            </div>
            
            <div className="py-2 border-b border-gray-100">
              <span className="text-gray-600 block mb-1">Số điện thoại:</span>
              <span className="font-medium">{delivery.SoDienThoai || delivery.SoDienThoaiKH || '-'}</span>
            </div>
            
            <div className="py-2">
              <span className="text-gray-600 block mb-1">Địa chỉ giao hàng:</span>
              <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded">
                {delivery.DiaChiGiaoHang}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Items */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Sản phẩm trong đơn hàng
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {delivery.chiTiet?.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm">{item.TenSanPham}</td>
                  <td className="px-4 py-3 text-sm text-right">{item.SoLuong}</td>
                  <td className="px-4 py-3 text-sm text-right">{item.DonGia.toLocaleString('vi-VN')} đ</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-pink-600">
                    {item.ThanhTien.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={4} className="px-4 py-3 text-right">Tổng tiền hàng:</td>
                <td className="px-4 py-3 text-right text-pink-600">
                  {delivery.TongTien?.toLocaleString('vi-VN') || 0} đ
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td colSpan={4} className="px-4 py-3 text-right">Phí vận chuyển:</td>
                <td className="px-4 py-3 text-right">
                  {delivery.PhiVanChuyen?.toLocaleString('vi-VN') || 0} đ
                </td>
              </tr>
              <tr className="bg-pink-50 font-bold text-lg">
                <td colSpan={4} className="px-4 py-3 text-right">Tổng cộng:</td>
                <td className="px-4 py-3 text-right text-pink-600">
                  {((delivery.TongTien || 0) + (delivery.PhiVanChuyen || 0)).toLocaleString('vi-VN')} đ
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Cập nhật trạng thái giao hàng</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="Chờ giao">Chờ giao</option>
                    <option value="Đang giao">Đang giao</option>
                    <option value="Đã giao">Đã giao</option>
                    <option value="Giao thất bại">Giao thất bại</option>
                    <option value="Đã hủy">Đã hủy</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ghi chú
                  </label>
                  <textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={3}
                    placeholder="Nhập ghi chú (nếu có)..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdateStatus}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                >
                  Cập nhật
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
