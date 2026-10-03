/* Voucher and immutable order voucher snapshots. Safe to run repeatedly. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF OBJECT_ID('dbo.Voucher','U') IS NULL
  BEGIN
    CREATE TABLE dbo.Voucher(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Voucher PRIMARY KEY,
      MaVoucher nvarchar(50) NOT NULL,
      MaVoucherKey AS UPPER(LTRIM(RTRIM(MaVoucher))) PERSISTED,
      TenChuongTrinh nvarchar(160) NOT NULL,
      MoTa nvarchar(1000) NULL,
      LoaiGiam varchar(24) NOT NULL,
      GiaTri decimal(18,2) NOT NULL,
      GiamToiDa decimal(18,2) NULL,
      DonHangToiThieu decimal(18,2) NOT NULL CONSTRAINT DF_Voucher_Min DEFAULT(0),
      TongLuotSuDung int NOT NULL,
      LuotDaSuDung int NOT NULL CONSTRAINT DF_Voucher_Used DEFAULT(0),
      LuotDangGiu int NOT NULL CONSTRAINT DF_Voucher_Held DEFAULT(0),
      MoiKhachToiDa int NOT NULL,
      PhamVi varchar(24) NOT NULL,
      DoiTuong varchar(28) NOT NULL,
      ChoPhepKetHopPhiShip bit NOT NULL CONSTRAINT DF_Voucher_Combine DEFAULT(0),
      TuDongKichHoat bit NOT NULL CONSTRAINT DF_Voucher_Auto DEFAULT(0),
      NgayBatDau datetime2 NOT NULL,
      NgayKetThuc datetime2 NOT NULL,
      TrangThai varchar(24) NOT NULL CONSTRAINT DF_Voucher_Status DEFAULT('NHAP'),
      CreatedAt datetime2 NOT NULL CONSTRAINT DF_Voucher_Created DEFAULT(SYSDATETIME()),
      UpdatedAt datetime2 NOT NULL CONSTRAINT DF_Voucher_Updated DEFAULT(SYSDATETIME()),
      CreatedBy int NULL,
      UpdatedBy int NULL,
      CONSTRAINT FK_Voucher_CreatedBy FOREIGN KEY(CreatedBy) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
      CONSTRAINT FK_Voucher_UpdatedBy FOREIGN KEY(UpdatedBy) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
      CONSTRAINT CK_Voucher_Type CHECK(LoaiGiam IN('PHAN_TRAM','SO_TIEN_CO_DINH','MIEN_GIAM_PHI_SHIP')),
      CONSTRAINT CK_Voucher_Value CHECK(GiaTri>=0 AND ISNULL(GiamToiDa,0)>=0 AND DonHangToiThieu>=0),
      CONSTRAINT CK_Voucher_Percent CHECK(LoaiGiam<>'PHAN_TRAM' OR GiaTri BETWEEN 1 AND 100),
      CONSTRAINT CK_Voucher_Usage CHECK(TongLuotSuDung>0 AND LuotDaSuDung>=0 AND LuotDangGiu>=0 AND LuotDaSuDung+LuotDangGiu<=TongLuotSuDung AND MoiKhachToiDa>0),
      CONSTRAINT CK_Voucher_Scope CHECK(PhamVi IN('TOAN_BO_DON_HANG','DANH_MUC','SAN_PHAM','THUONG_HIEU','PHI_VAN_CHUYEN')),
      CONSTRAINT CK_Voucher_Audience CHECK(DoiTuong IN('TAT_CA_KHACH_HANG','KHACH_HANG_MOI','KHACH_HANG_CU_THE')),
      CONSTRAINT CK_Voucher_Status CHECK(TrangThai IN('NHAP','SAP_DIEN_RA','DANG_HOAT_DONG','TAM_DUNG','HET_LUOT','HET_HAN','DA_HUY')),
      CONSTRAINT CK_Voucher_Time CHECK(NgayKetThuc>NgayBatDau)
    );
    CREATE UNIQUE INDEX UX_Voucher_Code_CI ON dbo.Voucher(MaVoucherKey);
    CREATE INDEX IX_Voucher_Status_Time ON dbo.Voucher(TrangThai,NgayBatDau,NgayKetThuc);
  END;

  IF OBJECT_ID('dbo.VoucherSanPham','U') IS NULL
  BEGIN
    CREATE TABLE dbo.VoucherSanPham(VoucherId int NOT NULL,MaSanPham int NOT NULL,
      CONSTRAINT PK_VoucherSanPham PRIMARY KEY(VoucherId,MaSanPham),
      CONSTRAINT FK_VoucherSanPham_Voucher FOREIGN KEY(VoucherId) REFERENCES dbo.Voucher(Id),
      CONSTRAINT FK_VoucherSanPham_Product FOREIGN KEY(MaSanPham) REFERENCES dbo.SanPham(MaSanPham));
  END;
  IF OBJECT_ID('dbo.VoucherDanhMuc','U') IS NULL
  BEGIN
    CREATE TABLE dbo.VoucherDanhMuc(VoucherId int NOT NULL,MaDanhMuc int NOT NULL,
      CONSTRAINT PK_VoucherDanhMuc PRIMARY KEY(VoucherId,MaDanhMuc),
      CONSTRAINT FK_VoucherDanhMuc_Voucher FOREIGN KEY(VoucherId) REFERENCES dbo.Voucher(Id),
      CONSTRAINT FK_VoucherDanhMuc_Category FOREIGN KEY(MaDanhMuc) REFERENCES dbo.DanhMuc(MaDanhMuc));
  END;
  IF OBJECT_ID('dbo.VoucherThuongHieu','U') IS NULL
  BEGIN
    CREATE TABLE dbo.VoucherThuongHieu(VoucherId int NOT NULL,TenThuongHieu nvarchar(160) NOT NULL,
      CONSTRAINT PK_VoucherThuongHieu PRIMARY KEY(VoucherId,TenThuongHieu),
      CONSTRAINT FK_VoucherThuongHieu_Voucher FOREIGN KEY(VoucherId) REFERENCES dbo.Voucher(Id));
  END;
  IF OBJECT_ID('dbo.VoucherKhachHang','U') IS NULL
  BEGIN
    CREATE TABLE dbo.VoucherKhachHang(VoucherId int NOT NULL,MaKhachHang int NOT NULL,CreatedAt datetime2 NOT NULL CONSTRAINT DF_VoucherKhachHang_Created DEFAULT(SYSDATETIME()),
      CONSTRAINT PK_VoucherKhachHang PRIMARY KEY(VoucherId,MaKhachHang),
      CONSTRAINT FK_VoucherKhachHang_Voucher FOREIGN KEY(VoucherId) REFERENCES dbo.Voucher(Id),
      CONSTRAINT FK_VoucherKhachHang_Customer FOREIGN KEY(MaKhachHang) REFERENCES dbo.KhachHang(MaKhachHang));
  END;
  IF OBJECT_ID('dbo.VoucherNguoiDung','U') IS NULL
  BEGIN
    CREATE TABLE dbo.VoucherNguoiDung(Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_VoucherNguoiDung PRIMARY KEY,VoucherId int NOT NULL,MaKhachHang int NOT NULL,TrangThai varchar(16) NOT NULL CONSTRAINT DF_VoucherNguoiDung_Status DEFAULT('DA_LUU'),CreatedAt datetime2 NOT NULL CONSTRAINT DF_VoucherNguoiDung_Created DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_VoucherNguoiDung_Voucher FOREIGN KEY(VoucherId) REFERENCES dbo.Voucher(Id),
      CONSTRAINT FK_VoucherNguoiDung_Customer FOREIGN KEY(MaKhachHang) REFERENCES dbo.KhachHang(MaKhachHang),
      CONSTRAINT UQ_VoucherNguoiDung UNIQUE(VoucherId,MaKhachHang),
      CONSTRAINT CK_VoucherNguoiDung_Status CHECK(TrangThai IN('DA_LUU','DA_SU_DUNG','HET_HAN')));
    CREATE INDEX IX_VoucherNguoiDung_Customer ON dbo.VoucherNguoiDung(MaKhachHang,TrangThai);
  END;
  IF OBJECT_ID('dbo.LichSuSuDungVoucher','U') IS NULL
  BEGIN
    CREATE TABLE dbo.LichSuSuDungVoucher(Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_LichSuSuDungVoucher PRIMARY KEY,VoucherId int NOT NULL,MaKhachHang int NOT NULL,MaHoaDon int NULL,LoaiApDung varchar(16) NOT NULL,TrangThai varchar(20) NOT NULL,SoTienGiam decimal(18,2) NOT NULL CONSTRAINT DF_LichSuVoucher_Amount DEFAULT(0),NgayTao datetime2 NOT NULL CONSTRAINT DF_LichSuVoucher_Created DEFAULT(SYSDATETIME()),NgayCapNhat datetime2 NOT NULL CONSTRAINT DF_LichSuVoucher_Updated DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_LichSuVoucher_Voucher FOREIGN KEY(VoucherId) REFERENCES dbo.Voucher(Id),
      CONSTRAINT FK_LichSuVoucher_Customer FOREIGN KEY(MaKhachHang) REFERENCES dbo.KhachHang(MaKhachHang),
      CONSTRAINT FK_LichSuVoucher_Order FOREIGN KEY(MaHoaDon) REFERENCES dbo.HoaDon(MaHoaDon),
      CONSTRAINT CK_LichSuVoucher_Type CHECK(LoaiApDung IN('SAN_PHAM','PHI_SHIP')),
      CONSTRAINT CK_LichSuVoucher_Status CHECK(TrangThai IN('DA_GIU_LUOT','DA_SU_DUNG','DA_TRA_LAI_LUOT')),
      CONSTRAINT CK_LichSuVoucher_Amount CHECK(SoTienGiam>=0));
    CREATE UNIQUE INDEX UX_LichSuVoucher_Order ON dbo.LichSuSuDungVoucher(MaHoaDon,VoucherId,LoaiApDung) WHERE MaHoaDon IS NOT NULL;
    CREATE INDEX IX_LichSuVoucher_Customer ON dbo.LichSuSuDungVoucher(VoucherId,MaKhachHang,TrangThai);
  END;
  IF OBJECT_ID('dbo.HoaDonVoucher','U') IS NULL
  BEGIN
    CREATE TABLE dbo.HoaDonVoucher(Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_HoaDonVoucher PRIMARY KEY,MaHoaDon int NOT NULL,VoucherId int NOT NULL,LoaiApDung varchar(16) NOT NULL,MaVoucherSnapshot nvarchar(50) NOT NULL,TenChuongTrinhSnapshot nvarchar(160) NOT NULL,SoTienGiam decimal(18,2) NOT NULL CONSTRAINT DF_HoaDonVoucher_Amount DEFAULT(0),CreatedAt datetime2 NOT NULL CONSTRAINT DF_HoaDonVoucher_Created DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_HoaDonVoucher_Order FOREIGN KEY(MaHoaDon) REFERENCES dbo.HoaDon(MaHoaDon),
      CONSTRAINT FK_HoaDonVoucher_Voucher FOREIGN KEY(VoucherId) REFERENCES dbo.Voucher(Id),
      CONSTRAINT CK_HoaDonVoucher_Type CHECK(LoaiApDung IN('SAN_PHAM','PHI_SHIP')),
      CONSTRAINT CK_HoaDonVoucher_Amount CHECK(SoTienGiam>=0));
    CREATE UNIQUE INDEX UX_HoaDonVoucher_Order ON dbo.HoaDonVoucher(MaHoaDon,VoucherId,LoaiApDung);
  END;
  IF OBJECT_ID('dbo.LichSuThayDoiVoucher','U') IS NULL
  BEGIN
    CREATE TABLE dbo.LichSuThayDoiVoucher(
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_LichSuThayDoiVoucher PRIMARY KEY,
      VoucherId int NOT NULL,
      MaTaiKhoan int NULL,
      HanhDong varchar(24) NOT NULL,
      ChiTiet nvarchar(1000) NULL,
      CreatedAt datetime2 NOT NULL CONSTRAINT DF_LichSuThayDoiVoucher_Created DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_LichSuThayDoiVoucher_Voucher FOREIGN KEY(VoucherId) REFERENCES dbo.Voucher(Id),
      CONSTRAINT FK_LichSuThayDoiVoucher_TaiKhoan FOREIGN KEY(MaTaiKhoan) REFERENCES dbo.TaiKhoan(MaTaiKhoan)
    );
    CREATE INDEX IX_LichSuThayDoiVoucher_Voucher ON dbo.LichSuThayDoiVoucher(VoucherId,CreatedAt DESC);
  END;

  IF COL_LENGTH('dbo.HoaDon','GiamGiaPhiShipVoucher') IS NULL ALTER TABLE dbo.HoaDon ADD GiamGiaPhiShipVoucher decimal(18,2) NULL;
  IF COL_LENGTH('dbo.ChiTietHoaDon','DonGiaGocSnapshot') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD DonGiaGocSnapshot decimal(18,2) NULL;
  IF COL_LENGTH('dbo.ChiTietHoaDon','GiamGiaTrucTiepSnapshot') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD GiamGiaTrucTiepSnapshot decimal(18,2) NULL;
  IF COL_LENGTH('dbo.ChiTietHoaDon','GiamGiaVoucherSnapshot') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD GiamGiaVoucherSnapshot decimal(18,2) NULL;
  IF COL_LENGTH('dbo.ChiTietHoaDon','GiaThucTraSnapshot') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD GiaThucTraSnapshot decimal(18,2) NULL;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
