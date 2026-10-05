/* Additive order-management fields. Safe to rerun and preserves all existing orders. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH('dbo.HoaDon','TrangThaiVanChuyen') IS NULL ALTER TABLE dbo.HoaDon ADD TrangThaiVanChuyen NVARCHAR(50) NULL;
  IF COL_LENGTH('dbo.HoaDon','DonViVanChuyen') IS NULL ALTER TABLE dbo.HoaDon ADD DonViVanChuyen NVARCHAR(100) NULL;
  IF COL_LENGTH('dbo.HoaDon','MaVanDon') IS NULL ALTER TABLE dbo.HoaDon ADD MaVanDon VARCHAR(100) NULL;
  IF COL_LENGTH('dbo.HoaDon','LyDoHuy') IS NULL ALTER TABLE dbo.HoaDon ADD LyDoHuy NVARCHAR(1000) NULL;
  IF COL_LENGTH('dbo.HoaDon','NgayCapNhat') IS NULL ALTER TABLE dbo.HoaDon ADD NgayCapNhat DATETIME NULL;
  IF COL_LENGTH('dbo.HoaDon','GiamGiaSanPham') IS NULL ALTER TABLE dbo.HoaDon ADD GiamGiaSanPham DECIMAL(18,2) NULL;
  IF COL_LENGTH('dbo.HoaDon','GiamGiaVoucher') IS NULL ALTER TABLE dbo.HoaDon ADD GiamGiaVoucher DECIMAL(18,2) NULL;

  IF COL_LENGTH('dbo.ChiTietHoaDon','MaSKUSnapshot') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD MaSKUSnapshot VARCHAR(50) NULL;
  IF COL_LENGTH('dbo.ChiTietHoaDon','BienTheSnapshot') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD BienTheSnapshot NVARCHAR(200) NULL;

  EXEC sp_executesql N'
    UPDATE dbo.HoaDon SET
      TrangThaiThanhToan=CASE
        WHEN TrangThai IN(N''Đã thanh toán'',N''Đã giao'',N''Hoàn thành'') THEN N''Đã thanh toán''
        WHEN PhuongThucThanhToan IN(N''COD'',N''Tiền mặt'') THEN N''Chưa thanh toán''
        ELSE N''Chờ thanh toán'' END
    WHERE TrangThaiThanhToan IS NULL;
    UPDATE dbo.HoaDon SET TrangThaiVanChuyen=CASE WHEN TrangThai IN(N''Đã giao'',N''Hoàn thành'') THEN N''Giao thành công'' ELSE N''Chưa tạo vận đơn'' END WHERE TrangThaiVanChuyen IS NULL;
    UPDATE dbo.HoaDon SET TamTinh=x.TamTinh,GiamGia=ISNULL(GiamGia,0),GiamGiaSanPham=ISNULL(GiamGiaSanPham,0),GiamGiaVoucher=ISNULL(GiamGiaVoucher,0),PhiVanChuyen=ISNULL(PhiVanChuyen,0),TongTien=x.TamTinh+ISNULL(PhiVanChuyen,0)-ISNULL(GiamGia,0),NgayCapNhat=ISNULL(NgayCapNhat,NgayLap)
    FROM dbo.HoaDon hd CROSS APPLY(SELECT ISNULL(SUM(ct.SoLuong*ct.DonGia),0) TamTinh FROM dbo.ChiTietHoaDon ct WHERE ct.MaHoaDon=hd.MaHoaDon)x WHERE hd.TamTinh IS NULL OR hd.TongTien IS NULL OR hd.NgayCapNhat IS NULL;
    UPDATE ct SET MaSKUSnapshot=sp.MaSKU,BienTheSnapshot=CASE WHEN sp.DungTich IS NOT NULL THEN CONCAT(CONVERT(varchar(30),sp.DungTich),'' '',ISNULL(sp.DonVi,'''')) ELSE sp.QuyCachDongGoi END FROM dbo.ChiTietHoaDon ct JOIN dbo.SanPham sp ON sp.MaSanPham=ct.MaSanPham WHERE ct.MaSKUSnapshot IS NULL OR ct.BienTheSnapshot IS NULL;
  ';

  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_HoaDon_QuanLy' AND object_id=OBJECT_ID('dbo.HoaDon')) CREATE INDEX IX_HoaDon_QuanLy ON dbo.HoaDon(TrangThai,TrangThaiThanhToan,NgayLap DESC);
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_HoaDon_MaVanDon' AND object_id=OBJECT_ID('dbo.HoaDon')) EXEC(N'CREATE UNIQUE INDEX UX_HoaDon_MaVanDon ON dbo.HoaDon(MaVanDon) WHERE MaVanDon IS NOT NULL;');

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
