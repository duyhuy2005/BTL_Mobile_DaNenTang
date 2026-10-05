const fs = require("fs");
const path = require("path");
const { getPool } = require("../dist/config/database");

(async () => {
  const pool = await getPool();
  try {
    const script = fs.readFileSync(path.resolve(__dirname, "../migrations/20261001_shipping_manual_events.sql"), "utf8");
    await pool.request().batch(script);
    const result = await pool.request().query(`SELECT
      COL_LENGTH('dbo.LichSuVanChuyen','ThoiDiemSuKien') AS ThoiDiemSuKien,
      COL_LENGTH('dbo.LichSuVanChuyen','NguonCapNhat') AS NguonCapNhat,
      (SELECT COUNT(*) FROM dbo.LichSuVanChuyen) AS SoBanGhiLichSu`);
    console.log(JSON.stringify(result.recordset[0]));
  } finally {
    await pool.close();
  }
})().catch((error) => {
  console.error("Không thể áp dụng/kiểm tra migration vận chuyển:", error.message);
  process.exitCode = 1;
});
