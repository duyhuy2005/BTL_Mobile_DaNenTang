/* Additive customer profile/address support. Safe to re-run; existing customer/order rows stay untouched. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH('dbo.KhachHang', 'NgaySinh') IS NULL
    ALTER TABLE dbo.KhachHang ADD NgaySinh date NULL;
  IF COL_LENGTH('dbo.KhachHang', 'GioiTinh') IS NULL
    ALTER TABLE dbo.KhachHang ADD GioiTinh nvarchar(20) NULL;
  IF COL_LENGTH('dbo.KhachHang', 'AnhDaiDien') IS NULL
    ALTER TABLE dbo.KhachHang ADD AnhDaiDien nvarchar(500) NULL;

  IF OBJECT_ID('dbo.DiaChiNhanHang', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.DiaChiNhanHang (
      Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_DiaChiNhanHang PRIMARY KEY,
      MaKhachHang int NOT NULL,
      TenNguoiNhan nvarchar(150) NOT NULL,
      SoDienThoai varchar(20) NOT NULL,
      DiaChi nvarchar(500) NOT NULL,
      MacDinh bit NOT NULL CONSTRAINT DF_DiaChiNhanHang_MacDinh DEFAULT (0),
      TrangThai bit NOT NULL CONSTRAINT DF_DiaChiNhanHang_TrangThai DEFAULT (1),
      NgayTao datetime2(0) NOT NULL CONSTRAINT DF_DiaChiNhanHang_NgayTao DEFAULT (SYSDATETIME()),
      NgayCapNhat datetime2(0) NOT NULL CONSTRAINT DF_DiaChiNhanHang_NgayCapNhat DEFAULT (SYSDATETIME()),
      CONSTRAINT FK_DiaChiNhanHang_KhachHang FOREIGN KEY (MaKhachHang) REFERENCES dbo.KhachHang(MaKhachHang)
    );
    CREATE INDEX IX_DiaChiNhanHang_KhachHang ON dbo.DiaChiNhanHang(MaKhachHang, TrangThai, MacDinh DESC, Id DESC);
    CREATE UNIQUE INDEX UX_DiaChiNhanHang_MacDinh ON dbo.DiaChiNhanHang(MaKhachHang) WHERE MacDinh=1 AND TrangThai=1;
  END;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
