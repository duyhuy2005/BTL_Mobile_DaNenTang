/*
  Public launch tracking for the one-month "MỚI" label.
  Existing rows deliberately keep NgayCongKhai = NULL: the legacy create time
  is not proof of the date a product first became publicly sellable.
  DaTungCongKhai defaults to 1 for legacy rows so toggling them never invents
  a new launch date. New drafts are explicitly inserted with value 0 by API.
*/
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF OBJECT_ID(N'dbo.SanPham', N'U') IS NULL
    THROW 51000, N'Không tìm thấy bảng dbo.SanPham; migration đã dừng.', 1;

  IF COL_LENGTH(N'dbo.SanPham', N'NgayCongKhai') IS NULL
    ALTER TABLE dbo.SanPham ADD NgayCongKhai datetime2(0) NULL;

  IF COL_LENGTH(N'dbo.SanPham', N'DaTungCongKhai') IS NULL
  BEGIN
    ALTER TABLE dbo.SanPham ADD DaTungCongKhai bit NOT NULL
      CONSTRAINT DF_SanPham_DaTungCongKhai DEFAULT (1) WITH VALUES;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.SanPham') AND name = N'IX_SanPham_NgayCongKhai'
  )
    EXEC(N'CREATE INDEX IX_SanPham_NgayCongKhai ON dbo.SanPham(NgayCongKhai DESC, MaSanPham DESC) WHERE NgayCongKhai IS NOT NULL;');

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
