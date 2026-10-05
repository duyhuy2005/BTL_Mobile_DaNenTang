const { getPool } = require("../dist/config/database");

(async () => {
  const pool = await getPool();
  try {
    const returns = await pool.request().query(`SELECT COUNT(*) Total,
      SUM(CASE WHEN TrangThai='CHO_DUYET' THEN 1 ELSE 0 END) ChoXemXet,
      SUM(CASE WHEN TrangThai IN('CHO_LAY_HANG_HOAN','DA_LAY_HANG_HOAN','DANG_HOAN_VE') THEN 1 ELSE 0 END) ChoNhanHang,
      SUM(CASE WHEN TrangThai IN('DA_NHAN_HANG_HOAN','DANG_KIEM_TRA') THEN 1 ELSE 0 END) ChoKiemTra,
      SUM(CASE WHEN TrangThai IN('CHO_HOAN_TIEN','DANG_HOAN_TIEN','HOAN_TIEN_THAT_BAI') THEN 1 ELSE 0 END) ChoHoanTien
      FROM dbo.YeuCauHoanTra`);
    const shipping = await pool.request().query(`SELECT COUNT(*) Total,
      SUM(CASE WHEN TrangThai='CHO_LAY_HANG' THEN 1 ELSE 0 END) ChoBanGiao,
      SUM(CASE WHEN TrangThai IN('DA_LAY_HANG','DANG_VAN_CHUYEN','DANG_GIAO','CHO_GIAO_LAI') THEN 1 ELSE 0 END) DangGiao,
      SUM(CASE WHEN TrangThai='GIAO_THAT_BAI' THEN 1 ELSE 0 END) ThatBai,
      SUM(CASE WHEN TrangThai='GIAO_THANH_CONG' AND NgayGiaoThanhCong>=CONVERT(date,GETDATE()) AND NgayGiaoThanhCong<DATEADD(day,1,CONVERT(date,GETDATE())) THEN 1 ELSE 0 END) DaGiaoHomNay
      FROM dbo.VanChuyen`);
    const schema = await pool.request().query(`SELECT
      OBJECT_ID('dbo.ChiTietYeuCauHoanTra','U') ReturnLines,
      OBJECT_ID('dbo.BienBanKiemTraHoanTra','U') InspectionHeaders,
      OBJECT_ID('dbo.GiaoDichHoanTienTra','U') RefundTransactions,
      COL_LENGTH('dbo.LichSuVanChuyen','ThoiDiemSuKien') ShippingEventTime,
      COL_LENGTH('dbo.LichSuVanChuyen','NguonCapNhat') ShippingEventSource`);
    console.log(JSON.stringify({ returns: returns.recordset[0], shipping: shipping.recordset[0], schema: schema.recordset[0] }));
  } finally {
    await pool.close();
  }
})().catch((error) => {
  console.error("Kiểm tra dữ liệu hoàn trả/vận chuyển thất bại:", error.message);
  process.exitCode = 1;
});
