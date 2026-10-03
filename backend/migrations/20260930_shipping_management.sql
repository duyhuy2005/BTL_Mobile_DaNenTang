/* Additive shipping/COD/return-inspection foundation. Safe to rerun. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF OBJECT_ID('dbo.DonViVanChuyen','U') IS NULL CREATE TABLE dbo.DonViVanChuyen(
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    MaDonVi VARCHAR(30) NOT NULL,
    TenDonVi NVARCHAR(150) NOT NULL,
    SoDienThoai VARCHAR(30) NULL,
    TrangThai BIT NOT NULL CONSTRAINT DF_DVVC_TrangThai DEFAULT 1,
    CreatedAt DATETIME NOT NULL CONSTRAINT DF_DVVC_CreatedAt DEFAULT GETDATE(),
    CONSTRAINT UX_DVVC_MaDonVi UNIQUE(MaDonVi)
  );

  IF NOT EXISTS(SELECT 1 FROM dbo.DonViVanChuyen WHERE MaDonVi='GHN')
    INSERT dbo.DonViVanChuyen(MaDonVi,TenDonVi) VALUES('GHN',N'Giao Hàng Nhanh');
  IF NOT EXISTS(SELECT 1 FROM dbo.DonViVanChuyen WHERE MaDonVi='GHTK')
    INSERT dbo.DonViVanChuyen(MaDonVi,TenDonVi) VALUES('GHTK',N'Giao Hàng Tiết Kiệm');
  IF NOT EXISTS(SELECT 1 FROM dbo.DonViVanChuyen WHERE MaDonVi='VIETTELPOST')
    INSERT dbo.DonViVanChuyen(MaDonVi,TenDonVi) VALUES('VIETTELPOST',N'Viettel Post');
  IF NOT EXISTS(SELECT 1 FROM dbo.DonViVanChuyen WHERE MaDonVi='JT')
    INSERT dbo.DonViVanChuyen(MaDonVi,TenDonVi) VALUES('JT',N'J&T Express');

  IF OBJECT_ID('dbo.VanChuyen','U') IS NULL CREATE TABLE dbo.VanChuyen(
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    HoaDonId INT NOT NULL,
    MaVanDon VARCHAR(40) NOT NULL,
    DonViVanChuyenId INT NOT NULL,
    LoaiDichVu NVARCHAR(100) NOT NULL,
    TenNguoiNhan NVARCHAR(150) NOT NULL,
    SoDienThoaiNhan VARCHAR(20) NOT NULL,
    EmailNguoiNhan VARCHAR(150) NULL,
    DiaChiGiaoHang NVARCHAR(500) NOT NULL,
    GhiChuGiaoHang NVARCHAR(1000) NULL,
    KhoiLuong DECIMAL(10,2) NOT NULL CONSTRAINT DF_VC_KhoiLuong DEFAULT 0,
    KichThuoc NVARCHAR(100) NULL,
    PhiVanChuyen DECIMAL(18,2) NOT NULL CONSTRAINT DF_VC_Phi DEFAULT 0,
    TienThuHo DECIMAL(18,2) NOT NULL CONSTRAINT DF_VC_COD DEFAULT 0,
    PhuongThucThanhToan NVARCHAR(50) NULL,
    TrangThai NVARCHAR(40) NOT NULL CONSTRAINT DF_VC_TrangThai DEFAULT N'CHO_LAY_HANG',
    TrangThaiCOD NVARCHAR(40) NOT NULL CONSTRAINT DF_VC_CODStatus DEFAULT N'CHUA_THU_HO',
    NgayDuKienGiao DATE NULL,
    NgayGiaoThanhCong DATETIME NULL,
    SoLanGiao INT NOT NULL CONSTRAINT DF_VC_SoLanGiao DEFAULT 0,
    LyDoThatBai NVARCHAR(500) NULL,
    CreatedBy INT NULL,
    CreatedAt DATETIME NOT NULL CONSTRAINT DF_VC_CreatedAt DEFAULT GETDATE(),
    UpdatedAt DATETIME NOT NULL CONSTRAINT DF_VC_UpdatedAt DEFAULT GETDATE(),
    CONSTRAINT FK_VC_HoaDon FOREIGN KEY(HoaDonId) REFERENCES dbo.HoaDon(MaHoaDon),
    CONSTRAINT FK_VC_DonVi FOREIGN KEY(DonViVanChuyenId) REFERENCES dbo.DonViVanChuyen(Id),
    CONSTRAINT FK_VC_NguoiTao FOREIGN KEY(CreatedBy) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
    CONSTRAINT UX_VC_MaVanDon UNIQUE(MaVanDon),
    CONSTRAINT CK_VC_Tien CHECK(PhiVanChuyen>=0 AND TienThuHo>=0),
    CONSTRAINT CK_VC_KhoiLuong CHECK(KhoiLuong>=0),
    CONSTRAINT CK_VC_SoLanGiao CHECK(SoLanGiao BETWEEN 0 AND 3)
  );

  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_VC_HoaDonHoatDong' AND object_id=OBJECT_ID('dbo.VanChuyen'))
    CREATE UNIQUE INDEX UX_VC_HoaDonHoatDong ON dbo.VanChuyen(HoaDonId) WHERE TrangThai<>N'DA_HUY_VAN_DON';
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_VC_TrangThai_NgayTao' AND object_id=OBJECT_ID('dbo.VanChuyen'))
    CREATE INDEX IX_VC_TrangThai_NgayTao ON dbo.VanChuyen(TrangThai,CreatedAt DESC);
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_VC_HoaDon' AND object_id=OBJECT_ID('dbo.VanChuyen'))
    CREATE INDEX IX_VC_HoaDon ON dbo.VanChuyen(HoaDonId);

  IF OBJECT_ID('dbo.LichSuVanChuyen','U') IS NULL CREATE TABLE dbo.LichSuVanChuyen(
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    VanChuyenId INT NOT NULL,
    TrangThaiCu NVARCHAR(40) NULL,
    TrangThaiMoi NVARCHAR(40) NOT NULL,
    ViTri NVARCHAR(200) NULL,
    GhiChu NVARCHAR(1000) NULL,
    LyDoThatBai NVARCHAR(500) NULL,
    NguoiCapNhatId INT NULL,
    CreatedAt DATETIME NOT NULL CONSTRAINT DF_LSVC_CreatedAt DEFAULT GETDATE(),
    CONSTRAINT FK_LSVC_VanChuyen FOREIGN KEY(VanChuyenId) REFERENCES dbo.VanChuyen(Id),
    CONSTRAINT FK_LSVC_TaiKhoan FOREIGN KEY(NguoiCapNhatId) REFERENCES dbo.TaiKhoan(MaTaiKhoan)
  );
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_LSVC_VanChuyen_Ngay' AND object_id=OBJECT_ID('dbo.LichSuVanChuyen'))
    CREATE INDEX IX_LSVC_VanChuyen_Ngay ON dbo.LichSuVanChuyen(VanChuyenId,CreatedAt,Id);

  IF OBJECT_ID('dbo.KiemTraHangHoan','U') IS NULL CREATE TABLE dbo.KiemTraHangHoan(
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    VanChuyenId INT NOT NULL,
    NguoiKiemTraId INT NULL,
    GhiChu NVARCHAR(1000) NULL,
    CreatedAt DATETIME NOT NULL CONSTRAINT DF_KTHH_CreatedAt DEFAULT GETDATE(),
    CONSTRAINT UX_KTHH_VanChuyen UNIQUE(VanChuyenId),
    CONSTRAINT FK_KTHH_VanChuyen FOREIGN KEY(VanChuyenId) REFERENCES dbo.VanChuyen(Id),
    CONSTRAINT FK_KTHH_TaiKhoan FOREIGN KEY(NguoiKiemTraId) REFERENCES dbo.TaiKhoan(MaTaiKhoan)
  );

  IF OBJECT_ID('dbo.ChiTietKiemTraHangHoan','U') IS NULL CREATE TABLE dbo.ChiTietKiemTraHangHoan(
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    KiemTraHangHoanId INT NOT NULL,
    MaSanPham INT NOT NULL,
    SoLuongNhan INT NOT NULL,
    SoLuongNhapLai INT NOT NULL,
    SoLuongHuHong INT NOT NULL,
    TinhTrang NVARCHAR(100) NOT NULL,
    GhiChu NVARCHAR(500) NULL,
    CONSTRAINT FK_CTKTHH_Phieu FOREIGN KEY(KiemTraHangHoanId) REFERENCES dbo.KiemTraHangHoan(Id),
    CONSTRAINT FK_CTKTHH_SanPham FOREIGN KEY(MaSanPham) REFERENCES dbo.SanPham(MaSanPham),
    CONSTRAINT UX_CTKTHH_PhieuSP UNIQUE(KiemTraHangHoanId,MaSanPham),
    CONSTRAINT CK_CTKTHH_SoLuong CHECK(SoLuongNhan>=0 AND SoLuongNhapLai>=0 AND SoLuongHuHong>=0 AND SoLuongNhan=SoLuongNhapLai+SoLuongHuHong)
  );

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
