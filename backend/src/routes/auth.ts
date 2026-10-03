import { Router } from "express";
import { queryOne, execute, getPool, sql } from "../config/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { timingSafeEqual } from "crypto";
import { AuthRequest, authenticate, authorizeRoles, normalizeRole } from "../middleware/auth";

const router = Router();

// Session restoration endpoint. The middleware re-reads account status from SQL Server,
// so a cached mobile identity is never treated as proof of an active session.
router.get("/me", authenticate, authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const user = await queryOne<any>(
      `SELECT tk.MaTaiKhoan,tk.TenDangNhap,tk.HoTen,tk.Email,tk.SoDienThoai,tk.VaiTro,tk.TrangThai,
              kh.MaKhachHang,kh.AnhDaiDien
       FROM TaiKhoan tk JOIN KhachHang kh ON kh.MaTaiKhoan=tk.MaTaiKhoan
       WHERE tk.MaTaiKhoan=@id`,
      { id: req.user?.MaTaiKhoan },
    );
    if (!user) return res.status(403).json({ success: false, message: "Tài khoản không còn hồ sơ khách hàng hoạt động" });
    res.json({ success: true, data: { user: { ...user, VaiTro: normalizeRole(user.VaiTro) } } });
  } catch (err: any) {
    console.error("Session validation failed:", err);
    res.status(500).json({ success: false, message: "Không thể xác minh phiên đăng nhập" });
  }
});

function isActiveAccount(status: unknown) {
  if (status === true) return true;
  const normalized = String(status ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "hoat dong" || normalized === "active";
}

function isBcryptHash(value: unknown): value is string {
  return typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);
}

