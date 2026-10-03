/* Additive customer-support fields. Existing order snapshots remain untouched. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH('dbo.KhachHang','NgayTao') IS NULL
  BEGIN
    ALTER TABLE dbo.KhachHang ADD NgayTao DATETIME NULL;
    ALTER TABLE dbo.KhachHang ADD CONSTRAINT DF_KhachHang_NgayTao DEFAULT(GETDATE()) FOR NgayTao;
    /* For linked accounts this is the best known profile-creation time. Orphan
       legacy profiles remain NULL instead of being assigned a fabricated date. */
    EXEC sys.sp_executesql N'UPDATE kh SET NgayTao=tk.NgayTao
      FROM dbo.KhachHang kh JOIN dbo.TaiKhoan tk ON tk.MaTaiKhoan=kh.MaTaiKhoan
      WHERE kh.NgayTao IS NULL AND tk.NgayTao IS NOT NULL';
  END;

  IF OBJECT_ID('dbo.GhiChuHoTroKhachHang','U') IS NULL
  BEGIN
    CREATE TABLE dbo.GhiChuHoTroKhachHang(
      Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GhiChuHoTroKhachHang PRIMARY KEY,
      MaKhachHang INT NOT NULL,
      MaTaiKhoanTao INT NOT NULL,
      NoiDung NVARCHAR(1000) NOT NULL,
      NgayTao DATETIME2(0) NOT NULL CONSTRAINT DF_GhiChuHoTroKhachHang_NgayTao DEFAULT(SYSDATETIME()),
      CONSTRAINT FK_GhiChuHoTroKhachHang_KhachHang FOREIGN KEY(MaKhachHang) REFERENCES dbo.KhachHang(MaKhachHang),
      CONSTRAINT FK_GhiChuHoTroKhachHang_TaiKhoan FOREIGN KEY(MaTaiKhoanTao) REFERENCES dbo.TaiKhoan(MaTaiKhoan),
      CONSTRAINT CK_GhiChuHoTroKhachHang_NoiDung CHECK(LEN(LTRIM(RTRIM(NoiDung))) BETWEEN 1 AND 1000)
    );
    CREATE INDEX IX_GhiChuHoTroKhachHang_Khach_Ngay ON dbo.GhiChuHoTroKhachHang(MaKhachHang,NgayTao DESC,Id DESC);
  END;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
