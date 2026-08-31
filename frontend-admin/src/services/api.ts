import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
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
      window.location.href = '/login';
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
  getStats: () => api.get('/dashboard/stats'),
  getTopProducts: (limit = 5) => api.get(`/dashboard/top-products?limit=${limit}`),
};

// Products
export const productsAPI = {
  getAll: (params?: { search?: string; maDanhMuc?: number; page?: number; limit?: number }) => 
    api.get('/sanpham', { params }),
  getById: (id: number) => api.get(`/sanpham/${id}`),
  create: (data: any) => api.post('/sanpham', data),
  update: (id: number, data: any) => api.put(`/sanpham/${id}`, data),
  delete: (id: number) => api.delete(`/sanpham/${id}`),
};

// Categories
export const categoriesAPI = {
  getAll: () => api.get('/danhmuc'),
  getById: (id: number) => api.get(`/danhmuc/${id}`),
  create: (data: any) => api.post('/danhmuc', data),
  update: (id: number, data: any) => api.put(`/danhmuc/${id}`, data),
  delete: (id: number) => api.delete(`/danhmuc/${id}`),
};

// Invoices
export const invoicesAPI = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) => 
    api.get('/hoadon', { params }),
  getById: (id: number) => api.get(`/hoadon/${id}`),
  create: (data: any) => api.post('/hoadon', data),
  delete: (id: number) => api.delete(`/hoadon/${id}`),
  downloadPDF: (id: number) => 
    api.get(`/hoadon/${id}/pdf`, { responseType: 'blob' }),
};

// Customers
export const customersAPI = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) => 
    api.get('/khachhang', { params }),
  getById: (id: number) => api.get(`/khachhang/${id}`),
  create: (data: any) => api.post('/khachhang', data),
  update: (id: number, data: any) => api.put(`/khachhang/${id}`, data),
  delete: (id: number) => api.delete(`/khachhang/${id}`),
};

export default api;
