import { Router } from "express";
import { execute, query, queryOne } from "../config/database";
import { AuthRequest, authorizeRoles, normalizeRole } from "../middleware/auth";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import crypto from "crypto";
import fs from "fs/promises";
import multer from "multer";
import path from "path";

const router = Router();
const adminOnly = authorizeRoles("Admin");
const employeeOnly = authorizeRoles("NhanVien");
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

async function getOwnProfile(accountId: number) {
  return queryOne<any>(`SELECT TOP 1 nv.MaNhanVien,nv.MaTaiKhoan,nv.HoTen,nv.SoDienThoai SoDienThoaiLienHe,
      nv.ChucVu,nv.TrangThai TrangThaiNhanVien,nv.NgaySinh,nv.GioiTinh,nv.DiaChi,nv.AnhDaiDien,
      CONVERT(varchar(18),nv.ProfileVersion,1) ProfileVersion,
      tk.TenDangNhap,tk.Email EmailDangNhap,tk.VaiTro,tk.TrangThai TrangThaiTaiKhoan
    FROM dbo.NhanVien nv JOIN dbo.TaiKhoan tk ON tk.MaTaiKhoan=nv.MaTaiKhoan
    WHERE nv.MaTaiKhoan=@accountId ORDER BY nv.MaNhanVien`, { accountId });
}

function accountIsActive(status: unknown) {
  return ["1", "true", "hoạt động", "hoat dong", "active"].includes(String(status ?? "").trim().toLowerCase());
}

function validDateOnly(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Ngày sinh không hợp lệ");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || date > new Date(new Date().toISOString().slice(0, 10))) throw new Error("Ngày sinh không hợp lệ hoặc ở tương lai");
  return value;
}

function inspectProfileImage(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return ".jpg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return ".png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return ".webp";
  return null;
}

// Self-service profile: ownership is derived only from the verified JWT.
router.get("/me", employeeOnly, async (req: AuthRequest, res) => {
  try {
    const profile = await getOwnProfile(Number(req.user!.MaTaiKhoan));
    if (!profile || normalizeRole(profile.VaiTro) !== "NhanVien" || !accountIsActive(profile.TrangThaiTaiKhoan) || !accountIsActive(profile.TrangThaiNhanVien)) {
      return res.status(profile ? 403 : 404).json({ success: false, message: profile ? "Tài khoản nhân viên không hoạt động hoặc quyền đã thay đổi" : "Tài khoản chưa được liên kết với hồ sơ nhân viên" });
    }
    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Không thể tải hồ sơ nhân viên" });
  }
});

