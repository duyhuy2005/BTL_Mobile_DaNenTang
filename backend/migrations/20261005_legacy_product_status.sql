/* Normalize confirmed legacy active product labels for APIs that use 1/0 status values. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF EXISTS (
    SELECT 1
    FROM sys.columns c
    JOIN sys.types t ON t.user_type_id=c.user_type_id
    WHERE c.object_id=OBJECT_ID(N'dbo.SanPham')
      AND c.name=N'TrangThai'
      AND t.name IN(N'nvarchar',N'varchar',N'nchar',N'char')
  )
  BEGIN
    UPDATE dbo.SanPham
    SET TrangThai=N'1'
    WHERE TRY_CONVERT(int,TrangThai) IS NULL
      AND CONVERT(varbinary(200),TrangThai) IN (
        0x100141004E00470020004200C1004E00,
        0xC400900041004E00470020004200C30081004E00
      );
  END;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
