/* Additive after-sales/mobile data structures. Existing orders/customers/products are never rewritten. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  IF OBJECT_ID('dbo.DanhGiaSanPham','U') IS NULL
  BEGIN
    CREATE TABLE dbo.DanhGiaSanPham(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_DanhGiaSanPham PRIMARY KEY,
      MaHoaDon int NOT NULL, MaSanPham int NOT NULL, MaKhachHang int NOT NULL,
      SoSao tinyint NOT NULL, NoiDung nvarchar(1000) NULL,
      TrangThai varchar(16) NOT NULL CONSTRAINT DF_DanhGiaSanPham_Status DEFAULT('CHO_DUYET'),
      NgayTao datetime2 NOT NULL CONSTRAINT DF_DanhGiaSanPham_Created DEFAULT(SYSDATETIME()),
      UpdatedAt datetime2 NOT NULL CONSTRAINT DF_DanhGiaSanPham_Updated DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_DanhGia_Order FOREIGN KEY(MaHoaDon) REFERENCES dbo.HoaDon(MaHoaDon),
      CONSTRAINT FK_DanhGia_Product FOREIGN KEY(MaSanPham) REFERENCES dbo.SanPham(MaSanPham),
      CONSTRAINT FK_DanhGia_Customer FOREIGN KEY(MaKhachHang) REFERENCES dbo.KhachHang(MaKhachHang),
      CONSTRAINT CK_DanhGia_Rating CHECK(SoSao BETWEEN 1 AND 5),
      CONSTRAINT CK_DanhGia_Status CHECK(TrangThai IN('CHO_DUYET','HIEN_THI','AN'))
    );
    CREATE UNIQUE INDEX UX_DanhGia_Order_Product ON dbo.DanhGiaSanPham(MaHoaDon,MaSanPham);
    CREATE INDEX IX_DanhGia_Product_Public ON dbo.DanhGiaSanPham(MaSanPham,TrangThai,NgayTao DESC);
    CREATE INDEX IX_DanhGia_Customer ON dbo.DanhGiaSanPham(MaKhachHang,NgayTao DESC);
  END;
  IF OBJECT_ID('dbo.AnhDanhGiaSanPham','U') IS NULL
  BEGIN
    CREATE TABLE dbo.AnhDanhGiaSanPham(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_AnhDanhGiaSanPham PRIMARY KEY,
      DanhGiaId int NOT NULL, Url varchar(500) NOT NULL,
      CONSTRAINT FK_AnhDanhGia_Review FOREIGN KEY(DanhGiaId) REFERENCES dbo.DanhGiaSanPham(Id)
    );
  END;
  IF OBJECT_ID('dbo.ThongBaoKhachHang','U') IS NULL
  BEGIN
    CREATE TABLE dbo.ThongBaoKhachHang(
      Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_ThongBaoKhachHang PRIMARY KEY,
      MaKhachHang int NOT NULL, Loai varchar(30) NOT NULL, TieuDe nvarchar(160) NOT NULL,
      NoiDung nvarchar(500) NOT NULL, LoaiThamChieu varchar(20) NULL, MaThamChieu int NULL,
      MaSuKien varchar(120) NOT NULL, DaDoc bit NOT NULL CONSTRAINT DF_ThongBao_Read DEFAULT(0),
      NgayTao datetime2 NOT NULL CONSTRAINT DF_ThongBao_Created DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_ThongBao_Customer FOREIGN KEY(MaKhachHang) REFERENCES dbo.KhachHang(MaKhachHang),
      CONSTRAINT UQ_ThongBao_Event UNIQUE(MaKhachHang,MaSuKien)
    );
    CREATE INDEX IX_ThongBao_Customer_Date ON dbo.ThongBaoKhachHang(MaKhachHang,NgayTao DESC,Id DESC);
  END;
  IF OBJECT_ID('dbo.NoiDungHoTro','U') IS NULL
  BEGIN
    CREATE TABLE dbo.NoiDungHoTro(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_NoiDungHoTro PRIMARY KEY,
      Loai varchar(16) NOT NULL, TieuDe nvarchar(160) NOT NULL, NoiDung nvarchar(2000) NOT NULL,
      GiaTri nvarchar(500) NULL, ThuTu int NOT NULL CONSTRAINT DF_NoiDungHoTro_Order DEFAULT(0),
      DangHoatDong bit NOT NULL CONSTRAINT DF_NoiDungHoTro_Active DEFAULT(1),
      CONSTRAINT CK_NoiDungHoTro_Type CHECK(Loai IN('FAQ','LIEN_HE'))
    );
  END;
  IF OBJECT_ID('dbo.YeuCauHoanTra','U') IS NULL
    THROW 51002, 'YeuCauHoanTra is required before adding return idempotency.', 1;
  IF COL_LENGTH('dbo.YeuCauHoanTra','IdempotencyKey') IS NULL
    ALTER TABLE dbo.YeuCauHoanTra ADD IdempotencyKey varchar(80) NULL;
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.YeuCauHoanTra') AND name='UX_YeuCauHoanTra_Idempotency')
    EXEC(N'CREATE UNIQUE INDEX UX_YeuCauHoanTra_Idempotency ON dbo.YeuCauHoanTra(MaKhachHang,IdempotencyKey) WHERE IdempotencyKey IS NOT NULL');
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