router.put("/me", employeeOnly, async (req: AuthRequest, res) => {
  try {
    const allowed = new Set(["HoTen", "SoDienThoaiLienHe", "NgaySinh", "GioiTinh", "DiaChi", "ProfileVersion"]);
    if (Object.keys(req.body ?? {}).some((key) => !allowed.has(key))) return res.status(400).json({ success: false, message: "Request có trường không được phép sửa" });
    const profile = await getOwnProfile(Number(req.user!.MaTaiKhoan));
    if (!profile || normalizeRole(profile.VaiTro) !== "NhanVien" || !accountIsActive(profile.TrangThaiTaiKhoan) || !accountIsActive(profile.TrangThaiNhanVien)) return res.status(profile ? 403 : 404).json({ success: false, message: "Không tìm thấy hồ sơ nhân viên đang hoạt động" });
    const HoTen = String(req.body.HoTen ?? "").trim();
    const phone = String(req.body.SoDienThoaiLienHe ?? "").trim();
    const GioiTinh = String(req.body.GioiTinh ?? "").trim();
    const DiaChi = String(req.body.DiaChi ?? "").trim();
    const ProfileVersion = String(req.body.ProfileVersion ?? "");
    if (!HoTen || HoTen.length > 100) return res.status(400).json({ success: false, message: "Họ tên là bắt buộc và tối đa 100 ký tự", field: "HoTen" });
    if (phone.length > 20 || (phone && !/^\+?[0-9][0-9 .()-]{5,19}$/.test(phone))) return res.status(400).json({ success: false, message: "Số điện thoại liên hệ không hợp lệ (tối đa 20 ký tự)", field: "SoDienThoaiLienHe" });
    if (DiaChi.length > 500) return res.status(400).json({ success: false, message: "Địa chỉ tối đa 500 ký tự", field: "DiaChi" });
    if (GioiTinh && !["Nam", "Nữ", "Khác"].includes(GioiTinh)) return res.status(400).json({ success: false, message: "Giới tính không hợp lệ", field: "GioiTinh" });
    const NgaySinh = validDateOnly(req.body.NgaySinh);
    if (!/^0x[\da-f]{16}$/i.test(ProfileVersion)) return res.status(400).json({ success: false, message: "Phiên bản hồ sơ không hợp lệ. Hãy tải lại hồ sơ." });

    const result = await execute(`
      SET XACT_ABORT ON;
      BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.NhanVien SET HoTen=@HoTen,SoDienThoai=@phone,NgaySinh=@NgaySinh,GioiTinh=@GioiTinh,DiaChi=@DiaChi
          OUTPUT INSERTED.MaNhanVien,INSERTED.HoTen,INSERTED.SoDienThoai SoDienThoaiLienHe,INSERTED.NgaySinh,INSERTED.GioiTinh,INSERTED.DiaChi,INSERTED.AnhDaiDien,CONVERT(varchar(18),INSERTED.ProfileVersion,1) ProfileVersion
          WHERE MaTaiKhoan=@accountId AND CONVERT(varchar(18),ProfileVersion,1)=@ProfileVersion AND TrangThai=1;
        IF @@ROWCOUNT=0 BEGIN ROLLBACK TRANSACTION; THROW 51001,'PROFILE_CONFLICT_OR_INACTIVE',1; END;
        UPDATE dbo.TaiKhoan SET HoTen=@HoTen WHERE MaTaiKhoan=@accountId AND REPLACE(LOWER(LTRIM(RTRIM(VaiTro))),N' ',N'') COLLATE Latin1_General_100_CI_AI IN(N'nhanvien',N'employee',N'staff') AND TrangThai IN(N'Hoạt động',N'Active',N'1');
        IF @@ROWCOUNT=0 BEGIN ROLLBACK TRANSACTION; THROW 51002,'ACCOUNT_INACTIVE_OR_ROLE_CHANGED',1; END;
        COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
        THROW;
      END CATCH;`, { accountId: Number(req.user!.MaTaiKhoan), ProfileVersion, HoTen, phone: phone || null, NgaySinh, GioiTinh: GioiTinh || null, DiaChi: DiaChi || null });
    const updated = result.recordset?.[0];
    if (!updated) return res.status(409).json({ success: false, message: "Hồ sơ vừa được Admin cập nhật. Hãy tải lại để xem phiên bản mới trước khi lưu." });
    res.json({ success: true, message: "Đã cập nhật hồ sơ", data: { ...updated, TenDangNhap: profile.TenDangNhap, EmailDangNhap: profile.EmailDangNhap, ChucVu: profile.ChucVu, TrangThaiNhanVien: profile.TrangThaiNhanVien, TrangThaiTaiKhoan: profile.TrangThaiTaiKhoan, VaiTro: profile.VaiTro } });
  } catch (err: any) {
    if (String(err.message).includes("PROFILE_CONFLICT_OR_INACTIVE")) return res.status(409).json({ success: false, message: "Hồ sơ vừa được thay đổi hoặc tài khoản đã ngừng hoạt động. Tải lại trước khi lưu." });
    if (String(err.message).includes("ACCOUNT_INACTIVE_OR_ROLE_CHANGED")) return res.status(403).json({ success: false, message: "Tài khoản đã khóa hoặc quyền đã thay đổi. Vui lòng đăng nhập lại." });
    res.status(400).json({ success: false, message: err.message || "Không thể cập nhật hồ sơ" });
  }
});

