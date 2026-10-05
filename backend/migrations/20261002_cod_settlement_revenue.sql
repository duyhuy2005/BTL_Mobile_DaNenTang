/* Additive money-event ledgers for COD/payment/reconciliation. Safe to rerun. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF OBJECT_ID('dbo.ThuTienDonHang','U') IS NULL
  BEGIN
    CREATE TABLE dbo.ThuTienDonHang(
      Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ThuTienDonHang PRIMARY KEY,
      MaHoaDon INT NOT NULL,
      VanChuyenId INT NULL,
      NguonThu VARCHAR(30) NOT NULL, -- SHOP_TRUC_TIEP | VAN_CHUYEN
      SoTien DECIMAL(18,2) NOT NULL,
      PhuongThuc NVARCHAR(30) NOT NULL,
      MaThamChieu VARCHAR(120) NOT NULL,
      ChungTuUrl VARCHAR(500) NULL,
      GhiChu NVARCHAR(500) NULL,
      ThoiDiemThu DATETIME2(0) NOT NULL,
      NguoiXacNhan INT NOT NULL,
      IdempotencyKey VARCHAR(100) NOT NULL,
      CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ThuTienDonHang_Created DEFAULT SYSDATETIME(),
      CONSTRAINT FK_ThuTienDonHang_HoaDon FOREIGN KEY(MaHoaDon) REFERENCES dbo.HoaDon(MaHoaDon),
      CONSTRAINT FK_ThuTienDonHang_VanChuyen FOREIGN KEY(VanChuyenId) REFERENCES dbo.VanChuyen(Id),
      CONSTRAINT FK_ThuTienDonHang_TaiKhoan FOREIGN KEY(NguoiXacNhan) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
      CONSTRAINT CK_ThuTienDonHang_SoTien CHECK(SoTien>0),
      CONSTRAINT CK_ThuTienDonHang_Nguon CHECK(NguonThu IN('SHOP_TRUC_TIEP','VAN_CHUYEN'))
    );
  END;
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_ThuTienDonHang_Idempotency' AND object_id=OBJECT_ID('dbo.ThuTienDonHang'))
    CREATE UNIQUE INDEX UX_ThuTienDonHang_Idempotency ON dbo.ThuTienDonHang(MaHoaDon,IdempotencyKey);
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_ThuTienDonHang_Order_Source_Reference' AND object_id=OBJECT_ID('dbo.ThuTienDonHang'))
    CREATE UNIQUE INDEX UX_ThuTienDonHang_Order_Source_Reference ON dbo.ThuTienDonHang(MaHoaDon,NguonThu,MaThamChieu);
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_ThuTienDonHang_Order_Time' AND object_id=OBJECT_ID('dbo.ThuTienDonHang'))
    CREATE INDEX IX_ThuTienDonHang_Order_Time ON dbo.ThuTienDonHang(MaHoaDon,ThoiDiemThu) INCLUDE(SoTien,NguonThu);

  IF OBJECT_ID('dbo.DoiSoatCOD','U') IS NULL
  BEGIN
    CREATE TABLE dbo.DoiSoatCOD(
      Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoiSoatCOD PRIMARY KEY,
      VanChuyenId INT NOT NULL,
      TienShopNhan DECIMAL(18,2) NOT NULL,
      PhiKhauTru DECIMAL(18,2) NOT NULL CONSTRAINT DF_DoiSoatCOD_Phi DEFAULT 0,
      DieuChinh DECIMAL(18,2) NOT NULL CONSTRAINT DF_DoiSoatCOD_DieuChinh DEFAULT 0,
      LyDoDieuChinh NVARCHAR(500) NULL,
      MaGiaoDich VARCHAR(120) NOT NULL,
      ChungTuUrl VARCHAR(500) NULL,
      ThoiDiemNhan DATETIME2(0) NOT NULL,
      NguoiXacNhan INT NOT NULL,
      IdempotencyKey VARCHAR(100) NOT NULL,
      CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_DoiSoatCOD_Created DEFAULT SYSDATETIME(),
      CONSTRAINT FK_DoiSoatCOD_VanChuyen FOREIGN KEY(VanChuyenId) REFERENCES dbo.VanChuyen(Id),
      CONSTRAINT FK_DoiSoatCOD_TaiKhoan FOREIGN KEY(NguoiXacNhan) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
      CONSTRAINT CK_DoiSoatCOD_Tien CHECK(TienShopNhan>=0 AND PhiKhauTru>=0),
      CONSTRAINT CK_DoiSoatCOD_Receipt CHECK(TienShopNhan+PhiKhauTru>0)
    );
  END;
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_DoiSoatCOD_Idempotency' AND object_id=OBJECT_ID('dbo.DoiSoatCOD'))
    CREATE UNIQUE INDEX UX_DoiSoatCOD_Idempotency ON dbo.DoiSoatCOD(VanChuyenId,IdempotencyKey);
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_DoiSoatCOD_Reference' AND object_id=OBJECT_ID('dbo.DoiSoatCOD'))
    CREATE UNIQUE INDEX UX_DoiSoatCOD_Reference ON dbo.DoiSoatCOD(MaGiaoDich);
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_DoiSoatCOD_Shipment_Time' AND object_id=OBJECT_ID('dbo.DoiSoatCOD'))
    CREATE INDEX IX_DoiSoatCOD_Shipment_Time ON dbo.DoiSoatCOD(VanChuyenId,ThoiDiemNhan) INCLUDE(TienShopNhan,PhiKhauTru,DieuChinh);

  IF OBJECT_ID('dbo.GiaoDichHoanTienTra','U') IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_GiaoDichHoanTienTra_Reference' AND object_id=OBJECT_ID('dbo.GiaoDichHoanTienTra'))
    CREATE UNIQUE INDEX UX_GiaoDichHoanTienTra_Reference ON dbo.GiaoDichHoanTienTra(MaGiaoDich)
      WHERE MaGiaoDich IS NOT NULL AND MaGiaoDich<>'';

  IF COL_LENGTH('dbo.HoaDon','NgayHoanTat') IS NULL ALTER TABLE dbo.HoaDon ADD NgayHoanTat DATETIME2(0) NULL;
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
