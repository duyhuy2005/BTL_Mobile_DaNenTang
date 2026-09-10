import { Router } from 'express';
import { query, queryOne } from '../config/database';

const router = Router();

// GET tong quan bao cao
router.get('/tong-quan', async (req, res) => {
  try {
    const tongDoanhThu = await queryOne<{ total: number }>(`
      SELECT ISNULL(SUM(CT.ThanhTien), 0) as total
      FROM HoaDon HD
      JOIN ChiTietHoaDon CT ON HD.MaHoaDon = CT.MaHoaDon
      WHERE HD.TrangThai = N'Đã thanh toán'
    `, {}) || { total: 0 };

    const tongDonHang = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM HoaDon`, {}
    ) || { total: 0 };

    const donHoanThanh = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM HoaDon WHERE TrangThai = N'Đã thanh toán'`, {}
    ) || { total: 0 };

    const donHuy = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM HoaDon WHERE TrangThai = N'Đã hủy'`, {}
    ) || { total: 0 };

    const tongKhachHang = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM KhachHang`, {}
    ) || { total: 0 };

    const tongSanPham = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM SanPham`, {}
    ) || { total: 0 };

    const sanPhamHetHang = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM SanPham WHERE SoLuong = 0`, {}
    ) || { total: 0 };

    res.json({
      success: true,
      data: {
        tongDoanhThu: tongDoanhThu.total,
        tongDonHang: tongDonHang.total,
        donHoanThanh: donHoanThanh.total,
        donHuy: donHuy.total,
        tongKhachHang: tongKhachHang.total,
        tongSanPham: tongSanPham.total,
        sanPhamHetHang: sanPhamHetHang.total
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET doanh thu theo ngay (30 ngay)
router.get('/doanh-thu', async (req, res) => {
  try {
    const period = (req.query.period as string) || '30';
    const days = parseInt(period);

    const data = await query(`
      SELECT
        CAST(HD.NgayLap AS DATE) as ngay,
        FORMAT(HD.NgayLap, 'dd/MM') as nhanNgay,
        COUNT(DISTINCT HD.MaHoaDon) as soDonHang,
        ISNULL(SUM(CT.ThanhTien), 0) as doanhThu
      FROM HoaDon HD
      LEFT JOIN ChiTietHoaDon CT ON HD.MaHoaDon = CT.MaHoaDon
      WHERE HD.NgayLap >= DATEADD(day, -${days}, GETDATE())
        AND HD.TrangThai = N'Đã thanh toán'
      GROUP BY CAST(HD.NgayLap AS DATE), FORMAT(HD.NgayLap, 'dd/MM')
      ORDER BY CAST(HD.NgayLap AS DATE)
    `, {});

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET san pham ban chay
router.get('/san-pham-ban-chay', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const data = await query(`
      SELECT TOP(@limit)
        SP.MaSanPham,
        SP.TenSanPham,
        SP.HinhAnh,
        SP.GiaBan,
        SP.GiaKhuyenMai,
        DM.TenDanhMuc,
        ISNULL(SUM(CT.SoLuong), 0) as SoLuongBan,
        ISNULL(SUM(CT.ThanhTien), 0) as DoanhThu
      FROM SanPham SP
      LEFT JOIN DanhMuc DM ON SP.MaDanhMuc = DM.MaDanhMuc
      LEFT JOIN ChiTietHoaDon CT ON SP.MaSanPham = CT.MaSanPham
      LEFT JOIN HoaDon HD ON CT.MaHoaDon = HD.MaHoaDon AND HD.TrangThai = N'Đã thanh toán'
      GROUP BY SP.MaSanPham, SP.TenSanPham, SP.HinhAnh, SP.GiaBan, SP.GiaKhuyenMai, DM.TenDanhMuc
      ORDER BY SoLuongBan DESC
    `, { limit });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET don hang theo trang thai
router.get('/don-hang-trang-thai', async (req, res) => {
  try {
    const data = await query(`
      SELECT
        TrangThai,
        COUNT(*) as SoDon,
        ISNULL(SUM(CT.ThanhTien), 0) as TongTien
      FROM HoaDon HD
      LEFT JOIN ChiTietHoaDon CT ON HD.MaHoaDon = CT.MaHoaDon
      GROUP BY HD.TrangThai
      ORDER BY SoDon DESC
    `, {});

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET doanh thu theo danh muc
router.get('/doanh-thu-danh-muc', async (req, res) => {
  try {
    const data = await query(`
      SELECT
        DM.TenDanhMuc,
        COUNT(DISTINCT CT.MaHoaDon) as SoDon,
        ISNULL(SUM(CT.SoLuong), 0) as SoLuongBan,
        ISNULL(SUM(CT.ThanhTien), 0) as DoanhThu
      FROM DanhMuc DM
      LEFT JOIN SanPham SP ON DM.MaDanhMuc = SP.MaDanhMuc
      LEFT JOIN ChiTietHoaDon CT ON SP.MaSanPham = CT.MaSanPham
      LEFT JOIN HoaDon HD ON CT.MaHoaDon = HD.MaHoaDon AND HD.TrangThai = N'Đã thanh toán'
      GROUP BY DM.MaDanhMuc, DM.TenDanhMuc
      ORDER BY DoanhThu DESC
    `, {});

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET khach hang mua nhieu nhat
router.get('/khach-hang-top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    const data = await query(`
      SELECT TOP(@limit)
        KH.MaKhachHang,
        KH.HoTen,
        KH.SoDienThoai,
        KH.Email,
        COUNT(HD.MaHoaDon) as SoDonHang,
        ISNULL(SUM(CT.ThanhTien), 0) as TongChiTieu
      FROM KhachHang KH
      LEFT JOIN HoaDon HD ON KH.MaKhachHang = HD.MaKhachHang AND HD.TrangThai = N'Đã thanh toán'
      LEFT JOIN ChiTietHoaDon CT ON HD.MaHoaDon = CT.MaHoaDon
      GROUP BY KH.MaKhachHang, KH.HoTen, KH.SoDienThoai, KH.Email
      ORDER BY TongChiTieu DESC
    `, { limit });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
