/* Additive inventory foundation. Existing product stock is preserved as opening stock. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  IF OBJECT_ID('dbo.NhaCungCap','U') IS NULL CREATE TABLE dbo.NhaCungCap(
    MaNCC INT IDENTITY(1,1) PRIMARY KEY, TenNCC NVARCHAR(200) NOT NULL, SoDienThoai VARCHAR(30) NULL,
    Email VARCHAR(150) NULL, DiaChi NVARCHAR(500) NULL, GhiChu NVARCHAR(1000) NULL,
    TrangThai BIT NOT NULL CONSTRAINT DF_NCC_TrangThai DEFAULT 1, NgayTao DATETIME NOT NULL CONSTRAINT DF_NCC_NgayTao DEFAULT GETDATE());
  IF OBJECT_ID('dbo.LoSanPham','U') IS NULL CREATE TABLE dbo.LoSanPham(
    MaLo INT IDENTITY(1,1) PRIMARY KEY, MaSanPham INT NOT NULL, MaNCC INT NULL, MaLoCode VARCHAR(80) NOT NULL,
    NgaySanXuat DATE NULL, HanSuDung DATE NULL, ViTri NVARCHAR(80) NULL, GiaNhap DECIMAL(18,2) NOT NULL CONSTRAINT DF_Lo_GiaNhap DEFAULT 0,
    SoLuongTon INT NOT NULL CONSTRAINT DF_Lo_Ton DEFAULT 0, SoLuongDaGiu INT NOT NULL CONSTRAINT DF_Lo_Giu DEFAULT 0,
    TrangThai NVARCHAR(30) NOT NULL CONSTRAINT DF_Lo_TrangThai DEFAULT N'Đang dùng', NgayTao DATETIME NOT NULL CONSTRAINT DF_Lo_NgayTao DEFAULT GETDATE(),
    CONSTRAINT FK_Lo_SanPham FOREIGN KEY(MaSanPham) REFERENCES dbo.SanPham(MaSanPham), CONSTRAINT FK_Lo_NCC FOREIGN KEY(MaNCC) REFERENCES dbo.NhaCungCap(MaNCC),
    CONSTRAINT CK_Lo_SoLuong CHECK(SoLuongTon>=0 AND SoLuongDaGiu>=0 AND SoLuongDaGiu<=SoLuongTon));
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_LoSanPham_Code' AND object_id=OBJECT_ID('dbo.LoSanPham')) CREATE UNIQUE INDEX UX_LoSanPham_Code ON dbo.LoSanPham(MaSanPham,MaLoCode);
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_LoSanPham_FEFO' AND object_id=OBJECT_ID('dbo.LoSanPham')) CREATE INDEX IX_LoSanPham_FEFO ON dbo.LoSanPham(MaSanPham,HanSuDung,SoLuongTon);
  IF OBJECT_ID('dbo.PhieuNhapKho','U') IS NULL CREATE TABLE dbo.PhieuNhapKho(
    MaPhieuNhap INT IDENTITY(1,1) PRIMARY KEY, MaNCC INT NULL, MaTaiKhoanTao INT NULL, MaThamChieu UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_PhieuNhap_Ref DEFAULT NEWID(),
    NgayNhap DATETIME NOT NULL CONSTRAINT DF_PhieuNhap_Ngay DEFAULT GETDATE(), TrangThai NVARCHAR(30) NOT NULL CONSTRAINT DF_PhieuNhap_Status DEFAULT N'Nháp', GhiChu NVARCHAR(1000) NULL, TongTien DECIMAL(18,2) NOT NULL CONSTRAINT DF_PhieuNhap_Tong DEFAULT 0,
    CONSTRAINT UX_PhieuNhap_Ref UNIQUE(MaThamChieu), CONSTRAINT FK_PhieuNhap_NCC FOREIGN KEY(MaNCC) REFERENCES dbo.NhaCungCap(MaNCC), CONSTRAINT FK_PhieuNhap_TK FOREIGN KEY(MaTaiKhoanTao) REFERENCES dbo.TaiKhoan(MaTaiKhoan));
  IF OBJECT_ID('dbo.ChiTietPhieuNhap','U') IS NULL CREATE TABLE dbo.ChiTietPhieuNhap(
    MaChiTietNhap INT IDENTITY(1,1) PRIMARY KEY, MaPhieuNhap INT NOT NULL, MaSanPham INT NOT NULL, MaLoCode VARCHAR(80) NOT NULL, NgaySanXuat DATE NULL, HanSuDung DATE NULL, ViTri NVARCHAR(80) NULL, SoLuong INT NOT NULL, GiaNhap DECIMAL(18,2) NOT NULL,
    CONSTRAINT FK_CTPN_Phieu FOREIGN KEY(MaPhieuNhap) REFERENCES dbo.PhieuNhapKho(MaPhieuNhap), CONSTRAINT FK_CTPN_SP FOREIGN KEY(MaSanPham) REFERENCES dbo.SanPham(MaSanPham), CONSTRAINT CK_CTPN_SoLuong CHECK(SoLuong>0), CONSTRAINT CK_CTPN_Gia CHECK(GiaNhap>=0));

  IF COL_LENGTH('dbo.PhieuNhapKho','MaTaiKhoanTao') IS NULL ALTER TABLE dbo.PhieuNhapKho ADD MaTaiKhoanTao INT NULL;
  IF COL_LENGTH('dbo.PhieuNhapKho','MaThamChieu') IS NULL ALTER TABLE dbo.PhieuNhapKho ADD MaThamChieu UNIQUEIDENTIFIER NULL;
  IF COL_LENGTH('dbo.PhieuNhapKho','NguoiTao') IS NOT NULL
    EXEC(N'UPDATE dbo.PhieuNhapKho SET MaTaiKhoanTao=NguoiTao WHERE MaTaiKhoanTao IS NULL AND NguoiTao IS NOT NULL;');
  EXEC(N'UPDATE dbo.PhieuNhapKho SET MaThamChieu=NEWID() WHERE MaThamChieu IS NULL;');
  ALTER TABLE dbo.PhieuNhapKho ALTER COLUMN MaThamChieu UNIQUEIDENTIFIER NOT NULL;
  IF NOT EXISTS(SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PhieuNhapKho') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID('dbo.PhieuNhapKho'),'MaThamChieu','ColumnId'))
    ALTER TABLE dbo.PhieuNhapKho ADD CONSTRAINT DF_PhieuNhap_Ref_Compat DEFAULT NEWID() FOR MaThamChieu;
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_PhieuNhap_Ref' AND object_id=OBJECT_ID('dbo.PhieuNhapKho'))
    CREATE UNIQUE INDEX UX_PhieuNhap_Ref ON dbo.PhieuNhapKho(MaThamChieu);

  DECLARE @TrangThaiDefault sysname, @TrangThaiDefaultDefinition nvarchar(4000);
  SELECT @TrangThaiDefault=dc.name,@TrangThaiDefaultDefinition=dc.definition
  FROM sys.default_constraints dc
  WHERE dc.parent_object_id=OBJECT_ID('dbo.PhieuNhapKho')
    AND dc.parent_column_id=COLUMNPROPERTY(OBJECT_ID('dbo.PhieuNhapKho'),'TrangThai','ColumnId');
  IF @TrangThaiDefault IS NOT NULL AND @TrangThaiDefaultDefinition NOT LIKE N'%NCHAR(225)%'
  BEGIN
    DECLARE @DropTrangThaiDefaultSql nvarchar(300)=N'ALTER TABLE dbo.PhieuNhapKho DROP CONSTRAINT '+QUOTENAME(@TrangThaiDefault);
    EXEC sys.sp_executesql @DropTrangThaiDefaultSql;
  END;
  IF NOT EXISTS(SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.PhieuNhapKho') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID('dbo.PhieuNhapKho'),'TrangThai','ColumnId'))
    ALTER TABLE dbo.PhieuNhapKho ADD CONSTRAINT DF_PhieuNhap_Status_Compat DEFAULT (NCHAR(78)+NCHAR(104)+NCHAR(225)+NCHAR(112)) FOR TrangThai;

  EXEC(N'IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=''FK_PhieuNhap_TK'')
    AND NOT EXISTS(SELECT 1 FROM dbo.PhieuNhapKho p LEFT JOIN dbo.TaiKhoan t ON t.MaTaiKhoan=p.MaTaiKhoanTao WHERE p.MaTaiKhoanTao IS NOT NULL AND t.MaTaiKhoan IS NULL)
    ALTER TABLE dbo.PhieuNhapKho ADD CONSTRAINT FK_PhieuNhap_TK FOREIGN KEY(MaTaiKhoanTao) REFERENCES dbo.TaiKhoan(MaTaiKhoan);');

  IF COL_LENGTH('dbo.ChiTietPhieuNhap','MaLoCode') IS NULL ALTER TABLE dbo.ChiTietPhieuNhap ADD MaLoCode VARCHAR(80) NULL;
  IF COL_LENGTH('dbo.ChiTietPhieuNhap','NgaySanXuat') IS NULL ALTER TABLE dbo.ChiTietPhieuNhap ADD NgaySanXuat DATE NULL;
  IF COL_LENGTH('dbo.ChiTietPhieuNhap','HanSuDung') IS NULL ALTER TABLE dbo.ChiTietPhieuNhap ADD HanSuDung DATE NULL;
  IF COL_LENGTH('dbo.ChiTietPhieuNhap','ViTri') IS NULL ALTER TABLE dbo.ChiTietPhieuNhap ADD ViTri NVARCHAR(80) NULL;
  IF COL_LENGTH('dbo.ChiTietPhieuNhap','ThanhTien') IS NULL
    ALTER TABLE dbo.ChiTietPhieuNhap ADD ThanhTien DECIMAL(18,2) NOT NULL CONSTRAINT DF_CTPN_ThanhTien_Compat DEFAULT 0;
  IF COL_LENGTH('dbo.ChiTietPhieuNhap','MaChiTiet') IS NOT NULL
    EXEC(N'UPDATE dbo.ChiTietPhieuNhap SET MaLoCode=CONCAT(''LEGACY-'',MaChiTiet) WHERE MaLoCode IS NULL OR MaLoCode='''';');
  ALTER TABLE dbo.ChiTietPhieuNhap ALTER COLUMN MaLoCode VARCHAR(80) NOT NULL;

  IF OBJECT_ID('dbo.BienDongKho','U') IS NULL CREATE TABLE dbo.BienDongKho(
    MaBienDong INT IDENTITY(1,1) PRIMARY KEY, MaSanPham INT NOT NULL, MaLo INT NULL, Loai NVARCHAR(40) NOT NULL, SoLuong INT NOT NULL, TonTruoc INT NOT NULL, TonSau INT NOT NULL,
    MaHoaDon INT NULL, MaPhieuNhap INT NULL, MaTaiKhoan INT NULL, MaThamChieu UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_BienDong_Ref DEFAULT NEWID(), GhiChu NVARCHAR(1000) NULL, NgayTao DATETIME NOT NULL CONSTRAINT DF_BienDong_Ngay DEFAULT GETDATE(),
    CONSTRAINT UX_BienDong_Ref UNIQUE(MaThamChieu), CONSTRAINT FK_BienDong_SP FOREIGN KEY(MaSanPham) REFERENCES dbo.SanPham(MaSanPham), CONSTRAINT FK_BienDong_Lo FOREIGN KEY(MaLo) REFERENCES dbo.LoSanPham(MaLo), CONSTRAINT FK_BienDong_HD FOREIGN KEY(MaHoaDon) REFERENCES dbo.HoaDon(MaHoaDon), CONSTRAINT FK_BienDong_PN FOREIGN KEY(MaPhieuNhap) REFERENCES dbo.PhieuNhapKho(MaPhieuNhap));
  IF OBJECT_ID('dbo.GiuHangDonHang','U') IS NULL CREATE TABLE dbo.GiuHangDonHang(
    MaGiuHang INT IDENTITY(1,1) PRIMARY KEY, MaHoaDon INT NOT NULL, MaLo INT NOT NULL, SoLuong INT NOT NULL, TrangThai NVARCHAR(20) NOT NULL CONSTRAINT DF_GiuHang_Status DEFAULT N'Đang giữ', HetHanLuc DATETIME NULL, NgayTao DATETIME NOT NULL CONSTRAINT DF_GiuHang_Ngay DEFAULT GETDATE(),
    CONSTRAINT FK_GiuHang_HD FOREIGN KEY(MaHoaDon) REFERENCES dbo.HoaDon(MaHoaDon), CONSTRAINT FK_GiuHang_Lo FOREIGN KEY(MaLo) REFERENCES dbo.LoSanPham(MaLo), CONSTRAINT CK_GiuHang_SoLuong CHECK(SoLuong>0));
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_BienDongKho_Ngay' AND object_id=OBJECT_ID('dbo.BienDongKho')) CREATE INDEX IX_BienDongKho_Ngay ON dbo.BienDongKho(NgayTao DESC,MaSanPham);
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_GiuHangDonHang_Status' AND object_id=OBJECT_ID('dbo.GiuHangDonHang')) CREATE INDEX IX_GiuHangDonHang_Status ON dbo.GiuHangDonHang(MaHoaDon,TrangThai);
  COMMIT TRANSACTION;
END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK TRANSACTION; THROW; END CATCH;
