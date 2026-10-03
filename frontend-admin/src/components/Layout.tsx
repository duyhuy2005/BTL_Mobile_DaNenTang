import { Fragment, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_ORIGIN } from '../services/api';

function readUser() {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); }
  catch { return {}; }
}

function avatarUrl(value?: string) {
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `${API_ORIGIN}${value.startsWith('/') ? '' : '/'}${value}`;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(readUser);
  useEffect(() => {
    const syncUser = () => setUser(readUser());
    window.addEventListener('beautystore:user-updated', syncUser);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener('beautystore:user-updated', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);
  const isAdmin = user.VaiTro === 'Admin';
  const staffTheme = user.VaiTro === 'NhanVien';

  // Menu cho Admin - có đầy đủ quyền
  const adminMenuItems: { path: string; icon: string; label: string; badge?: string }[] = [
    { path: '/', icon: '📊', label: 'Tổng quan' },
    { path: '/products', icon: '📦', label: 'Sản phẩm' },
    { path: '/categories', icon: '📁', label: 'Danh mục' },
    { path: '/warehouse', icon: '🏬', label: 'Kho hàng' },
    { path: '/invoices', icon: '🛒', label: 'Đơn hàng' },
    { path: '/deliveries', icon: '🚚', label: 'Vận chuyển' },
    { path: '/returns', icon: '↩️', label: 'Hoàn trả' },
    { path: '/customers', icon: '👥', label: 'Khách hàng' },
    { path: '/staff', icon: '👨‍💼', label: 'Nhân viên' },
    { path: '/promotions', icon: '🎁', label: 'Khuyến mãi' },
    { path: '/reviews', icon: '⭐', label: 'Đánh giá' },
    { path: '/reports', icon: '📈', label: 'Báo cáo' },
  ];

  // Menu cho Nhân viên - quyền hạn giới hạn theo yêu cầu
  const staffMenuItems: { path: string; icon: string; label: string; badge?: string }[] = [
    { path: '/', icon: '📊', label: 'Tổng quan' },
    { path: '/products', icon: '📦', label: 'Sản phẩm', badge: '👁' }, // Chỉ xem
    { path: '/warehouse', icon: '🏬', label: 'Kho hàng', badge: '👁' }, // Chỉ xem
    { path: '/invoices', icon: '🛒', label: 'Đơn hàng' }, // Xử lý
    { path: '/deliveries', icon: '🚚', label: 'Vận chuyển' }, // Xử lý
    { path: '/returns', icon: '↩️', label: 'Hoàn trả' }, // Tiếp nhận/kiểm tra
    { path: '/customers', icon: '👥', label: 'Khách hàng', badge: '👁' }, // Chỉ xem
    { path: '/profile', icon: '👤', label: 'Hồ sơ cá nhân' },
  ];

  const menuItems = isAdmin ? adminMenuItems : staffMenuItems;
  const isPromotionArea = location.pathname === '/promotions' || location.pathname.startsWith('/promotions/');
  const isVoucherPage = location.pathname === '/promotions/vouchers';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Desktop */}
      <aside className={`hidden md:flex md:flex-col md:w-64 border-r fixed h-full ${staffTheme ? 'border-slate-800 bg-[#10213d] text-white' : 'border-gray-200 bg-white'}`}>
        <div className={`flex items-center gap-2 px-6 py-4 border-b ${staffTheme ? 'border-white/10' : 'border-gray-200'}`}>
          <div className={`relative w-8 h-8 overflow-hidden rounded-full flex items-center justify-center font-bold ${staffTheme ? 'bg-amber-400 text-slate-950' : 'bg-pink-600 text-white'}`}><span>{String(user.HoTen || user.TenDangNhap || 'B').trim().split(/\s+/).slice(-2).map((x:string)=>x[0]).join('').toUpperCase()}</span>{user.AnhDaiDien && <img className="absolute inset-0 h-full w-full object-cover" src={avatarUrl(user.AnhDaiDien)} alt="Ảnh đại diện" onError={e => { e.currentTarget.style.display='none'; }}/>}</div>
          <span className={`font-bold ${staffTheme ? 'text-white' : 'text-gray-900'}`}>BeautyStore</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Fragment key={item.path}><Link
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                location.pathname === item.path || (item.path === '/promotions' && isPromotionArea)
                  ? staffTheme ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-pink-50 text-pink-600 font-medium'
                  : staffTheme ? 'text-slate-200 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{item.badge}</span>
              )}
            </Link>
            {isAdmin && item.path === '/promotions' && (
              <div className="ml-12 mb-2 border-l border-pink-200 pl-3 space-y-1">
                <Link to="/promotions" className={`block rounded-md px-2 py-2 text-xs ${location.pathname === '/promotions' ? 'bg-pink-50 text-pink-700 font-semibold' : 'text-gray-600 hover:text-pink-600'}`}>Chương trình khuyến mại</Link>
                <Link to="/promotions/vouchers" className={`block rounded-md px-2 py-2 text-xs ${isVoucherPage ? 'bg-pink-50 text-pink-700 font-semibold' : 'text-gray-600 hover:text-pink-600'}`}>Voucher giảm giá</Link>
              </div>
            )}</Fragment>
          ))}
        </nav>

        <div className={`p-4 border-t ${staffTheme ? 'border-white/10' : 'border-gray-200'}`}>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-colors ${staffTheme ? 'text-slate-200 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <span className="text-lg">🚪</span>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-pink-600 rounded flex items-center justify-center text-white font-bold">B</div>
          <span className="font-bold text-gray-900">Beauty Store</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <span className="text-2xl">{mobileMenuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-white z-10 p-4 overflow-y-auto">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <Fragment key={item.path}><Link
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
                    location.pathname === item.path || (item.path === '/promotions' && isPromotionArea)
                    ? 'bg-pink-50 text-pink-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{item.badge}</span>
              )}
            </Link>
            {isAdmin && item.path === '/promotions' && (
              <div className="ml-12 border-l border-pink-200 pl-3 space-y-1">
                <Link to="/promotions" onClick={() => setMobileMenuOpen(false)} className={`block rounded-md px-2 py-2 text-xs ${location.pathname === '/promotions' ? 'bg-pink-50 text-pink-700 font-semibold' : 'text-gray-700'}`}>Chương trình khuyến mại</Link>
                <Link to="/promotions/vouchers" onClick={() => setMobileMenuOpen(false)} className={`block rounded-md px-2 py-2 text-xs ${isVoucherPage ? 'bg-pink-50 text-pink-700 font-semibold' : 'text-gray-700'}`}>Voucher giảm giá</Link>
              </div>
            )}</Fragment>
            ))}
          </nav>
          <button
            onClick={handleLogout}
            className="w-full mt-6 flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            <span className="text-lg">🚪</span>
            Đăng xuất
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0">
        {/* Top Header - Desktop */}
        <div className="hidden md:block bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 overflow-hidden bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>{user.AnhDaiDien && <img className="absolute inset-0 h-full w-full object-cover" src={avatarUrl(user.AnhDaiDien)} alt="Ảnh đại diện" onError={e => { e.currentTarget.style.display='none'; }} />}
              </div>
              <div>
              <p className="text-sm font-semibold text-gray-900">{user.HoTen || user.TenDangNhap || 'User'}</p>
                <p className="text-xs text-gray-500">
                  {isAdmin ? '🔑 Quản trị viên' : '👤 Nhân viên'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {children}
      </main>
    </div>
  );
}
