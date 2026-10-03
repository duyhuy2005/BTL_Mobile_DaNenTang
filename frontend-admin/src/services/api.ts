import axios from 'axios';

// A local browser uses localhost; deployments can override this in VITE_API_URL.
export const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000/api';
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.setItem('auth_error', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data: { TenDangNhap: string; MatKhau: string }) => 
    api.post('/auth/login', data),
  register: (data: { TenDangNhap: string; MatKhau: string; VaiTro?: string }) => 
    api.post('/auth/register', data),
};

// Dashboard
export const dashboardAPI = {
  getStats: (period = 7) => api.get('/dashboard/stats', { params: { period } }),
  getTopProducts: (limit = 5) => api.get(`/dashboard/top-products?limit=${limit}`),
  getStaffOverview: () => api.get('/dashboard/staff-overview'),
};

// Products
export const productsAPI = {
  getAll: (params?: { search?: string; maDanhMuc?: number; thuongHieu?: string; tonKho?: 'het' | 'sapHet' | 'con'; trangThai?: number; page?: number; limit?: number }) =>
    api.get('/sanpham', { params }),
  getById: (id: number) => api.get(`/sanpham/${id}`),
  create: (data: any) => api.post('/sanpham', data),
  update: (id: number, data: any) => api.put(`/sanpham/${id}`, data),
  delete: (id: number) => api.delete(`/sanpham/${id}`),
  stats: () => api.get('/sanpham/stats'),
  filters: () => api.get('/sanpham/filters'),
  copy: (id: number, data?: { TenSanPham?: string; MaSKU?: string; MaVach?: string }) => api.post(`/sanpham/${id}/copy`, data || {}),
  updateStatus: (id: number, TrangThai: number) => api.patch(`/sanpham/${id}/status`, { TrangThai }),
  updateVariants: (id: number, BienThe: any[]) => api.put(`/sanpham/${id}/bien-the`, { BienThe }),
};

// Categories
export const categoriesAPI = {
  getAll: () => api.get('/danhmuc'),
  getById: (id: number) => api.get(`/danhmuc/${id}`),
  create: (data: any) => api.post('/danhmuc', data),
  update: (id: number, data: any) => api.put(`/danhmuc/${id}`, data),
  delete: (id: number) => api.delete(`/danhmuc/${id}`),
  stats: () => api.get('/danhmuc/stats'),
};

// Invoices
export const invoicesAPI = {
  getAll: (params?: {
    search?: string;
    page?: number;
    limit?: number;
    trangThai?: string;
    thanhToan?: string;
    vanChuyen?: string;
    ngayDat?: string;
    tuNgay?: string;
    denNgay?: string;
    maKhachHang?: number;
    nhomTrangThai?: 'CHO_XAC_NHAN' | 'CHO_CHUAN_BI' | 'CHO_BAN_GIAO' | 'DANG_GIAO' | 'HOAN_TAT' | 'DA_HUY';
  }) =>
    api.get('/hoadon', { params }),
  getStats: () => api.get('/hoadon/stats'),
  getById: (id: number) => api.get(`/hoadon/${id}`),
  create: (data: any) => api.post('/hoadon', data),
  action: (id: number, data: {
    action: 'confirm' | 'start_prepare' | 'pack' | 'complete' | 'reject' | 'cancel' | 'mark_paid';
    reason?: string;
    DonViVanChuyen?: string;
    MaVanDon?: string;
  }) => api.post(`/hoadon/${id}/actions`, data),
  downloadPDF: (id: number) => 
    api.get(`/hoadon/${id}/pdf`, { responseType: 'blob' }),
};

export type ShippingAction = 'cancel' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'reschedule' | 'retry_delivery' | 'return_to_shop' | 'returned' | 'cod_collected' | 'cod_pending' | 'cod_reconciled' | 'cod_transferred';

