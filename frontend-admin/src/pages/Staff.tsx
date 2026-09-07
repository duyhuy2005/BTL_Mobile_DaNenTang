import { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface StaffMember {
  MaNhanVien: number;
  HoTen: string;
  ChucVu: string;
  SoDienThoai: string;
  Email: string;
  NgayVaoLam?: string;
}

interface FormData {
  HoTen: string;
  ChucVu: string;
  SoDienThoai: string;
  Email: string;
  NgayVaoLam: string;
}

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  
  const [formData, setFormData] = useState<FormData>({
    HoTen: '',
    ChucVu: '',
    SoDienThoai: '',
    Email: '',
    NgayVaoLam: new Date().toISOString().split('T')[0]
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/nhanvien', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm
        }
      });
      setStaff(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Lỗi tải danh sách nhân viên:', error);
      alert('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [pagination.page, searchTerm]);

  const handleOpenModal = (member?: StaffMember) => {
    if (member) {
      setEditingId(member.MaNhanVien);
      setFormData({
        HoTen: member.HoTen,
        ChucVu: member.ChucVu,
        SoDienThoai: member.SoDienThoai,
        Email: member.Email || '',
        NgayVaoLam: member.NgayVaoLam ? member.NgayVaoLam.split('T')[0] : new Date().toISOString().split('T')[0]
      });
    } else {
      setEditingId(null);
      setFormData({
        HoTen: '',
        ChucVu: '',
        SoDienThoai: '',
        Email: '',
        NgayVaoLam: new Date().toISOString().split('T')[0]
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
    
    // Validate
    if (!formData.HoTen || !formData.ChucVu || !formData.SoDienThoai) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      if (editingId) {
        // Update
        await axios.put(
          `http://localhost:3000/api/nhanvien/${editingId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Cập nhật nhân viên thành công!');
      } else {
        // Create
        await axios.post(
          'http://localhost:3000/api/nhanvien',
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Thêm nhân viên thành công!');
      }
      
      handleCloseModal();
      fetchStaff();
    } catch (error: any) {
      console.error('Lỗi:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhân viên "${name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/nhanvien/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Xóa nhân viên thành công!');
      fetchStaff();
    } catch (error: any) {
      console.error('Lỗi xóa nhân viên:', error);
      alert(error.response?.data?.message || 'Không thể xóa nhân viên');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">👥 Quản lý nhân viên</h1>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Thêm nhân viên
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên, chức vụ, số điện thoại, email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ tên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chức vụ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số điện thoại</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày vào làm</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                    </div>
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? 'Không tìm thấy nhân viên phù hợp' : 'Chưa có nhân viên nào'}
                  </td>
                </tr>
              ) : (
                staff.map((member, index) => (
                  <tr key={member.MaNhanVien} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{member.HoTen}</div>
                      <div className="text-xs text-gray-500">#{member.MaNhanVien}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {member.ChucVu}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.SoDienThoai}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {member.Email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.NgayVaoLam ? new Date(member.NgayVaoLam).toLocaleDateString('vi-VN') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(member)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Sửa"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(member.MaNhanVien, member.HoTen)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Xóa"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Hiển thị {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} nhân viên
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Trước
              </button>
              <div className="flex gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setPagination({ ...pagination, page })}
                    className={`px-3 py-1 border rounded-md ${
                      page === pagination.page
                        ? 'bg-pink-500 text-white border-pink-500'
                        : 'border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editingId ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Họ tên */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Họ tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.HoTen}
                    onChange={(e) => setFormData({ ...formData, HoTen: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>

                {/* Chức vụ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chức vụ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.ChucVu}
                    onChange={(e) => setFormData({ ...formData, ChucVu: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  >
                    <option value="">-- Chọn chức vụ --</option>
                    <option value="Quản lý">Quản lý</option>
                    <option value="Nhân viên bán hàng">Nhân viên bán hàng</option>
                    <option value="Nhân viên kho">Nhân viên kho</option>
                    <option value="Kế toán">Kế toán</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Bảo vệ">Bảo vệ</option>
                  </select>
                </div>

                {/* Số điện thoại */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.SoDienThoai}
                    onChange={(e) => setFormData({ ...formData, SoDienThoai: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="0901234567"
                    pattern="[0-9]{10,11}"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.Email}
                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="example@email.com"
                  />
                </div>

                {/* Ngày vào làm */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày vào làm
                  </label>
                  <input
                    type="date"
                    value={formData.NgayVaoLam}
                    onChange={(e) => setFormData({ ...formData, NgayVaoLam: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                >
                  {editingId ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
