import { useEffect, useState } from 'react';
import axios from 'axios';
import { categoriesAPI, productsAPI } from '../../services/api';
import { formatCurrency } from '../../utils/format';

export default function Products() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.VaiTro === 'Admin';
  const canEdit = isAdmin; // Chỉ Admin mới được thêm/sửa/xóa
  
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Chỉ chấp nhận file ảnh (JPG, JPEG, PNG, WEBP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước file không được vượt quá 5MB');
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3000/api/upload', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data.data.url;
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.response?.data?.message || 'Lỗi upload ảnh');
      return null;
    } finally {
      setUploading(false);
    }
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
    const data: any = Object.fromEntries(formData.entries());

    // Xóa MaSanPham khỏi data khi thêm mới — để SQL Server tự IDENTITY
    if (!editingProduct) {
      delete data.MaSanPham;
    }

    try {
      // Upload image if new file selected
      if (imageFile) {
        const imageUrl = await uploadImage();
        if (imageUrl) {
          data.HinhAnh = imageUrl;
        }
      } else if (editingProduct && !imagePreview) {
        // Keep old image if editing and no new image
        data.HinhAnh = editingProduct.HinhAnh;
      }

      if (editingProduct) {
        await productsAPI.update(editingProduct.MaSanPham, data);
      } else {
        await productsAPI.create(data);
      }
      
      setShowModal(false);
      setEditingProduct(null);
      setImageFile(null);
      setImagePreview('');
      loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lưu thất bại');
    }
  };

  const openModal = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setImagePreview(product.HinhAnh ? `http://localhost:3000${product.HinhAnh}` : '');
    } else {
      setEditingProduct(null);
      setImagePreview('');
    }
    setImageFile(null);
    setShowModal(true);
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
          <div>
            <h1 className="text-2xl font-bold text-gray-800">2. Quản lý sản phẩm</h1>
            {!canEdit && (
              <p className="text-sm text-gray-600 mt-1">👁 Chế độ xem - Chỉ Admin mới có thể thêm/sửa/xóa</p>
            )}
          </div>
          {canEdit && (
            <button
              onClick={() => openModal()}
              className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-semibold"
            >
              + Thêm sản phẩm
            </button>
          )}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hình ảnh</th>
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
                      <td colSpan={9} className="px-6 py-4 text-center text-gray-500">Không có dữ liệu</td>
                    </tr>
                  ) : (
                    products.map((product, idx) => {
                      const status = getStockStatus(product.SoLuong);
                      return (
                        <tr key={product.MaSanPham} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {product.HinhAnh ? (
                              <img 
                                src={`http://localhost:3000${product.HinhAnh}`} 
                                alt={product.TenSanPham}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23d1d5db" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                                }}
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </td>
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
                            {canEdit ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openModal(product)}
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
                            ) : (
                              <span className="text-xs text-gray-500">👁 Chỉ xem</span>
                            )}
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
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2 text-gray-900">Xóa sản phẩm?</h2>
                <p className="text-gray-600 mb-3">
                  Bạn có chắc muốn xóa sản phẩm <span className="font-semibold text-gray-900">"{deletingProduct.TenSanPham}"</span>?
                </p>
                
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-amber-800 font-medium">
                        💡 <strong>Khuyến nghị:</strong>
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Nếu sản phẩm đã xuất hiện trong đơn hàng, nên chuyển sang trạng thái <strong>"NGỪNG KINH DOANH"</strong> thay vì xóa để giữ lịch sử đơn hàng.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeletingProduct(null); }}
                className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  // Chuyển sang edit modal với trạng thái NGỪNG KINH DOANH
                  openModal({ ...deletingProduct, TrangThai: 'NGỪNG KINH DOANH' });
                  setShowDeleteModal(false);
                  setDeletingProduct(null);
                }}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
              >
                Ngừng kinh doanh
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">{editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Hình ảnh sản phẩm */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-semibold mb-3 text-gray-700">Hình ảnh sản phẩm</label>
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    {imagePreview ? (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-40 h-40 object-cover rounded-lg border-2 border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="w-40 h-40 bg-white rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs text-gray-500">Chưa có ảnh</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Upload button */}
                  <div className="flex-1">
                    <input
                      type="file"
                      id="imageInput"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="imageInput"
                      className="inline-flex items-center px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg cursor-pointer border-2 border-gray-300 font-medium transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Chọn ảnh từ máy
                    </label>
                    <div className="mt-3 text-xs text-gray-600 space-y-1">
                      <p>✓ Định dạng: JPG, JPEG, PNG, WEBP</p>
                      <p>✓ Kích thước tối đa: 5MB</p>
                      <p>✓ Khuyến nghị: Ảnh vuông 800x800px</p>
                    </div>
                    {uploading && (
                      <p className="text-sm text-pink-600 mt-3 font-medium">⏳ Đang upload ảnh...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Thông tin cơ bản */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Thông tin cơ bản</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Mã sản phẩm {!editingProduct && <span className="text-red-500">*</span>}
                    </label>
                    <input 
                      name="MaSanPham" 
                      defaultValue={editingProduct?.MaSanPham}
                      disabled={!!editingProduct}
                      required={!editingProduct}
                      placeholder="VD: SP001"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:bg-gray-100" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Tên sản phẩm <span className="text-red-500">*</span>
                    </label>
                    <input 
                      name="TenSanPham" 
                      defaultValue={editingProduct?.TenSanPham}
                      required
                      placeholder="Nhập tên sản phẩm"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Danh mục <span className="text-red-500">*</span>
                    </label>
                    <select 
                      name="MaDanhMuc" 
                      defaultValue={editingProduct?.MaDanhMuc}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map(cat => (
                        <option key={cat.MaDanhMuc} value={cat.MaDanhMuc}>
                          {cat.TenDanhMuc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Thương hiệu</label>
                    <input 
                      name="ThuongHieu" 
                      defaultValue={editingProduct?.ThuongHieu}
                      placeholder="VD: Cocoon, La Roche-Posay"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" 
                    />
                  </div>
                </div>
              </div>

              {/* Giá và số lượng */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Giá và kho hàng</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Giá nhập <span className="text-red-500">*</span>
                    </label>
                    <input 
                      name="GiaNhap" 
                      type="number"
                      min="0"
                      step="1000"
                      defaultValue={editingProduct?.GiaNhap}
                      required
                      placeholder="0"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Giá bán <span className="text-red-500">*</span>
                    </label>
                    <input 
                      name="GiaBan" 
                      type="number"
                      min="0"
                      step="1000"
                      defaultValue={editingProduct?.GiaBan}
                      required
                      placeholder="0"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Giá khuyến mãi</label>
                    <input 
                      name="GiaKhuyenMai" 
                      type="number"
                      min="0"
                      step="1000"
                      defaultValue={editingProduct?.GiaKhuyenMai}
                      placeholder="0"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Số lượng <span className="text-red-500">*</span>
                    </label>
                    <input 
                      name="SoLuong" 
                      type="number"
                      min="0"
                      defaultValue={editingProduct?.SoLuong}
                      required
                      placeholder="0"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" 
                    />
                  </div>
                </div>
              </div>

              {/* Chi tiết sản phẩm */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Chi tiết sản phẩm</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Mô tả</label>
                    <textarea 
                      name="MoTa" 
                      defaultValue={editingProduct?.MoTa}
                      rows={3}
                      placeholder="Mô tả chi tiết về sản phẩm..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Thành phần</label>
                    <textarea 
                      name="ThanhPhan" 
                      defaultValue={editingProduct?.ThanhPhan}
                      rows={3}
                      placeholder="Liệt kê các thành phần chính..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Công dụng</label>
                    <textarea 
                      name="CongDung" 
                      defaultValue={editingProduct?.CongDung}
                      rows={3}
                      placeholder="Công dụng, lợi ích của sản phẩm..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Hướng dẫn sử dụng</label>
                    <textarea 
                      name="HuongDanSuDung" 
                      defaultValue={editingProduct?.HuongDanSuDung}
                      rows={3}
                      placeholder="Cách sử dụng sản phẩm..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Trạng thái */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Trạng thái sản phẩm</h3>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Trạng thái <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="TrangThai" 
                    defaultValue={editingProduct?.TrangThai || 'ĐANG BÁN'}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="ĐANG BÁN">🟢 ĐANG BÁN</option>
                    <option value="TẠM NGỪNG BÁN">🟡 TẠM NGỪNG BÁN</option>
                    <option value="HẾT HÀNG">🔴 HẾT HÀNG</option>
                    <option value="NGỪNG KINH DOANH">⚫ NGỪNG KINH DOANH</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 <strong>Lưu ý:</strong> Nếu sản phẩm đã có trong đơn hàng, hãy chuyển sang trạng thái "NGỪNG KINH DOANH" thay vì xóa để giữ lịch sử.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-6 border-t">
                <button 
                  type="button" 
                  onClick={() => { 
                    setShowModal(false); 
                    setEditingProduct(null); 
                    setImageFile(null); 
                    setImagePreview(''); 
                  }} 
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="flex-1 bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? '⏳ Đang xử lý...' : (editingProduct ? '💾 Cập nhật sản phẩm' : '➕ Thêm sản phẩm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
