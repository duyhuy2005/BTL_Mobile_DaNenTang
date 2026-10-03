import { Router } from "express";
import { execute, getPool, query, queryOne, sql } from "../config/database";
import { AuthRequest, authorizeRoles } from "../middleware/auth";

const router = Router();

async function currentCustomer(req: AuthRequest) {
  if (!req.user) return null;
  return queryOne<any>("SELECT * FROM KhachHang WHERE MaTaiKhoan=@MaTaiKhoan", { MaTaiKhoan: req.user.MaTaiKhoan });
}

function validPhone(phone?: string) {
  return !phone || /^(03|05|07|08|09)[0-9]{8}$/.test(phone);
}

const STAFF = authorizeRoles("NhanVien");
const COMPLETED_ORDER = `hd.TrangThai IN(N'DA_GIAO',N'HOAN_THANH') AND ISNULL((SELECT SUM(gt.SoTien) FROM GiaoDichHoanTienTra gt JOIN YeuCauHoanTra yr ON yr.Id=gt.YeuCauId WHERE yr.MaHoaDon=hd.MaHoaDon AND gt.TrangThai='DA_HOAN_TIEN'),0)<ISNULL(hd.TongTien,0)`;
const PROCESSING_ORDER = `hd.TrangThai IN(N'CHO_XAC_NHAN',N'DA_XAC_NHAN',N'DANG_CHUAN_BI',N'DA_DONG_GOI',N'DANG_GIAO',N'GIAO_THAT_BAI',N'DANG_HOAN_HANG')`;
const ACTIVE_RETURN = `r.TrangThai NOT IN('TU_CHOI','TU_CHOI_SAU_KIEM_TRA','DA_HOAN_TIEN','DA_DOI_HANG','HOAN_TAT','DA_HUY')`;
const MASK_PHONE = `CASE WHEN kh.SoDienThoai IS NULL THEN NULL WHEN LEN(kh.SoDienThoai)>6 THEN LEFT(kh.SoDienThoai,3)+REPLICATE('*',LEN(kh.SoDienThoai)-6)+RIGHT(kh.SoDienThoai,3) ELSE REPLICATE('*',LEN(kh.SoDienThoai)) END`;
const MASK_EMAIL = `CASE WHEN kh.Email IS NULL THEN NULL WHEN CHARINDEX('@',kh.Email)>2 THEN LEFT(kh.Email,2)+'***'+SUBSTRING(kh.Email,CHARINDEX('@',kh.Email),200) ELSE '***' END`;

function intParam(value: unknown, fallback: number, max: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? Math.min(number, max) : fallback;
}

function customerCode(id: number) { return `KH${String(id).padStart(4, "0")}`; }

function staffError(res: any, err: any) {
  const status = Number(err?.status) || 500;
  res.status(status).json({ success: false, message: status === 500 ? "Không thể tải dữ liệu hỗ trợ khách hàng" : err.message });
}