router.post("/me/avatar", employeeOnly, (req, res, next) => {
  avatarUpload.single("image")(req, res, (error: any) => {
    if (error) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ success: false, message: error.code === "LIMIT_FILE_SIZE" ? "Ảnh đại diện tối đa 5 MB" : "Không đọc được tệp ảnh" });
    next();
  });
}, async (req: AuthRequest, res) => {
  let filePath = "";
  try {
    const profile = await getOwnProfile(Number(req.user!.MaTaiKhoan));
    if (!profile || normalizeRole(profile.VaiTro) !== "NhanVien" || !accountIsActive(profile.TrangThaiTaiKhoan) || !accountIsActive(profile.TrangThaiNhanVien)) return res.status(profile ? 403 : 404).json({ success: false, message: "Không tìm thấy hồ sơ nhân viên đang hoạt động" });
    if (!req.file?.buffer) return res.status(400).json({ success: false, message: "Vui lòng chọn ảnh đại diện" });
    const extension = inspectProfileImage(req.file.buffer);
    if (!extension) return res.status(415).json({ success: false, message: "Tệp không phải ảnh JPEG, PNG hoặc WEBP hợp lệ" });
    const uploadDir = path.join(path.resolve(__dirname, "..", ".."), "uploads", "staff");
    await fs.mkdir(uploadDir, { recursive: true });
    const filename = `staff-${Number(profile.MaNhanVien)}-${crypto.randomUUID()}${extension}`;
    filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, req.file.buffer, { flag: "wx" });
    const url = `/uploads/staff/${filename}`;
    const updated = await execute(`UPDATE nv SET AnhDaiDien=@url OUTPUT INSERTED.AnhDaiDien,CONVERT(varchar(18),INSERTED.ProfileVersion,1) ProfileVersion
      FROM dbo.NhanVien nv JOIN dbo.TaiKhoan tk ON tk.MaTaiKhoan=nv.MaTaiKhoan
      WHERE nv.MaTaiKhoan=@accountId AND nv.TrangThai=1 AND REPLACE(LOWER(LTRIM(RTRIM(tk.VaiTro))),N' ',N'') COLLATE Latin1_General_100_CI_AI IN(N'nhanvien',N'employee',N'staff') AND tk.TrangThai IN(N'Hoạt động',N'Active',N'1')`, { url, accountId: Number(req.user!.MaTaiKhoan) });
    if (!updated.recordset?.[0]) { await fs.unlink(filePath).catch(() => undefined); filePath = ""; return res.status(403).json({ success: false, message: "Tài khoản đã khóa hoặc quyền đã thay đổi" }); }
    res.json({ success: true, message: "Đã cập nhật ảnh đại diện", data: updated.recordset[0] });
  } catch (err: any) {
    if (filePath) await fs.unlink(filePath).catch(() => undefined);
    res.status(500).json({ success: false, message: "Không thể lưu ảnh đại diện" });
  }
});

router.post("/me/change-password", employeeOnly, async (req: AuthRequest, res) => {
  try {
    const allowed = new Set(["MatKhauHienTai", "MatKhauMoi", "XacNhanMatKhauMoi"]);
    if (Object.keys(req.body ?? {}).some((key) => !allowed.has(key))) return res.status(400).json({ success: false, message: "Request có trường không được phép" });
    const { MatKhauHienTai, MatKhauMoi, XacNhanMatKhauMoi } = req.body ?? {};
    if (![MatKhauHienTai, MatKhauMoi, XacNhanMatKhauMoi].every((x) => typeof x === "string" && x.length > 0)) return res.status(400).json({ success: false, message: "Vui lòng nhập đủ ba trường mật khẩu" });
    if (MatKhauMoi.length < 8 || MatKhauMoi.length > 72) return res.status(400).json({ success: false, message: "Mật khẩu mới phải dài từ 8 đến 72 ký tự" });
    if (MatKhauMoi !== XacNhanMatKhauMoi) return res.status(400).json({ success: false, message: "Mật khẩu mới và xác nhận không khớp" });
    const account = await queryOne<any>("SELECT MatKhau,VaiTro,TrangThai FROM dbo.TaiKhoan WHERE MaTaiKhoan=@id", { id: Number(req.user!.MaTaiKhoan) });
    if (!account || normalizeRole(account.VaiTro) !== "NhanVien" || !accountIsActive(account.TrangThai)) return res.status(403).json({ success: false, message: "Tài khoản không hoạt động hoặc quyền đã thay đổi" });
    const stored = String(account.MatKhau ?? "");
    const isHash = /^\$2[aby]\$\d{2}\$/.test(stored);
    const currentMatches = isHash ? await bcrypt.compare(MatKhauHienTai, stored) : (() => { const a=Buffer.from(MatKhauHienTai,"utf8"),b=Buffer.from(stored,"utf8"); return a.length===b.length && timingSafeEqual(a,b); })();
    if (!currentMatches) return res.status(400).json({ success: false, message: "Mật khẩu hiện tại không đúng", field: "MatKhauHienTai" });
    if (isHash && await bcrypt.compare(MatKhauMoi, stored)) return res.status(400).json({ success: false, message: "Mật khẩu mới phải khác mật khẩu hiện tại", field: "MatKhauMoi" });
    if (!isHash && MatKhauMoi === stored) return res.status(400).json({ success: false, message: "Mật khẩu mới phải khác mật khẩu hiện tại", field: "MatKhauMoi" });
    const hashed = await bcrypt.hash(MatKhauMoi, 10);
    const update = await execute("UPDATE dbo.TaiKhoan SET MatKhau=@hashed WHERE MaTaiKhoan=@id AND MatKhau=@stored AND REPLACE(LOWER(LTRIM(RTRIM(VaiTro))),N' ',N'') COLLATE Latin1_General_100_CI_AI IN(N'nhanvien',N'employee',N'staff') AND TrangThai IN(N'Hoạt động',N'Active',N'1')", { hashed, stored, id: Number(req.user!.MaTaiKhoan) });
    if (!update.rowsAffected) return res.status(409).json({ success: false, message: "Thông tin tài khoản vừa thay đổi; tải lại trang rồi thử lại." });
    res.json({ success: true, message: "Đổi mật khẩu thành công. Phiên hiện tại vẫn dùng được đến khi JWT hết hạn; đăng nhập mới dùng mật khẩu mới." });
  } catch {
    res.status(500).json({ success: false, message: "Không thể đổi mật khẩu lúc này" });
  }
});

