/*
  Product variants share the existing lot/stock ledger. This migration deliberately
  leaves all legacy rows unassigned (MaBienThe NULL); no attribute is inferred.
  Apply using the project's migration runner after reviewing the target database.
*/
IF OBJECT_ID(N'dbo.BienTheSanPham', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.BienTheSanPham (
    MaBienThe int IDENTITY(1,1) NOT NULL CONSTRAINT PK_BienTheSanPham PRIMARY KEY,
    MaSanPham int NOT NULL,
    MaSKU varchar(80) NOT NULL,
    ThuocTinhKey nvarchar(1000) NOT NULL,
    DungTich decimal(10,2) NULL,
    DonViDungTich nvarchar(20) NULL,
    KhoiLuong decimal(10,2) NULL,
    DonViKhoiLuong nvarchar(20) NULL,
    MaMau nvarchar(80) NULL,
    TenMau nvarchar(120) NULL,
    MaHEX char(7) NULL,
    MuiHuong nvarchar(120) NULL,
    QuyCachDongGoi nvarchar(120) NULL,
    GiaBan decimal(18,2) NOT NULL,
    HinhAnh varchar(500) NULL,
    TrangThai bit NOT NULL CONSTRAINT DF_BienTheSanPham_TrangThai DEFAULT(1),
    NgayTao datetime2(0) NOT NULL CONSTRAINT DF_BienTheSanPham_NgayTao DEFAULT(SYSDATETIME()),
    UpdatedAt datetime2(0) NOT NULL CONSTRAINT DF_BienTheSanPham_UpdatedAt DEFAULT(SYSDATETIME()),
    CONSTRAINT FK_BienTheSanPham_SanPham FOREIGN KEY (MaSanPham) REFERENCES dbo.SanPham(MaSanPham),
    CONSTRAINT CK_BienTheSanPham_Gia CHECK (GiaBan >= 0),
    CONSTRAINT CK_BienTheSanPham_Metric CHECK ((DungTich IS NULL OR DungTich > 0) AND (KhoiLuong IS NULL OR KhoiLuong > 0)),
    CONSTRAINT CK_BienTheSanPham_HasAttribute CHECK (DungTich IS NOT NULL OR KhoiLuong IS NOT NULL OR NULLIF(MaMau,N'') IS NOT NULL OR NULLIF(MuiHuong,N'') IS NOT NULL OR NULLIF(QuyCachDongGoi,N'') IS NOT NULL)
  );
  CREATE UNIQUE INDEX UX_BienTheSanPham_SKU ON dbo.BienTheSanPham(MaSKU);
  CREATE UNIQUE INDEX UX_BienTheSanPham_Combination ON dbo.BienTheSanPham(MaSanPham,ThuocTinhKey);
  CREATE INDEX IX_BienTheSanPham_Product ON dbo.BienTheSanPham(MaSanPham,TrangThai);
END;
GO

IF COL_LENGTH(N'dbo.LoSanPham',N'MaBienThe') IS NULL ALTER TABLE dbo.LoSanPham ADD MaBienThe int NULL;
IF COL_LENGTH(N'dbo.ChiTietPhieuNhap',N'MaBienThe') IS NULL ALTER TABLE dbo.ChiTietPhieuNhap ADD MaBienThe int NULL;
IF COL_LENGTH(N'dbo.ChiTietGioHang',N'MaBienThe') IS NULL ALTER TABLE dbo.ChiTietGioHang ADD MaBienThe int NULL;
IF COL_LENGTH(N'dbo.ChiTietHoaDon',N'MaBienThe') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD MaBienThe int NULL;
IF COL_LENGTH(N'dbo.ChiTietYeuCauHoanTra',N'MaBienThe') IS NULL ALTER TABLE dbo.ChiTietYeuCauHoanTra ADD MaBienThe int NULL;
GO

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_LoSanPham_BienThe')
  ALTER TABLE dbo.LoSanPham ADD CONSTRAINT FK_LoSanPham_BienThe FOREIGN KEY(MaBienThe) REFERENCES dbo.BienTheSanPham(MaBienThe);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_ChiTietPhieuNhap_BienThe')
  ALTER TABLE dbo.ChiTietPhieuNhap ADD CONSTRAINT FK_ChiTietPhieuNhap_BienThe FOREIGN KEY(MaBienThe) REFERENCES dbo.BienTheSanPham(MaBienThe);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_ChiTietGioHang_BienThe')
  ALTER TABLE dbo.ChiTietGioHang ADD CONSTRAINT FK_ChiTietGioHang_BienThe FOREIGN KEY(MaBienThe) REFERENCES dbo.BienTheSanPham(MaBienThe);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_ChiTietHoaDon_BienThe')
  ALTER TABLE dbo.ChiTietHoaDon ADD CONSTRAINT FK_ChiTietHoaDon_BienThe FOREIGN KEY(MaBienThe) REFERENCES dbo.BienTheSanPham(MaBienThe);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_ChiTietYeuCauHoanTra_BienThe')
  ALTER TABLE dbo.ChiTietYeuCauHoanTra ADD CONSTRAINT FK_ChiTietYeuCauHoanTra_BienThe FOREIGN KEY(MaBienThe) REFERENCES dbo.BienTheSanPham(MaBienThe);
GO

/* Prevent duplicates and cross-variant merging in carts after the migration. */
IF EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ChiTietGioHang') AND name=N'UX_ChiTietGioHang_ProductVariant')
  DROP INDEX UX_ChiTietGioHang_ProductVariant ON dbo.ChiTietGioHang;
CREATE UNIQUE INDEX UX_ChiTietGioHang_ProductVariant ON dbo.ChiTietGioHang(MaGioHang,MaSanPham,MaBienThe);
GO
