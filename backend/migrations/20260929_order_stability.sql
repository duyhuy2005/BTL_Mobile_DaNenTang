/* Order stability - safe for existing data. Run once against the configured database. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH('dbo.HoaDon', 'TenNguoiNhan') IS NULL
    ALTER TABLE dbo.HoaDon ADD TenNguoiNhan NVARCHAR(150) NULL;
  IF COL_LENGTH('dbo.HoaDon', 'SoDienThoaiNhan') IS NULL
    ALTER TABLE dbo.HoaDon ADD SoDienThoaiNhan VARCHAR(20) NULL;
  IF COL_LENGTH('dbo.HoaDon', 'DiaChiGiaoHang') IS NULL
    ALTER TABLE dbo.HoaDon ADD DiaChiGiaoHang NVARCHAR(500) NULL;
  IF COL_LENGTH('dbo.HoaDon', 'TamTinh') IS NULL
    ALTER TABLE dbo.HoaDon ADD TamTinh DECIMAL(18,2) NULL;
  IF COL_LENGTH('dbo.HoaDon', 'GiamGia') IS NULL
    ALTER TABLE dbo.HoaDon ADD GiamGia DECIMAL(18,2) NULL;
  IF COL_LENGTH('dbo.HoaDon', 'PhiVanChuyen') IS NULL
    ALTER TABLE dbo.HoaDon ADD PhiVanChuyen DECIMAL(18,2) NULL;
  IF COL_LENGTH('dbo.HoaDon', 'TongTien') IS NULL
    ALTER TABLE dbo.HoaDon ADD TongTien DECIMAL(18,2) NULL;
  IF COL_LENGTH('dbo.HoaDon', 'TrangThaiThanhToan') IS NULL
    ALTER TABLE dbo.HoaDon ADD TrangThaiThanhToan NVARCHAR(50) NULL;
  IF COL_LENGTH('dbo.HoaDon', 'NgayThanhToan') IS NULL
    ALTER TABLE dbo.HoaDon ADD NgayThanhToan DATETIME NULL;

  IF COL_LENGTH('dbo.ChiTietHoaDon', 'TenSanPhamSnapshot') IS NULL
    ALTER TABLE dbo.ChiTietHoaDon ADD TenSanPhamSnapshot NVARCHAR(200) NULL;
  IF COL_LENGTH('dbo.ChiTietHoaDon', 'HinhAnhSnapshot') IS NULL
    ALTER TABLE dbo.ChiTietHoaDon ADD HinhAnhSnapshot VARCHAR(500) NULL;

  IF OBJECT_ID('dbo.LichSuTrangThaiHoaDon', 'U') IS NULL
    CREATE TABLE dbo.LichSuTrangThaiHoaDon (
      MaLichSu INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      MaHoaDon INT NOT NULL,
      TrangThaiCu NVARCHAR(50) NULL,
      TrangThaiMoi NVARCHAR(50) NOT NULL,
      NguoiThayDoi INT NULL,
      GhiChu NVARCHAR(500) NULL,
      NgayThayDoi DATETIME NOT NULL CONSTRAINT DF_LichSuHD_Ngay DEFAULT GETDATE(),
      CONSTRAINT FK_LichSuHD_HoaDon FOREIGN KEY (MaHoaDon) REFERENCES dbo.HoaDon(MaHoaDon),
      CONSTRAINT FK_LichSuHD_TaiKhoan FOREIGN KEY (NguoiThayDoi) REFERENCES dbo.TaiKhoan(MaTaiKhoan)
    );

  IF OBJECT_ID('dbo.SanPhamYeuThich', 'U') IS NULL
    CREATE TABLE dbo.SanPhamYeuThich (
      MaYeuThich INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      MaKhachHang INT NOT NULL,
      MaSanPham INT NOT NULL,
      NgayThem DATETIME NOT NULL CONSTRAINT DF_YeuThich_NgayThem DEFAULT GETDATE(),
      GhiChu NVARCHAR(500) NULL,
      CONSTRAINT FK_YeuThich_KhachHang FOREIGN KEY (MaKhachHang) REFERENCES dbo.KhachHang(MaKhachHang),
      CONSTRAINT FK_YeuThich_SanPham FOREIGN KEY (MaSanPham) REFERENCES dbo.SanPham(MaSanPham),
      CONSTRAINT UQ_YeuThich_KhachHang_SanPham UNIQUE (MaKhachHang, MaSanPham)
    );

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_KhachHang_MaTaiKhoan' AND object_id=OBJECT_ID('dbo.KhachHang'))
    CREATE UNIQUE INDEX UX_KhachHang_MaTaiKhoan ON dbo.KhachHang(MaTaiKhoan) WHERE MaTaiKhoan IS NOT NULL;
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_NhanVien_MaTaiKhoan' AND object_id=OBJECT_ID('dbo.NhanVien'))
    CREATE UNIQUE INDEX UX_NhanVien_MaTaiKhoan ON dbo.NhanVien(MaTaiKhoan) WHERE MaTaiKhoan IS NOT NULL;
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_GioHang_MaKhachHang' AND object_id=OBJECT_ID('dbo.GioHang'))
    CREATE UNIQUE INDEX UX_GioHang_MaKhachHang ON dbo.GioHang(MaKhachHang);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_HoaDon_MaKhachHang_NgayLap' AND object_id=OBJECT_ID('dbo.HoaDon'))
    CREATE INDEX IX_HoaDon_MaKhachHang_NgayLap ON dbo.HoaDon(MaKhachHang, NgayLap DESC);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_LichSuHD_MaHoaDon_Ngay' AND object_id=OBJECT_ID('dbo.LichSuTrangThaiHoaDon'))
    CREATE INDEX IX_LichSuHD_MaHoaDon_Ngay ON dbo.LichSuTrangThaiHoaDon(MaHoaDon, NgayThayDoi);

  COMMIT TRANSACTION;
  PRINT N'Order stability migration completed.';
END TRY
BEGIN CATCH
  IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
