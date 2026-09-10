import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface InvoiceDetail {
  MaHoaDon: number;
  MaSanPham: number;
  TenSanPham: string;
  SoLuong: number;
  DonGia: number;
  ThanhTien: number;
}

interface Invoice {
  MaHoaDon: number;
  MaKhachHang: number;
  TenKhachHang: string;
  SoDienThoai: string;
  DiaChi: string;
  NgayLap: string;
  TongTien: number;
  PhuongThucThanhToan: string;
  TrangThai: string;
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [details, setDetails] = useState<InvoiceDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoiceDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Fetching invoice ID:', id);
      console.log('Token:', token ? 'exists' : 'missing');
      
      const response = await axios.get(`http://localhost:3000/api/hoadon/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('API Response:', response.data);
      
      setInvoice(response.data.data.hoaDon);
      setDetails(response.data.data.chiTiet);
    } catch (error: any) {
      console.error('Lỗi tải chi tiết hóa đơn:', error);
      console.error('Error response:', error.response?.data);
      alert('Không thể tải thông tin hóa đơn: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/hoadon/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `HoaDon_${String(id).padStart(4, '0')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Lỗi tải PDF:', error);
      alert('Không thể tải file PDF');
    }
  };

  useEffect(() => {
    if (id) {
      fetchInvoiceDetail();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Đang tải...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Không tìm thấy hóa đơn</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/invoices')}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Chi tiết hóa đơn #{String(invoice.MaHoaDon).padStart(4, '0')}</h1>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Tải PDF
          </button>
        </div>
      </div>

      {/* Invoice Info Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Thông tin hóa đơn</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Khách hàng</p>
            <p className="text-base font-semibold text-gray-800">{invoice.TenKhachHang || 'Khách lẻ'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Số điện thoại</p>
            <p className="text-base font-semibold text-gray-800">{invoice.SoDienThoai || 'Không có'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Địa chỉ</p>
            <p className="text-base font-semibold text-gray-800">{invoice.DiaChi || 'Không có'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Ngày lập</p>
            <p className="text-base font-semibold text-gray-800">
              {new Date(invoice.NgayLap).toLocaleString('vi-VN')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Phương thức thanh toán</p>
            <p className="text-base font-semibold text-gray-800">{invoice.PhuongThucThanhToan}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Trạng thái</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
              invoice.TrangThai.includes('thanh toán') || invoice.TrangThai.includes('Da thanh')
                ? 'bg-green-100 text-green-800' 
                : invoice.TrangThai.includes('hủy') || invoice.TrangThai.includes('h?y')
                ? 'bg-gray-100 text-gray-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {invoice.TrangThai}
            </span>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Danh sách sản phẩm</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn giá</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {details.map((detail, index) => (
                <tr key={`${detail.MaHoaDon}-${detail.MaSanPham}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{detail.TenSanPham}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{detail.SoLuong}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {detail.DonGia.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-pink-600">
                    {detail.ThanhTien.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-end">
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-8 py-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Tổng tiền thanh toán</p>
            <p className="text-3xl font-bold text-pink-600">
              {invoice.TongTien.toLocaleString('vi-VN')} đ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
