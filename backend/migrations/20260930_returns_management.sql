/*
  BeautyStore after-sales returns. Idempotent: creates only missing tables/columns.
  No existing order/customer/product/inventory rows are deleted or rewritten.
*/
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH('dbo.HoaDon', 'TrangThaiHoanTra') IS NULL
    ALTER TABLE dbo.HoaDon ADD TrangThaiHoanTra nvarchar(30) NULL;

  IF OBJECT_ID('dbo.YeuCauHoanTra','U') IS NULL
  BEGIN
    CREATE TABLE dbo.YeuCauHoanTra(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_YeuCauHoanTra PRIMARY KEY,
      MaHoaDon int NOT NULL,
      MaKhachHang int NOT NULL,
      LoaiYeuCau varchar(20) NOT NULL CONSTRAINT DF_YeuCauHoanTra_Loai DEFAULT('HOAN_TIEN'),
      LyDo nvarchar(60) NOT NULL,
      MoTa nvarchar(1000) NULL,
      PhuongThucNhanTien nvarchar(40) NULL,
      TrangThai varchar(30) NOT NULL CONSTRAINT DF_YeuCauHoanTra_TrangThai DEFAULT('CHO_DUYET'),
      SoTienHang decimal(18,2) NOT NULL CONSTRAINT DF_YeuCauHoanTra_TienHang DEFAULT(0),
      GiamGiaPhanBo decimal(18,2) NOT NULL CONSTRAINT DF_YeuCauHoanTra_GiamGia DEFAULT(0),
      PhiHoanKhachChiu decimal(18,2) NOT NULL CONSTRAINT DF_YeuCauHoanTra_Phi DEFAULT(0),
      SoTienDuKien decimal(18,2) NOT NULL CONSTRAINT DF_YeuCauHoanTra_DuKien DEFAULT(0),
      SoTienDaHoan decimal(18,2) NOT NULL CONSTRAINT DF_YeuCauHoanTra_DaHoan DEFAULT(0),
      LyDoTuChoi nvarchar(500) NULL,
      NguoiTao int NOT NULL,
      NguoiXuLy int NULL,
      NgayYeuCau datetime2 NOT NULL CONSTRAINT DF_YeuCauHoanTra_Ngay DEFAULT(SYSDATETIME()),
      UpdatedAt datetime2 NOT NULL CONSTRAINT DF_YeuCauHoanTra_Updated DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_YeuCauHoanTra_HoaDon FOREIGN KEY(MaHoaDon) REFERENCES dbo.HoaDon(MaHoaDon),
      CONSTRAINT FK_YeuCauHoanTra_KhachHang FOREIGN KEY(MaKhachHang) REFERENCES dbo.KhachHang(MaKhachHang),
      CONSTRAINT FK_YeuCauHoanTra_NguoiTao FOREIGN KEY(NguoiTao) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
      CONSTRAINT FK_YeuCauHoanTra_NguoiXuLy FOREIGN KEY(NguoiXuLy) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
      CONSTRAINT CK_YeuCauHoanTra_Loai CHECK(LoaiYeuCau IN('HOAN_TIEN','DOI_HANG')),
      CONSTRAINT CK_YeuCauHoanTra_Status CHECK(TrangThai IN('CHO_DUYET','DA_DUYET','TU_CHOI','CHO_KHACH_GUI_HANG','CHO_LAY_HANG_HOAN','DANG_HOAN_VE','DA_NHAN_HANG_HOAN','DANG_KIEM_TRA','CHAP_NHAN_HOAN','TU_CHOI_SAU_KIEM_TRA','CHO_HOAN_TIEN','DANG_HOAN_TIEN','DA_HOAN_TIEN','HOAN_TIEN_THAT_BAI','DA_DOI_HANG','HOAN_TAT','DA_HUY')),
      CONSTRAINT CK_YeuCauHoanTra_Money CHECK(SoTienHang>=0 AND GiamGiaPhanBo>=0 AND PhiHoanKhachChiu>=0 AND SoTienDuKien>=0 AND SoTienDaHoan>=0)
    );
    CREATE INDEX IX_YeuCauHoanTra_Order ON dbo.YeuCauHoanTra(MaHoaDon,TrangThai);
    CREATE INDEX IX_YeuCauHoanTra_Customer ON dbo.YeuCauHoanTra(MaKhachHang,NgayYeuCau DESC);
    CREATE INDEX IX_YeuCauHoanTra_Status ON dbo.YeuCauHoanTra(TrangThai,NgayYeuCau DESC);
  END;

  IF OBJECT_ID('dbo.ChiTietYeuCauHoanTra','U') IS NULL
  BEGIN
    CREATE TABLE dbo.ChiTietYeuCauHoanTra(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_ChiTietYeuCauHoanTra PRIMARY KEY,
      YeuCauId int NOT NULL,
      MaHoaDon int NOT NULL,
      MaSanPham int NOT NULL,
      TenSanPhamSnapshot nvarchar(255) NOT NULL,
      HinhAnhSnapshot varchar(500) NULL,
      DonGiaSnapshot decimal(18,2) NOT NULL,
      SoLuongMua int NOT NULL,
      SoLuongTra int NOT NULL,
      TienHang decimal(18,2) NOT NULL,
      GiamGiaPhanBo decimal(18,2) NOT NULL,
      SoTienDuKien decimal(18,2) NOT NULL,
      PhanLoaiKho varchar(20) NULL,
      SoLuongThucNhan int NULL,
      CONSTRAINT FK_ChiTietYeuCauHoanTra_Request FOREIGN KEY(YeuCauId) REFERENCES dbo.YeuCauHoanTra(Id),
      CONSTRAINT FK_ChiTietYeuCauHoanTra_OrderLine FOREIGN KEY(MaHoaDon,MaSanPham) REFERENCES dbo.ChiTietHoaDon(MaHoaDon,MaSanPham),
      CONSTRAINT FK_ChiTietYeuCauHoanTra_Product FOREIGN KEY(MaSanPham) REFERENCES dbo.SanPham(MaSanPham),
      CONSTRAINT UQ_ChiTietYeuCauHoanTra UNIQUE(YeuCauId,MaSanPham),
      CONSTRAINT CK_ChiTietYeuCauHoanTra_Qty CHECK(SoLuongMua>0 AND SoLuongTra>0 AND SoLuongTra<=SoLuongMua AND (SoLuongThucNhan IS NULL OR SoLuongThucNhan>=0)),
      CONSTRAINT CK_ChiTietYeuCauHoanTra_Money CHECK(DonGiaSnapshot>=0 AND TienHang>=0 AND GiamGiaPhanBo>=0 AND SoTienDuKien>=0),
      CONSTRAINT CK_ChiTietYeuCauHoanTra_StockType CHECK(PhanLoaiKho IS NULL OR PhanLoaiKho IN('BAN_LAI','HANG_HONG','CHO_XU_LY','TU_CHOI_NHAN'))
    );
    CREATE INDEX IX_ChiTietYeuCauHoanTra_OrderLine ON dbo.ChiTietYeuCauHoanTra(MaHoaDon,MaSanPham,YeuCauId);
  END;

  IF OBJECT_ID('dbo.BangChungYeuCauHoanTra','U') IS NULL
  BEGIN
    CREATE TABLE dbo.BangChungYeuCauHoanTra(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_BangChungYeuCauHoanTra PRIMARY KEY,
      YeuCauId int NOT NULL,
      Url varchar(500) NOT NULL,
      Loai varchar(10) NOT NULL,
      KichThuoc int NOT NULL,
      NgayTao datetime2 NOT NULL CONSTRAINT DF_BangChungHoanTra_Ngay DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_BangChungYeuCauHoanTra_Request FOREIGN KEY(YeuCauId) REFERENCES dbo.YeuCauHoanTra(Id),
      CONSTRAINT CK_BangChungYeuCauHoanTra_Type CHECK(Loai IN('image','video')),
      CONSTRAINT CK_BangChungYeuCauHoanTra_Size CHECK(KichThuoc>0)
    );
  END;

  IF OBJECT_ID('dbo.LichSuYeuCauHoanTra','U') IS NULL
  BEGIN
    CREATE TABLE dbo.LichSuYeuCauHoanTra(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_LichSuYeuCauHoanTra PRIMARY KEY,
      YeuCauId int NOT NULL,
      TrangThaiCu varchar(30) NULL,
      TrangThaiMoi varchar(30) NOT NULL,
      GhiChu nvarchar(1000) NULL,
      NguoiThaoTac int NULL,
      NgayTao datetime2 NOT NULL CONSTRAINT DF_LichSuYeuCauHoanTra_Ngay DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_LichSuYeuCauHoanTra_Request FOREIGN KEY(YeuCauId) REFERENCES dbo.YeuCauHoanTra(Id),
      CONSTRAINT FK_LichSuYeuCauHoanTra_User FOREIGN KEY(NguoiThaoTac) REFERENCES dbo.TaiKhoan(MaTaiKhoan)
    );
    CREATE INDEX IX_LichSuYeuCauHoanTra_Request ON dbo.LichSuYeuCauHoanTra(YeuCauId,NgayTao);
  END;

  IF OBJECT_ID('dbo.VanDonHoanTra','U') IS NULL
  BEGIN
    CREATE TABLE dbo.VanDonHoanTra(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_VanDonHoanTra PRIMARY KEY,
      YeuCauId int NOT NULL,
      DonViVanChuyenId int NOT NULL,
      MaVanDon varchar(80) NOT NULL,
      DiaChiLayHang nvarchar(500) NOT NULL,
      DiaChiNhanHang nvarchar(500) NOT NULL,
      PhiHoan decimal(18,2) NOT NULL CONSTRAINT DF_VanDonHoanTra_Phi DEFAULT(0),
      BenChiuPhi varchar(20) NOT NULL,
      TienThuHo decimal(18,2) NOT NULL CONSTRAINT DF_VanDonHoanTra_COD DEFAULT(0),
      GhiChu nvarchar(500) NULL,
      TrangThai varchar(30) NOT NULL CONSTRAINT DF_VanDonHoanTra_Status DEFAULT('CHO_LAY_HANG_HOAN'),
      NguoiTao int NOT NULL,
      NgayTao datetime2 NOT NULL CONSTRAINT DF_VanDonHoanTra_Ngay DEFAULT(SYSDATETIME()),
      UpdatedAt datetime2 NOT NULL CONSTRAINT DF_VanDonHoanTra_Updated DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_VanDonHoanTra_Request FOREIGN KEY(YeuCauId) REFERENCES dbo.YeuCauHoanTra(Id),
      CONSTRAINT FK_VanDonHoanTra_Carrier FOREIGN KEY(DonViVanChuyenId) REFERENCES dbo.DonViVanChuyen(Id),
      CONSTRAINT FK_VanDonHoanTra_User FOREIGN KEY(NguoiTao) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
      CONSTRAINT CK_VanDonHoanTra_ActiveStatus CHECK(TrangThai IN('CHO_LAY_HANG_HOAN','DA_LAY_HANG_HOAN','DANG_HOAN_VE','DA_GIAO_HANG_HOAN','THAT_BAI','DA_HUY')),
      CONSTRAINT CK_VanDonHoanTra_Fee CHECK(PhiHoan>=0 AND TienThuHo=0),
      CONSTRAINT CK_VanDonHoanTra_Payer CHECK(BenChiuPhi IN('SHOP','KHACH_HANG'))
    );
    CREATE UNIQUE INDEX UX_VanDonHoanTra_ActiveRequest ON dbo.VanDonHoanTra(YeuCauId) WHERE TrangThai<>'DA_HUY';
  END;

  IF OBJECT_ID('dbo.LichSuVanDonHoanTra','U') IS NULL
  BEGIN
    CREATE TABLE dbo.LichSuVanDonHoanTra(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_LichSuVanDonHoanTra PRIMARY KEY,
      VanDonId int NOT NULL,
      TrangThaiCu varchar(30) NULL,
      TrangThaiMoi varchar(30) NOT NULL,
      GhiChu nvarchar(500) NULL,
      NguoiThaoTac int NULL,
      NgayTao datetime2 NOT NULL CONSTRAINT DF_LichSuVanDonHoanTra_Ngay DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_LichSuVanDonHoanTra_Shipment FOREIGN KEY(VanDonId) REFERENCES dbo.VanDonHoanTra(Id),
      CONSTRAINT FK_LichSuVanDonHoanTra_User FOREIGN KEY(NguoiThaoTac) REFERENCES dbo.TaiKhoan(MaTaiKhoan)
    );
  END;

  IF OBJECT_ID('dbo.BienBanKiemTraHoanTra','U') IS NULL
  BEGIN
    CREATE TABLE dbo.BienBanKiemTraHoanTra(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_BienBanKiemTraHoanTra PRIMARY KEY,
      YeuCauId int NOT NULL,
      NguoiKiemTra int NOT NULL,
      KetLuan nvarchar(1000) NULL,
      GhiChu nvarchar(1000) NULL,
      NgayKiemTra datetime2 NOT NULL CONSTRAINT DF_BienBanKiemTraHoanTra_Ngay DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_BienBanKiemTraHoanTra_Request FOREIGN KEY(YeuCauId) REFERENCES dbo.YeuCauHoanTra(Id),
      CONSTRAINT FK_BienBanKiemTraHoanTra_User FOREIGN KEY(NguoiKiemTra) REFERENCES dbo.TaiKhoan(MaTaiKhoan)
    );
  END;

  IF OBJECT_ID('dbo.ChiTietKiemTraYeuCauHoanTra','U') IS NULL
  BEGIN
    CREATE TABLE dbo.ChiTietKiemTraYeuCauHoanTra(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_ChiTietKiemTraYeuCauHoanTra PRIMARY KEY,
      BienBanId int NOT NULL,
      ChiTietYeuCauId int NOT NULL,
      SoLuongThucNhan int NOT NULL,
      TemCon bit NOT NULL,
      DaMo bit NOT NULL,
      DaSuDung bit NOT NULL,
      TinhTrang nvarchar(100) NOT NULL,
      PhanLoaiKho varchar(20) NOT NULL,
      GhiChu nvarchar(500) NULL,
      CONSTRAINT FK_ChiTietKiemTraYeuCauHoanTra_Header FOREIGN KEY(BienBanId) REFERENCES dbo.BienBanKiemTraHoanTra(Id),
      CONSTRAINT FK_ChiTietKiemTraYeuCauHoanTra_Item FOREIGN KEY(ChiTietYeuCauId) REFERENCES dbo.ChiTietYeuCauHoanTra(Id),
      CONSTRAINT CK_ChiTietKiemTraYeuCauHoanTra_Qty CHECK(SoLuongThucNhan>=0),
      CONSTRAINT CK_ChiTietKiemTraYeuCauHoanTra_Type CHECK(PhanLoaiKho IN('BAN_LAI','HANG_HONG','CHO_XU_LY','TU_CHOI_NHAN'))
    );
  END;

  IF OBJECT_ID('dbo.BienDongKhoHoanTra','U') IS NULL
  BEGIN
    CREATE TABLE dbo.BienDongKhoHoanTra(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_BienDongKhoHoanTra PRIMARY KEY,
      YeuCauId int NOT NULL,
      ChiTietYeuCauId int NOT NULL,
      MaSanPham int NOT NULL,
      MaLo int NULL,
      PhanLoaiKho varchar(20) NOT NULL,
      SoLuong int NOT NULL,
      MaTaiKhoan int NOT NULL,
      NgayTao datetime2 NOT NULL CONSTRAINT DF_BienDongKhoHoanTra_Ngay DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_BienDongKhoHoanTra_Request FOREIGN KEY(YeuCauId) REFERENCES dbo.YeuCauHoanTra(Id),
      CONSTRAINT FK_BienDongKhoHoanTra_Item FOREIGN KEY(ChiTietYeuCauId) REFERENCES dbo.ChiTietYeuCauHoanTra(Id),
      CONSTRAINT FK_BienDongKhoHoanTra_Product FOREIGN KEY(MaSanPham) REFERENCES dbo.SanPham(MaSanPham),
      CONSTRAINT FK_BienDongKhoHoanTra_Lot FOREIGN KEY(MaLo) REFERENCES dbo.LoSanPham(MaLo),
      CONSTRAINT FK_BienDongKhoHoanTra_User FOREIGN KEY(MaTaiKhoan) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
      CONSTRAINT UQ_BienDongKhoHoanTra_Item UNIQUE(ChiTietYeuCauId),
      CONSTRAINT CK_BienDongKhoHoanTra_Qty CHECK(SoLuong>0),
      CONSTRAINT CK_BienDongKhoHoanTra_Type CHECK(PhanLoaiKho IN('BAN_LAI','HANG_HONG','CHO_XU_LY'))
    );
  END;

  IF OBJECT_ID('dbo.CK_BienDongKhoHoanTra_Type','C') IS NOT NULL
    ALTER TABLE dbo.BienDongKhoHoanTra DROP CONSTRAINT CK_BienDongKhoHoanTra_Type;
  ALTER TABLE dbo.BienDongKhoHoanTra ADD CONSTRAINT CK_BienDongKhoHoanTra_Type CHECK(PhanLoaiKho IN('BAN_LAI','HANG_HONG','CHO_XU_LY'));

  IF OBJECT_ID('dbo.GiaoDichHoanTienTra','U') IS NULL
  BEGIN
    CREATE TABLE dbo.GiaoDichHoanTienTra(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_GiaoDichHoanTienTra PRIMARY KEY,
      YeuCauId int NOT NULL,
      SoTien decimal(18,2) NOT NULL,
      PhuongThuc nvarchar(40) NOT NULL,
      MaGiaoDich varchar(120) NULL,
      ChungTuUrl varchar(500) NULL,
      TrangThai varchar(25) NOT NULL,
      GhiChu nvarchar(500) NULL,
      NguoiThaoTac int NOT NULL,
      NgayTao datetime2 NOT NULL CONSTRAINT DF_GiaoDichHoanTienTra_Ngay DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_GiaoDichHoanTienTra_Request FOREIGN KEY(YeuCauId) REFERENCES dbo.YeuCauHoanTra(Id),
      CONSTRAINT FK_GiaoDichHoanTienTra_User FOREIGN KEY(NguoiThaoTac) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
      CONSTRAINT CK_GiaoDichHoanTienTra_Money CHECK(SoTien>0),
      CONSTRAINT CK_GiaoDichHoanTienTra_Status CHECK(TrangThai IN('CHO_HOAN_TIEN','DANG_HOAN_TIEN','DA_HOAN_TIEN','HOAN_TIEN_THAT_BAI'))
    );
    CREATE INDEX IX_GiaoDichHoanTienTra_Request ON dbo.GiaoDichHoanTienTra(YeuCauId,TrangThai);
  END;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
