/* Additive category tree support; existing categories remain root nodes. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  IF COL_LENGTH('dbo.DanhMuc','MaDanhMucCha') IS NULL ALTER TABLE dbo.DanhMuc ADD MaDanhMucCha INT NULL;
  IF COL_LENGTH('dbo.DanhMuc','MaDanhMucCode') IS NULL ALTER TABLE dbo.DanhMuc ADD MaDanhMucCode VARCHAR(50) NULL;
  IF COL_LENGTH('dbo.DanhMuc','ThuTuHienThi') IS NULL ALTER TABLE dbo.DanhMuc ADD ThuTuHienThi INT NOT NULL CONSTRAINT DF_DanhMuc_ThuTu DEFAULT 0;
  IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_DanhMuc_Cha') ALTER TABLE dbo.DanhMuc ADD CONSTRAINT FK_DanhMuc_Cha FOREIGN KEY (MaDanhMucCha) REFERENCES dbo.DanhMuc(MaDanhMuc);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_DanhMuc_Code' AND object_id=OBJECT_ID('dbo.DanhMuc')) EXEC(N'CREATE UNIQUE INDEX UX_DanhMuc_Code ON dbo.DanhMuc(MaDanhMucCode) WHERE MaDanhMucCode IS NOT NULL;');
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_DanhMuc_Cha_ThuTu' AND object_id=OBJECT_ID('dbo.DanhMuc')) EXEC(N'CREATE INDEX IX_DanhMuc_Cha_ThuTu ON dbo.DanhMuc(MaDanhMucCha, ThuTuHienThi, MaDanhMuc);');
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
