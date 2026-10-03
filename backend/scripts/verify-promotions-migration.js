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
    options: { encrypt: false, trustServerCertificate: true, useUTC: false },
  });
  try {
    const before = await pool.request().query(`SELECT DB_NAME() DatabaseName,
      (SELECT COUNT(*) FROM dbo.SanPham) ProductsBefore,
      (SELECT COUNT(*) FROM dbo.HoaDon) OrdersBefore,
      (SELECT COUNT(*) FROM sys.tables WHERE name LIKE 'KhuyenMai%') PromotionTablesBefore`);
    const file = fs.readFileSync(path.resolve(__dirname, "../migrations/20261001_promotions.sql"), "utf8");
    await pool.request().batch(file);
    await pool.request().batch(file);
    const after = await pool.request().query(`SELECT DB_NAME() DatabaseName,
      (SELECT COUNT(*) FROM sys.tables WHERE name IN('KhuyenMai','KhuyenMaiSanPham','KhuyenMaiDanhMuc','KhuyenMaiThuongHieu','QuaTangKhuyenMai','ChiTietCombo','LichSuSuDungKhuyenMai','HoaDonKhuyenMai','LichSuThayDoiKhuyenMai')) TableCount,
      COL_LENGTH('dbo.ChiTietHoaDon','GiaGocLucMua') PriceSnapshotColumn,
      (SELECT COUNT(*) FROM dbo.SanPham) ProductsAfter,
      (SELECT COUNT(*) FROM dbo.HoaDon) OrdersAfter`);
    const b = before.recordset[0], a = after.recordset[0];
    if (a.TableCount !== 9 || !a.PriceSnapshotColumn || b.ProductsBefore !== a.ProductsAfter || b.OrdersBefore !== a.OrdersAfter) throw new Error("Kiểm tra sau migration không đạt");
    console.log(JSON.stringify({ database: a.DatabaseName, tables: a.TableCount, migrationRuns: 2, existingProductsPreserved: a.ProductsAfter, existingOrdersPreserved: a.OrdersAfter }));
  } finally { await pool.close(); }
}
main().catch(e => { console.error("Promotion migration verification failed:", e.message); process.exitCode = 1; });
