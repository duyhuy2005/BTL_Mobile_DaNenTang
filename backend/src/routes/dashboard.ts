import { Router } from "express";
import { query, queryOne } from "../config/database";
import { AuthRequest, authorizeRoles } from "../middleware/auth";

const router = Router();

// One staff-only snapshot for the employee overview. Every count and list uses
// the same status predicates, and old unprocessed orders are intentionally kept.
router.get("/staff-overview", authorizeRoles("Admin", "NhanVien"), async (_req: AuthRequest, res) => {
  try {
    const stats = await queryOne<any>(`SELECT
      COALESCE(SUM(CASE WHEN TrangThai=N'CHO_XAC_NHAN' THEN 1 ELSE 0 END),0) ChoXacNhan,
      COALESCE(SUM(CASE WHEN TrangThai IN(N'DA_XAC_NHAN',N'DANG_CHUAN_BI',N'DA_DONG_GOI') THEN 1 ELSE 0 END),0) DangChuanBi,
      COALESCE(SUM(CASE WHEN TrangThai=N'DANG_GIAO' THEN 1 ELSE 0 END),0) DangGiao
      FROM HoaDon`);
    const returns = await queryOne<any>(`SELECT COALESCE(SUM(CASE WHEN TrangThai=N'CHO_DUYET' THEN 1 ELSE 0 END),0) ChoDuyet FROM YeuCauHoanTra`);
    const pendingOrders = await query<any>(`SELECT TOP 8 hd.MaHoaDon,hd.NgayLap,hd.TongTien,hd.TrangThai,hd.PhuongThucThanhToan,
        hd.TrangThaiThanhToan,hd.TrangThaiVanChuyen,COALESCE(vc.TrangThai,hd.TrangThaiVanChuyen,N'CHUA_TAO_VAN_DON') TrangThaiVanChuyenHienTai,
        COALESCE(vc.TenDonVi,hd.DonViVanChuyen) DonViVanChuyen,COALESCE(vc.MaVanDon,hd.MaVanDon) MaVanDon,
        COALESCE(hd.TenNguoiNhan,kh.HoTen,N'Khách lẻ') HoTen,
        (SELECT TOP 3 ct.MaSanPham,COALESCE(ct.TenSanPhamSnapshot,sp.TenSanPham) TenSanPham,
          COALESCE(ct.HinhAnhSnapshot,sp.HinhAnh) HinhAnh,ct.SoLuong
         FROM ChiTietHoaDon ct LEFT JOIN SanPham sp ON sp.MaSanPham=ct.MaSanPham
         WHERE ct.MaHoaDon=hd.MaHoaDon FOR JSON PATH) SanPhamJSON
      FROM HoaDon hd LEFT JOIN KhachHang kh ON kh.MaKhachHang=hd.MaKhachHang
      OUTER APPLY(SELECT TOP 1 v.MaVanDon,v.TrangThai,dv.TenDonVi FROM VanChuyen v JOIN DonViVanChuyen dv ON dv.Id=v.DonViVanChuyenId WHERE v.HoaDonId=hd.MaHoaDon ORDER BY v.Id DESC) vc
      WHERE hd.TrangThai=N'CHO_XAC_NHAN' ORDER BY hd.NgayLap,hd.MaHoaDon`);
    const preparationOrders = await query<any>(`SELECT TOP 8 hd.MaHoaDon,hd.NgayLap,hd.TongTien,hd.TrangThai,hd.PhuongThucThanhToan,
        hd.TrangThaiThanhToan,hd.TrangThaiVanChuyen,COALESCE(vc.TrangThai,hd.TrangThaiVanChuyen,N'CHUA_TAO_VAN_DON') TrangThaiVanChuyenHienTai,
        COALESCE(vc.TenDonVi,hd.DonViVanChuyen) DonViVanChuyen,COALESCE(vc.MaVanDon,hd.MaVanDon) MaVanDon,
        COALESCE(hd.TenNguoiNhan,kh.HoTen,N'Khách lẻ') HoTen,
        (SELECT TOP 3 ct.MaSanPham,COALESCE(ct.TenSanPhamSnapshot,sp.TenSanPham) TenSanPham,
          COALESCE(ct.HinhAnhSnapshot,sp.HinhAnh) HinhAnh,ct.SoLuong
         FROM ChiTietHoaDon ct LEFT JOIN SanPham sp ON sp.MaSanPham=ct.MaSanPham
         WHERE ct.MaHoaDon=hd.MaHoaDon FOR JSON PATH) SanPhamJSON
      FROM HoaDon hd LEFT JOIN KhachHang kh ON kh.MaKhachHang=hd.MaKhachHang
      OUTER APPLY(SELECT TOP 1 v.MaVanDon,v.TrangThai,dv.TenDonVi FROM VanChuyen v JOIN DonViVanChuyen dv ON dv.Id=v.DonViVanChuyenId WHERE v.HoaDonId=hd.MaHoaDon ORDER BY v.Id DESC) vc
      WHERE hd.TrangThai IN(N'DA_XAC_NHAN',N'DANG_CHUAN_BI',N'DA_DONG_GOI') ORDER BY hd.NgayLap,hd.MaHoaDon`);
    const deliveryOrders = await query<any>(`SELECT TOP 8 hd.MaHoaDon,hd.NgayLap,hd.TongTien,hd.TrangThai,hd.PhuongThucThanhToan,
        hd.TrangThaiThanhToan,hd.TrangThaiVanChuyen,COALESCE(vc.TrangThai,hd.TrangThaiVanChuyen,N'CHUA_TAO_VAN_DON') TrangThaiVanChuyenHienTai,
        COALESCE(vc.TenDonVi,hd.DonViVanChuyen) DonViVanChuyen,COALESCE(vc.MaVanDon,hd.MaVanDon) MaVanDon,
        COALESCE(hd.TenNguoiNhan,kh.HoTen,N'Khách lẻ') HoTen,
        (SELECT TOP 3 ct.MaSanPham,COALESCE(ct.TenSanPhamSnapshot,sp.TenSanPham) TenSanPham,
          COALESCE(ct.HinhAnhSnapshot,sp.HinhAnh) HinhAnh,ct.SoLuong
         FROM ChiTietHoaDon ct LEFT JOIN SanPham sp ON sp.MaSanPham=ct.MaSanPham
         WHERE ct.MaHoaDon=hd.MaHoaDon FOR JSON PATH) SanPhamJSON
      FROM HoaDon hd LEFT JOIN KhachHang kh ON kh.MaKhachHang=hd.MaKhachHang
      OUTER APPLY(SELECT TOP 1 v.MaVanDon,v.TrangThai,dv.TenDonVi FROM VanChuyen v JOIN DonViVanChuyen dv ON dv.Id=v.DonViVanChuyenId WHERE v.HoaDonId=hd.MaHoaDon ORDER BY CASE WHEN v.TrangThai=N'DA_HUY_VAN_DON' THEN 1 ELSE 0 END,v.Id DESC) vc
      WHERE hd.TrangThai=N'DANG_GIAO' ORDER BY hd.NgayLap,hd.MaHoaDon`);
    const lowStockProducts = await query<any>(`SELECT TOP 5 sp.MaSanPham,sp.TenSanPham,sp.MaSKU,sp.HinhAnh,
        COALESCE(stock.TonThucTe,0) TonThucTe,COALESCE(stock.DaGiu,0) DaGiu,COALESCE(stock.CoTheBan,0) CoTheBan,
        ISNULL(sp.NguongCanhBaoTonKho,10) NguongCanhBaoTonKho
      FROM SanPham sp OUTER APPLY(SELECT SUM(l.SoLuongTon) TonThucTe,SUM(l.SoLuongDaGiu) DaGiu,
        SUM(CASE WHEN l.HanSuDung IS NULL OR l.HanSuDung>=CAST(GETDATE() AS date) THEN l.SoLuongTon-l.SoLuongDaGiu ELSE 0 END) CoTheBan
        FROM LoSanPham l WHERE l.MaSanPham=sp.MaSanPham AND l.TrangThai<>N'Đã hủy') stock
      WHERE sp.TrangThai=1 AND COALESCE(stock.CoTheBan,0)<=ISNULL(sp.NguongCanhBaoTonKho,10)
      ORDER BY COALESCE(stock.CoTheBan,0),sp.TenSanPham`);
    const rawActivities = await query<any>(`SELECT TOP 10 ls.MaLichSu,ls.MaHoaDon,ls.TrangThaiCu,ls.TrangThaiMoi,ls.NgayThayDoi,
        COALESCE(tk.HoTen,tk.TenDangNhap,N'Hệ thống') NguoiThayDoi
      FROM LichSuTrangThaiHoaDon ls LEFT JOIN TaiKhoan tk ON tk.MaTaiKhoan=ls.NguoiThayDoi
      ORDER BY ls.NgayThayDoi DESC,ls.MaLichSu DESC`);
    const decodeOrders = (rows: any[]) => rows.map(({ SanPhamJSON, ...row }) => {
      let SanPhamTomTat: any[] = [];
      try { SanPhamTomTat = SanPhamJSON ? JSON.parse(SanPhamJSON) : []; } catch { /* malformed legacy preview */ }
      const { TrangThaiVanChuyenHienTai, ...rest } = row;
      return { ...rest, TrangThaiVanChuyen: TrangThaiVanChuyenHienTai, SanPhamTomTat };
    });
    res.json({ success: true, data: {
      stats: { ...stats, YeuCauHoanTra: Number(returns?.ChoDuyet || 0) },
      pendingOrders: decodeOrders(pendingOrders), preparationOrders: decodeOrders(preparationOrders), deliveryOrders: decodeOrders(deliveryOrders),
      lowStockProducts, activities: rawActivities,
    } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Không thể tải tổng quan nhân viên" });
  }
});

router.get("/stats", authorizeRoles("Admin"), async (_req, res) => {
  try {
    const period = Number(_req.query.period || 7);
    if (![7, 30, 90].includes(period)) return res.status(400).json({ success:false, message:"Khoảng thời gian chỉ nhận 7, 30 hoặc 90 ngày" });
    const stats = await queryOne<any>(`SELECT
      COALESCE(SUM(CASE WHEN hd.TrangThai<>N'DA_HUY' AND hd.TrangThaiThanhToan IN(N'DA_THANH_TOAN',N'HOAN_MOT_PHAN',N'DA_HOAN_TIEN') AND COALESCE(paid.PaidTotal,0)>=hd.TongTien THEN 1 ELSE 0 END),0) totalOrdersPaid,
      COUNT(1) totalOrders,
      COALESCE(SUM(CASE WHEN hd.TrangThai=N'CHO_XAC_NHAN' THEN 1 ELSE 0 END),0) pendingOrders,
      COALESCE(SUM(CASE WHEN hd.TrangThai=N'DANG_GIAO' THEN 1 ELSE 0 END),0) shippingOrders,
      COALESCE(SUM(CASE WHEN hd.TrangThai IN(N'DA_GIAO',N'HOAN_THANH') AND hd.TrangThaiThanhToan IN(N'DA_THANH_TOAN',N'HOAN_MOT_PHAN',N'DA_HOAN_TIEN') AND COALESCE(paid.PaidTotal,0)>=hd.TongTien THEN 1 ELSE 0 END),0) completedOrders,
      COALESCE(SUM(CASE WHEN hd.TrangThai=N'DA_HUY' THEN 1 ELSE 0 END),0) cancelledOrders,
      (SELECT COUNT(1) FROM KhachHang) totalCustomers,
      (SELECT COUNT(1) FROM SanPham WHERE IsDeleted=0) totalProducts,
      (SELECT COUNT(1) FROM SanPham sp OUTER APPLY(SELECT SUM(l.SoLuongTon-l.SoLuongDaGiu) available
        FROM LoSanPham l WHERE l.MaSanPham=sp.MaSanPham AND l.TrangThai<>N'Đã hủy'
        AND (l.HanSuDung IS NULL OR l.HanSuDung>=CONVERT(date,GETDATE()))) stock
        WHERE sp.IsDeleted=0 AND COALESCE(stock.available,sp.SoLuong,0)>0
        AND COALESCE(stock.available,sp.SoLuong,0)<=ISNULL(sp.NguongCanhBaoTonKho,10)) lowStockProducts,
      (SELECT COUNT(1) FROM SanPham sp OUTER APPLY(SELECT SUM(l.SoLuongTon-l.SoLuongDaGiu) available
        FROM LoSanPham l WHERE l.MaSanPham=sp.MaSanPham AND l.TrangThai<>N'Đã hủy'
        AND (l.HanSuDung IS NULL OR l.HanSuDung>=CONVERT(date,GETDATE()))) stock
        WHERE sp.IsDeleted=0 AND COALESCE(stock.available,sp.SoLuong,0)<=0) outOfStockProducts,
      (SELECT COUNT(1) FROM YeuCauHoanTra WHERE TrangThai NOT IN('TU_CHOI','TU_CHOI_SAU_KIEM_TRA','DA_HOAN_TIEN','DA_DOI_HANG','HOAN_TAT','DA_HUY')) returnOrders
      FROM HoaDon hd OUTER APPLY(SELECT SUM(tt.SoTien) PaidTotal FROM ThuTienDonHang tt WHERE tt.MaHoaDon=hd.MaHoaDon) paid`);
    const finance = await queryOne<any>(`WITH Paid AS (
        SELECT hd.MaHoaDon,COALESCE(SUM(tt.SoTien),0) PaidTotal,MAX(tt.ThoiDiemThu) PaidAt
        FROM HoaDon hd LEFT JOIN ThuTienDonHang tt ON tt.MaHoaDon=hd.MaHoaDon GROUP BY hd.MaHoaDon,hd.TrangThaiThanhToan,hd.TongTien
      ), Lines AS (SELECT ct.MaHoaDon,SUM(COALESCE(ct.GiaThucTraSnapshot,ct.GiaThucTra,ct.ThanhTien/NULLIF(ct.SoLuong,0),ct.DonGia)*ct.SoLuong) ProductTotal FROM ChiTietHoaDon ct GROUP BY ct.MaHoaDon),
      Eligible AS (SELECT hd.MaHoaDon,hd.PhiVanChuyen,l.ProductTotal,CASE WHEN p.PaidAt>COALESCE(hd.NgayHoanTat,hd.NgayCapNhat,hd.NgayLap) THEN p.PaidAt ELSE COALESCE(hd.NgayHoanTat,hd.NgayCapNhat,hd.NgayLap) END RevenueAt FROM HoaDon hd JOIN Paid p ON p.MaHoaDon=hd.MaHoaDon JOIN Lines l ON l.MaHoaDon=hd.MaHoaDon WHERE hd.TrangThai IN(N'DA_GIAO',N'HOAN_THANH') AND p.PaidTotal>=hd.TongTien),
      Settled AS (SELECT VanChuyenId,SUM(TienShopNhan+PhiKhauTru+DieuChinh) Accounted,SUM(TienShopNhan) CashReceived,SUM(PhiKhauTru) CarrierFees FROM DoiSoatCOD GROUP BY VanChuyenId),
      CarrierCollections AS (SELECT VanChuyenId,SUM(SoTien) Collected FROM ThuTienDonHang WHERE NguonThu='VAN_CHUYEN' GROUP BY VanChuyenId)
      SELECT
        COALESCE((SELECT SUM(ProductTotal) FROM Eligible WHERE RevenueAt>=DATEADD(day,1-@period,CONVERT(date,GETDATE()))),0) completedProductRevenue,
        COALESCE((SELECT SUM(g.SoTien) FROM GiaoDichHoanTienTra g JOIN YeuCauHoanTra r ON r.Id=g.YeuCauId JOIN Paid p ON p.MaHoaDon=r.MaHoaDon WHERE g.TrangThai='DA_HOAN_TIEN' AND p.PaidTotal>0 AND g.NgayTao>=DATEADD(day,1-@period,CONVERT(date,GETDATE()))),0) refundedProductAmount,
        COALESCE((SELECT SUM(ProductTotal) FROM Eligible WHERE RevenueAt>=DATEADD(day,1-@period,CONVERT(date,GETDATE()))),0)-COALESCE((SELECT SUM(g.SoTien) FROM GiaoDichHoanTienTra g JOIN YeuCauHoanTra r ON r.Id=g.YeuCauId JOIN Paid p ON p.MaHoaDon=r.MaHoaDon WHERE g.TrangThai='DA_HOAN_TIEN' AND p.PaidTotal>0 AND g.NgayTao>=DATEADD(day,1-@period,CONVERT(date,GETDATE()))),0) netProductRevenue,
        COALESCE((SELECT SUM(SoTien) FROM ThuTienDonHang WHERE ThoiDiemThu>=DATEADD(day,1-@period,CONVERT(date,GETDATE()))),0) totalCustomerPaid,
        (SELECT COUNT(*) FROM HoaDon hd WHERE hd.TrangThaiThanhToan IN(N'DA_THANH_TOAN',N'HOAN_MOT_PHAN',N'DA_HOAN_TIEN') AND NOT EXISTS(SELECT 1 FROM ThuTienDonHang tt WHERE tt.MaHoaDon=hd.MaHoaDon)) unverifiedLegacyPaidOrders,
        COALESCE((SELECT SUM(hd.TongTien) FROM HoaDon hd WHERE hd.TrangThaiThanhToan IN(N'DA_THANH_TOAN',N'HOAN_MOT_PHAN',N'DA_HOAN_TIEN') AND NOT EXISTS(SELECT 1 FROM ThuTienDonHang tt WHERE tt.MaHoaDon=hd.MaHoaDon)),0) unverifiedLegacyPaidAmount,
        COALESCE((SELECT SUM(c.Collected-ISNULL(s.Accounted,0)) FROM CarrierCollections c LEFT JOIN Settled s ON s.VanChuyenId=c.VanChuyenId WHERE EXISTS(SELECT 1 FROM ThuTienDonHang tt WHERE tt.VanChuyenId=c.VanChuyenId AND tt.NguonThu='VAN_CHUYEN' AND tt.ThoiDiemThu>=DATEADD(day,1-@period,CONVERT(date,GETDATE())))),0) codAwaitingReconciliation,
        COALESCE((SELECT SUM(vc.TienThuHo) FROM VanChuyen vc WHERE vc.TrangThaiCOD IN(N'DA_THU_HO',N'CHO_DOI_SOAT',N'DA_DOI_SOAT') AND NOT EXISTS(SELECT 1 FROM ThuTienDonHang t WHERE t.VanChuyenId=vc.Id AND t.NguonThu='VAN_CHUYEN')),0) codLegacyUnverified,
        COALESCE((SELECT SUM(TienShopNhan) FROM DoiSoatCOD WHERE ThoiDiemNhan>=DATEADD(day,1-@period,CONVERT(date,GETDATE()))),0)+COALESCE((SELECT SUM(SoTien) FROM ThuTienDonHang WHERE NguonThu='SHOP_TRUC_TIEP' AND ThoiDiemThu>=DATEADD(day,1-@period,CONVERT(date,GETDATE()))),0) shopCashReceived,
        COALESCE((SELECT SUM(PhiVanChuyen) FROM Eligible WHERE RevenueAt>=DATEADD(day,1-@period,CONVERT(date,GETDATE()))),0) customerShippingFees,
        COALESCE((SELECT SUM(PhiKhauTru) FROM DoiSoatCOD WHERE ThoiDiemNhan>=DATEADD(day,1-@period,CONVERT(date,GETDATE()))),0) reconciledCarrierFees`, {period});
    const revenueLast7Days = await query<any>(`WITH Paid AS (
        SELECT hd.MaHoaDon,COALESCE(SUM(tt.SoTien),0) PaidTotal,MAX(tt.ThoiDiemThu) PaidAt
        FROM HoaDon hd LEFT JOIN ThuTienDonHang tt ON tt.MaHoaDon=hd.MaHoaDon GROUP BY hd.MaHoaDon,hd.TrangThaiThanhToan,hd.TongTien
      ), Daily AS (
        SELECT CAST(CASE WHEN p.PaidAt>COALESCE(hd.NgayHoanTat,hd.NgayCapNhat,hd.NgayLap) THEN p.PaidAt ELSE COALESCE(hd.NgayHoanTat,hd.NgayCapNhat,hd.NgayLap) END AS date) Day,
          SUM(COALESCE(ct.GiaThucTraSnapshot,ct.GiaThucTra,ct.ThanhTien/NULLIF(ct.SoLuong,0),ct.DonGia)*ct.SoLuong) Revenue
        FROM HoaDon hd JOIN Paid p ON p.MaHoaDon=hd.MaHoaDon JOIN ChiTietHoaDon ct ON ct.MaHoaDon=hd.MaHoaDon
        WHERE hd.TrangThai IN(N'DA_GIAO',N'HOAN_THANH') AND p.PaidTotal>=hd.TongTien AND CASE WHEN p.PaidAt>COALESCE(hd.NgayHoanTat,hd.NgayCapNhat,hd.NgayLap) THEN p.PaidAt ELSE COALESCE(hd.NgayHoanTat,hd.NgayCapNhat,hd.NgayLap) END>=DATEADD(day,-@period+1,CONVERT(date,GETDATE()))
        GROUP BY CAST(CASE WHEN p.PaidAt>COALESCE(hd.NgayHoanTat,hd.NgayCapNhat,hd.NgayLap) THEN p.PaidAt ELSE COALESCE(hd.NgayHoanTat,hd.NgayCapNhat,hd.NgayLap) END AS date)
      ), RefundDaily AS (SELECT CAST(g.NgayTao AS date) Day,SUM(g.SoTien) Refund FROM GiaoDichHoanTienTra g JOIN YeuCauHoanTra r ON r.Id=g.YeuCauId JOIN Paid p ON p.MaHoaDon=r.MaHoaDon WHERE g.TrangThai='DA_HOAN_TIEN' AND p.PaidTotal>0 AND g.NgayTao>=DATEADD(day,-@period+1,CONVERT(date,GETDATE())) GROUP BY CAST(g.NgayTao AS date))
      SELECT CONVERT(varchar(10),COALESCE(d.Day,r.Day),103) ngay,COALESCE(d.Revenue,0) doanhThuDonHoanTat,COALESCE(r.Refund,0) hoanTienHang,COALESCE(d.Revenue,0)-COALESCE(r.Refund,0) doanhThuThuan
      FROM Daily d FULL JOIN RefundDaily r ON r.Day=d.Day ORDER BY COALESCE(d.Day,r.Day)`, { period });
    res.json({
      success: true,
      data: { ...stats, ...finance, revenueLast7Days, periodDays:period, definitions:{completedProductRevenue:"Tiền hàng sau giảm giá của đơn đã giao/hoàn tất và thanh toán đủ; không gồm phí vận chuyển",refundedProductAmount:"Hoàn tiền hàng có giao dịch DA_HOAN_TIEN",netProductRevenue:"Doanh thu đơn hoàn tất trừ hoàn tiền hàng",totalCustomerPaid:"Tổng khoản thu khách đã ghi nhận, kể cả đơn chưa giao",codAwaitingReconciliation:"COD hãng đã xác nhận thu trừ tiền/phí/điều chỉnh đối soát",shopCashReceived:"Tiền thực nhận tại shop và khoản hãng đã chuyển",customerShippingFees:"Phí vận chuyển khách trả trên đơn đủ điều kiện",reconciledCarrierFees:"Phí hãng đã khấu trừ trong đối soát"} },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/top-products", authorizeRoles("Admin"), async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(20, Math.floor(Number(req.query.limit) || 5)));
    const data = await query(`SELECT TOP(@limit) sp.MaSanPham,sp.TenSanPham,sp.GiaBan,sp.HinhAnh,
      COALESCE(SUM(ct.SoLuong),0) TongBan
      FROM SanPham sp JOIN ChiTietHoaDon ct ON ct.MaSanPham=sp.MaSanPham
      JOIN HoaDon hd ON hd.MaHoaDon=ct.MaHoaDon
      WHERE sp.IsDeleted=0 AND hd.TrangThai IN(N'DA_GIAO',N'HOAN_THANH') AND (SELECT ISNULL(SUM(tt.SoTien),0) FROM ThuTienDonHang tt WHERE tt.MaHoaDon=hd.MaHoaDon)>=hd.TongTien
      GROUP BY sp.MaSanPham,sp.TenSanPham,sp.GiaBan,sp.HinhAnh ORDER BY TongBan DESC,sp.MaSanPham`, { limit });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
