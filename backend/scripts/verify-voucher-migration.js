const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const sql = require("mssql");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const pool = await sql.connect({
    server: process.env.DB_SERVER || "TRANHUY",
    port: Number(process.env.DB_PORT) || 1433,
    database: process.env.DB_DATABASE || "QuanLyCuaHangMyPham",
    user: process.env.DB_USER || "beauty_user",
    password: process.env.DB_PASSWORD || "",
    options: { encrypt: false, trustServerCertificate: true },
  });
  try {
    const migration = fs.readFileSync(path.resolve(__dirname, "../migrations/20260930_vouchers.sql"), "utf8");
    await pool.request().batch(migration);
    await pool.request().batch(migration);
    const result = await pool.request().query(`SELECT DB_NAME() DatabaseName,
      (SELECT COUNT(*) FROM sys.tables WHERE name IN('Voucher','VoucherSanPham','VoucherDanhMuc','VoucherThuongHieu','VoucherKhachHang','VoucherNguoiDung','LichSuSuDungVoucher','HoaDonVoucher','LichSuThayDoiVoucher')) TableCount,
      COL_LENGTH('dbo.HoaDon','GiamGiaPhiShipVoucher') ShippingVoucherColumn,
      COL_LENGTH('dbo.ChiTietHoaDon','GiamGiaVoucherSnapshot') LineVoucherColumn`);
    const row = result.recordset[0];
    if (row.TableCount !== 9 || !row.ShippingVoucherColumn || !row.LineVoucherColumn) throw new Error("Schema voucher chưa đầy đủ sau migration");
    console.log(JSON.stringify({ database: row.DatabaseName, voucherTables: row.TableCount, migrationRuns: 2, snapshotColumnsPresent: true }));
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error("Voucher migration verification failed:", error.message);
  process.exitCode = 1;
});
