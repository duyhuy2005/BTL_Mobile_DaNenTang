import { Router } from "express";
import { getPool, query, queryOne, sql } from "../config/database";
import { AuthRequest, authorizeRoles } from "../middleware/auth";

const router = Router();
const staff = authorizeRoles("Admin", "NhanVien");
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
const fail = (res: any, e: any) => res.status(e instanceof ApiError ? e.status : 500).json({ success: false, message: e.message || "Lỗi kho hàng" });
const txRequest = (tx: sql.Transaction, values: Record<string, unknown> = {}) => {
  const request = new sql.Request(tx);
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === "") request.input(key, sql.NVarChar, null);
    else if (typeof value === "number") request.input(key, Number.isInteger(value) ? sql.Int : sql.Decimal(18, 2), value);
    else request.input(key, sql.NVarChar, String(value));
  }
  return request;
};
const pageOf = (req: any) => ({ page: Math.max(1, Number(req.query.page) || 1), limit: Math.min(100, Math.max(1, Number(req.query.limit) || 10)) });

router.get("/dashboard", staff, async (_req, res) => {
  try {
    const stats = await queryOne<any>(`SELECT COUNT(DISTINCT l.MaSanPham) tongSanPham,ISNULL(SUM(l.SoLuongTon),0) tongTon,
      ISNULL(SUM(l.SoLuongTon*l.GiaNhap),0) giaTriTonKho,
      COUNT(DISTINCT CASE WHEN x.CoTheBan<=ISNULL(sp.NguongCanhBaoTonKho,10) AND x.TonThucTe>0 THEN l.MaSanPham END) sapHet,
      SUM(CASE WHEN l.SoLuongTon>0 AND l.HanSuDung BETWEEN CAST(GETDATE() AS date) AND DATEADD(day,90,CAST(GETDATE() AS date)) THEN 1 ELSE 0 END) sapHetHan,
      (SELECT COUNT(*) FROM PhieuNhapKho WHERE TrangThai IN(N'Nháp',N'Chờ xác nhận')) phieuChoXacNhan
      FROM LoSanPham l JOIN SanPham sp ON sp.MaSanPham=l.MaSanPham
      JOIN (SELECT MaSanPham,SUM(SoLuongTon) TonThucTe,SUM(CASE WHEN HanSuDung IS NULL OR HanSuDung>=CAST(GETDATE() AS date) THEN SoLuongTon-SoLuongDaGiu ELSE 0 END) CoTheBan FROM LoSanPham WHERE TrangThai<>N'Đã hủy' GROUP BY MaSanPham) x ON x.MaSanPham=l.MaSanPham
      WHERE l.TrangThai<>N'Đã hủy'`);
    const alerts = await query<any>(`SELECT TOP 8 sp.MaSanPham,sp.TenSanPham,l.MaLoCode,l.HanSuDung,l.SoLuongTon,l.SoLuongDaGiu,
      CASE WHEN l.HanSuDung<CAST(GETDATE() AS date) THEN N'Đã hết hạn' WHEN l.HanSuDung<=DATEADD(day,90,CAST(GETDATE() AS date)) THEN N'Sắp hết hạn' ELSE N'Sắp hết hàng' END LoaiCanhBao
      FROM LoSanPham l JOIN SanPham sp ON sp.MaSanPham=l.MaSanPham WHERE l.TrangThai<>N'Đã hủy' AND l.SoLuongTon>0
      AND (l.HanSuDung<=DATEADD(day,90,CAST(GETDATE() AS date)) OR l.SoLuongTon-l.SoLuongDaGiu<=ISNULL(sp.NguongCanhBaoTonKho,10))
      ORDER BY CASE WHEN l.HanSuDung<CAST(GETDATE() AS date) THEN 0 ELSE 1 END,l.HanSuDung`);
    const chart = await query<any>(`WITH M AS (SELECT DATEFROMPARTS(YEAR(DATEADD(month,-v.number,GETDATE())),MONTH(DATEADD(month,-v.number,GETDATE())),1) d FROM master..spt_values v WHERE v.type='P' AND v.number BETWEEN 0 AND 5)
      SELECT FORMAT(M.d,'MM/yyyy') thang,ISNULL(SUM(CASE WHEN b.Loai IN(N'Nhập',N'Tồn đầu kỳ',N'Điều chỉnh tăng',N'Hoàn kho') AND b.SoLuong>0 THEN b.SoLuong ELSE 0 END),0) nhap,ISNULL(SUM(CASE WHEN b.Loai IN(N'Xuất',N'Hàng hỏng',N'Điều chỉnh giảm') AND b.SoLuong<0 THEN -b.SoLuong ELSE 0 END),0) xuat
      FROM M LEFT JOIN BienDongKho b ON YEAR(b.NgayTao)=YEAR(M.d) AND MONTH(b.NgayTao)=MONTH(M.d) GROUP BY M.d ORDER BY M.d`);
    res.json({ success: true, data: { stats, alerts, chart } });
  } catch (e) { fail(res, e); }
});

