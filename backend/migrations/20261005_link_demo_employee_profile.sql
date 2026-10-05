/* Link the existing demo employee account to its self-service profile. Safe to rerun. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  DECLARE @AccountId int;
  SELECT TOP 1 @AccountId=MaTaiKhoan
  FROM dbo.TaiKhoan
  WHERE TenDangNhap=N'nhanvien'
    AND REPLACE(LOWER(LTRIM(RTRIM(VaiTro))),N' ',N'') COLLATE Latin1_General_100_CI_AI IN(N'nhanvien',N'employee',N'staff')
  AND TrangThai=1;

  IF @AccountId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE MaTaiKhoan=@AccountId)
  BEGIN
    INSERT dbo.NhanVien(MaTaiKhoan,HoTen,SoDienThoai,Email,ChucVu,TrangThai)
    SELECT MaTaiKhoan,COALESCE(NULLIF(LTRIM(RTRIM(HoTen)),N''),TenDangNhap),SoDienThoai,Email,N'Nhan vien',1
    FROM dbo.TaiKhoan
    WHERE MaTaiKhoan=@AccountId;
  END;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;