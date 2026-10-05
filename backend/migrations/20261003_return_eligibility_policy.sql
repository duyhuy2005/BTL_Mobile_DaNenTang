/* Store configurable customer return window; preserve existing orders and requests. */
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF OBJECT_ID('dbo.ChinhSachHoanTra','U') IS NULL
  BEGIN
    CREATE TABLE dbo.ChinhSachHoanTra(
      Id TINYINT NOT NULL CONSTRAINT PK_ChinhSachHoanTra PRIMARY KEY,
      SoNgayDuocYeuCau INT NOT NULL,
      ChoPhepKhachYeuCau BIT NOT NULL CONSTRAINT DF_ChinhSachHoanTra_Enabled DEFAULT(1),
      UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ChinhSachHoanTra_Updated DEFAULT(SYSDATETIME()),
      UpdatedBy INT NULL,
      CONSTRAINT CK_ChinhSachHoanTra_Singleton CHECK(Id=1),
      CONSTRAINT CK_ChinhSachHoanTra_Days CHECK(SoNgayDuocYeuCau BETWEEN 1 AND 365),
      CONSTRAINT FK_ChinhSachHoanTra_Account FOREIGN KEY(UpdatedBy) REFERENCES dbo.TaiKhoan(MaTaiKhoan)
    );
  END;

  /* Preserve the current backend policy (7 days), but make it a database setting
     that Admin can inspect and change through the policy API. */
  IF NOT EXISTS(SELECT 1 FROM dbo.ChinhSachHoanTra WHERE Id=1)
    INSERT dbo.ChinhSachHoanTra(Id,SoNgayDuocYeuCau,ChoPhepKhachYeuCau) VALUES(1,7,1);

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