export const shippingAPI = {
  getStats: () => api.get('/vanchuyen/stats'),
  getAll: (params?: { search?: string; status?: string; carrier?: string; date?: string; from?: string; to?: string; payment?: string; page?: number; limit?: number }) => api.get('/vanchuyen', { params }),
  getById: (id: number) => api.get(`/vanchuyen/${id}`),
  getCarriers: () => api.get('/vanchuyen/carriers'),
  getEligibleOrders: () => api.get('/vanchuyen/don-hang-du-dieu-kien'),
  create: (data: any) => api.post('/vanchuyen', data),
  action: (id: number, data: { action: ShippingAction; reason?: string; note?: string; location?: string; expectedDate?: string; eventAt?: string; items?: any[]; SoTien?: number; PhuongThuc?: string; MaThamChieu?: string; ChungTuUrl?: string; IdempotencyKey?: string }) => api.post(`/vanchuyen/${id}/actions`, data),
  settleCod: (id: number, data: any) => api.post(`/vanchuyen/${id}/settlements`, data),
  receiveOrderPayment: (orderId: number, data: any) => api.post(`/vanchuyen/orders/${orderId}/receipts`, data),
};

export const returnsAPI = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string; refundStatus?: string; reason?: string; type?: string; from?: string; to?: string }) => api.get('/hoantra', { params }),
  getStats: () => api.get('/hoantra/thong-ke'),
  getById: (id: number) => api.get(`/hoantra/${id}`),
  getCarriers: () => api.get('/hoantra/don-vi-van-chuyen'),
  approve: (id: number) => api.patch(`/hoantra/${id}/chap-nhan`, {}),
  reject: (id: number, LyDo: string) => api.patch(`/hoantra/${id}/tu-choi`, { LyDo }),
  selfShip: (id: number) => api.patch(`/hoantra/${id}/khach-tu-gui`, {}),
  createReturnShipment: (id: number, data: any) => api.post(`/hoantra/${id}/van-don-hoan`, data),
  shipmentEvent: (id: number, shipmentId: number, data: { action: string; reason?: string }) => api.patch(`/hoantra/${id}/van-don-hoan/${shipmentId}`, data),
  customerSent: (id: number, MaVanDon?: string) => api.patch(`/hoantra/${id}/khach-da-gui`, { MaVanDon }),
  received: (id: number, GhiChu?: string) => api.patch(`/hoantra/${id}/da-nhan-hang`, { GhiChu }),
  beginInspection: (id: number) => api.patch(`/hoantra/${id}/bat-dau-kiem-tra`, {}),
  inspect: (id: number, data: any) => api.post(`/hoantra/${id}/bien-ban-kiem-tra`, data),
  acceptAfterInspection: (id: number, GhiChu?: string) => api.patch(`/hoantra/${id}/chap-nhan-sau-kiem-tra`, { GhiChu }),
  rejectAfterInspection: (id: number, LyDo: string) => api.patch(`/hoantra/${id}/tu-choi-sau-kiem-tra`, { LyDo }),
  processInventory: (id: number) => api.post(`/hoantra/${id}/xu-ly-kho`, {}),
  refund: (id: number, data: any) => api.post(`/hoantra/${id}/hoan-tien`, data),
  cancel: (id: number, LyDo?: string) => api.patch(`/hoantra/${id}/huy`, { LyDo }),
};

export const voucherAPI = {
  getAll: (params?: { page?: number; limit?: number; search?: string; trangThai?: string; loaiGiam?: string; phamVi?: string }) => api.get('/voucher', { params }),
  getStats: () => api.get('/voucher/thong-ke'),
  getById: (id: number) => api.get(`/voucher/${id}`),
  create: (data: any) => api.post('/voucher', data),
  update: (id: number, data: any) => api.put(`/voucher/${id}`, data),
  copy: (id: number, MaVoucher?: string) => api.post(`/voucher/${id}/sao-chep`, { MaVoucher }),
  activate: (id: number) => api.patch(`/voucher/${id}/kich-hoat`),
  pause: (id: number) => api.patch(`/voucher/${id}/tam-dung`),
  cancel: (id: number) => api.patch(`/voucher/${id}/huy`),
  usage: (id: number) => api.get(`/voucher/${id}/lich-su-su-dung`),
  audit: (id: number) => api.get(`/voucher/${id}/lich-su-thay-doi`),
  orders: (id: number) => api.get(`/voucher/${id}/don-hang`),
};

