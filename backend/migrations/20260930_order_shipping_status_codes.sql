/*
  Normalize order/payment/shipping statuses without deleting historical data.
  Safe to rerun. Existing recipient snapshots are only filled when currently NULL/blank.
*/
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  UPDATE hd SET
    TenNguoiNhan = COALESCE(NULLIF(LTRIM(RTRIM(hd.TenNguoiNhan)),N''), kh.HoTen),
    SoDienThoaiNhan = COALESCE(NULLIF(LTRIM(RTRIM(hd.SoDienThoaiNhan)),''), kh.SoDienThoai),
    DiaChiGiaoHang = COALESCE(NULLIF(LTRIM(RTRIM(hd.DiaChiGiaoHang)),N''), kh.DiaChi)
  FROM dbo.HoaDon hd
  LEFT JOIN dbo.KhachHang kh ON kh.MaKhachHang=hd.MaKhachHang
  WHERE NULLIF(LTRIM(RTRIM(hd.TenNguoiNhan)),N'') IS NULL
     OR NULLIF(LTRIM(RTRIM(hd.SoDienThoaiNhan)),'') IS NULL
     OR NULLIF(LTRIM(RTRIM(hd.DiaChiGiaoHang)),N'') IS NULL;

  UPDATE dbo.HoaDon SET TrangThai=CASE TrangThai
    WHEN N'Chờ xác nhận' THEN N'CHO_XAC_NHAN'
    WHEN N'Chờ thanh toán' THEN N'CHO_XAC_NHAN'
    WHEN N'Đã thanh toán' THEN N'CHO_XAC_NHAN'
    WHEN N'Đã xác nhận' THEN N'DA_XAC_NHAN'
    WHEN N'Đang chuẩn bị' THEN N'DANG_CHUAN_BI'
    WHEN N'Đã đóng gói' THEN N'DA_DONG_GOI'
    WHEN N'Đang giao' THEN N'DANG_GIAO'
    WHEN N'Đã giao' THEN N'DA_GIAO'
    WHEN N'Hoàn thành' THEN N'HOAN_THANH'
    WHEN N'Đã hủy' THEN N'DA_HUY'
    WHEN N'Giao thất bại' THEN N'GIAO_THAT_BAI'
    WHEN N'Đang hoàn hàng' THEN N'DANG_HOAN_HANG'
    WHEN N'Đã hoàn hàng' THEN N'DA_HOAN_HANG'
    ELSE TrangThai END;

  UPDATE dbo.HoaDon SET TrangThaiThanhToan=CASE TrangThaiThanhToan
    WHEN N'Chưa thanh toán' THEN N'CHUA_THANH_TOAN'
    WHEN N'Chờ thanh toán' THEN N'CHO_THANH_TOAN'
    WHEN N'Đã thanh toán' THEN N'DA_THANH_TOAN'
    WHEN N'Chờ hoàn tiền' THEN N'CHO_HOAN_TIEN'
    WHEN N'Đã hoàn tiền' THEN N'DA_HOAN_TIEN'
    ELSE COALESCE(TrangThaiThanhToan,
      CASE WHEN PhuongThucThanhToan IN(N'COD',N'Tiền mặt') THEN N'CHUA_THANH_TOAN' ELSE N'CHO_THANH_TOAN' END)
    END;

  UPDATE dbo.HoaDon SET TrangThaiVanChuyen=CASE TrangThaiVanChuyen
    WHEN N'Chưa tạo vận đơn' THEN N'CHUA_TAO_VAN_DON'
    WHEN N'Chờ lấy hàng' THEN N'CHO_LAY_HANG'
    WHEN N'Đã lấy hàng' THEN N'DA_LAY_HANG'
    WHEN N'Đang vận chuyển' THEN N'DANG_VAN_CHUYEN'
    WHEN N'Đang giao' THEN N'DANG_GIAO'
    WHEN N'Đang giao lại' THEN N'CHO_GIAO_LAI'
    WHEN N'Chờ giao lại' THEN N'CHO_GIAO_LAI'
    WHEN N'Giao thành công' THEN N'GIAO_THANH_CONG'
    WHEN N'Giao thất bại' THEN N'GIAO_THAT_BAI'
    WHEN N'Đang hoàn về' THEN N'DANG_HOAN_VE'
    WHEN N'Đã hoàn về' THEN N'DA_HOAN_VE'
    WHEN N'Đã hủy vận đơn' THEN N'DA_HUY_VAN_DON'
    ELSE COALESCE(TrangThaiVanChuyen,N'CHUA_TAO_VAN_DON') END;

  UPDATE dbo.LichSuTrangThaiHoaDon SET TrangThaiCu=CASE TrangThaiCu
    WHEN N'Chờ xác nhận' THEN N'CHO_XAC_NHAN' WHEN N'Chờ thanh toán' THEN N'CHO_XAC_NHAN'
    WHEN N'Đã thanh toán' THEN N'CHO_XAC_NHAN' WHEN N'Đã xác nhận' THEN N'DA_XAC_NHAN'
    WHEN N'Đang chuẩn bị' THEN N'DANG_CHUAN_BI' WHEN N'Đã đóng gói' THEN N'DA_DONG_GOI'
    WHEN N'Đang giao' THEN N'DANG_GIAO' WHEN N'Đã giao' THEN N'DA_GIAO'
    WHEN N'Hoàn thành' THEN N'HOAN_THANH' WHEN N'Đã hủy' THEN N'DA_HUY'
    WHEN N'Giao thất bại' THEN N'GIAO_THAT_BAI' WHEN N'Đang hoàn hàng' THEN N'DANG_HOAN_HANG'
    WHEN N'Đã hoàn hàng' THEN N'DA_HOAN_HANG' ELSE TrangThaiCu END,
    TrangThaiMoi=CASE TrangThaiMoi
    WHEN N'Chờ xác nhận' THEN N'CHO_XAC_NHAN' WHEN N'Chờ thanh toán' THEN N'CHO_XAC_NHAN'
    WHEN N'Đã thanh toán' THEN N'CHO_XAC_NHAN' WHEN N'Đã xác nhận' THEN N'DA_XAC_NHAN'
    WHEN N'Đang chuẩn bị' THEN N'DANG_CHUAN_BI' WHEN N'Đã đóng gói' THEN N'DA_DONG_GOI'
    WHEN N'Đang giao' THEN N'DANG_GIAO' WHEN N'Đã giao' THEN N'DA_GIAO'
    WHEN N'Hoàn thành' THEN N'HOAN_THANH' WHEN N'Đã hủy' THEN N'DA_HUY'
    WHEN N'Giao thất bại' THEN N'GIAO_THAT_BAI' WHEN N'Đang hoàn hàng' THEN N'DANG_HOAN_HANG'
    WHEN N'Đã hoàn hàng' THEN N'DA_HOAN_HANG' ELSE TrangThaiMoi END;

  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_HoaDon_TrangThai_NgayLap' AND object_id=OBJECT_ID(N'dbo.HoaDon'))
    CREATE INDEX IX_HoaDon_TrangThai_NgayLap ON dbo.HoaDon(TrangThai,NgayLap DESC);

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
