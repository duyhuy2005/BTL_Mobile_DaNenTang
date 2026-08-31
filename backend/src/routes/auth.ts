import { Router } from 'express';
import { queryOne } from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

// POST login
router.post('/login', async (req, res) => {
  try {
    const { TenDangNhap, MatKhau } = req.body;
    
    if (!TenDangNhap || !MatKhau) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    
    const user = await queryOne(`
      SELECT * FROM TaiKhoan WHERE TenDangNhap = @TenDangNhap
    `, { TenDangNhap });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }
    
    const isValidPassword = await bcrypt.compare(MatKhau, user.MatKhau);
    
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }
    
    const token = jwt.sign(
      {
        MaTaiKhoan: user.MaTaiKhoan,
        TenDangNhap: user.TenDangNhap,
        VaiTro: user.VaiTro
      },
      process.env.JWT_SECRET || 'beauty_store_secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: {
          MaTaiKhoan: user.MaTaiKhoan,
          TenDangNhap: user.TenDangNhap,
          VaiTro: user.VaiTro,
          TrangThai: user.TrangThai
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST register
router.post('/register', async (req, res) => {
  try {
    const { TenDangNhap, MatKhau, VaiTro } = req.body;
    
    if (!TenDangNhap || !MatKhau) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    
    const existing = await queryOne('SELECT * FROM TaiKhoan WHERE TenDangNhap = @TenDangNhap', { TenDangNhap });
    
    if (existing) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
    }
    
    const hashedPassword = await bcrypt.hash(MatKhau, 10);
    
    const { execute } = await import('../config/database');
    const result = await execute(`
      INSERT INTO TaiKhoan (TenDangNhap, MatKhau, VaiTro, TrangThai)
      OUTPUT INSERTED.MaTaiKhoan
      VALUES (@TenDangNhap, @MatKhau, @VaiTro, N'Hoạt động')
    `, { TenDangNhap, MatKhau: hashedPassword, VaiTro: VaiTro || 'KhachHang' });
    
    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      data: { MaTaiKhoan: result.recordset[0].MaTaiKhoan }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