export const promotionsAPI = {
  getAll: (params?: { page?: number; limit?: number; search?: string; trangThai?: string; loai?: string; phamVi?: string; tuNgay?: string; denNgay?: string }) => api.get('/khuyenmai', { params }),
  getStats: () => api.get('/khuyenmai/thong-ke'),
  getById: (id: number) => api.get(`/khuyenmai/${id}`),
  create: (data: any) => api.post('/khuyenmai', data),
  update: (id: number, data: any) => api.put(`/khuyenmai/${id}`, data),
  copy: (id: number, data?: any) => api.post(`/khuyenmai/${id}/sao-chep`, data || {}),
  activate: (id: number) => api.patch(`/khuyenmai/${id}/kich-hoat`),
  pause: (id: number) => api.patch(`/khuyenmai/${id}/tam-dung`),
  end: (id: number) => api.patch(`/khuyenmai/${id}/ket-thuc`),
  cancel: (id: number) => api.patch(`/khuyenmai/${id}/huy`),
  conflicts: (id: number) => api.get(`/khuyenmai/${id}/san-pham-trung`),
  orders: (id: number) => api.get(`/khuyenmai/${id}/don-hang`),
  effectiveness: (id: number) => api.get(`/khuyenmai/${id}/hieu-qua`),
};

// Customers
export const customersAPI = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) => 
    api.get('/khachhang', { params }),
  staffSummary: () => api.get('/khachhang/staff/summary'),
  staffRecentNotes: () => api.get('/khachhang/staff/notes/recent'),
  staffList: (params?: { search?: string; group?: string; page?: number; limit?: number }) => api.get('/khachhang/staff', { params }),
  staffDetail: (id: number) => api.get(`/khachhang/staff/${id}`),
  staffContact: (id: number) => api.get(`/khachhang/staff/${id}/contact`),
  staffOrders: (id: number, params?: { page?: number; limit?: number }) => api.get(`/khachhang/staff/${id}/orders`, { params }),
  staffReturns: (id: number, params?: { page?: number; limit?: number }) => api.get(`/khachhang/staff/${id}/returns`, { params }),
  staffNotes: (id: number) => api.get(`/khachhang/staff/${id}/notes`),
  addStaffNote: (id: number, NoiDung: string) => api.post(`/khachhang/staff/${id}/notes`, { NoiDung }),
  getById: (id: number) => api.get(`/khachhang/${id}`),
  create: (data: any) => api.post('/khachhang', data),
  update: (id: number, data: any) => api.put(`/khachhang/${id}`, data),
  delete: (id: number) => api.delete(`/khachhang/${id}`),
};

export const employeesAPI = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) => api.get('/nhanvien', { params }),
  getById: (id: number) => api.get(`/nhanvien/${id}`),
  myProfile: () => api.get('/nhanvien/me'),
  updateMyProfile: (data: { HoTen: string; SoDienThoaiLienHe: string; NgaySinh: string | null; GioiTinh: string; DiaChi: string; ProfileVersion: string }) => api.put('/nhanvien/me', data),
  uploadMyAvatar: (data: FormData) => api.post('/nhanvien/me/avatar', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changeMyPassword: (data: { MatKhauHienTai: string; MatKhauMoi: string; XacNhanMatKhauMoi: string }) => api.post('/nhanvien/me/change-password', data),
  create: (data: any) => api.post('/nhanvien', data),
  update: (id: number, data: any) => api.put(`/nhanvien/${id}`, data),
  delete: (id: number) => api.delete(`/nhanvien/${id}`),
};

export default api;
