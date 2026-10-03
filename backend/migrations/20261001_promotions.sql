/* Automatic product promotions. Additive/idempotent; preserves legacy product prices. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  IF OBJECT_ID('dbo.KhuyenMai','U') IS NULL
  BEGIN
    CREATE TABLE dbo.KhuyenMai(
      Id int IDENTITY PRIMARY KEY, MaChuongTrinh nvarchar(50) NOT NULL,
      TenChuongTrinh nvarchar(160) NOT NULL, MoTa nvarchar(1000) NULL, Banner nvarchar(500) NULL,
      LoaiKhuyenMai varchar(24) NOT NULL, GiaTri decimal(18,2) NOT NULL CONSTRAINT DF_KhuyenMai_Value DEFAULT(0),
      GiamToiDa decimal(18,2) NULL, DonToiThieu decimal(18,2) NOT NULL CONSTRAINT DF_KhuyenMai_Min DEFAULT(0),
      NgayBatDau datetime2 NOT NULL, NgayKetThuc datetime2 NOT NULL,
      TongLuot int NULL, LuotDaGiu int NOT NULL CONSTRAINT DF_KhuyenMai_Held DEFAULT(0), LuotDaSuDung int NOT NULL CONSTRAINT DF_KhuyenMai_Used DEFAULT(0),
      MoiKhachToiDa int NULL, DoUuTien int NOT NULL CONSTRAINT DF_KhuyenMai_Priority DEFAULT(0),
      PhamVi varchar(16) NOT NULL, ChoPhepKetHopVoucher bit NOT NULL CONSTRAINT DF_KhuyenMai_Voucher DEFAULT(1),
      TuDongKichHoat bit NOT NULL CONSTRAINT DF_KhuyenMai_Auto DEFAULT(0), TrangThai varchar(24) NOT NULL CONSTRAINT DF_KhuyenMai_Status DEFAULT('NHAP'),
      CreatedAt datetime2 NOT NULL CONSTRAINT DF_KhuyenMai_Created DEFAULT(SYSDATETIME()), UpdatedAt datetime2 NOT NULL CONSTRAINT DF_KhuyenMai_Updated DEFAULT(SYSDATETIME()),
      CreatedBy int NULL, UpdatedBy int NULL,
      CONSTRAINT FK_KhuyenMai_Created FOREIGN KEY(CreatedBy) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
      CONSTRAINT FK_KhuyenMai_Updated FOREIGN KEY(UpdatedBy) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
      CONSTRAINT CK_KhuyenMai_Type CHECK(LoaiKhuyenMai IN('GIAM_PHAN_TRAM','GIAM_CO_DINH','DONG_GIA','MUA_X_TANG_Y','COMBO')),
      CONSTRAINT CK_KhuyenMai_Value CHECK(GiaTri>=0 AND DonToiThieu>=0 AND ISNULL(GiamToiDa,0)>=0),
      CONSTRAINT CK_KhuyenMai_Scope CHECK(PhamVi IN('TOAN_BO','DANH_MUC','SAN_PHAM','THUONG_HIEU')),
      CONSTRAINT CK_KhuyenMai_Status CHECK(TrangThai IN('NHAP','CHO_AP_DUNG','DANG_HOAT_DONG','TAM_DUNG','HET_SO_LUONG','KET_THUC','DA_HUY')),
      CONSTRAINT CK_KhuyenMai_Time CHECK(NgayKetThuc>NgayBatDau),
      CONSTRAINT CK_KhuyenMai_Percent CHECK(LoaiKhuyenMai<>'GIAM_PHAN_TRAM' OR GiaTri BETWEEN 1 AND 100),
      CONSTRAINT CK_KhuyenMai_Stock CHECK((TongLuot IS NULL OR TongLuot>0) AND LuotDaGiu>=0 AND LuotDaSuDung>=0 AND (TongLuot IS NULL OR LuotDaGiu+LuotDaSuDung<=TongLuot))
    );
    CREATE UNIQUE INDEX UX_KhuyenMai_Code ON dbo.KhuyenMai(MaChuongTrinh);
    CREATE INDEX IX_KhuyenMai_StatusTime ON dbo.KhuyenMai(TrangThai,NgayBatDau,NgayKetThuc,DoUuTien DESC);
  END;
  IF OBJECT_ID('dbo.KhuyenMaiSanPham','U') IS NULL BEGIN CREATE TABLE dbo.KhuyenMaiSanPham(KhuyenMaiId int NOT NULL,MaSanPham int NOT NULL,PRIMARY KEY(KhuyenMaiId,MaSanPham),FOREIGN KEY(KhuyenMaiId) REFERENCES dbo.KhuyenMai(Id),FOREIGN KEY(MaSanPham) REFERENCES dbo.SanPham(MaSanPham)); END;
  IF OBJECT_ID('dbo.KhuyenMaiDanhMuc','U') IS NULL BEGIN CREATE TABLE dbo.KhuyenMaiDanhMuc(KhuyenMaiId int NOT NULL,MaDanhMuc int NOT NULL,PRIMARY KEY(KhuyenMaiId,MaDanhMuc),FOREIGN KEY(KhuyenMaiId) REFERENCES dbo.KhuyenMai(Id),FOREIGN KEY(MaDanhMuc) REFERENCES dbo.DanhMuc(MaDanhMuc)); END;
  IF OBJECT_ID('dbo.KhuyenMaiThuongHieu','U') IS NULL BEGIN CREATE TABLE dbo.KhuyenMaiThuongHieu(KhuyenMaiId int NOT NULL,ThuongHieu nvarchar(160) NOT NULL,PRIMARY KEY(KhuyenMaiId,ThuongHieu),FOREIGN KEY(KhuyenMaiId) REFERENCES dbo.KhuyenMai(Id)); END;
  IF OBJECT_ID('dbo.QuaTangKhuyenMai','U') IS NULL BEGIN CREATE TABLE dbo.QuaTangKhuyenMai(KhuyenMaiId int NOT NULL,MaSanPhamMua int NOT NULL,SoLuongMua int NOT NULL,MaSanPhamTang int NOT NULL,SoLuongTang int NOT NULL,PRIMARY KEY(KhuyenMaiId,MaSanPhamMua,MaSanPhamTang),FOREIGN KEY(KhuyenMaiId) REFERENCES dbo.KhuyenMai(Id),FOREIGN KEY(MaSanPhamMua) REFERENCES dbo.SanPham(MaSanPham),FOREIGN KEY(MaSanPhamTang) REFERENCES dbo.SanPham(MaSanPham),CHECK(SoLuongMua>0 AND SoLuongTang>0)); END;
  IF OBJECT_ID('dbo.ChiTietCombo','U') IS NULL BEGIN CREATE TABLE dbo.ChiTietCombo(KhuyenMaiId int NOT NULL,MaSanPham int NOT NULL,SoLuong int NOT NULL,PRIMARY KEY(KhuyenMaiId,MaSanPham),FOREIGN KEY(KhuyenMaiId) REFERENCES dbo.KhuyenMai(Id),FOREIGN KEY(MaSanPham) REFERENCES dbo.SanPham(MaSanPham),CHECK(SoLuong>0)); END;
  IF OBJECT_ID('dbo.LichSuSuDungKhuyenMai','U') IS NULL BEGIN CREATE TABLE dbo.LichSuSuDungKhuyenMai(Id bigint IDENTITY PRIMARY KEY,KhuyenMaiId int NOT NULL,MaKhachHang int NOT NULL,MaHoaDon int NULL,SoLuong int NOT NULL CONSTRAINT DF_LichSuKM_Qty DEFAULT(1),TrangThai varchar(16) NOT NULL,CreatedAt datetime2 NOT NULL CONSTRAINT DF_LichSuKM_Created DEFAULT(SYSDATETIME()),UpdatedAt datetime2 NOT NULL CONSTRAINT DF_LichSuKM_Updated DEFAULT(SYSDATETIME()),FOREIGN KEY(KhuyenMaiId) REFERENCES dbo.KhuyenMai(Id),FOREIGN KEY(MaKhachHang) REFERENCES dbo.KhachHang(MaKhachHang),FOREIGN KEY(MaHoaDon) REFERENCES dbo.HoaDon(MaHoaDon),CHECK(TrangThai IN('DA_GIU_SUAT','DA_SU_DUNG','DA_TRA_LAI'))); CREATE UNIQUE INDEX UX_LichSuKM_Order ON dbo.LichSuSuDungKhuyenMai(KhuyenMaiId,MaHoaDon) WHERE MaHoaDon IS NOT NULL; END;
  IF OBJECT_ID('dbo.HoaDonKhuyenMai','U') IS NULL BEGIN CREATE TABLE dbo.HoaDonKhuyenMai(Id bigint IDENTITY PRIMARY KEY,MaHoaDon int NOT NULL,KhuyenMaiId int NOT NULL,MaChuongTrinhSnapshot nvarchar(50) NOT NULL,TenChuongTrinhSnapshot nvarchar(160) NOT NULL,TienGiam decimal(18,2) NOT NULL,CreatedAt datetime2 NOT NULL CONSTRAINT DF_HoaDonKM_Created DEFAULT(SYSDATETIME()),FOREIGN KEY(MaHoaDon) REFERENCES dbo.HoaDon(MaHoaDon),FOREIGN KEY(KhuyenMaiId) REFERENCES dbo.KhuyenMai(Id),CHECK(TienGiam>=0),UNIQUE(MaHoaDon,KhuyenMaiId)); END;
  IF OBJECT_ID('dbo.LichSuThayDoiKhuyenMai','U') IS NULL BEGIN CREATE TABLE dbo.LichSuThayDoiKhuyenMai(Id bigint IDENTITY PRIMARY KEY,KhuyenMaiId int NOT NULL,MaTaiKhoan int NULL,HanhDong varchar(24) NOT NULL,ChiTiet nvarchar(1000) NULL,CreatedAt datetime2 NOT NULL CONSTRAINT DF_LichSuThayDoiKM_Created DEFAULT(SYSDATETIME()),FOREIGN KEY(KhuyenMaiId) REFERENCES dbo.KhuyenMai(Id),FOREIGN KEY(MaTaiKhoan) REFERENCES dbo.TaiKhoan(MaTaiKhoan)); CREATE INDEX IX_LichSuThayDoiKM_Program ON dbo.LichSuThayDoiKhuyenMai(KhuyenMaiId,CreatedAt DESC); END;
  IF COL_LENGTH('dbo.ChiTietHoaDon','GiaGocLucMua') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD GiaGocLucMua decimal(18,2) NULL;
  IF COL_LENGTH('dbo.ChiTietHoaDon','KhuyenMaiId') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD KhuyenMaiId int NULL;
  IF COL_LENGTH('dbo.ChiTietHoaDon','TienGiamKhuyenMai') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD TienGiamKhuyenMai decimal(18,2) NULL;
  IF COL_LENGTH('dbo.ChiTietHoaDon','GiaSauKhuyenMai') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD GiaSauKhuyenMai decimal(18,2) NULL;
  IF COL_LENGTH('dbo.ChiTietHoaDon','TienVoucherPhanBo') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD TienVoucherPhanBo decimal(18,2) NULL;
  IF COL_LENGTH('dbo.ChiTietHoaDon','GiaThucTra') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD GiaThucTra decimal(18,2) NULL;
  IF COL_LENGTH('dbo.ChiTietHoaDon','LaHangTang') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD LaHangTang bit NULL;
  IF COL_LENGTH('dbo.ChiTietHoaDon','ComboId') IS NULL ALTER TABLE dbo.ChiTietHoaDon ADD ComboId int NULL;
  IF COL_LENGTH('dbo.ChiTietHoaDon','KhuyenMaiId') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_ChiTietHoaDon_KhuyenMai') ALTER TABLE dbo.ChiTietHoaDon ADD CONSTRAINT FK_ChiTietHoaDon_KhuyenMai FOREIGN KEY(KhuyenMaiId) REFERENCES dbo.KhuyenMai(Id);
  COMMIT;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK;
  THROW;
END CATCH;
