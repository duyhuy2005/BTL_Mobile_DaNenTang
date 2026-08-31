import { useEffect, useState } from 'react';
import { categoriesAPI, productsAPI } from '../services/api';
import { formatCurrency } from '../utils/format';

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [pagination.page, search, selectedCategory]);

  const loadCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page, limit: pagination.limit };
      if (search) params.search = search;
      if (selectedCategory) params.maDanhMuc = selectedCategory;

      const res = await productsAPI.getAll(params);
      setProducts(res.data.data);
      setPagination({ 
        ...pagination, 
        total: res.data.pagination.total,
        totalPages: res.data.pagination.totalPages 
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    loadProducts();
  };

  const openDeleteModal = (product: any) => {
    setDeletingProduct(product);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingProduct) return;

    try {
      await productsAPI.delete(deletingProduct.MaSanPham);
      setShowDeleteModal(false);
      setDeletingProduct(null);
      loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa thất bại');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.MaSanPham, data);
      } else {
        await productsAPI.create(data);
      }
      setShowModal(false);
      setEditingProduct(null);
      loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lưu thất bại');
    }
  };

  // Tính trạng thái dựa trên số lượng
  const getStockStatus = (soLuong: number) => {
    if (soLuong === 0) {
      return { label: 'Hết hàng', color: 'bg-red-100 text-red-800', icon: '🔴' };
    } else if (soLuong <= 5) {
      return { label: 'Sắp hết', color: 'bg-orange-100 text-orange-800', icon: '🟠' };
    } else {
      return { label: 'Còn hàng', color: 'bg-green-100 text-green-800', icon: '🟢' };
    }
  };

  // Render page numbers
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => setPagination({ ...pagination, page: 1 })}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(<span key="dots1" className="px-2">...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setPagination({ ...pagination, page: i })}
          className={`px-3 py-1 border rounded ${
            i === pagination.page
              ? 'bg-pink-500 text-white border-pink-500'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      );
    }

    if (endPage < pagination.totalPages) {
      if (endPage < pagination.totalPages - 1) {
        pages.push(<span key="dots2" className="px-2">...</span>);
      }
      pages.push(
        <button
          key={pagination.totalPages}
          onClick={() => setPagination({ ...pagination, page: pagination.totalPages })}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
        >
          {pagination.totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">2. Quản lý sản phẩm</h1>
          <button
            onClick={() => { setShowModal(true); setEditingProduct(null); }}
            className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-semibold"
          >
            + Thêm sản phẩm
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm sản phẩm..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPagination({ ...pagination, page: 1 }); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat.MaDanhMuc} value={cat.MaDanhMuc}>{cat.TenDanhMuc}</option>
            ))}
          </select>
          <button type="submit" className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-lg">
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-600">Đang tải...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Danh mục</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thương hiệu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá bán</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-gray-500">Không có dữ liệu</td>
                    </tr>
                  ) : (
                    products.map((product, idx) => {
                      const status = getStockStatus(product.SoLuong);
                      return (
                        <tr key={product.MaSanPham} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{product.TenSanPham}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{product.TenDanhMuc}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{product.ThuongHieu || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-pink-600 font-semibold">{formatCurrency(product.GiaBan)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{product.SoLuong}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${status.color}`}>
                              <span>{status.icon}</span>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setEditingProduct(product); setShowModal(true); }}
                                className="text-blue-600 hover:text-blue-800"
                                title="Sửa"
                              >
                                <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => openDeleteModal(product)}
                                className="text-red-600 hover:text-red-800"
                                title="Xóa"
                              >
                                <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Hiển thị {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} trong {pagination.total} sản phẩm
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={pagination.page === 1}
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ‹
                    </button>
                    {renderPageNumbers()}
                    <button
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Xóa sản phẩm?</h2>
            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn xóa sản phẩm <span className="font-semibold text-gray-900">"{deletingProduct.TenSanPham}"</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeletingProduct(null); }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
              >
                Xóa sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">{editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tên sản phẩm *</label>
                <input 
                  name="TenSanPham" 
                  defaultValue={editingProduct?.TenSanPham} 
                  required 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Danh mục *</label>
                  <select 
                    name="MaDanhMuc" 
                    defaultValue={editingProduct?.MaDanhMuc} 
                    required 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map(cat => <option key={cat.MaDanhMuc} value={cat.MaDanhMuc}>{cat.TenDanhMuc}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Thương hiệu</label>
                  <input 
                    name="ThuongHieu" 
                    defaultValue={editingProduct?.ThuongHieu} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Giá nhập *</label>
                  <input 
                    name="GiaNhap" 
                    type="number" 
                    defaultValue={editingProduct?.GiaNhap} 
                    required 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Giá bán *</label>
                  <input 
                    name="GiaBan" 
                    type="number" 
                    defaultValue={editingProduct?.GiaBan} 
                    required 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Số lượng *</label>
                  <input 
                    name="SoLuong" 
                    type="number" 
                    defaultValue={editingProduct?.SoLuong} 
                    required 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Mô tả</label>
                <textarea 
                  name="MoTa" 
                  defaultValue={editingProduct?.MoTa} 
                  rows={3} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hình ảnh (URL)</label>
                <input 
                  name="HinhAnh" 
                  defaultValue={editingProduct?.HinhAnh} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" 
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  className="flex-1 bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-lg font-medium"
                >
                  {editingProduct ? 'Cập nhật' : 'Thêm mới'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setEditingProduct(null); }} 
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
