import { useEffect, useState } from 'react';
import { categoriesAPI } from '../services/api';

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa danh mục này?')) return;
    try {
      await categoriesAPI.delete(id);
      loadCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa thất bại');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      if (editing) {
        await categoriesAPI.update(editing.MaDanhMuc, data);
      } else {
        await categoriesAPI.create(data);
      }
      setShowModal(false);
      setEditing(null);
      loadCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lưu thất bại');
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.TenDanhMuc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-pink-50 rounded-lg px-6 py-3 mb-6">
        <h1 className="text-xl font-semibold text-pink-600">4. Quản lý danh mục</h1>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Quản lý danh mục</h2>
          <button
            onClick={() => { setShowModal(true); setEditing(null); }}
            className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            + Thêm danh mục
          </button>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm danh mục..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-600">Đang tải...</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">STT</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Tên danh mục</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Mô tả</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Số sản phẩm</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Trạng thái</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      Không có danh mục nào
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat, idx) => (
                    <tr key={cat.MaDanhMuc} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{idx + 1}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{cat.TenDanhMuc}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{cat.MoTa || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{cat.SoSanPham || 0}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Hoạt động
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setEditing(cat); setShowModal(true); }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Sửa"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDelete(cat.MaDanhMuc)}
                            className="text-red-600 hover:text-red-800"
                            title="Xóa"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Hiển thị 1 đến {filteredCategories.length} trong tổng số {filteredCategories.length} danh mục
              </div>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center bg-pink-500 text-white rounded font-medium text-sm">
                  1
                </button>
                <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 text-sm">
                  2
                </button>
                <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 text-sm">
                  3
                </button>
                <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 text-sm">
                  4
                </button>
                <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 text-sm">
                  &gt;
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editing ? 'Sửa danh mục' : 'Thêm danh mục'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input 
                  name="TenDanhMuc" 
                  defaultValue={editing?.TenDanhMuc} 
                  required 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" 
                  placeholder="Nhập tên danh mục"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea 
                  name="MoTa" 
                  defaultValue={editing?.MoTa} 
                  rows={3} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Nhập mô tả danh mục"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh (URL)</label>
                <input 
                  name="HinhAnh" 
                  defaultValue={editing?.HinhAnh} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  className="flex-1 bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-lg font-medium"
                >
                  Lưu
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