function matchesLegacyPassword(input: string, stored: string) {
  const inputBytes = Buffer.from(input, "utf8");
  const storedBytes = Buffer.from(stored, "utf8");
  return inputBytes.length === storedBytes.length && timingSafeEqual(inputBytes, storedBytes);
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { TenDangNhap, MatKhau } = req.body;
    if (!TenDangNhap || !MatKhau)
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập đầy đủ thông tin" });

    const user = await queryOne(
      `SELECT * FROM TaiKhoan
       WHERE TenDangNhap = @TenDangNhap OR Email = @TenDangNhap OR SoDienThoai = @TenDangNhap`,
      { TenDangNhap },
    );
    if (!user)
      return res
        .status(401)
        .json({
          success: false,
          message: "Tên đăng nhập hoặc mật khẩu không đúng",
        });

    const isValid = isBcryptHash(user.MatKhau)
      ? await bcrypt.compare(MatKhau, user.MatKhau)
      : matchesLegacyPassword(MatKhau, String(user.MatKhau ?? ""));
    if (!isValid)
      return res
        .status(401)
        .json({
          success: false,
          message: "Tên đăng nhập hoặc mật khẩu không đúng",
        });

    if (!isActiveAccount(user.TrangThai)) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa hoặc chưa được kích hoạt",
      });
    }

    // Legacy rows were stored without bcrypt. Upgrade only after a successful
    // verification; the user's password itself is not changed.
    if (!isBcryptHash(user.MatKhau)) {
      await execute(
        "UPDATE TaiKhoan SET MatKhau=@MatKhau WHERE MaTaiKhoan=@MaTaiKhoan",
        { MaTaiKhoan: user.MaTaiKhoan, MatKhau: await bcrypt.hash(MatKhau, 10) },
      );
    }

    const vaiTro = normalizeRole(user.VaiTro);
    const nhanVien = vaiTro === "NhanVien"
      ? await queryOne("SELECT AnhDaiDien FROM NhanVien WHERE MaTaiKhoan=@MaTaiKhoan", { MaTaiKhoan: user.MaTaiKhoan })
      : null;
    const token = jwt.sign(
      {
        MaTaiKhoan: user.MaTaiKhoan,
        TenDangNhap: user.TenDangNhap,
        VaiTro: vaiTro,
      },
      process.env.JWT_SECRET || "beauty_store_secret",
      { expiresIn: "24h" },
    );

    // Lấy thêm thông tin KhachHang nếu có
    const khachHang = await queryOne(
      "SELECT * FROM KhachHang WHERE MaTaiKhoan = @MaTaiKhoan",
      { MaTaiKhoan: user.MaTaiKhoan },
    );
    if (vaiTro === "KhachHang" && (!khachHang || khachHang.TrangThai === false || khachHang.TrangThai === 0)) {
      return res.status(403).json({ success: false, message: "Hồ sơ khách hàng chưa được kích hoạt hoặc chưa được liên kết" });
    }

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        token,
        user: {
          MaTaiKhoan: user.MaTaiKhoan,
          TenDangNhap: user.TenDangNhap,
          HoTen: user.HoTen,
          Email: user.Email,
          VaiTro: vaiTro,
          TrangThai: user.TrangThai,
          AnhDaiDien: nhanVien?.AnhDaiDien || null,
        },
        khachHang: khachHang || null,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { TenDangNhap, MatKhau, HoTen, Email, SoDienThoai } =
      req.body;
    const login = String(TenDangNhap || "").trim().toLowerCase();
    const name = String(HoTen || "").trim();
    const email = String(Email || "").trim().toLowerCase();
    const phone = String(SoDienThoai || "").replace(/[ .-]/g, "");
    if (!login || typeof MatKhau !== "string" || MatKhau.length < 8 || !name || (!email && !phone))
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập đủ thông tin hợp lệ; mật khẩu cần ít nhất 8 ký tự" });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: "Email không hợp lệ" });
    if (phone && !/^(03|05|07|08|09)[0-9]{8}$/.test(phone)) return res.status(400).json({ success: false, message: "Số điện thoại không hợp lệ" });

    const hashed = await bcrypt.hash(MatKhau, 10);

    const pool = await getPool(); const tx = new sql.Transaction(pool); await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    let maTaiKhoan: number;
    try {
      const request = new sql.Request(tx).input("login", sql.VarChar(255), login).input("email", sql.VarChar(255), email || null).input("phone", sql.VarChar(20), phone || null);
      const duplicate = await request.query("SELECT TOP 1 MaTaiKhoan FROM dbo.TaiKhoan WITH(UPDLOCK,HOLDLOCK) WHERE TenDangNhap=@login OR (@email IS NOT NULL AND Email=@email) OR (@phone IS NOT NULL AND SoDienThoai=@phone)");
      if (duplicate.recordset.length) { await tx.rollback(); return res.status(409).json({ success: false, message: "Email hoặc số điện thoại đã được sử dụng" }); }
      const inserted = await new sql.Request(tx).input("login", sql.VarChar(255), login).input("password", sql.VarChar(255), hashed).input("name", sql.NVarChar(150), name).input("email", sql.VarChar(255), email || null).input("phone", sql.VarChar(20), phone || null).query("INSERT dbo.TaiKhoan(TenDangNhap,MatKhau,HoTen,Email,SoDienThoai,VaiTro,TrangThai) OUTPUT INSERTED.MaTaiKhoan VALUES(@login,@password,@name,@email,@phone,N'KhachHang',N'Hoạt động')");
      maTaiKhoan = inserted.recordset[0].MaTaiKhoan;
      await new sql.Request(tx).input("account", sql.Int, maTaiKhoan).input("name", sql.NVarChar(150), name).input("email", sql.VarChar(255), email || null).input("phone", sql.VarChar(20), phone || null).query("INSERT dbo.KhachHang(MaTaiKhoan,HoTen,Email,SoDienThoai,TrangThai) VALUES(@account,@name,@email,@phone,1)");
      await tx.commit();
    } catch (error) { try { await tx.rollback(); } catch { /* transaction already rolled back */ } throw error; }

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công. Tài khoản đã được kích hoạt và có thể đăng nhập.",
      data: { MaTaiKhoan: maTaiKhoan },
    });
  } catch (err: any) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
