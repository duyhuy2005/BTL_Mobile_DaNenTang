/* Audit fields for manual carrier updates; historical events stay unknown. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  IF COL_LENGTH('dbo.LichSuVanChuyen','ThoiDiemSuKien') IS NULL
    ALTER TABLE dbo.LichSuVanChuyen ADD ThoiDiemSuKien DATETIME NULL;
  IF COL_LENGTH('dbo.LichSuVanChuyen','NguonCapNhat') IS NULL
    ALTER TABLE dbo.LichSuVanChuyen ADD NguonCapNhat NVARCHAR(20) NULL;
  IF NOT EXISTS(SELECT 1 FROM sys.default_constraints WHERE name='DF_LichSuVanChuyen_EventTime' AND parent_object_id=OBJECT_ID('dbo.LichSuVanChuyen'))
    ALTER TABLE dbo.LichSuVanChuyen ADD CONSTRAINT DF_LichSuVanChuyen_EventTime DEFAULT(GETDATE()) FOR ThoiDiemSuKien;
  IF NOT EXISTS(SELECT 1 FROM sys.default_constraints WHERE name='DF_LichSuVanChuyen_Source' AND parent_object_id=OBJECT_ID('dbo.LichSuVanChuyen'))
    ALTER TABLE dbo.LichSuVanChuyen ADD CONSTRAINT DF_LichSuVanChuyen_Source DEFAULT(N'THU_CONG') FOR NguonCapNhat;
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