router.get("/staff-summary", staff, async (_req, res) => {
  try {
    const stats = await queryOne<any>(`SELECT COUNT(*) MatHangTheoDoi,
      COALESCE(SUM(CASE WHEN stock.CoTheBan>0 AND stock.CoTheBan<=COALESCE(sp.NguongCanhBaoTonKho,10) THEN 1 ELSE 0 END),0) SapHetHang,
      COALESCE(SUM(CASE WHEN stock.CoTheBan<=0 THEN 1 ELSE 0 END),0) HetHang
      FROM SanPham sp OUTER APPLY (SELECT COALESCE(SUM(l.SoLuongTon),0) TonThucTe,COALESCE(SUM(l.SoLuongDaGiu),0) DaGiu,
        COALESCE(SUM(CASE WHEN l.HanSuDung IS NULL OR l.HanSuDung>=CONVERT(date,GETDATE()) THEN l.SoLuongTon-l.SoLuongDaGiu ELSE 0 END),0) CoTheBan
        FROM LoSanPham l WHERE l.MaSanPham=sp.MaSanPham AND l.TrangThai<>N'Đã hủy') stock WHERE sp.IsDeleted=0`);
    const expiry = await queryOne<any>(`SELECT COUNT(*) LoSapHetHan FROM LoSanPham WHERE TrangThai<>N'Đã hủy' AND SoLuongTon>0
      AND HanSuDung>=CONVERT(date,GETDATE()) AND HanSuDung<=DATEADD(day,90,CONVERT(date,GETDATE()))`);
    res.json({ success: true, data: { ...stats, LoSapHetHan: Number(expiry?.LoSapHetHan || 0), SoNgayCanhBaoHan: 90 } });
  } catch (e) { fail(res, e); }
});

