import { useEffect, useState } from 'react';
import { customersAPI } from '../services/api';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    loadCustomers();
  }, [pagination.page, search]);

  const loadCustomers = async () => {
    try {
      const params = { page: pagination.page, limit: pagination.limit, search };
      const res = await customersAPI.getAll(params);
      setCustomers(res.data.data);
      setPagination({ ...pagination, total: res.data.pagination.total });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa khách hàng này?')) return;
    try {
      await customersAPI.delete(id);
      loadCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa thất bại');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    // Validate phone number
    const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/;
    if (!phoneRegex.test(data.SoDienThoai as string)) {
      alert('Số điện thoại không hợp lệ!\nVui lòng nhập số điện thoại di động Việt Nam 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.\nVí dụ: 0901234567');
      return;
    }

    try {
      if (editing) {
        await customersAPI.update(editing.MaKhachHang, data);
      } else {
        await customersAPI.create(data);
      }
      setShowModal(false);
      setEditing(null);
      loadCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lưu thất bại');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý khách hàng</h1>
        <button
          onClick={() => { setShowModal(true); setEditing(null); }}
          className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg font-semibold"
        >
          + Thêm khách hàng
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên, SĐT, email..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">STT</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Họ tên</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">SĐT</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Địa chỉ</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Số hóa đơn</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, idx) => (
                <tr key={customer.MaKhachHang} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                  <td className="py-3 px-4">{customer.HoTen}</td>
                  <td className="py-3 px-4">{customer.SoDienThoai}</td>
                  <td className="py-3 px-4">{customer.Email}</td>
                  <td className="py-3 px-4">{customer.DiaChi}</td>
                  <td className="py-3 px-4 text-right">{customer.SoHoaDon}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditing(customer); setShowModal(true); }} className="text-blue-600">✏️</button>
                      <button onClick={() => handleDelete(customer.MaKhachHang)} className="text-red-600">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Hiển thị {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
          </div>
          <div className="flex gap-2">
            <button
              disabled={pagination.page === 1}
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Trước
            </button>
            <button
              disabled={pagination.page * pagination.limit >= pagination.total}
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">{editing ? 'Sửa khách hàng' : 'Thêm khách hàng'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Họ tên</label>
                <input name="HoTen" defaultValue={editing?.HoTen} required className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                <input 
                  name="SoDienThoai" 
                  defaultValue={editing?.SoDienThoai} 
                  required 
                  pattern="^(03|05|07|08|09)[0-9]{8}$"
                  title="Số điện thoại phải là 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09"
                  maxLength={10}
                  className="w-full px-3 py-2 border rounded-lg" 
                  placeholder="0901234567"
                />
                <p className="text-xs text-gray-500 mt-1">Ví dụ: 0901234567, 0321234567</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input name="Email" type="email" defaultValue={editing?.Email} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <textarea name="DiaChi" defaultValue={editing?.DiaChi} rows={2} className="w-full px-3 py-2 border rounded-lg"></textarea>
              </div>
              {!editing && (
                <div>
                  <label className="block text-sm font-medium mb-1">Mã tài khoản (tùy chọn)</label>
                  <input name="MaTaiKhoan" type="number" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              )}
              {editing && (
                <div>
                  <label className="block text-sm font-medium mb-1">Trạng thái</label>
                  <select name="TrangThai" defaultValue={editing?.TrangThai} className="w-full px-3 py-2 border rounded-lg">
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Khóa">Khóa</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-pink-600 hover:bg-pink-700 text-white py-2 rounded-lg">Lưu</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg">Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
