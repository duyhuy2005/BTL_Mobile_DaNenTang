import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { getPool } from "./config/database";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

import authRoutes from "./routes/auth";
import danhmucRoutes from "./routes/danhmuc";
import sanphamRoutes from "./routes/sanpham";
import khachhangRoutes from "./routes/khachhang";
import hoadonRoutes from "./routes/hoadon";
import nhanvienRoutes from "./routes/nhanvien";
import gioHangRoutes from "./routes/giohang";
import dashboardRoutes from "./routes/dashboard";
import yeuThichRoutes from "./routes/yeuthich";
import uploadRoutes from "./routes/upload";
import khoHangRoutes from "./routes/khohang";
import giaoHangRoutes from "./routes/giaohang";
import hoanDoiTraRoutes from "./routes/hoandoitra";
import voucherRoutes from "./routes/voucher";
import khuyenMaiRoutes from "./routes/khuyenmai";
import danhGiaRoutes from "./routes/danhgia";
import thongBaoRoutes from "./routes/thongbao";
import baoCaoRoutes from "./routes/baocao";
import { authenticate, authenticateOptional } from "./middleware/auth";

// Public
app.use("/api/auth", authRoutes);

// Protected
app.use("/api/dashboard", authenticate, dashboardRoutes);
app.use("/api/baocao", authenticate, baoCaoRoutes);
// Catalogue reads are public; route-level role checks still protect stats and writes.
app.use("/api/danhmuc", authenticateOptional, danhmucRoutes);
app.use("/api/sanpham", authenticateOptional, sanphamRoutes);
app.use("/api/khachhang", authenticate, khachhangRoutes);
app.use("/api/hoadon", authenticate, hoadonRoutes);
app.use("/api/nhanvien", authenticate, nhanvienRoutes);
app.use("/api/giohang", authenticate, gioHangRoutes);
app.use("/api/yeuthich", authenticate, yeuThichRoutes);
app.use("/api/upload", authenticate, uploadRoutes);
app.use("/api/khohang", authenticate, khoHangRoutes);
app.use("/api/giaohang", authenticate, giaoHangRoutes);
app.use("/api/vanchuyen", authenticate, giaoHangRoutes);
app.use("/api/hoantra", authenticate, hoanDoiTraRoutes);
app.use("/api/voucher", authenticate, voucherRoutes);
app.use("/api/khuyenmai", authenticate, khuyenMaiRoutes);
app.use("/api/danhgia", authenticateOptional, danhGiaRoutes);
app.use("/api/thongbao", authenticateOptional, thongBaoRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Backend API đang hoạt động",
    timestamp: new Date(),
  });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "API không tồn tại" });
});

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Server Error:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Lỗi server" });
  },
);

async function startServer() {
  try {
    await getPool();
    // Expo Go on a physical phone connects through the computer's LAN address.
    // Binding explicitly to all interfaces keeps localhost working and exposes the API on that LAN.
    app.listen(PORT, "0.0.0.0", () => {
      console.log("\n═══════════════════════════════════════════════════════");
      console.log("   🌸 BEAUTY STORE - Backend API Server");
      console.log("═══════════════════════════════════════════════════════");
      console.log(`   ✅ Server: http://localhost:${PORT} (LAN enabled)`);
      console.log(`   ✅ Database: ${process.env.DB_DATABASE}`);
      console.log("   📌 /api/auth | /api/sanpham | /api/danhmuc");
      console.log("   📌 /api/hoadon | /api/khachhang | /api/giohang");
      console.log("   📌 /api/nhanvien | /api/dashboard");
      console.log("═══════════════════════════════════════════════════════\n");
    });
  } catch (err) {
    console.error("❌ Không thể khởi động server:", err);
    process.exit(1);
  }
}

startServer();
