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
  TrangThai: number;
  TenDangNhap?: string;
  VaiTro?: string;
}

interface FormData {
  HoTen: string;
  ChucVu: string;
  SoDienThoai: string;
  Email: string;
  NgayVaoLam: string;
  TrangThai: number;
}

const API = 'http://localhost:3000/api';

export default function QuanLyNhanVien() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const [formData, setFormData] = useState<FormData>({
    HoTen: '',
    ChucVu: '',
    SoDienThoai: '',
    Email: '',
    NgayVaoLam: new Date().toISOString().split('T')[0],
    TrangThai: 1
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/nhanvien`, {
        headers,
        params: { page: pagination.page, limit: pagination.limit, search: searchTerm }
      });
      setStaff(res.data.data || []);
      if (res.data.pagination) setPagination(res.data.pagination);
    } catch (err) {
      console.error('Lỗi tải danh sách nhân viên:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, [pagination.page, searchTerm]);

  const handleOpenModal = (member?: StaffMember) => {
    if (member) {
      setEditingId(member.MaNhanVien);
      setFormData({
        HoTen: member.HoTen,
        ChucVu: member.ChucVu,
        SoDienThoai: member.SoDienThoai,
        Email: member.Email || '',
        NgayVaoLam: member.NgayVaoLam ? member.NgayVaoLam.split('T')[0] : new Date().toISOString().split('T')[0],
        TrangThai: member.TrangThai
      });
    } else {
      setEditingId(null);
      setFormData({ HoTen: '', ChucVu: '', SoDienThoai: '', Email: '', NgayVaoLam: new Date().toISOString().split('T')[0], TrangThai: 1 });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.HoTen || !formData.ChucVu || !formData.SoDienThoai) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${API}/nhanvien/${editingId}`, formData, { headers });
        alert('Cập nhật nhân viên thành công!');
      } else {
        await axios.post(`${API}/nhanvien`, formData, { headers });
        alert('Thêm nhân viên thành công!');
      }
      setShowModal(false);
      fetchStaff();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhân viên "${name}"?`)) return;
    try {
      await axios.delete(`${API}/nhanvien/${id}`, { headers });
      alert('Xóa nhân viên thành công!');
      fetchStaff();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa nhân viên');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  // SQL Server trả về bit dạng true/false hoặc 1/0
  const isActive = (trangThai: any) => trangThai === 1 || trangThai === true || trangThai === '1';

  const getChucVuColor = (chucVu: string) => {
    if (chucVu?.includes('Quản lý') || chucVu?.includes('quan ly')) return 'bg-purple-100 text-purple-800';
    if (chucVu?.includes('Kế toán')) return 'bg-yellow-100 text-yellow-800';
    if (chucVu?.includes('kho') || chucVu?.includes('Kho')) return 'bg-orange-100 text-orange-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6 mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">👥 Quản lý nhân viên</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          Thêm nhân viên
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên, chức vụ, số điện thoại, email..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{staff.filter(s => isActive(s.TrangThai)).length}</div>
          <div className="text-sm text-gray-500 mt-1">Đang làm việc</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{staff.filter(s => s.ChucVu?.includes('Quản lý')).length}</div>
          <div className="text-sm text-gray-500 mt-1">Quản lý</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">{staff.filter(s => !isActive(s.TrangThai)).length}</div>
          <div className="text-sm text-gray-500 mt-1">Nghỉ việc</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chức vụ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số điện thoại</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày vào làm</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                    </div>
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'Không tìm thấy nhân viên phù hợp' : 'Chưa có nhân viên nào'}
                  </td>
                </tr>
              ) : (
                staff.map((member, index) => (
                  <tr key={member.MaNhanVien} className={`hover:bg-gray-50 ${!isActive(member.TrangThai) ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{member.HoTen}</div>
                      {member.TenDangNhap && (
                        <div className="text-xs text-gray-400">@{member.TenDangNhap}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getChucVuColor(member.ChucVu)}`}>
                        {member.ChucVu}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">{member.SoDienThoai}</td>
                    <td className="px-4 py-4 text-sm text-blue-600">{member.Email || '-'}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{formatDate(member.NgayVaoLam)}</td>
                    <td className="px-4 py-4">
                      {isActive(member.TrangThai) ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Đang làm
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                          Nghỉ việc
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(member)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Sửa"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(member.MaNhanVien, member.HoTen)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                          title="Xóa"
                        >
                          <TrashIcon className="w-4 h-4" />
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
              Tổng: <span className="font-medium">{pagination.total}</span> nhân viên
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-100 text-sm">
                Trước
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPagination(prev => ({ ...prev, page: p }))}
                  className={`px-3 py-1 border rounded-md text-sm ${p === pagination.page ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 hover:bg-gray-100'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-100 text-sm">
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editingId ? '✏️ Sửa thông tin nhân viên' : '➕ Thêm nhân viên mới'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Họ tên */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ tên <span className="text-red-500">*</span>
                </label>
                <input type="text" value={formData.HoTen}
                  onChange={(e) => setFormData({ ...formData, HoTen: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="VD: Nguyễn Văn A" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Chức vụ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chức vụ <span className="text-red-500">*</span>
                  </label>
                  <select value={formData.ChucVu}
                    onChange={(e) => setFormData({ ...formData, ChucVu: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" required>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input type="tel" value={formData.SoDienThoai}
                    onChange={(e) => setFormData({ ...formData, SoDienThoai: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="0901234567" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.Email}
                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="example@beautystore.vn" />
                </div>

                {/* Ngày vào làm */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày vào làm</label>
                  <input type="date" value={formData.NgayVaoLam}
                    onChange={(e) => setFormData({ ...formData, NgayVaoLam: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" />
                </div>
              </div>

              {/* Trạng thái - chỉ hiện khi sửa */}
              {editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select value={formData.TrangThai}
                    onChange={(e) => setFormData({ ...formData, TrangThai: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                    <option value={1}>Đang làm việc</option>
                    <option value={0}>Nghỉ việc</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Hủy
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 font-medium">
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
