import { Router } from 'express';
import { query, queryOne } from '../config/database';

const router = Router();

// GET dashboard stats
router.get('/stats', async (req, res) => {
  try {
    // Tổng doanh thu
    const totalRevenue = await queryOne(`
      SELECT ISNULL(SUM(ChiTietHoaDon.ThanhTien), 0) as total 
      FROM HoaDon 
      INNER JOIN ChiTietHoaDon ON HoaDon.MaHoaDon = ChiTietHoaDon.MaHoaDon
      WHERE HoaDon.TrangThai = N'Đã thanh toán'
    `) || { total: 0 };
    
    // Tổng số đơn hàng
    const totalOrders = await queryOne(`SELECT COUNT(*) as total FROM HoaDon`) || { total: 0 };
    
    // Đơn chờ xác nhận (Chờ thanh toán)
    const pendingOrders = await queryOne(`
      SELECT COUNT(*) as total FROM HoaDon 
      WHERE TrangThai = N'Chờ thanh toán'
    `) || { total: 0 };
    
    // Đơn đang giao (Kiểm tra bảng GiaoHang)
    let shippingOrders: { total: number } = { total: 0 };
    try {
      shippingOrders = await queryOne(`
        SELECT COUNT(*) as total FROM GiaoHang 
        WHERE TrangThai = N'Đang giao' OR TrangThai = N'Chờ giao'
      `) || { total: 0 };
    } catch (e) {
      // Nếu bảng GiaoHang chưa có, đếm = 0
    }
    
    // Đơn hoàn thành (Đã thanh toán + Đã giao hoặc chỉ Đã thanh toán)
    let completedOrders: { total: number } = { total: 0 };
    try {
      // Thử đếm từ bảng GiaoHang trước
      completedOrders = await queryOne(`
        SELECT COUNT(*) as total FROM GiaoHang 
        WHERE TrangThai = N'Đã giao'
      `) || { total: 0 };
    } catch (e) {
      // Nếu không có bảng GiaoHang, đếm đơn Đã thanh toán
      completedOrders = await queryOne(`
        SELECT COUNT(*) as total FROM HoaDon 
        WHERE TrangThai = N'Đã thanh toán'
      `) || { total: 0 };
    }
    
    // Đơn bị hủy
    const cancelledOrders = await queryOne(`
      SELECT COUNT(*) as total FROM HoaDon 
      WHERE TrangThai = N'Đã hủy'
    `) || { total: 0 };
    
    // Số khách hàng
    const totalCustomers = await queryOne(`SELECT COUNT(*) as total FROM KhachHang`) || { total: 0 };
    
    // Số sản phẩm
    const totalProducts = await queryOne(`SELECT COUNT(*) as total FROM SanPham`) || { total: 0 };
    
    // Sản phẩm sắp hết (số lượng <= 10)
    const lowStockProducts = await queryOne(`
      SELECT COUNT(*) as total FROM SanPham 
      WHERE SoLuong > 0 AND SoLuong <= 10
    `) || { total: 0 };
    
    // Sản phẩm hết hàng
    const outOfStockProducts = await queryOne(`
      SELECT COUNT(*) as total FROM SanPham 
      WHERE SoLuong = 0
    `) || { total: 0 };
    
    // Đơn hoàn trả (nếu có bảng HoanDoiTra)
    let returnOrders: { total: number } = { total: 0 };
    try {
      returnOrders = await queryOne(`
        SELECT COUNT(*) as total FROM HoanDoiTra 
        WHERE LoaiYeuCau LIKE N'%trả%'
      `) || { total: 0 };
    } catch (e) {
      // Bảng chưa tồn tại, để mặc định 0
    }
    
    // Doanh thu 7 ngày gần đây
    const revenueLast7Days = await query(`
      SELECT 
        FORMAT(HoaDon.NgayLap, 'dd/MM') as ngay,
        ISNULL(SUM(ChiTietHoaDon.ThanhTien), 0) as doanhThu
      FROM HoaDon
      LEFT JOIN ChiTietHoaDon ON HoaDon.MaHoaDon = ChiTietHoaDon.MaHoaDon
      WHERE HoaDon.NgayLap >= DATEADD(day, -6, CAST(GETDATE() AS DATE))
        AND HoaDon.TrangThai = N'Đã thanh toán'
      GROUP BY CAST(HoaDon.NgayLap AS DATE), FORMAT(HoaDon.NgayLap, 'dd/MM')
      ORDER BY CAST(HoaDon.NgayLap AS DATE)
    `);
    
    // Đảm bảo có đủ 7 ngày dữ liệu
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0');
      const existing = revenueLast7Days.find((r: any) => r.ngay === dayStr);
      last7Days.push({
        ngay: dayStr,
        doanhThu: existing ? existing.doanhThu : 0
      });
    }
    
    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue.total,
        totalOrders: totalOrders.total,
        pendingOrders: pendingOrders.total,
        shippingOrders: shippingOrders.total,
        completedOrders: completedOrders.total,
        cancelledOrders: cancelledOrders.total,
        totalCustomers: totalCustomers.total,
        totalProducts: totalProducts.total,
        lowStockProducts: lowStockProducts.total,
        outOfStockProducts: outOfStockProducts.total,
        returnOrders: returnOrders.total,
        revenueLast7Days: last7Days
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
        SanPham.MaSanPham,
        SanPham.TenSanPham,
        SanPham.GiaBan,
        SanPham.HinhAnh,
        ISNULL(SUM(ChiTietHoaDon.SoLuong), 0) as SoLuongBan,
        ISNULL(SUM(ChiTietHoaDon.ThanhTien), 0) as DoanhThu
      FROM SanPham
      LEFT JOIN ChiTietHoaDon ON ChiTietHoaDon.MaSanPham = SanPham.MaSanPham
      LEFT JOIN HoaDon ON ChiTietHoaDon.MaHoaDon = HoaDon.MaHoaDon 
        AND HoaDon.TrangThai LIKE N'%thanh toán%'
      GROUP BY SanPham.MaSanPham, SanPham.TenSanPham, SanPham.GiaBan, SanPham.HinhAnh
      ORDER BY SoLuongBan DESC, DoanhThu DESC
    `, { limit });
    
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Top products error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
