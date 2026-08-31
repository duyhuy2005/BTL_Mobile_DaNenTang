import { Router } from 'express';
import { query, queryOne } from '../config/database';

const router = Router();

// GET dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalRevenue = await queryOne(`
      SELECT ISNULL(SUM(ChiTietHoaDon.ThanhTien), 0) as total 
      FROM HoaDon 
      INNER JOIN ChiTietHoaDon ON HoaDon.MaHoaDon = ChiTietHoaDon.MaHoaDon
      WHERE HoaDon.TrangThai LIKE N'%thanh toán%'
    `);
    
    const totalInvoices = await queryOne(`SELECT COUNT(*) as total FROM HoaDon`);
    const totalProducts = await queryOne(`SELECT COUNT(*) as total FROM SanPham`);
    const totalCustomers = await queryOne(`SELECT COUNT(*) as total FROM KhachHang`);
    
    const revenueLast7Days = await query(`
      SELECT 
        CONVERT(VARCHAR(10), HoaDon.NgayLap, 103) as ngay,
        SUM(ChiTietHoaDon.ThanhTien) as doanhThu
      FROM HoaDon
      INNER JOIN ChiTietHoaDon ON HoaDon.MaHoaDon = ChiTietHoaDon.MaHoaDon
      WHERE HoaDon.NgayLap >= DATEADD(day, -7, GETDATE()) 
        AND HoaDon.TrangThai LIKE N'%thanh toán%'
      GROUP BY CONVERT(VARCHAR(10), HoaDon.NgayLap, 103), HoaDon.NgayLap
      ORDER BY HoaDon.NgayLap
    `);
    
    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue.total,
        totalInvoices: totalInvoices.total,
        totalProducts: totalProducts.total,
        totalCustomers: totalCustomers.total,
        revenueLast7Days
      }
    });
  } catch (err: any) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET top products
router.get('/top-products', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const data = await query(`
      SELECT TOP(@limit)
        SanPham.TenSanPham,
        SUM(ChiTietHoaDon.SoLuong) as soLuongBan,
        SUM(ChiTietHoaDon.ThanhTien) as doanhThu
      FROM ChiTietHoaDon
      INNER JOIN SanPham ON ChiTietHoaDon.MaSanPham = SanPham.MaSanPham
      INNER JOIN HoaDon ON ChiTietHoaDon.MaHoaDon = HoaDon.MaHoaDon
      WHERE HoaDon.TrangThai LIKE N'%thanh toán%'
      GROUP BY SanPham.TenSanPham
      ORDER BY soLuongBan DESC
    `, { limit });
    
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Top products error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
