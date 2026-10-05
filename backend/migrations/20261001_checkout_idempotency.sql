/* Additive, backward-compatible checkout retry protection. Existing orders keep NULL. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH('dbo.HoaDon', 'IdempotencyKey') IS NULL
    ALTER TABLE dbo.HoaDon ADD IdempotencyKey VARCHAR(100) NULL;

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.HoaDon') AND name = 'UX_HoaDon_KhachHang_IdempotencyKey'
  )
    EXEC(N'CREATE UNIQUE INDEX UX_HoaDon_KhachHang_IdempotencyKey
      ON dbo.HoaDon(MaKhachHang, IdempotencyKey)
      WHERE MaKhachHang IS NOT NULL AND IdempotencyKey IS NOT NULL;');

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
