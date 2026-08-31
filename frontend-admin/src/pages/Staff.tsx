import { useState, useEffect } from 'react';
import axios from 'axios';

interface StaffMember {
  MaNhanVien: number;
  HoTen: string;
  ChucVu: string;
  SoDienThoai: string;
  Email: string;
}

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/nhanvien', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStaff(response.data.data || []);
    } catch (error) {
      console.error('Lỗi tải danh sách nhân viên:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">7. Quản lý nhân viên</h1>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ tên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chức vụ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số điện thoại</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">Đang tải...</td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">Không có dữ liệu</td>
                </tr>
              ) : (
                staff.map((member, index) => (
                  <tr key={member.MaNhanVien} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{member.HoTen}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{member.ChucVu}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{member.SoDienThoai}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-blue-600">{member.Email}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