// Customer-safe profile endpoints. The owner is always derived from the JWT.
router.get("/me", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const customer = await currentCustomer(req);
    if (!customer) return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ khách hàng" });
    res.json({ success: true, data: customer });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

router.get("/me/summary", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const customer = await currentCustomer(req);
    if (!customer) return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ khách hàng" });
    const data = await queryOne<any>(`SELECT COUNT(*) TongDon,
      SUM(CASE WHEN TrangThai=N'CHO_XAC_NHAN' THEN 1 ELSE 0 END) ChoXacNhan,
      SUM(CASE WHEN TrangThai=N'DANG_GIAO' THEN 1 ELSE 0 END) DangGiao,
      SUM(CASE WHEN TrangThai IN(N'DA_GIAO',N'HOAN_THANH') THEN 1 ELSE 0 END) HoanTat,
      (SELECT COUNT(*) FROM dbo.YeuCauHoanTra r WHERE r.MaKhachHang=@id AND r.TrangThai NOT IN('TU_CHOI','DA_HOAN_TIEN','HOAN_TAT','DA_HUY')) HoanTra
      FROM dbo.HoaDon WHERE MaKhachHang=@id`, { id: customer.MaKhachHang });
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

router.put("/me", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const customer = await currentCustomer(req);
    if (!customer) return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ khách hàng" });
    const HoTen = String(req.body.HoTen ?? customer.HoTen).trim();
    const NgaySinh = req.body.NgaySinh ? String(req.body.NgaySinh) : null;
    const GioiTinh = req.body.GioiTinh == null ? null : String(req.body.GioiTinh).trim();
    if (!HoTen || HoTen.length > 150) return res.status(400).json({ success: false, message: "Họ tên bắt buộc và tối đa 150 ký tự" });
    if (NgaySinh && !/^\d{4}-\d{2}-\d{2}$/.test(NgaySinh)) return res.status(400).json({ success: false, message: "Ngày sinh không hợp lệ" });
    if (GioiTinh && !["Nam", "Nữ", "Khác"].includes(GioiTinh)) return res.status(400).json({ success: false, message: "Giới tính không hợp lệ" });
    const pool = await getPool(); const tx = new sql.Transaction(pool); await tx.begin();
    try {
      await new sql.Request(tx).input("id", sql.Int, customer.MaKhachHang).input("name", sql.NVarChar(150), HoTen)
        .input("birth", sql.Date, NgaySinh).input("gender", sql.NVarChar(20), GioiTinh)
        .query("UPDATE dbo.KhachHang SET HoTen=@name,NgaySinh=@birth,GioiTinh=@gender WHERE MaKhachHang=@id; UPDATE tk SET HoTen=@name FROM dbo.TaiKhoan tk JOIN dbo.KhachHang kh ON kh.MaTaiKhoan=tk.MaTaiKhoan WHERE kh.MaKhachHang=@id");
      await tx.commit();
    } catch (error) { await tx.rollback(); throw error; }
    const updated = await currentCustomer(req);
    res.json({ success: true, message: "Cập nhật hồ sơ thành công", data: updated });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// Email/phone are login identifiers and remain read-only until a verification flow exists.
router.get("/me/addresses", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const customer = await currentCustomer(req);
    if (!customer) return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ khách hàng" });
    const data = await query("SELECT Id,TenNguoiNhan,SoDienThoai,DiaChi,MacDinh,NgayTao,NgayCapNhat FROM dbo.DiaChiNhanHang WHERE MaKhachHang=@id AND TrangThai=1 ORDER BY MacDinh DESC,Id DESC", { id: customer.MaKhachHang });
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/me/addresses", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  const name = String(req.body.TenNguoiNhan || "").trim(); const phone = String(req.body.SoDienThoai || "").replace(/[ .-]/g, ""); const address = String(req.body.DiaChi || "").trim();
  if (!name || name.length > 150 || !address || address.length > 500 || !/^(03|05|07|08|09)[0-9]{8}$/.test(phone)) return res.status(400).json({ success: false, message: "Vui lòng kiểm tra họ tên, số điện thoại và địa chỉ đầy đủ" });
  try {
    const customer = await currentCustomer(req); if (!customer) return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ khách hàng" });
    const pool = await getPool(); const tx = new sql.Transaction(pool); await tx.begin();
    try {
      const request = new sql.Request(tx); request.input("customer", sql.Int, customer.MaKhachHang).input("name", sql.NVarChar(150), name).input("phone", sql.VarChar(20), phone).input("address", sql.NVarChar(500), address).input("requested", sql.Bit, Boolean(req.body.MacDinh));
      const rows = await request.query("DECLARE @makeDefault bit=CASE WHEN NOT EXISTS(SELECT 1 FROM dbo.DiaChiNhanHang WITH(UPDLOCK,HOLDLOCK) WHERE MaKhachHang=@customer AND TrangThai=1) OR @requested=1 THEN 1 ELSE 0 END; IF @makeDefault=1 UPDATE dbo.DiaChiNhanHang SET MacDinh=0,NgayCapNhat=SYSDATETIME() WHERE MaKhachHang=@customer AND TrangThai=1; INSERT dbo.DiaChiNhanHang(MaKhachHang,TenNguoiNhan,SoDienThoai,DiaChi,MacDinh) OUTPUT INSERTED.Id VALUES(@customer,@name,@phone,@address,@makeDefault)");
      await tx.commit(); res.status(201).json({ success: true, data: { Id: rows.recordset[0].Id } });
    } catch (error) { await tx.rollback(); throw error; }
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

router.put("/me/addresses/:id", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  const name = String(req.body.TenNguoiNhan || "").trim(); const phone = String(req.body.SoDienThoai || "").replace(/[ .-]/g, ""); const address = String(req.body.DiaChi || "").trim();
  if (!name || name.length > 150 || !address || address.length > 500 || !/^(03|05|07|08|09)[0-9]{8}$/.test(phone)) return res.status(400).json({ success: false, message: "Vui lòng kiểm tra họ tên, số điện thoại và địa chỉ đầy đủ" });
  try {
    const customer = await currentCustomer(req); if (!customer) return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ khách hàng" });
    const result = await execute("UPDATE dbo.DiaChiNhanHang SET TenNguoiNhan=@name,SoDienThoai=@phone,DiaChi=@address,NgayCapNhat=SYSDATETIME() WHERE Id=@id AND MaKhachHang=@customer AND TrangThai=1", { name, phone, address, id: Number(req.params.id), customer: customer.MaKhachHang });
    if (!result.rowsAffected) return res.status(404).json({ success: false, message: "Không tìm thấy địa chỉ" }); res.json({ success: true });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/me/addresses/:id/default", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const customer = await currentCustomer(req); if (!customer) return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ khách hàng" });
    const pool = await getPool(); const tx = new sql.Transaction(pool); await tx.begin();
    try {
      const request = new sql.Request(tx).input("id", sql.Int, Number(req.params.id)).input("customer", sql.Int, customer.MaKhachHang);
      const found = await request.query("SELECT Id FROM dbo.DiaChiNhanHang WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id AND MaKhachHang=@customer AND TrangThai=1");
      if (!found.recordset.length) { await tx.rollback(); return res.status(404).json({ success: false, message: "Không tìm thấy địa chỉ" }); }
      await request.query("UPDATE dbo.DiaChiNhanHang SET MacDinh=0,NgayCapNhat=SYSDATETIME() WHERE MaKhachHang=@customer AND TrangThai=1; UPDATE dbo.DiaChiNhanHang SET MacDinh=1,NgayCapNhat=SYSDATETIME() WHERE Id=@id AND MaKhachHang=@customer");
      await tx.commit(); res.json({ success: true });
    } catch (error) { await tx.rollback(); throw error; }
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete("/me/addresses/:id", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const customer = await currentCustomer(req); if (!customer) return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ khách hàng" });
    const pool = await getPool(); const tx = new sql.Transaction(pool); await tx.begin();
    try {
      const request = new sql.Request(tx).input("id", sql.Int, Number(req.params.id)).input("customer", sql.Int, customer.MaKhachHang);
      const deleted = await request.query("UPDATE dbo.DiaChiNhanHang SET TrangThai=0,MacDinh=0,NgayCapNhat=SYSDATETIME() OUTPUT DELETED.MacDinh WHERE Id=@id AND MaKhachHang=@customer AND TrangThai=1");
      if (!deleted.recordset.length) { await tx.rollback(); return res.status(404).json({ success: false, message: "Không tìm thấy địa chỉ" }); }
      if (deleted.recordset[0].MacDinh) await request.query("UPDATE TOP (1) dbo.DiaChiNhanHang SET MacDinh=1,NgayCapNhat=SYSDATETIME() WHERE Id=(SELECT TOP (1) Id FROM dbo.DiaChiNhanHang WHERE MaKhachHang=@customer AND TrangThai=1 ORDER BY Id DESC)");
      await tx.commit(); res.json({ success: true });
    } catch (error) { await tx.rollback(); throw error; }
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/me/change-password", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const { MatKhauHienTai, MatKhauMoi } = req.body;
    if (typeof MatKhauHienTai !== "string" || typeof MatKhauMoi !== "string" || MatKhauMoi.length < 8) return res.status(400).json({ success: false, message: "Mật khẩu mới phải có ít nhất 8 ký tự" });
    const account = await queryOne<any>("SELECT tk.MaTaiKhoan,tk.MatKhau FROM TaiKhoan tk JOIN KhachHang kh ON kh.MaTaiKhoan=tk.MaTaiKhoan WHERE tk.MaTaiKhoan=@id", { id: req.user!.MaTaiKhoan });
    if (!account) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản khách hàng" });
    const bcrypt = await import("bcryptjs"); const ok = /^\$2[aby]\$\d{2}\$/.test(String(account.MatKhau)) ? await bcrypt.default.compare(MatKhauHienTai, account.MatKhau) : MatKhauHienTai === account.MatKhau;
    if (!ok) return res.status(400).json({ success: false, message: "Mật khẩu hiện tại không đúng" });
    await execute("UPDATE TaiKhoan SET MatKhau=@password WHERE MaTaiKhoan=@id", { id: account.MaTaiKhoan, password: await bcrypt.default.hash(MatKhauMoi, 10) });
    res.json({ success: true, message: "Đã đổi mật khẩu" });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// Employee-only customer support APIs. Every order/return query is bound to the
// customer primary key; customer-facing /me routes remain owner-scoped.
router.get("/staff/summary", STAFF, async (_req, res) => {
  try {
    const data = await queryOne<any>(`SELECT COUNT(*) TongKhach,
      COALESCE(SUM(CASE WHEN kh.NgayTao>=DATEFROMPARTS(YEAR(GETDATE()),MONTH(GETDATE()),1) AND kh.NgayTao<DATEADD(month,1,DATEFROMPARTS(YEAR(GETDATE()),MONTH(GETDATE()),1)) THEN 1 ELSE 0 END),0) KhachMoiThang,
      COALESCE(SUM(CASE WHEN ISNULL(orders.SoDonHoanTat,0)>=2 THEN 1 ELSE 0 END),0) KhachMuaLai
      FROM KhachHang kh OUTER APPLY(SELECT COUNT(*) SoDonHoanTat FROM HoaDon hd WHERE hd.MaKhachHang=kh.MaKhachHang AND ${COMPLETED_ORDER}) orders`);
    res.json({ success: true, data });
  } catch (err) { staffError(res, err); }
});

router.get("/staff/notes/recent", STAFF, async (_req, res) => {
  try {
    const data = await query<any>(`SELECT TOP 8 n.Id,n.MaKhachHang,kh.HoTen,n.NoiDung,n.NgayTao,
      COALESCE(tk.HoTen,tk.TenDangNhap) NguoiTao FROM GhiChuHoTroKhachHang n
      JOIN KhachHang kh ON kh.MaKhachHang=n.MaKhachHang JOIN TaiKhoan tk ON tk.MaTaiKhoan=n.MaTaiKhoanTao
      ORDER BY n.NgayTao DESC,n.Id DESC`);
    res.json({ success: true, data });
  } catch (err) { staffError(res, err); }
});

router.get("/staff", STAFF, async (req, res) => {
  try {
    const page = intParam(req.query.page, 1, 100000);
    const limit = intParam(req.query.limit, 6, 100);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const group = String(req.query.group || "");
    const params: Record<string, unknown> = { offset, limit };
    const where = ["1=1"];
    if (search) {
      where.push(`(kh.HoTen LIKE @pattern OR CONVERT(varchar(20),kh.MaKhachHang) LIKE @pattern OR ('KH'+RIGHT('0000'+CONVERT(varchar(20),kh.MaKhachHang),4)) LIKE @pattern OR ('KH'+RIGHT('00000000'+CONVERT(varchar(20),kh.MaKhachHang),8)) LIKE @pattern OR kh.SoDienThoai LIKE @pattern)`);
      params.pattern = `%${search}%`;
    }
    if (group === "MOI") where.push("kh.NgayTao>=DATEFROMPARTS(YEAR(GETDATE()),MONTH(GETDATE()),1) AND kh.NgayTao<DATEADD(month,1,DATEFROMPARTS(YEAR(GETDATE()),MONTH(GETDATE()),1))");
    else if (group === "MUA_LAI") where.push(`(SELECT COUNT(*) FROM HoaDon hd WHERE hd.MaKhachHang=kh.MaKhachHang AND ${COMPLETED_ORDER})>=2`);
    else if (group === "CHUA_MUA") where.push(`NOT EXISTS(SELECT 1 FROM HoaDon hd WHERE hd.MaKhachHang=kh.MaKhachHang AND ${COMPLETED_ORDER})`);
    else if (group) return res.status(400).json({ success: false, message: "Nhóm khách hàng không hợp lệ" });
    const predicate = where.join(" AND ");
    const total = (await queryOne<any>(`SELECT COUNT(*) total FROM KhachHang kh WHERE ${predicate}`, params))?.total || 0;
    const data = await query<any>(`SELECT kh.MaKhachHang,kh.HoTen,${MASK_PHONE} SoDienThoaiMasked,${MASK_EMAIL} EmailMasked,kh.NgayTao,kh.TrangThai,
      (SELECT COUNT(*) FROM HoaDon hd WHERE hd.MaKhachHang=kh.MaKhachHang AND ${COMPLETED_ORDER}) SoDonHoanTat,
      (SELECT MAX(hd.NgayLap) FROM HoaDon hd WHERE hd.MaKhachHang=kh.MaKhachHang AND ${COMPLETED_ORDER}) LanMuaGanNhat
      FROM KhachHang kh WHERE ${predicate} ORDER BY CASE WHEN kh.NgayTao IS NULL THEN 1 ELSE 0 END,kh.NgayTao DESC,kh.MaKhachHang DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params);
    res.json({ success: true, data: data.map(row => ({ ...row, MaKhachHangHienThi: customerCode(row.MaKhachHang), NhomKhach: Number(row.SoDonHoanTat) >= 2 ? "MUA_LAI" : "THUONG" })), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (err) { staffError(res, err); }
});

router.get("/staff/:id/contact", STAFF, async (req, res) => {
  try {
    const id = intParam(req.params.id, 0, Number.MAX_SAFE_INTEGER);
    if (!id) return res.status(400).json({ success: false, message: "Mã khách hàng không hợp lệ" });
    const data = await queryOne<any>("SELECT MaKhachHang,SoDienThoai,Email,DiaChi FROM KhachHang WHERE MaKhachHang=@id", { id });
    if (!data) return res.status(404).json({ success: false, message: "Không tìm thấy khách hàng" });
    res.json({ success: true, data });
  } catch (err) { staffError(res, err); }
});

router.get("/staff/:id", STAFF, async (req, res) => {
  try {
    const id = intParam(req.params.id, 0, Number.MAX_SAFE_INTEGER);
    if (!id) return res.status(400).json({ success: false, message: "Mã khách hàng không hợp lệ" });
    const customer = await queryOne<any>(`SELECT kh.MaKhachHang,kh.HoTen,${MASK_PHONE} SoDienThoaiMasked,${MASK_EMAIL} EmailMasked,kh.DiaChi,kh.NgayTao,kh.TrangThai,
      (SELECT COUNT(*) FROM HoaDon hd WHERE hd.MaKhachHang=kh.MaKhachHang AND ${COMPLETED_ORDER}) SoDonHoanTat,
      (SELECT COUNT(*) FROM HoaDon hd WHERE hd.MaKhachHang=kh.MaKhachHang AND ${PROCESSING_ORDER}) SoDonDangXuLy,
      (SELECT COUNT(*) FROM YeuCauHoanTra r WHERE r.MaKhachHang=kh.MaKhachHang AND ${ACTIVE_RETURN}) SoYeuCauHoanTra,
      (SELECT COUNT(*) FROM YeuCauHoanTra r WHERE r.MaKhachHang=kh.MaKhachHang) TongYeuCauHoanTra
      FROM KhachHang kh WHERE kh.MaKhachHang=@id`, { id });
    if (!customer) return res.status(404).json({ success: false, message: "Không tìm thấy khách hàng" });
    const orders = await query<any>(`SELECT TOP 3 hd.MaHoaDon,hd.NgayLap,hd.TrangThai,hd.TrangThaiThanhToan,hd.TongTien,
      (SELECT COUNT(*) FROM ChiTietHoaDon ct WHERE ct.MaHoaDon=hd.MaHoaDon) SoDongSanPham
      FROM HoaDon hd WHERE hd.MaKhachHang=@id ORDER BY hd.NgayLap DESC,hd.MaHoaDon DESC`, { id });
    const returns = await query<any>(`SELECT TOP 5 r.Id,r.MaHoaDon,r.TrangThai,r.LyDo,r.NgayYeuCau,r.SoTienDuKien FROM YeuCauHoanTra r
      WHERE r.MaKhachHang=@id ORDER BY r.NgayYeuCau DESC,r.Id DESC`, { id });
    res.json({ success: true, data: { ...customer, MaKhachHangHienThi: customerCode(id), DonGanDay: orders, HoanTraGanDay: returns } });
  } catch (err) { staffError(res, err); }
});

router.get("/staff/:id/orders", STAFF, async (req, res) => {
  try {
    const customerId = intParam(req.params.id, 0, Number.MAX_SAFE_INTEGER);
    if (!customerId) return res.status(400).json({ success: false, message: "Mã khách hàng không hợp lệ" });
    if (!await queryOne("SELECT MaKhachHang FROM KhachHang WHERE MaKhachHang=@customerId", { customerId })) return res.status(404).json({ success: false, message: "Không tìm thấy khách hàng" });
    const page = intParam(req.query.page, 1, 100000), limit = intParam(req.query.limit, 8, 50), offset = (page - 1) * limit;
    const total = (await queryOne<any>("SELECT COUNT(*) total FROM HoaDon WHERE MaKhachHang=@customerId", { customerId }))?.total || 0;
    const data = await query<any>(`SELECT hd.MaHoaDon,hd.NgayLap,hd.TrangThai,hd.TrangThaiThanhToan,hd.TrangThaiVanChuyen,hd.TongTien,
      (SELECT COUNT(*) FROM ChiTietHoaDon ct WHERE ct.MaHoaDon=hd.MaHoaDon) SoDongSanPham,
      (SELECT SUM(ct.SoLuong) FROM ChiTietHoaDon ct WHERE ct.MaHoaDon=hd.MaHoaDon) TongSoLuong
      FROM HoaDon hd WHERE hd.MaKhachHang=@customerId ORDER BY hd.NgayLap DESC,hd.MaHoaDon DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { customerId, offset, limit });
    res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (err) { staffError(res, err); }
});

router.get("/staff/:id/returns", STAFF, async (req, res) => {
  try {
    const customerId = intParam(req.params.id, 0, Number.MAX_SAFE_INTEGER);
    if (!customerId) return res.status(400).json({ success: false, message: "Mã khách hàng không hợp lệ" });
    const page = intParam(req.query.page, 1, 100000), limit = intParam(req.query.limit, 8, 50), offset = (page - 1) * limit;
    const total = (await queryOne<any>("SELECT COUNT(*) total FROM YeuCauHoanTra WHERE MaKhachHang=@customerId", { customerId }))?.total || 0;
    const data = await query<any>(`SELECT r.Id,r.MaHoaDon,r.TrangThai,r.LyDo,r.NgayYeuCau,r.SoTienDuKien FROM YeuCauHoanTra r
      WHERE r.MaKhachHang=@customerId ORDER BY r.NgayYeuCau DESC,r.Id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { customerId, offset, limit });
    res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (err) { staffError(res, err); }
});

router.get("/staff/:id/notes", STAFF, async (req, res) => {
  try {
    const customerId = intParam(req.params.id, 0, Number.MAX_SAFE_INTEGER);
    if (!customerId) return res.status(400).json({ success: false, message: "Mã khách hàng không hợp lệ" });
    const data = await query<any>(`SELECT TOP 30 n.Id,n.NoiDung,n.NgayTao,n.MaTaiKhoanTao,COALESCE(tk.HoTen,tk.TenDangNhap) NguoiTao
      FROM GhiChuHoTroKhachHang n JOIN TaiKhoan tk ON tk.MaTaiKhoan=n.MaTaiKhoanTao
      WHERE n.MaKhachHang=@customerId ORDER BY n.NgayTao DESC,n.Id DESC`, { customerId });
    res.json({ success: true, data });
  } catch (err) { staffError(res, err); }
});

router.post("/staff/:id/notes", STAFF, async (req: AuthRequest, res) => {
  try {
    const customerId = intParam(req.params.id, 0, Number.MAX_SAFE_INTEGER);
    const content = String(req.body.NoiDung || "").trim();
    if (!customerId) return res.status(400).json({ success: false, message: "Mã khách hàng không hợp lệ" });
    if (!content || content.length > 1000) return res.status(400).json({ success: false, message: "Ghi chú phải có từ 1 đến 1000 ký tự" });
    if (/password|mật khẩu|token|cvv|chẩn đoán|bệnh án/i.test(content)) return res.status(400).json({ success: false, message: "Không lưu thông tin xác thực, thanh toán hoặc chẩn đoán sức khỏe trong ghi chú hỗ trợ" });
    if (!await queryOne("SELECT MaKhachHang FROM KhachHang WHERE MaKhachHang=@customerId", { customerId })) return res.status(404).json({ success: false, message: "Không tìm thấy khách hàng" });
    const result = await execute(`INSERT GhiChuHoTroKhachHang(MaKhachHang,MaTaiKhoanTao,NoiDung) OUTPUT INSERTED.Id,INSERTED.NgayTao VALUES(@customerId,@accountId,@content)`, { customerId, accountId: req.user!.MaTaiKhoan, content });
    res.status(201).json({ success: true, message: "Đã lưu ghi chú hỗ trợ", data: result.recordset[0] });
  } catch (err) { staffError(res, err); }
});

// Full customer PII is reserved for Admin. Employee screens use the dedicated
// /staff APIs above, which mask contact data until an explicit support action.
router.get("/", authorizeRoles("Admin"), async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = "WHERE 1=1";
    const params: any = {};
    if (search) { where += " AND (HoTen LIKE @search OR SoDienThoai LIKE @search OR Email LIKE @search)"; params.search = `%${search}%`; }
    const total = (await queryOne<{ total: number }>(`SELECT COUNT(*) as total FROM KhachHang ${where}`, params))?.total || 0;
    params.offset = offset; params.limit = Number(limit);
    const data = await query(`SELECT * FROM KhachHang ${where} ORDER BY MaKhachHang DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params);
    res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

router.get("/:id", authorizeRoles("Admin"), async (req, res) => {
  try {
    const data = await queryOne("SELECT * FROM KhachHang WHERE MaKhachHang=@id", { id: Number(req.params.id) });
    if (!data) return res.status(404).json({ success: false, message: "Không tìm thấy" });
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/", authorizeRoles("Admin"), async (req, res) => {
  try {
    const { MaTaiKhoan, HoTen, SoDienThoai, Email, DiaChi } = req.body;
    if (!validPhone(SoDienThoai)) return res.status(400).json({ success: false, message: "Số điện thoại không hợp lệ" });
    const result = await execute(`INSERT INTO KhachHang (MaTaiKhoan, HoTen, SoDienThoai, Email, DiaChi, TrangThai) OUTPUT INSERTED.MaKhachHang VALUES (@MaTaiKhoan, @HoTen, @SoDienThoai, @Email, @DiaChi, 1)`, {
      MaTaiKhoan: MaTaiKhoan || null, HoTen, SoDienThoai: SoDienThoai || null, Email: Email || null, DiaChi: DiaChi || null,
    });
    res.status(201).json({ success: true, message: "Thêm thành công", data: { MaKhachHang: result.recordset[0].MaKhachHang } });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

router.put("/:id", authorizeRoles("Admin"), async (req, res) => {
  let transaction: sql.Transaction | undefined;
  try {
    const { HoTen, SoDienThoai, Email, DiaChi, TrangThai } = req.body;
    if (!validPhone(SoDienThoai)) return res.status(400).json({ success: false, message: "Số điện thoại không hợp lệ" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0 || !String(HoTen || "").trim()) return res.status(400).json({ success: false, message: "Mã khách hàng hoặc họ tên không hợp lệ" });
    const pool = await getPool(); transaction = new sql.Transaction(pool); await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const customer = (await new sql.Request(transaction).input("id", sql.Int, id)
      .query("SELECT MaKhachHang,MaTaiKhoan FROM KhachHang WITH(UPDLOCK,HOLDLOCK) WHERE MaKhachHang=@id")).recordset[0];
    if (!customer) { await transaction.rollback(); transaction = undefined; return res.status(404).json({ success: false, message: "Không tìm thấy khách hàng" }); }
    const requestedStatus = String(TrangThai ?? "Hoạt động").trim().toLowerCase();
    const status = ["1", "true", "hoạt động", "hoat dong", "active"].includes(requestedStatus) ? "Hoạt động" : "Khóa";
    const values = { name: String(HoTen).trim(), phone: SoDienThoai || null, email: Email || null, address: DiaChi || null, status, id };
    await new sql.Request(transaction).input("name", sql.NVarChar(150), values.name)
      .input("phone", sql.VarChar(20), values.phone).input("email", sql.VarChar(255), values.email)
      .input("address", sql.NVarChar(500), values.address).input("status", sql.NVarChar(30), values.status).input("id", sql.Int, id)
      .query("UPDATE KhachHang SET HoTen=@name,SoDienThoai=@phone,Email=@email,DiaChi=@address,TrangThai=@status WHERE MaKhachHang=@id");
    // Keep the login identity's display/contact fields aligned with the customer
    // profile edited by Admin. The whole change is atomic with the profile row.
    if (customer.MaTaiKhoan) await new sql.Request(transaction).input("name", sql.NVarChar(150), values.name)
      .input("phone", sql.VarChar(20), values.phone).input("email", sql.VarChar(255), values.email)
      .input("accountId", sql.Int, customer.MaTaiKhoan)
      .query("UPDATE TaiKhoan SET HoTen=@name,SoDienThoai=@phone,Email=@email WHERE MaTaiKhoan=@accountId");
    await transaction.commit(); transaction = undefined;
    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (err: any) { if (transaction) try { await transaction.rollback(); } catch { /* preserve original error */ } res.status(500).json({ success: false, message: err.message }); }
});

export default router;
