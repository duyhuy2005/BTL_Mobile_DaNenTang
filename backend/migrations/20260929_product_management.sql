/* Product-management expansion. Additive and safe for existing rows. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH('dbo.SanPham', 'MaSKU') IS NULL ALTER TABLE dbo.SanPham ADD MaSKU VARCHAR(50) NULL;
  IF COL_LENGTH('dbo.SanPham', 'MaVach') IS NULL ALTER TABLE dbo.SanPham ADD MaVach VARCHAR(50) NULL;
  IF COL_LENGTH('dbo.SanPham', 'XuatXu') IS NULL ALTER TABLE dbo.SanPham ADD XuatXu NVARCHAR(150) NULL;
  IF COL_LENGTH('dbo.SanPham', 'ThanhPhan') IS NULL ALTER TABLE dbo.SanPham ADD ThanhPhan NVARCHAR(MAX) NULL;
  IF COL_LENGTH('dbo.SanPham', 'CongDung') IS NULL ALTER TABLE dbo.SanPham ADD CongDung NVARCHAR(MAX) NULL;
  IF COL_LENGTH('dbo.SanPham', 'HuongDanSuDung') IS NULL ALTER TABLE dbo.SanPham ADD HuongDanSuDung NVARCHAR(MAX) NULL;
  IF COL_LENGTH('dbo.SanPham', 'DoiTuongSuDung') IS NULL ALTER TABLE dbo.SanPham ADD DoiTuongSuDung NVARCHAR(500) NULL;
  IF COL_LENGTH('dbo.SanPham', 'LoaiDaPhuHop') IS NULL ALTER TABLE dbo.SanPham ADD LoaiDaPhuHop NVARCHAR(500) NULL;
  IF COL_LENGTH('dbo.SanPham', 'CanhBaoKichUng') IS NULL ALTER TABLE dbo.SanPham ADD CanhBaoKichUng NVARCHAR(MAX) NULL;
  IF COL_LENGTH('dbo.SanPham', 'DungTich') IS NULL ALTER TABLE dbo.SanPham ADD DungTich DECIMAL(12,2) NULL;
  IF COL_LENGTH('dbo.SanPham', 'DonVi') IS NULL ALTER TABLE dbo.SanPham ADD DonVi NVARCHAR(20) NULL;
  IF COL_LENGTH('dbo.SanPham', 'QuyCachDongGoi') IS NULL ALTER TABLE dbo.SanPham ADD QuyCachDongGoi NVARCHAR(250) NULL;
  IF COL_LENGTH('dbo.SanPham', 'GiaKhuyenMai') IS NULL ALTER TABLE dbo.SanPham ADD GiaKhuyenMai DECIMAL(18,2) NULL;
  IF COL_LENGTH('dbo.SanPham', 'NgaySanXuat') IS NULL ALTER TABLE dbo.SanPham ADD NgaySanXuat DATE NULL;
  IF COL_LENGTH('dbo.SanPham', 'HanSuDung') IS NULL ALTER TABLE dbo.SanPham ADD HanSuDung DATE NULL;
  IF COL_LENGTH('dbo.SanPham', 'NguongCanhBaoTonKho') IS NULL ALTER TABLE dbo.SanPham ADD NguongCanhBaoTonKho INT NULL;
  IF COL_LENGTH('dbo.SanPham', 'NguonThongTin') IS NULL ALTER TABLE dbo.SanPham ADD NguonThongTin NVARCHAR(100) NULL;
  IF COL_LENGTH('dbo.SanPham', 'UpdatedAt') IS NULL ALTER TABLE dbo.SanPham ADD UpdatedAt DATETIME NULL;
  IF COL_LENGTH('dbo.SanPham', 'IsDeleted') IS NULL ALTER TABLE dbo.SanPham ADD IsDeleted BIT NOT NULL CONSTRAINT DF_SanPham_IsDeleted DEFAULT 0;

  IF OBJECT_ID('dbo.SanPhamHinhAnh', 'U') IS NULL
    CREATE TABLE dbo.SanPhamHinhAnh (
      MaHinhAnh INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      MaSanPham INT NOT NULL,
      DuongDan VARCHAR(500) NOT NULL,
      LaAnhDaiDien BIT NOT NULL CONSTRAINT DF_SPHinhAnh_DaiDien DEFAULT 0,
      ThuTu INT NOT NULL CONSTRAINT DF_SPHinhAnh_ThuTu DEFAULT 0,
      NgayTao DATETIME NOT NULL CONSTRAINT DF_SPHinhAnh_NgayTao DEFAULT GETDATE(),
      CONSTRAINT FK_SPHinhAnh_SanPham FOREIGN KEY (MaSanPham) REFERENCES dbo.SanPham(MaSanPham)
    );

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_SanPham_MaSKU' AND object_id=OBJECT_ID('dbo.SanPham'))
    EXEC(N'CREATE UNIQUE INDEX UX_SanPham_MaSKU ON dbo.SanPham(MaSKU) WHERE MaSKU IS NOT NULL;');
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_SanPham_MaVach' AND object_id=OBJECT_ID('dbo.SanPham'))
    EXEC(N'CREATE UNIQUE INDEX UX_SanPham_MaVach ON dbo.SanPham(MaVach) WHERE MaVach IS NOT NULL;');
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_SanPham_QuanLy' AND object_id=OBJECT_ID('dbo.SanPham'))
    EXEC(N'CREATE INDEX IX_SanPham_QuanLy ON dbo.SanPham(IsDeleted, TrangThai, MaDanhMuc, MaSanPham DESC);');
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_SPHinhAnh_SanPham' AND object_id=OBJECT_ID('dbo.SanPhamHinhAnh'))
    CREATE INDEX IX_SPHinhAnh_SanPham ON dbo.SanPhamHinhAnh(MaSanPham, LaAnhDaiDien DESC, ThuTu);

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
