import { Router } from 'express';
import { query, queryOne } from '../config/database';
import { authorizeRoles } from '../middleware/auth';

const router = Router();
router.use(authorizeRoles('Admin'));

// GET tong quan bao cao
router.get('/tong-quan', async (req, res) => {
  try {
    const summary = await queryOne<any>(`WITH Paid AS (SELECT hd.MaHoaDon,COALESCE(SUM(tt.SoTien),0) PaidTotal FROM HoaDon hd LEFT JOIN ThuTienDonHang tt ON tt.MaHoaDon=hd.MaHoaDon GROUP BY hd.MaHoaDon),
      Lines AS (SELECT MaHoaDon,SUM(COALESCE(GiaThucTraSnapshot,GiaThucTra,ThanhTien/NULLIF(SoLuong,0),DonGia)*SoLuong) ProductTotal FROM ChiTietHoaDon GROUP BY MaHoaDon)
      SELECT
      COALESCE((SELECT SUM(l.ProductTotal) FROM HoaDon hd JOIN Paid p ON p.MaHoaDon=hd.MaHoaDon JOIN Lines l ON l.MaHoaDon=hd.MaHoaDon WHERE hd.TrangThai IN(N'DA_GIAO',N'HOAN_THANH') AND p.PaidTotal>=hd.TongTien),0)-COALESCE((SELECT SUM(SoTien) FROM GiaoDichHoanTienTra WHERE TrangThai='DA_HOAN_TIEN'),0) tongDoanhThu,
      COALESCE((SELECT SUM(l.ProductTotal) FROM HoaDon hd JOIN Paid p ON p.MaHoaDon=hd.MaHoaDon JOIN Lines l ON l.MaHoaDon=hd.MaHoaDon WHERE hd.TrangThai IN(N'DA_GIAO',N'HOAN_THANH') AND p.PaidTotal>=hd.TongTien),0) doanhThuDonHoanTat,
      COALESCE((SELECT SUM(g.SoTien) FROM GiaoDichHoanTienTra g JOIN YeuCauHoanTra r ON r.Id=g.YeuCauId JOIN Paid p ON p.MaHoaDon=r.MaHoaDon WHERE g.TrangThai='DA_HOAN_TIEN' AND p.PaidTotal>0),0) hoanTienHang,
      COALESCE((SELECT SUM(PaidTotal) FROM Paid),0) tongKhachDaThanhToan,
      (SELECT COUNT(*) FROM HoaDon hd WHERE hd.TrangThaiThanhToan IN(N'DA_THANH_TOAN',N'HOAN_MOT_PHAN',N'DA_HOAN_TIEN') AND NOT EXISTS(SELECT 1 FROM ThuTienDonHang t WHERE t.MaHoaDon=hd.MaHoaDon)) soDonThanhToanCuChuaXacMinh,
      COALESCE((SELECT SUM(hd.TongTien) FROM HoaDon hd WHERE hd.TrangThaiThanhToan IN(N'DA_THANH_TOAN',N'HOAN_MOT_PHAN',N'DA_HOAN_TIEN') AND NOT EXISTS(SELECT 1 FROM ThuTienDonHang t WHERE t.MaHoaDon=hd.MaHoaDon)),0) tienThanhToanCuChuaXacMinh,
      COALESCE((SELECT SUM(tt.SoTien) FROM ThuTienDonHang tt WHERE tt.NguonThu='SHOP_TRUC_TIEP'),0)+COALESCE((SELECT SUM(TienShopNhan) FROM DoiSoatCOD),0) tienShopThucNhan,
      COALESCE((SELECT SUM(vc.TienThuHo) FROM VanChuyen vc WHERE vc.TrangThaiCOD IN(N'DA_THU_HO',N'THU_MOT_PHAN',N'NHAN_MOT_PHAN') AND NOT EXISTS(SELECT 1 FROM ThuTienDonHang t WHERE t.VanChuyenId=vc.Id AND t.NguonThu='VAN_CHUYEN')),0) codLegacyChuaDoiSoat,
      COALESCE((SELECT SUM(c.Collected-ISNULL(s.Accounted,0)) FROM (SELECT VanChuyenId,SUM(SoTien) Collected FROM ThuTienDonHang WHERE NguonThu='VAN_CHUYEN' GROUP BY VanChuyenId)c OUTER APPLY(SELECT SUM(TienShopNhan+PhiKhauTru+DieuChinh) Accounted FROM DoiSoatCOD WHERE VanChuyenId=c.VanChuyenId)s),0) codChoDoiSoat,
      COALESCE((SELECT SUM(vc.TienThuHo) FROM VanChuyen vc WHERE vc.TrangThaiCOD IN(N'DA_THU_HO',N'CHO_DOI_SOAT',N'DA_DOI_SOAT') AND NOT EXISTS(SELECT 1 FROM ThuTienDonHang t WHERE t.VanChuyenId=vc.Id AND t.NguonThu='VAN_CHUYEN')),0) codCuChuaXacMinh,
      (SELECT COUNT(*) FROM HoaDon) tongDonHang,
      (SELECT COUNT(*) FROM HoaDon hd JOIN Paid p ON p.MaHoaDon=hd.MaHoaDon WHERE hd.TrangThai IN(N'DA_GIAO',N'HOAN_THANH') AND p.PaidTotal>=hd.TongTien) donHoanThanh,
      (SELECT COUNT(*) FROM HoaDon WHERE TrangThai=N'DA_HUY') donHuy,
      (SELECT COUNT(*) FROM KhachHang) tongKhachHang,
      (SELECT COUNT(*) FROM SanPham WHERE IsDeleted=0) tongSanPham,
      (SELECT COUNT(*) FROM SanPham sp OUTER APPLY(SELECT SUM(l.SoLuongTon-l.SoLuongDaGiu) available FROM LoSanPham l
        WHERE l.MaSanPham=sp.MaSanPham AND l.TrangThai<>N'Đã hủy' AND (l.HanSuDung IS NULL OR l.HanSuDung>=CONVERT(date,GETDATE()))) stock
        WHERE sp.IsDeleted=0 AND COALESCE(stock.available,sp.SoLuong,0)<=0) sanPhamHetHang`);

    res.json({
      success: true,
      data: {
        ...summary,
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
    const days = Number.parseInt(period, 10);
    if (![7, 30, 90].includes(days)) return res.status(400).json({ success: false, message: 'Khoảng thời gian chỉ nhận 7, 30 hoặc 90 ngày' });

    const data = await query(`WITH Paid AS (SELECT hd.MaHoaDon,COALESCE(SUM(tt.SoTien),0) PaidTotal,MAX(tt.ThoiDiemThu) PaidAt FROM HoaDon hd LEFT JOIN ThuTienDonHang tt ON tt.MaHoaDon=hd.MaHoaDon GROUP BY hd.MaHoaDon),
      Revenue AS (SELECT CAST(CASE WHEN p.PaidAt>COALESCE(hd.NgayHoanTat,hd.NgayCapNhat,hd.NgayLap) THEN p.PaidAt ELSE COALESCE(hd.NgayHoanTat,hd.NgayCapNhat,hd.NgayLap) END AS date) ngay,COUNT(DISTINCT hd.MaHoaDon) soDonHang,
        SUM(COALESCE(ct.GiaThucTraSnapshot,ct.GiaThucTra,ct.ThanhTien/NULLIF(ct.SoLuong,0),ct.DonGia)*ct.SoLuong) doanhThuDonHoanTat
        FROM HoaDon hd JOIN Paid p ON p.MaHoaDon=hd.MaHoaDon JOIN ChiTietHoaDon ct ON ct.MaHoaDon=hd.MaHoaDon
        WHERE hd.TrangThai IN(N'DA_GIAO',N'HOAN_THANH') AND p.PaidTotal>=hd.TongTien AND CASE WHEN p.PaidAt>COALESCE(hd.NgayHoanTat,hd.NgayCapNhat,hd.NgayLap) THEN p.PaidAt ELSE COALESCE(hd.NgayHoanTat,hd.NgayCapNhat,hd.NgayLap) END>=DATEADD(day,-@days+1,CONVERT(date,GETDATE()))
        GROUP BY CAST(CASE WHEN p.PaidAt>COALESCE(hd.NgayHoanTat,hd.NgayCapNhat,hd.NgayLap) THEN p.PaidAt ELSE COALESCE(hd.NgayHoanTat,hd.NgayCapNhat,hd.NgayLap) END AS date)),
      Refund AS (SELECT CAST(g.NgayTao AS date) ngay,SUM(g.SoTien) hoanTienHang FROM GiaoDichHoanTienTra g JOIN YeuCauHoanTra r ON r.Id=g.YeuCauId JOIN Paid p ON p.MaHoaDon=r.MaHoaDon WHERE g.TrangThai='DA_HOAN_TIEN' AND p.PaidTotal>0 AND g.NgayTao>=DATEADD(day,-@days+1,CONVERT(date,GETDATE())) GROUP BY CAST(g.NgayTao AS date))
      SELECT COALESCE(v.ngay,r.ngay) ngay,FORMAT(COALESCE(v.ngay,r.ngay),'dd/MM') nhanNgay,ISNULL(v.soDonHang,0) soDonHang,ISNULL(v.doanhThuDonHoanTat,0) doanhThuDonHoanTat,ISNULL(r.hoanTienHang,0) hoanTienHang,
        ISNULL(v.doanhThuDonHoanTat,0)-ISNULL(r.hoanTienHang,0) doanhThu FROM Revenue v FULL JOIN Refund r ON r.ngay=v.ngay ORDER BY COALESCE(v.ngay,r.ngay)`, { days });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET san pham ban chay
router.get('/san-pham-ban-chay', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, Number.parseInt(String(req.query.limit || '10'), 10) || 10));

    const data = await query(`
      SELECT TOP(@limit)
        SP.MaSanPham,
        SP.TenSanPham,
        SP.HinhAnh,
        SP.GiaBan,
        SP.GiaKhuyenMai,
        DM.TenDanhMuc,
        ISNULL(SUM(CT.SoLuong), 0) as SoLuongBan,
        ISNULL(SUM(COALESCE(CT.GiaThucTraSnapshot,CT.GiaThucTra,CT.ThanhTien/NULLIF(CT.SoLuong,0),CT.DonGia)*CT.SoLuong), 0) as DoanhThu
      FROM SanPham SP
      LEFT JOIN DanhMuc DM ON SP.MaDanhMuc = DM.MaDanhMuc
      JOIN ChiTietHoaDon CT ON SP.MaSanPham = CT.MaSanPham
      JOIN HoaDon HD ON CT.MaHoaDon = HD.MaHoaDon
        AND HD.TrangThai IN(N'DA_GIAO',N'HOAN_THANH') AND (SELECT ISNULL(SUM(tt.SoTien),0) FROM ThuTienDonHang tt WHERE tt.MaHoaDon=HD.MaHoaDon)>=HD.TongTien
      WHERE SP.IsDeleted=0
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
        ISNULL(SUM(HD.TongTien), 0) as TongTien
      FROM HoaDon HD
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
        ISNULL(SUM(COALESCE(CT.GiaThucTraSnapshot,CT.GiaThucTra,CT.ThanhTien/NULLIF(CT.SoLuong,0),CT.DonGia)*CT.SoLuong), 0) as DoanhThu
      FROM DanhMuc DM
      LEFT JOIN SanPham SP ON DM.MaDanhMuc = SP.MaDanhMuc
      LEFT JOIN ChiTietHoaDon CT ON SP.MaSanPham = CT.MaSanPham
      JOIN HoaDon HD ON CT.MaHoaDon = HD.MaHoaDon AND HD.TrangThai IN(N'DA_GIAO',N'HOAN_THANH') AND (SELECT ISNULL(SUM(tt.SoTien),0) FROM ThuTienDonHang tt WHERE tt.MaHoaDon=HD.MaHoaDon)>=HD.TongTien
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
    const limit = Math.max(1, Math.min(50, Number.parseInt(String(req.query.limit || '5'), 10) || 5));

    const data = await query(`
      SELECT TOP(@limit)
        KH.MaKhachHang,
        KH.HoTen,
        KH.SoDienThoai,
        KH.Email,
        COUNT(DISTINCT HD.MaHoaDon) as SoDonHang,
        ISNULL(SUM(HD.Net), 0) as TongChiTieu
      FROM KhachHang KH
      LEFT JOIN (SELECT hd.MaHoaDon,hd.MaKhachHang,lines.ProductTotal-ISNULL(refunds.Refunded,0) Net
        FROM HoaDon hd
        OUTER APPLY(SELECT SUM(COALESCE(ct.GiaThucTraSnapshot,ct.GiaThucTra,ct.ThanhTien/NULLIF(ct.SoLuong,0),ct.DonGia)*ct.SoLuong) ProductTotal FROM ChiTietHoaDon ct WHERE ct.MaHoaDon=hd.MaHoaDon) lines
        OUTER APPLY(SELECT SUM(g.SoTien) Refunded FROM GiaoDichHoanTienTra g JOIN YeuCauHoanTra r ON r.Id=g.YeuCauId WHERE r.MaHoaDon=hd.MaHoaDon AND g.TrangThai='DA_HOAN_TIEN') refunds
        WHERE hd.TrangThai IN(N'DA_GIAO',N'HOAN_THANH') AND (SELECT ISNULL(SUM(tt.SoTien),0) FROM ThuTienDonHang tt WHERE tt.MaHoaDon=hd.MaHoaDon)>=hd.TongTien) HD ON KH.MaKhachHang=HD.MaKhachHang
      GROUP BY KH.MaKhachHang, KH.HoTen, KH.SoDienThoai, KH.Email
      ORDER BY TongChiTieu DESC
    `, { limit });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
