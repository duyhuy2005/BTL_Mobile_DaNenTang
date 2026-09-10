import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';

// Pages Admin - chỉ Admin truy cập
import TongQuanAdmin from './pages/admin/TongQuan';
import QuanLyNhanVien from './pages/admin/QuanLyNhanVien';
import KhuyenMai from './pages/admin/KhuyenMai';
import Voucher from './pages/admin/Voucher';
import DanhGia from './pages/admin/DanhGia';
import BaoCao from './pages/admin/BaoCao';

// Pages Nhân viên - riêng cho Staff
import TongQuanNhanVien from './pages/nhanvien/TongQuan';

// Pages Chung - cả Admin và Staff
import SanPham from './pages/chung/SanPham';
import DanhMuc from './pages/chung/DanhMuc';
import KhoHang from './pages/chung/KhoHang';
import DonHang from './pages/chung/DonHang';
import ChiTietDonHang from './pages/chung/ChiTietDonHang';
import TaoDonHang from './pages/chung/TaoDonHang';
import GiaoHang from './pages/chung/GiaoHang';
import ChiTietGiaoHang from './pages/chung/ChiTietGiaoHang';
import HoanTra from './pages/chung/HoanTra';
import ChiTietHoanTra from './pages/chung/ChiTietHoanTra';
import KhachHang from './pages/chung/KhachHang';
import Login from './pages/Login';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

// Admin Only Route - chỉ Admin mới truy cập được
function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token) return <Navigate to="/login" />;
  if (user.VaiTro !== 'Admin') {
    return <Navigate to="/" />;
  }
  
  return <Layout>{children}</Layout>;
}

// Dashboard Route - phân biệt theo vai trò
function DashboardRoute() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.VaiTro === 'Admin';
  
  return (
    <Layout>
      {isAdmin ? <TongQuanAdmin /> : <TongQuanNhanVien />}
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Dashboard - tự động phân biệt Admin/Staff */}
        <Route path="/" element={<DashboardRoute />} />
        
        {/* Routes cho cả Admin và Staff */}
        <Route path="/products" element={<PrivateRoute><SanPham /></PrivateRoute>} />
        <Route path="/categories" element={<PrivateRoute><DanhMuc /></PrivateRoute>} />
        <Route path="/warehouse" element={<PrivateRoute><KhoHang /></PrivateRoute>} />
        <Route path="/invoices" element={<PrivateRoute><DonHang /></PrivateRoute>} />
        <Route path="/invoices/:id" element={<PrivateRoute><ChiTietDonHang /></PrivateRoute>} />
        <Route path="/invoices/create" element={<PrivateRoute><TaoDonHang /></PrivateRoute>} />
        <Route path="/deliveries" element={<PrivateRoute><GiaoHang /></PrivateRoute>} />
        <Route path="/deliveries/:id" element={<PrivateRoute><ChiTietGiaoHang /></PrivateRoute>} />
        <Route path="/returns" element={<PrivateRoute><HoanTra /></PrivateRoute>} />
        <Route path="/returns/:id" element={<PrivateRoute><ChiTietHoanTra /></PrivateRoute>} />
        <Route path="/customers" element={<PrivateRoute><KhachHang /></PrivateRoute>} />
        
        {/* Routes chỉ dành cho Admin */}
        <Route path="/staff" element={<AdminRoute><QuanLyNhanVien /></AdminRoute>} />
        <Route path="/promotions" element={<AdminRoute><KhuyenMai /></AdminRoute>} />
        <Route path="/vouchers" element={<AdminRoute><Voucher /></AdminRoute>} />
        <Route path="/reviews" element={<AdminRoute><DanhGia /></AdminRoute>} />
        <Route path="/reports" element={<AdminRoute><BaoCao /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
