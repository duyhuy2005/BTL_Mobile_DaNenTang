/* Employee self-service profile fields. Additive and safe for existing rows. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF OBJECT_ID(N'dbo.NhanVien', N'U') IS NULL
    THROW 51000, 'NhanVien table is required before applying employee profile migration.', 1;

  IF COL_LENGTH(N'dbo.NhanVien', N'NgaySinh') IS NULL
    ALTER TABLE dbo.NhanVien ADD NgaySinh date NULL;
  IF COL_LENGTH(N'dbo.NhanVien', N'GioiTinh') IS NULL
    ALTER TABLE dbo.NhanVien ADD GioiTinh nvarchar(20) NULL;
  IF COL_LENGTH(N'dbo.NhanVien', N'DiaChi') IS NULL
    ALTER TABLE dbo.NhanVien ADD DiaChi nvarchar(500) NULL;
  IF COL_LENGTH(N'dbo.NhanVien', N'AnhDaiDien') IS NULL
    ALTER TABLE dbo.NhanVien ADD AnhDaiDien nvarchar(500) NULL;
  IF COL_LENGTH(N'dbo.NhanVien', N'ProfileVersion') IS NULL
    ALTER TABLE dbo.NhanVien ADD ProfileVersion rowversion NOT NULL;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
