/* Additive stock-count workflow. Existing inventory data is untouched. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF OBJECT_ID('dbo.PhieuKiemKe','U') IS NULL CREATE TABLE dbo.PhieuKiemKe(
    MaPhieuKiemKe INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    MaTaiKhoanTao INT NULL,
    MaTaiKhoanXacNhan INT NULL,
    NgayTao DATETIME NOT NULL CONSTRAINT DF_PKK_NgayTao DEFAULT GETDATE(),
    NgayXacNhan DATETIME NULL,
    TrangThai NVARCHAR(30) NOT NULL CONSTRAINT DF_PKK_TrangThai DEFAULT N'Nháp',
    LyDo NVARCHAR(1000) NOT NULL,
    GhiChu NVARCHAR(1000) NULL,
    CONSTRAINT FK_PKK_Tao FOREIGN KEY(MaTaiKhoanTao) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
    CONSTRAINT FK_PKK_XacNhan FOREIGN KEY(MaTaiKhoanXacNhan) REFERENCES dbo.TaiKhoan(MaTaiKhoan)
  );

  IF OBJECT_ID('dbo.ChiTietKiemKe','U') IS NULL CREATE TABLE dbo.ChiTietKiemKe(
    MaChiTietKiemKe INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    MaPhieuKiemKe INT NOT NULL,
    MaLo INT NOT NULL,
    TonHeThong INT NOT NULL,
    TonThucTe INT NOT NULL,
    ChenhLech AS (TonThucTe-TonHeThong) PERSISTED,
    CONSTRAINT FK_CTKK_Phieu FOREIGN KEY(MaPhieuKiemKe) REFERENCES dbo.PhieuKiemKe(MaPhieuKiemKe),
    CONSTRAINT FK_CTKK_Lo FOREIGN KEY(MaLo) REFERENCES dbo.LoSanPham(MaLo),
    CONSTRAINT CK_CTKK_SoLuong CHECK(TonHeThong>=0 AND TonThucTe>=0),
    CONSTRAINT UX_CTKK_PhieuLo UNIQUE(MaPhieuKiemKe,MaLo)
  );

  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_PKK_TrangThai' AND object_id=OBJECT_ID('dbo.PhieuKiemKe'))
    CREATE INDEX IX_PKK_TrangThai ON dbo.PhieuKiemKe(TrangThai,NgayTao DESC);

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
