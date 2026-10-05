/* Replenishment proposals are separate from receipts: approval never increases stock. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  IF OBJECT_ID('dbo.YeuCauNhapKho','U') IS NULL
    CREATE TABLE dbo.YeuCauNhapKho(
      Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_YeuCauNhapKho PRIMARY KEY,
      MaThamChieu UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_YeuCauNhapKho_Ref DEFAULT NEWID(),
      MaTaiKhoanTao INT NOT NULL,
      TrangThai VARCHAR(20) NOT NULL CONSTRAINT DF_YeuCauNhapKho_Status DEFAULT 'CHO_DUYET',
      LyDo NVARCHAR(500) NOT NULL,
      GhiChu NVARCHAR(1000) NULL,
      MaTaiKhoanXuLy INT NULL,
      LyDoXuLy NVARCHAR(1000) NULL,
      NgayTao DATETIME2(0) NOT NULL CONSTRAINT DF_YeuCauNhapKho_Created DEFAULT SYSDATETIME(),
      NgayXuLy DATETIME2(0) NULL,
      CONSTRAINT UQ_YeuCauNhapKho_Ref UNIQUE(MaThamChieu),
      CONSTRAINT CK_YeuCauNhapKho_Status CHECK(TrangThai IN ('CHO_DUYET','DA_DUYET','TU_CHOI','DA_HUY')),
      CONSTRAINT FK_YeuCauNhapKho_Tao FOREIGN KEY(MaTaiKhoanTao) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
      CONSTRAINT FK_YeuCauNhapKho_XuLy FOREIGN KEY(MaTaiKhoanXuLy) REFERENCES dbo.TaiKhoan(MaTaiKhoan)
    );
  IF OBJECT_ID('dbo.ChiTietYeuCauNhapKho','U') IS NULL
    CREATE TABLE dbo.ChiTietYeuCauNhapKho(
      Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ChiTietYeuCauNhapKho PRIMARY KEY,
      YeuCauId INT NOT NULL,
      MaSanPham INT NOT NULL,
      SoLuongDeNghi INT NOT NULL,
      CONSTRAINT FK_CTYCNK_Request FOREIGN KEY(YeuCauId) REFERENCES dbo.YeuCauNhapKho(Id),
      CONSTRAINT FK_CTYCNK_Product FOREIGN KEY(MaSanPham) REFERENCES dbo.SanPham(MaSanPham),
      CONSTRAINT UQ_CTYCNK_Request_Product UNIQUE(YeuCauId,MaSanPham),
      CONSTRAINT CK_CTYCNK_Qty CHECK(SoLuongDeNghi>0)
    );
  IF OBJECT_ID('dbo.LichSuYeuCauNhapKho','U') IS NULL
    CREATE TABLE dbo.LichSuYeuCauNhapKho(
      Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LichSuYeuCauNhapKho PRIMARY KEY,
      YeuCauId INT NOT NULL,
      TrangThaiCu VARCHAR(20) NULL,
      TrangThaiMoi VARCHAR(20) NOT NULL,
      MaTaiKhoan INT NOT NULL,
      LyDo NVARCHAR(1000) NULL,
      NgayTao DATETIME2(0) NOT NULL CONSTRAINT DF_LichSuYeuCauNhapKho_Created DEFAULT SYSDATETIME(),
      CONSTRAINT FK_LSYCNK_Request FOREIGN KEY(YeuCauId) REFERENCES dbo.YeuCauNhapKho(Id),
      CONSTRAINT FK_LSYCNK_Account FOREIGN KEY(MaTaiKhoan) REFERENCES dbo.TaiKhoan(MaTaiKhoan)
    );
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_YeuCauNhapKho_Owner_Status' AND object_id=OBJECT_ID('dbo.YeuCauNhapKho'))
    CREATE INDEX IX_YeuCauNhapKho_Owner_Status ON dbo.YeuCauNhapKho(MaTaiKhoanTao,TrangThai,NgayTao DESC);
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_YeuCauNhapKho_Status' AND object_id=OBJECT_ID('dbo.YeuCauNhapKho'))
    CREATE INDEX IX_YeuCauNhapKho_Status ON dbo.YeuCauNhapKho(TrangThai,NgayTao DESC);
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