router.get("/items", staff, async (req, res) => {
  try {
    const { page, limit } = pageOf(req), search = String(req.query.search || ""), category = Number(req.query.category || 0), status = String(req.query.status || ""), productId = Number(req.query.productId || 0);
    const params = { search: `%${search}%`, category, status, productId, offset: (page - 1) * limit, limit };
    const cte = `WITH I AS (SELECT sp.MaSanPham,sp.TenSanPham,sp.MaSKU,sp.HinhAnh,sp.MaDanhMuc,dm.TenDanhMuc,sp.NguongCanhBaoTonKho,
      COALESCE(inv.TonThucTe,0) TonThucTe,COALESCE(inv.DaGiu,0) DaGiu,COALESCE(inv.CoTheBan,0) CoTheBan,inv.HanGanNhat,inv.ViTri
      FROM SanPham sp JOIN DanhMuc dm ON dm.MaDanhMuc=sp.MaDanhMuc OUTER APPLY (
        SELECT SUM(l.SoLuongTon) TonThucTe,SUM(l.SoLuongDaGiu) DaGiu,
          SUM(CASE WHEN l.HanSuDung IS NULL OR l.HanSuDung>=CONVERT(date,GETDATE()) THEN l.SoLuongTon-l.SoLuongDaGiu ELSE 0 END) CoTheBan,
          MIN(CASE WHEN l.SoLuongTon>0 AND l.HanSuDung>=CONVERT(date,GETDATE()) THEN l.HanSuDung END) HanGanNhat,
          MAX(CASE WHEN l.SoLuongTon>0 THEN l.ViTri END) ViTri
        FROM LoSanPham l WHERE l.MaSanPham=sp.MaSanPham AND l.TrangThai<>N'Đã hủy') inv
      WHERE sp.IsDeleted=0 AND (sp.TenSanPham LIKE @search OR ISNULL(sp.MaSKU,'') LIKE @search OR ISNULL(CONVERT(nvarchar(50),sp.DungTich),'') LIKE @search
        OR EXISTS(SELECT 1 FROM LoSanPham matched WHERE matched.MaSanPham=sp.MaSanPham AND matched.TrangThai<>N'Đã hủy' AND matched.MaLoCode LIKE @search))
      AND (@category=0 OR sp.MaDanhMuc=@category) AND (@productId=0 OR sp.MaSanPham=@productId)),
      S AS (SELECT *,CASE WHEN CoTheBan<=0 THEN N'Hết hàng' WHEN CoTheBan<=ISNULL(NguongCanhBaoTonKho,10) THEN N'Sắp hết' ELSE N'Ổn định' END TrangThai FROM I)`;
    const total = (await queryOne<any>(`${cte} SELECT COUNT(*) total FROM S WHERE (@status='' OR TrangThai=@status)`, params))?.total || 0;
    const data = await query<any>(`${cte} SELECT * FROM S WHERE (@status='' OR TrangThai=@status) ORDER BY MaSanPham DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params);
    res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (e) { fail(res, e); }
});

router.get("/lots", staff, async (req, res) => {
  try {
    const { page, limit } = pageOf(req), search = String(req.query.search || ""), expiry = String(req.query.expiry || ""), category = Number(req.query.category || 0), expiryDays = Math.min(365, Math.max(1, Number(req.query.expiryDays) || 90));
    const where = `WHERE l.TrangThai<>N'Đã hủy' AND (sp.TenSanPham LIKE @search OR ISNULL(sp.MaSKU,'') LIKE @search OR l.MaLoCode LIKE @search)
      AND (@category=0 OR sp.MaDanhMuc=@category) AND (@expiry='' OR (@expiry='soon' AND l.SoLuongTon>0 AND l.HanSuDung BETWEEN CONVERT(date,GETDATE()) AND DATEADD(day,@expiryDays,CONVERT(date,GETDATE()))) OR (@expiry='expired' AND l.SoLuongTon>0 AND l.HanSuDung<CONVERT(date,GETDATE())))`;
    const params = { search: `%${search}%`, expiry, expiryDays, category, offset: (page - 1) * limit, limit };
    const total = (await queryOne<any>(`SELECT COUNT(*) total FROM LoSanPham l JOIN SanPham sp ON sp.MaSanPham=l.MaSanPham ${where}`, params))?.total || 0;
    const data = await query<any>(`SELECT l.MaLo,l.MaSanPham,l.MaBienThe,l.MaLoCode,l.NgaySanXuat,l.HanSuDung,l.ViTri,l.SoLuongTon,l.SoLuongDaGiu,l.TrangThai,l.NgayTao,sp.TenSanPham,COALESCE(v.MaSKU,sp.MaSKU) MaSKU,dm.TenDanhMuc,CASE WHEN l.HanSuDung IS NULL OR l.HanSuDung>=CONVERT(date,GETDATE()) THEN l.SoLuongTon-l.SoLuongDaGiu ELSE 0 END CoTheBan,
      CASE WHEN l.HanSuDung<CAST(GETDATE() AS date) THEN N'Đã hết hạn' WHEN l.HanSuDung<=DATEADD(day,@expiryDays,CAST(GETDATE() AS date)) THEN N'Sắp hết hạn' ELSE N'Đang dùng' END TrangThaiHan
      FROM LoSanPham l JOIN SanPham sp ON sp.MaSanPham=l.MaSanPham LEFT JOIN BienTheSanPham v ON v.MaBienThe=l.MaBienThe JOIN DanhMuc dm ON dm.MaDanhMuc=sp.MaDanhMuc ${where}
      ORDER BY CASE WHEN l.HanSuDung IS NULL THEN 1 ELSE 0 END,l.HanSuDung,l.MaLo OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params);
    res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (e) { fail(res, e); }
});

router.get("/transactions", staff, async (req, res) => {
  try {
    const { page, limit } = pageOf(req), search = String(req.query.search || "");
    const params = { search: `%${search}%`, offset: (page - 1) * limit, limit };
    const where = "WHERE sp.TenSanPham LIKE @search OR ISNULL(sp.MaSKU,'') LIKE @search OR ISNULL(l.MaLoCode,'') LIKE @search";
    const total = (await queryOne<any>(`SELECT COUNT(*) total FROM BienDongKho b JOIN SanPham sp ON sp.MaSanPham=b.MaSanPham LEFT JOIN LoSanPham l ON l.MaLo=b.MaLo ${where}`, params))?.total || 0;
    const data = await query<any>(`SELECT b.*,sp.TenSanPham,sp.MaSKU,l.MaLoCode,tk.TenDangNhap NguoiThucHien FROM BienDongKho b JOIN SanPham sp ON sp.MaSanPham=b.MaSanPham LEFT JOIN LoSanPham l ON l.MaLo=b.MaLo LEFT JOIN TaiKhoan tk ON tk.MaTaiKhoan=b.MaTaiKhoan ${where} ORDER BY b.NgayTao DESC,b.MaBienDong DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params);
    res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (e) { fail(res, e); }
});

router.get("/items/:id", staff, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const product = await queryOne<any>(`SELECT sp.MaSanPham,sp.TenSanPham,sp.MaSKU,sp.HinhAnh,
      COALESCE(stock.TonThucTe,0) TonThucTe,COALESCE(stock.DaGiu,0) DaGiu,COALESCE(stock.CoTheBan,0) CoTheBan
      FROM SanPham sp OUTER APPLY (SELECT SUM(l.SoLuongTon) TonThucTe,SUM(l.SoLuongDaGiu) DaGiu,
        SUM(CASE WHEN l.HanSuDung IS NULL OR l.HanSuDung>=CAST(GETDATE() AS date) THEN l.SoLuongTon-l.SoLuongDaGiu ELSE 0 END) CoTheBan
        FROM LoSanPham l WHERE l.MaSanPham=sp.MaSanPham AND l.TrangThai<>N'Đã hủy') stock
      WHERE sp.MaSanPham=@id AND sp.IsDeleted=0`, { id });
    if (!product) throw new ApiError(404, "Không tìm thấy sản phẩm trong kho");
    const lots = await query("SELECT MaLo,MaSanPham,MaLoCode,NgaySanXuat,HanSuDung,ViTri,SoLuongTon,SoLuongDaGiu,TrangThai,NgayTao FROM LoSanPham WHERE MaSanPham=@id AND TrangThai<>N'Đã hủy' ORDER BY CASE WHEN HanSuDung IS NULL THEN 1 ELSE 0 END,HanSuDung", { id });
    const transactions = await query("SELECT TOP 30 b.*,l.MaLoCode FROM BienDongKho b LEFT JOIN LoSanPham l ON l.MaLo=b.MaLo WHERE b.MaSanPham=@id ORDER BY b.NgayTao DESC,b.MaBienDong DESC", { id });
    res.json({ success: true, data: { product, lots, transactions } });
  } catch (e) { fail(res, e); }
});

// Staff replenishment proposals are not receipt documents: approval does not touch stock.
router.get("/my-replenishment-requests", authorizeRoles("NhanVien"), async (req: AuthRequest, res) => {
  try {
    const { page, limit } = pageOf(req), offset = (page - 1) * limit, owner = req.user!.MaTaiKhoan, search = String(req.query.search || "");
    const filter = `AND (@search='' OR q.LyDo LIKE @pattern OR CONVERT(varchar(20),q.Id) LIKE @pattern OR EXISTS(SELECT 1 FROM ChiTietYeuCauNhapKho d JOIN SanPham sp ON sp.MaSanPham=d.MaSanPham WHERE d.YeuCauId=q.Id AND (sp.TenSanPham LIKE @pattern OR ISNULL(sp.MaSKU,'') LIKE @pattern)))`;
    const args = { owner, search, pattern: `%${search}%` };
    const total = (await queryOne<any>(`SELECT COUNT(*) total FROM YeuCauNhapKho q WHERE q.MaTaiKhoanTao=@owner ${filter}`, args))?.total || 0;
    const data = await query<any>(`SELECT q.Id,q.TrangThai,q.LyDo,q.GhiChu,q.NgayTao,q.NgayXuLy,q.LyDoXuLy,
      (SELECT COUNT(*) FROM ChiTietYeuCauNhapKho d WHERE d.YeuCauId=q.Id) SoDong,
      (SELECT TOP 1 sp.TenSanPham FROM ChiTietYeuCauNhapKho d JOIN SanPham sp ON sp.MaSanPham=d.MaSanPham WHERE d.YeuCauId=q.Id ORDER BY d.Id) SanPhamDau
      FROM YeuCauNhapKho q WHERE q.MaTaiKhoanTao=@owner ${filter} ORDER BY q.NgayTao DESC,q.Id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { ...args, offset, limit });
    res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (e) { fail(res, e); }
});
router.get("/my-replenishment-requests/:id", authorizeRoles("NhanVien"), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id), owner = req.user!.MaTaiKhoan;
    const header = await queryOne<any>("SELECT Id,TrangThai,LyDo,GhiChu,NgayTao,NgayXuLy,LyDoXuLy FROM YeuCauNhapKho WHERE Id=@id AND MaTaiKhoanTao=@owner", { id, owner });
    if (!header) throw new ApiError(404, "Không tìm thấy yêu cầu nhập của bạn");
    const [items, history] = await Promise.all([
      query("SELECT d.MaSanPham,d.SoLuongDeNghi,sp.TenSanPham,sp.MaSKU,sp.DonVi FROM ChiTietYeuCauNhapKho d JOIN SanPham sp ON sp.MaSanPham=d.MaSanPham WHERE d.YeuCauId=@id ORDER BY d.Id", { id }),
      query("SELECT TrangThaiCu,TrangThaiMoi,LyDo,NgayTao FROM LichSuYeuCauNhapKho WHERE YeuCauId=@id ORDER BY NgayTao,Id", { id }),
    ]);
    res.json({ success: true, data: { ...header, items, history } });
  } catch (e) { fail(res, e); }
});
router.post("/my-replenishment-requests", authorizeRoles("NhanVien"), async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try {
    const reason = String(req.body.LyDo || "").trim(), items = req.body.items;
    if (!reason) throw new ApiError(400, "Vui lòng nhập lý do đề nghị nhập hàng");
    if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, "Yêu cầu cần ít nhất một mặt hàng");
    const normalized = items.map((item: any) => ({ MaSanPham: Number(item.MaSanPham), SoLuongDeNghi: Number(item.SoLuongDeNghi) }));
    if (normalized.some((item: any) => !Number.isInteger(item.MaSanPham) || item.MaSanPham <= 0 || !Number.isInteger(item.SoLuongDeNghi) || item.SoLuongDeNghi <= 0)) throw new ApiError(400, "Sản phẩm và số lượng đề nghị phải là số nguyên dương");
    if (new Set(normalized.map((item: any) => item.MaSanPham)).size !== normalized.length) throw new ApiError(400, "Mỗi sản phẩm chỉ được xuất hiện một lần trong yêu cầu");
    const pool = await getPool(); tx = new sql.Transaction(pool); await tx.begin();
    for (const item of normalized) {
      const product = await txRequest(tx, { id: item.MaSanPham }).query("SELECT MaSanPham FROM SanPham WITH(UPDLOCK,HOLDLOCK) WHERE MaSanPham=@id AND IsDeleted=0");
      if (!product.recordset[0]) throw new ApiError(404, `Không tìm thấy sản phẩm mã ${item.MaSanPham}`);
    }
    const header = await txRequest(tx, { owner: req.user!.MaTaiKhoan, LyDo: reason, GhiChu: String(req.body.GhiChu || "").trim() || null }).query("INSERT INTO YeuCauNhapKho(MaTaiKhoanTao,LyDo,GhiChu) OUTPUT INSERTED.Id VALUES(@owner,@LyDo,@GhiChu)");
    const id = Number(header.recordset[0].Id);
    for (const item of normalized) await txRequest(tx, { id, ...item }).query("INSERT INTO ChiTietYeuCauNhapKho(YeuCauId,MaSanPham,SoLuongDeNghi) VALUES(@id,@MaSanPham,@SoLuongDeNghi)");
    await txRequest(tx, { id, owner: req.user!.MaTaiKhoan }).query("INSERT INTO LichSuYeuCauNhapKho(YeuCauId,TrangThaiCu,TrangThaiMoi,MaTaiKhoan,LyDo) VALUES(@id,NULL,'CHO_DUYET',@owner,N'Tạo yêu cầu nhập hàng')");
    await tx.commit(); tx = undefined;
    res.status(201).json({ success: true, data: { Id: id, TrangThai: "CHO_DUYET" }, message: "Đã gửi yêu cầu. Tồn kho chưa thay đổi." });
  } catch (e) { if (tx) try { await tx.rollback(); } catch {} fail(res, e); }
});
router.post("/my-replenishment-requests/:id/cancel", authorizeRoles("NhanVien"), async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try {
    const id = Number(req.params.id), pool = await getPool(); tx = new sql.Transaction(pool); await tx.begin();
    const head = await txRequest(tx, { id, owner: req.user!.MaTaiKhoan }).query("SELECT TrangThai FROM YeuCauNhapKho WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id AND MaTaiKhoanTao=@owner");
    if (!head.recordset[0]) throw new ApiError(404, "Không tìm thấy yêu cầu nhập của bạn");
    if (head.recordset[0].TrangThai !== "CHO_DUYET") throw new ApiError(409, "Chỉ có thể hủy yêu cầu đang chờ duyệt");
    await txRequest(tx, { id, owner: req.user!.MaTaiKhoan }).query("UPDATE YeuCauNhapKho SET TrangThai='DA_HUY',MaTaiKhoanXuLy=@owner,NgayXuLy=SYSDATETIME() WHERE Id=@id; INSERT INTO LichSuYeuCauNhapKho(YeuCauId,TrangThaiCu,TrangThaiMoi,MaTaiKhoan,LyDo) VALUES(@id,'CHO_DUYET','DA_HUY',@owner,N'Nhân viên hủy yêu cầu')");
    await tx.commit(); tx = undefined; res.json({ success: true, message: "Đã hủy yêu cầu nhập." });
  } catch (e) { if (tx) try { await tx.rollback(); } catch {} fail(res, e); }
});
router.get("/replenishment-requests", authorizeRoles("Admin"), async (req, res) => {
  try {
    const { page, limit } = pageOf(req), status = String(req.query.status || ""), offset = (page - 1) * limit;
    const total = (await queryOne<any>("SELECT COUNT(*) total FROM YeuCauNhapKho WHERE (@status='' OR TrangThai=@status)", { status }))?.total || 0;
    const data = await query<any>(`SELECT q.Id,q.MaTaiKhoanTao,q.TrangThai,q.LyDo,q.GhiChu,q.NgayTao,q.NgayXuLy,q.LyDoXuLy,tk.TenDangNhap NguoiYeuCau,
      (SELECT COUNT(*) FROM ChiTietYeuCauNhapKho d WHERE d.YeuCauId=q.Id) SoDong,
      (SELECT TOP 1 sp.TenSanPham FROM ChiTietYeuCauNhapKho d JOIN SanPham sp ON sp.MaSanPham=d.MaSanPham WHERE d.YeuCauId=q.Id ORDER BY d.Id) SanPhamDau
      FROM YeuCauNhapKho q JOIN TaiKhoan tk ON tk.MaTaiKhoan=q.MaTaiKhoanTao WHERE (@status='' OR q.TrangThai=@status)
      ORDER BY CASE WHEN q.TrangThai='CHO_DUYET' THEN 0 ELSE 1 END,q.NgayTao DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { status, offset, limit });
    res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (e) { fail(res, e); }
});
router.get("/replenishment-requests/:id", authorizeRoles("Admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const header = await queryOne<any>(`SELECT q.Id,q.MaTaiKhoanTao,q.TrangThai,q.LyDo,q.GhiChu,q.NgayTao,q.NgayXuLy,q.LyDoXuLy,tk.TenDangNhap NguoiYeuCau
      FROM YeuCauNhapKho q JOIN TaiKhoan tk ON tk.MaTaiKhoan=q.MaTaiKhoanTao WHERE q.Id=@id`, { id });
    if (!header) throw new ApiError(404, "Không tìm thấy yêu cầu nhập");
    const [items, history] = await Promise.all([
      query("SELECT d.MaSanPham,d.SoLuongDeNghi,sp.TenSanPham,sp.MaSKU,sp.DonVi FROM ChiTietYeuCauNhapKho d JOIN SanPham sp ON sp.MaSanPham=d.MaSanPham WHERE d.YeuCauId=@id ORDER BY d.Id", { id }),
      query("SELECT TrangThaiCu,TrangThaiMoi,LyDo,NgayTao FROM LichSuYeuCauNhapKho WHERE YeuCauId=@id ORDER BY NgayTao,Id", { id }),
    ]);
    res.json({ success: true, data: { ...header, items, history } });
  } catch (e) { fail(res, e); }
});
router.post("/replenishment-requests/:id/decision", authorizeRoles("Admin"), async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try {
    const id = Number(req.params.id), decision = String(req.body.decision || ""), reason = String(req.body.reason || "").trim();
    if (!["approve", "reject"].includes(decision)) throw new ApiError(400, "Quyết định không hợp lệ");
    if (decision === "reject" && !reason) throw new ApiError(400, "Khi từ chối cần ghi lý do");
    const pool = await getPool(); tx = new sql.Transaction(pool); await tx.begin();
    const head = await txRequest(tx, { id }).query("SELECT TrangThai FROM YeuCauNhapKho WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id");
    if (!head.recordset[0]) throw new ApiError(404, "Không tìm thấy yêu cầu nhập");
    if (head.recordset[0].TrangThai !== "CHO_DUYET") throw new ApiError(409, "Yêu cầu đã được xử lý; hãy tải lại danh sách");
    const next = decision === "approve" ? "DA_DUYET" : "TU_CHOI";
    await txRequest(tx, { id, next, userId: req.user!.MaTaiKhoan, reason: reason || null }).query("UPDATE YeuCauNhapKho SET TrangThai=@next,MaTaiKhoanXuLy=@userId,LyDoXuLy=@reason,NgayXuLy=SYSDATETIME() WHERE Id=@id; INSERT INTO LichSuYeuCauNhapKho(YeuCauId,TrangThaiCu,TrangThaiMoi,MaTaiKhoan,LyDo) VALUES(@id,'CHO_DUYET',@next,@userId,@reason)");
    await tx.commit(); tx = undefined;
    res.json({ success: true, message: decision === "approve" ? "Đã duyệt đề nghị; chưa có thay đổi tồn kho." : "Đã từ chối yêu cầu nhập." });
  } catch (e) { if (tx) try { await tx.rollback(); } catch {} fail(res, e); }
});

router.get("/suppliers", staff, async (_req, res) => { try { res.json({ success: true, data: await query("SELECT * FROM NhaCungCap WHERE TrangThai=1 ORDER BY TenNCC") }); } catch (e) { fail(res, e); } });
router.post("/suppliers", staff, async (req, res) => { try { if (!String(req.body.TenNCC || "").trim()) throw new ApiError(400, "Tên nhà cung cấp là bắt buộc"); const result = await query<any>("INSERT INTO NhaCungCap(TenNCC,SoDienThoai,Email,DiaChi,GhiChu) OUTPUT INSERTED.* VALUES(@TenNCC,@SoDienThoai,@Email,@DiaChi,@GhiChu)", req.body); res.status(201).json({ success: true, data: result[0] }); } catch (e) { fail(res, e); } });

router.get("/receipts", staff, async (_req, res) => { try { res.json({ success: true, data: await query(`SELECT p.*,n.TenNCC,tk.TenDangNhap NguoiTao,(SELECT COUNT(*) FROM ChiTietPhieuNhap c WHERE c.MaPhieuNhap=p.MaPhieuNhap) SoDong FROM PhieuNhapKho p LEFT JOIN NhaCungCap n ON n.MaNCC=p.MaNCC LEFT JOIN TaiKhoan tk ON tk.MaTaiKhoan=p.MaTaiKhoanTao ORDER BY p.MaPhieuNhap DESC`) }); } catch (e) { fail(res, e); } });
router.post("/receipts", staff, async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try {
    const items = req.body.items; if (!Array.isArray(items) || !items.length) throw new ApiError(400, "Phiếu nhập cần ít nhất một sản phẩm");
    const pool = await getPool(); tx = new sql.Transaction(pool); await tx.begin();
    const created = await txRequest(tx, { MaNCC: Number(req.body.MaNCC) || null, MaTaiKhoanTao: req.user?.MaTaiKhoan, NgayNhap: req.body.NgayNhap || null, GhiChu: req.body.GhiChu || null }).query("INSERT INTO PhieuNhapKho(MaNCC,MaTaiKhoanTao,NgayNhap,GhiChu) OUTPUT INSERTED.MaPhieuNhap VALUES(@MaNCC,@MaTaiKhoanTao,COALESCE(CONVERT(datetime,@NgayNhap),GETDATE()),@GhiChu)");
    const id = created.recordset[0].MaPhieuNhap;
    for (const item of items) {
      const values = { MaPhieuNhap: id, MaSanPham: Number(item.MaSanPham), MaBienThe: item.MaBienThe == null || item.MaBienThe === '' ? null : Number(item.MaBienThe), MaLoCode: String(item.MaLoCode || "").trim(), NgaySanXuat: item.NgaySanXuat || null, HanSuDung: item.HanSuDung || null, ViTri: item.ViTri || null, SoLuong: Number(item.SoLuong), GiaNhap: Number(item.GiaNhap), ThanhTien: Number(item.SoLuong) * Number(item.GiaNhap) };
      if (!Number.isInteger(values.MaSanPham) || !values.MaLoCode || !Number.isInteger(values.SoLuong) || values.SoLuong <= 0 || !Number.isFinite(values.GiaNhap) || values.GiaNhap < 0) throw new ApiError(400, "Chi tiết phiếu nhập không hợp lệ");
      if (values.MaBienThe !== null) { if (!Number.isInteger(values.MaBienThe) || values.MaBienThe <= 0) throw new ApiError(400, "Mã biến thể không hợp lệ"); const v=await txRequest(tx,{id:values.MaBienThe,productId:values.MaSanPham}).query("SELECT MaBienThe FROM BienTheSanPham WHERE MaBienThe=@id AND MaSanPham=@productId"); if(!v.recordset[0]) throw new ApiError(404,"Biến thể không thuộc sản phẩm nhập"); }
      if (values.NgaySanXuat && values.HanSuDung && new Date(values.HanSuDung) <= new Date(values.NgaySanXuat)) throw new ApiError(400, "Hạn sử dụng phải sau ngày sản xuất");
      await txRequest(tx, values).query("INSERT INTO ChiTietPhieuNhap(MaPhieuNhap,MaSanPham,MaBienThe,MaLoCode,NgaySanXuat,HanSuDung,ViTri,SoLuong,GiaNhap,ThanhTien) VALUES(@MaPhieuNhap,@MaSanPham,@MaBienThe,@MaLoCode,@NgaySanXuat,@HanSuDung,@ViTri,@SoLuong,@GiaNhap,@ThanhTien)");
    }
    await tx.commit(); tx = undefined; res.status(201).json({ success: true, data: { MaPhieuNhap: id, TrangThai: "Nháp" } });
  } catch (e) { if (tx) try { await tx.rollback(); } catch {} fail(res, e); }
});
router.post("/receipts/:id/submit", staff, async (req, res) => { try { const result = await query<any>("UPDATE PhieuNhapKho SET TrangThai=N'Chờ xác nhận' OUTPUT INSERTED.MaPhieuNhap WHERE MaPhieuNhap=@id AND TrangThai=N'Nháp'", { id: Number(req.params.id) }); if (!result.length) throw new ApiError(409, "Phiếu không ở trạng thái nháp"); res.json({ success: true }); } catch (e) { fail(res, e); } });
router.post("/receipts/:id/cancel", staff, async (req, res) => { try { const result = await query<any>("UPDATE PhieuNhapKho SET TrangThai=N'Đã hủy' OUTPUT INSERTED.MaPhieuNhap WHERE MaPhieuNhap=@id AND TrangThai IN(N'Nháp',N'Chờ xác nhận')", { id: Number(req.params.id) }); if (!result.length) throw new ApiError(409, "Phiếu đã được xử lý, không thể hủy"); res.json({ success: true }); } catch (e) { fail(res, e); } });
router.post("/receipts/:id/confirm", authorizeRoles("Admin"), async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try {
    const id = Number(req.params.id), pool = await getPool(); tx = new sql.Transaction(pool); await tx.begin();
    const header = await txRequest(tx, { id }).query("SELECT * FROM PhieuNhapKho WITH(UPDLOCK,HOLDLOCK) WHERE MaPhieuNhap=@id");
    if (!header.recordset[0]) throw new ApiError(404, "Không tìm thấy phiếu nhập");
    if (!["Nháp", "Chờ xác nhận"].includes(header.recordset[0].TrangThai)) throw new ApiError(409, "Phiếu đã được xử lý, không thể xác nhận lần hai");
    const lines = await txRequest(tx, { id }).query("SELECT * FROM ChiTietPhieuNhap WHERE MaPhieuNhap=@id"); let total = 0;
    for (const item of lines.recordset) {
      if (item.HanSuDung && new Date(item.HanSuDung) < new Date(new Date().toDateString())) throw new ApiError(409, `Lô ${item.MaLoCode} đã hết hạn`);
      const found = await txRequest(tx, { MaSanPham: item.MaSanPham, MaBienThe:item.MaBienThe, MaLoCode: item.MaLoCode }).query("SELECT * FROM LoSanPham WITH(UPDLOCK,HOLDLOCK) WHERE MaSanPham=@MaSanPham AND MaLoCode=@MaLoCode AND ((@MaBienThe IS NULL AND MaBienThe IS NULL) OR MaBienThe=@MaBienThe)"); let lot = found.recordset[0];
      if (lot) await txRequest(tx, { MaLo: lot.MaLo, SoLuong: item.SoLuong }).query("UPDATE LoSanPham SET SoLuongTon=SoLuongTon+@SoLuong WHERE MaLo=@MaLo");
      else lot = (await txRequest(tx, { ...item, MaNCC: header.recordset[0].MaNCC }).query("INSERT INTO LoSanPham(MaSanPham,MaBienThe,MaNCC,MaLoCode,NgaySanXuat,HanSuDung,ViTri,GiaNhap,SoLuongTon) OUTPUT INSERTED.* VALUES(@MaSanPham,@MaBienThe,@MaNCC,@MaLoCode,@NgaySanXuat,@HanSuDung,@ViTri,@GiaNhap,@SoLuong)")).recordset[0];
      const p = (await txRequest(tx, { MaSanPham: item.MaSanPham }).query("SELECT SoLuong FROM SanPham WITH(UPDLOCK,ROWLOCK) WHERE MaSanPham=@MaSanPham")).recordset[0]; const before = Number(p.SoLuong || 0);
      await txRequest(tx, { MaSanPham: item.MaSanPham, SoLuong: item.SoLuong }).query("UPDATE SanPham SET SoLuong=SoLuong+@SoLuong WHERE MaSanPham=@MaSanPham");
      await txRequest(tx, { MaSanPham: item.MaSanPham, MaLo: lot.MaLo, MaPhieuNhap: id, MaTaiKhoan: req.user?.MaTaiKhoan, SoLuong: item.SoLuong, TonTruoc: before, TonSau: before + item.SoLuong, GhiChu: `Xác nhận phiếu nhập ${id}` }).query("INSERT INTO BienDongKho(MaSanPham,MaLo,MaPhieuNhap,MaTaiKhoan,Loai,SoLuong,TonTruoc,TonSau,GhiChu) VALUES(@MaSanPham,@MaLo,@MaPhieuNhap,@MaTaiKhoan,N'Nhập',@SoLuong,@TonTruoc,@TonSau,@GhiChu)"); total += Number(item.SoLuong) * Number(item.GiaNhap);
    }
    await txRequest(tx, { id, total }).query("UPDATE PhieuNhapKho SET TrangThai=N'Đã xác nhận',TongTien=@total WHERE MaPhieuNhap=@id"); await tx.commit(); tx = undefined; res.json({ success: true, message: "Đã xác nhận nhập kho" });
  } catch (e) { if (tx) try { await tx.rollback(); } catch {} fail(res, e); }
});

router.get("/counts", staff, async (_req, res) => { try { res.json({ success: true, data: await query("SELECT * FROM PhieuKiemKe ORDER BY MaPhieuKiemKe DESC") }); } catch (e) { fail(res, e); } });
router.post("/counts", staff, async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try {
    const items = req.body.items; if (!String(req.body.LyDo || "").trim()) throw new ApiError(400, "Lý do kiểm kê là bắt buộc"); if (!Array.isArray(items) || !items.length) throw new ApiError(400, "Phiếu kiểm kê cần ít nhất một lô");
    const pool = await getPool(); tx = new sql.Transaction(pool); await tx.begin(); const head = await txRequest(tx, { MaTaiKhoanTao: req.user?.MaTaiKhoan, LyDo: req.body.LyDo, GhiChu: req.body.GhiChu || null }).query("INSERT INTO PhieuKiemKe(MaTaiKhoanTao,LyDo,GhiChu) OUTPUT INSERTED.MaPhieuKiemKe VALUES(@MaTaiKhoanTao,@LyDo,@GhiChu)"); const id = head.recordset[0].MaPhieuKiemKe;
    for (const item of items) { const lot = (await txRequest(tx, { MaLo: Number(item.MaLo) }).query("SELECT SoLuongTon FROM LoSanPham WHERE MaLo=@MaLo")).recordset[0]; if (!lot) throw new ApiError(404, "Không tìm thấy lô kiểm kê"); const actual = Number(item.TonThucTe); if (!Number.isInteger(actual) || actual < 0) throw new ApiError(400, "Tồn thực tế không hợp lệ"); await txRequest(tx, { MaPhieuKiemKe: id, MaLo: Number(item.MaLo), TonHeThong: lot.SoLuongTon, TonThucTe: actual }).query("INSERT INTO ChiTietKiemKe(MaPhieuKiemKe,MaLo,TonHeThong,TonThucTe) VALUES(@MaPhieuKiemKe,@MaLo,@TonHeThong,@TonThucTe)"); }
    await tx.commit(); tx = undefined; res.status(201).json({ success: true, data: { MaPhieuKiemKe: id, TrangThai: "Nháp" } });
  } catch (e) { if (tx) try { await tx.rollback(); } catch {} fail(res, e); }
});
router.post("/counts/:id/submit", staff, async (req, res) => { try { const result = await query<any>("UPDATE PhieuKiemKe SET TrangThai=N'Chờ xác nhận' OUTPUT INSERTED.MaPhieuKiemKe WHERE MaPhieuKiemKe=@id AND TrangThai=N'Nháp'", { id: Number(req.params.id) }); if (!result.length) throw new ApiError(409, "Phiếu không ở trạng thái nháp"); res.json({ success: true }); } catch (e) { fail(res, e); } });
router.post("/counts/:id/confirm", authorizeRoles("Admin"), async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try {
    const id = Number(req.params.id), pool = await getPool(); tx = new sql.Transaction(pool); await tx.begin(); const head = (await txRequest(tx, { id }).query("SELECT * FROM PhieuKiemKe WITH(UPDLOCK,HOLDLOCK) WHERE MaPhieuKiemKe=@id")).recordset[0];
    if (!head) throw new ApiError(404, "Không tìm thấy phiếu kiểm kê"); if (!["Nháp", "Chờ xác nhận"].includes(head.TrangThai)) throw new ApiError(409, "Phiếu đã được xử lý"); const lines = await txRequest(tx, { id }).query("SELECT c.*,l.MaSanPham,l.SoLuongDaGiu FROM ChiTietKiemKe c JOIN LoSanPham l ON l.MaLo=c.MaLo WHERE c.MaPhieuKiemKe=@id");
    for (const item of lines.recordset) { if (item.TonThucTe < item.SoLuongDaGiu) throw new ApiError(409, "Tồn thực tế không được nhỏ hơn số lượng đang giữ"); const lot = (await txRequest(tx, { MaLo: item.MaLo }).query("SELECT * FROM LoSanPham WITH(UPDLOCK,ROWLOCK) WHERE MaLo=@MaLo")).recordset[0]; const diff = Number(item.TonThucTe) - Number(lot.SoLuongTon); if (!diff) continue; await txRequest(tx, { MaLo: item.MaLo, TonThucTe: item.TonThucTe }).query("UPDATE LoSanPham SET SoLuongTon=@TonThucTe WHERE MaLo=@MaLo"); await txRequest(tx, { MaSanPham: lot.MaSanPham, diff }).query("UPDATE SanPham SET SoLuong=SoLuong+@diff WHERE MaSanPham=@MaSanPham AND SoLuong+@diff>=0"); await txRequest(tx, { MaSanPham: lot.MaSanPham, MaLo: lot.MaLo, MaTaiKhoan: req.user?.MaTaiKhoan, SoLuong: diff, TonTruoc: lot.SoLuongTon, TonSau: item.TonThucTe, GhiChu: `Kiểm kê #${id}: ${head.LyDo}` }).query("INSERT INTO BienDongKho(MaSanPham,MaLo,MaTaiKhoan,Loai,SoLuong,TonTruoc,TonSau,GhiChu) VALUES(@MaSanPham,@MaLo,@MaTaiKhoan,CASE WHEN @SoLuong>0 THEN N'Điều chỉnh tăng' ELSE N'Điều chỉnh giảm' END,@SoLuong,@TonTruoc,@TonSau,@GhiChu)"); }
    await txRequest(tx, { id, MaTaiKhoan: req.user?.MaTaiKhoan }).query("UPDATE PhieuKiemKe SET TrangThai=N'Đã xác nhận',MaTaiKhoanXacNhan=@MaTaiKhoan,NgayXacNhan=GETDATE() WHERE MaPhieuKiemKe=@id"); await tx.commit(); tx = undefined; res.json({ success: true, message: "Đã xác nhận kiểm kê" });
  } catch (e) { if (tx) try { await tx.rollback(); } catch {} fail(res, e); }
});

export default router;