router.get("/", adminOnly, async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = "WHERE 1=1";
    const params: any = {};
    if (search) {
      where += " AND (HoTen LIKE @search OR Email LIKE @search)";
      params.search = `%${search}%`;
    }
    const total =
      (
        await queryOne<{ total: number }>(
          `SELECT COUNT(*) as total FROM NhanVien ${where}`,
          params,
        )
      )?.total || 0;
    params.offset = offset;
    params.limit = Number(limit);
    const data = await query(
      `SELECT * FROM NhanVien ${where} ORDER BY MaNhanVien DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params,
    );
    res.json({
      success: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/:id", adminOnly, async (req, res) => {
  try {
    const data = await queryOne("SELECT * FROM NhanVien WHERE MaNhanVien=@id", {
      id: Number(req.params.id),
    });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/", adminOnly, async (req, res) => {
  try {
    const { MaTaiKhoan, HoTen, SoDienThoai, Email, ChucVu } = req.body;
    const result = await execute(
      `
      INSERT INTO NhanVien (MaTaiKhoan, HoTen, SoDienThoai, Email, ChucVu, TrangThai)
      OUTPUT INSERTED.MaNhanVien VALUES (@MaTaiKhoan, @HoTen, @SoDienThoai, @Email, @ChucVu, 1)
    `,
      {
        MaTaiKhoan: MaTaiKhoan || null,
        HoTen,
        SoDienThoai: SoDienThoai || null,
        Email: Email || null,
        ChucVu: ChucVu || null,
      },
    );
    res
      .status(201)
      .json({
        success: true,
        data: { MaNhanVien: result.recordset[0].MaNhanVien },
      });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/:id", adminOnly, async (req, res) => {
  try {
    const { HoTen, SoDienThoai, Email, ChucVu, TrangThai } = req.body;
    await execute(
      `SET XACT_ABORT ON;
       BEGIN TRY
         BEGIN TRANSACTION;
         UPDATE dbo.NhanVien SET HoTen=@HoTen, SoDienThoai=@SoDienThoai, Email=@Email, ChucVu=@ChucVu, TrangThai=@TrangThai WHERE MaNhanVien=@id;
         IF @@ROWCOUNT=0 BEGIN ROLLBACK TRANSACTION; THROW 51003,'EMPLOYEE_NOT_FOUND',1; END;
         UPDATE tk SET HoTen=@HoTen FROM dbo.TaiKhoan tk JOIN dbo.NhanVien nv ON nv.MaTaiKhoan=tk.MaTaiKhoan WHERE nv.MaNhanVien=@id;
         COMMIT TRANSACTION;
       END TRY
       BEGIN CATCH
         IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
         THROW;
       END CATCH;`,
      {
        HoTen,
        SoDienThoai: SoDienThoai || null,
        Email: Email || null,
        ChucVu: ChucVu || null,
        TrangThai: TrangThai !== undefined ? TrangThai : 1,
        id: Number(req.params.id),
      },
    );
    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
