import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesAPI, productsAPI, customersAPI } from '../services/api';
import { formatCurrency } from '../utils/format';

interface CartItem {
  MaSanPham: number;
  TenSanPham: string;
  SoLuong: number;
  DonGia: number;
  ThanhTien: number;
}

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [formData, setFormData] = useState({
    MaKhachHang: '',
    TenKhachHang: '',
    SoDienThoai: '',
    PhuongThucThanhToan: 'Tiền mặt',
    GhiChu: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersRes, productsRes] = await Promise.all([
        customersAPI.getAll({ limit: 100 }),
        productsAPI.getAll({ limit: 100 }),
      ]);
      setCustomers(customersRes.data.data);
      setProducts(productsRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCustomer = (customer: any) => {
    setFormData({
      ...formData,
      MaKhachHang: customer.MaKhachHang,
      TenKhachHang: customer.HoTen,
      SoDienThoai: customer.SoDienThoai || '',
    });
  };

  const handleAddProduct = (product: any) => {
    const existing = cart.find(item => item.MaSanPham === product.MaSanPham);
    if (existing) {
      setCart(cart.map(item =>
        item.MaSanPham === product.MaSanPham
          ? { ...item, SoLuong: item.SoLuong + 1, ThanhTien: (item.SoLuong + 1) * item.DonGia }
          : item
      ));
    } else {
      setCart([...cart, {
        MaSanPham: product.MaSanPham,
        TenSanPham: product.TenSanPham,
        SoLuong: 1,
        DonGia: product.GiaBan,
        ThanhTien: product.GiaBan,
      }]);
    }
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setCart(cart.filter((_, i) => i !== index));
    } else {
      setCart(cart.map((item, i) =>
        i === index
          ? { ...item, SoLuong: newQty, ThanhTien: newQty * item.DonGia }
          : item
      ));
    }
  };

  const handleRemoveItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + item.ThanhTien, 0);
  };

  const handleSubmit = async () => {
    if (!formData.TenKhachHang || cart.length === 0) {
      alert('Vui lòng nhập thông tin khách hàng và thêm sản phẩm');
      return;
    }

    setLoading(true);
    try {
      const data = {
        MaKhachHang: formData.MaKhachHang || null,
        MaNhanVien: 1, // TODO: Get from auth
        PhuongThucThanhToan: formData.PhuongThucThanhToan,
        GhiChu: formData.GhiChu,
        ChiTiet: cart.map(item => ({
          MaSanPham: item.MaSanPham,
          SoLuong: item.SoLuong,
          DonGia: item.DonGia,
        })),
      };

      const res = await invoicesAPI.create(data);
      alert('Tạo hóa đơn thành công!');
      navigate(`/invoices`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Tạo hóa đơn thất bại');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.TenSanPham.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.ThuongHieu?.toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tạo hóa đơn</h1>
        <button
          onClick={() => navigate('/invoices')}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          ← Quay lại
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Customer & Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Thông tin khách hàng</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên khách hàng *</label>
                <input
                  type="text"
                  value={formData.TenKhachHang}
                  onChange={(e) => setFormData({ ...formData, TenKhachHang: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Nhập tên khách hàng"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                <input
                  type="text"
                  value={formData.SoDienThoai}
                  onChange={(e) => setFormData({ ...formData, SoDienThoai: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Nhập SĐT"
                />
              </div>
            </div>
            {customers.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Chọn từ khách hàng có sẵn</label>
                <select
                  onChange={(e) => {
                    const customer = customers.find(c => c.MaKhachHang === parseInt(e.target.value));
                    if (customer) handleSelectCustomer(customer);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.map(c => (
                    <option key={c.MaKhachHang} value={c.MaKhachHang}>
                      {c.HoTen} - {c.SoDienThoai}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Product Search */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Danh sách sản phẩm</h3>
            <input
              type="text"
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 mb-4"
              placeholder="Tìm sản phẩm..."
            />
            <div className="max-h-80 overflow-y-auto space-y-2">
              {filteredProducts.map(product => (
                <div
                  key={product.MaSanPham}
                  onClick={() => handleAddProduct(product)}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 cursor-pointer transition-all"
                >
                  <div>
                    <div className="font-medium text-gray-900">{product.TenSanPham}</div>
                    <div className="text-sm text-gray-500">{product.ThuongHieu}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-pink-600">{formatCurrency(product.GiaBan)}</div>
                    <div className="text-xs text-gray-500">Còn: {product.SoLuong}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right - Cart */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Đơn hàng</h3>
            
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-8">Chưa có sản phẩm</div>
            ) : (
              <div className="space-y-3 mb-4">
                {cart.map((item, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.TenSanPham}</div>
                        <div className="text-xs text-gray-500">{formatCurrency(item.DonGia)}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQuantity(idx, item.SoLuong - 1)}
                        className="w-8 h-8 border border-gray-300 rounded-lg hover:bg-gray-100"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={item.SoLuong}
                        onChange={(e) => handleUpdateQuantity(idx, parseInt(e.target.value) || 1)}
                        className="w-16 text-center border border-gray-300 rounded-lg py-1"
                      />
                      <button
                        onClick={() => handleUpdateQuantity(idx, item.SoLuong + 1)}
                        className="w-8 h-8 border border-gray-300 rounded-lg hover:bg-gray-100"
                      >
                        +
                      </button>
                      <div className="flex-1 text-right font-semibold text-pink-600">
                        {formatCurrency(item.ThanhTien)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phương thức thanh toán</label>
                <select
                  value={formData.PhuongThucThanhToan}
                  onChange={(e) => setFormData({ ...formData, PhuongThucThanhToan: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="Chuyển khoản">Chuyển khoản</option>
                  <option value="Thẻ">Thẻ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
                <textarea
                  value={formData.GhiChu}
                  onChange={(e) => setFormData({ ...formData, GhiChu: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  rows={2}
                  placeholder="Ghi chú thêm..."
                />
              </div>

              <div className="bg-pink-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Tổng tiền:</span>
                  <span className="text-pink-600">{formatCurrency(getTotalAmount())}</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || cart.length === 0}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang xử lý...' : '✓ Lưu hóa đơn'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
