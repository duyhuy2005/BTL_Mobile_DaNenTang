import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { getPool } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files - uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Import routes
import authRoutes from './routes/auth';
import baocaoRoutes from './routes/baocao';
import danhmucRoutes from './routes/danhmuc';
import dashboardRoutes from './routes/dashboard';
import giaohangRoutes from './routes/giaohang';
import hoadonRoutes from './routes/hoadon';
import hoandoitraRoutes from './routes/hoandoitra';
import inventoryRoutes from './routes/inventory';
import khachhangRoutes from './routes/khachhang';
import khuyenmaiRoutes from './routes/khuyenmai';
import nhacungcapRoutes from './routes/nhacungcap';
import nhanvienRoutes from './routes/nhanvien';
import phieunhapRoutes from './routes/phieunhap';
import phieuxuatRoutes from './routes/phieuxuat';
import sanphamRoutes from './routes/sanpham';
import uploadRoutes from './routes/upload';
import yeuthichRoutes from './routes/yeuthich';

import { authenticate, authorizeAdmin } from './middleware/auth';

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes - require authentication
app.use('/api/dashboard', authenticate, dashboardRoutes); // Cho phép cả Admin và Nhân viên xem
app.use('/api/sanpham', authenticate, sanphamRoutes);
app.use('/api/danhmuc', authenticate, danhmucRoutes);
app.use('/api/hoadon', authenticate, hoadonRoutes);
app.use('/api/giaohang', authenticate, giaohangRoutes);
app.use('/api/hoandoitra', authenticate, hoandoitraRoutes);
app.use('/api/khachhang', authenticate, khachhangRoutes);
app.use('/api/nhanvien',   authenticate, nhanvienRoutes);
app.use('/api/upload',     authenticate, uploadRoutes);
app.use('/api/yeuthich',   authenticate, yeuthichRoutes);
app.use('/api/khuyenmai',  authenticate, khuyenmaiRoutes);
app.use('/api/baocao',     authenticate, baocaoRoutes);
// Kho hàng
app.use('/api/inventory',  authenticate, inventoryRoutes);
app.use('/api/nhacungcap', authenticate, nhacungcapRoutes);
app.use('/api/phieunhap',  authenticate, phieunhapRoutes);
app.use('/api/phieuxuat',  authenticate, phieuxuatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Backend API đang hoạt động', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint không tồn tại' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Lỗi server' });
});

// Start server
async function startServer() {
  try {
    await getPool();
    
    app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('   🌸 BEAUTY STORE - Backend API Server');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`   ✅ Server đang chạy tại: http://localhost:${PORT}`);
      console.log(`   ✅ Database: ${process.env.DB_DATABASE}`);
      console.log('');
      console.log('   📌 API Endpoints:');
      console.log('      POST   /api/auth/login');
      console.log('      POST   /api/auth/register');
      console.log('      GET    /api/dashboard/stats');
      console.log('      GET    /api/dashboard/top-products');
      console.log('      GET    /api/sanpham');
      console.log('      GET    /api/danhmuc');
      console.log('      GET    /api/hoadon');
      console.log('      GET    /api/hoadon/:id/pdf');
      console.log('      GET    /api/giaohang');
      console.log('      GET    /api/hoandoitra');
      console.log('      GET    /api/khachhang');
      console.log('      GET    /api/nhanvien');
      console.log('      POST   /api/upload (Upload ảnh)');
      console.log('      GET    /api/yeuthich/:maKhachHang (Yêu thích)');
      console.log('      GET    /uploads/products/:filename');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
    });
  } catch (err) {
    console.error('❌ Không thể khởi động server:', err);
    process.exit(1);
  }
}

startServer();
