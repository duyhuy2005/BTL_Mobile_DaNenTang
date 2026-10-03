import { Router, Response } from "express";
import { getPool, query, queryOne, sql } from "../config/database";
import { AuthRequest, authorizeRoles } from "../middleware/auth";
import { evaluateVoucher, reserveVoucher, settleOrderVouchers, VoucherError, VoucherLine } from "../services/voucher";
import { promotionForProduct, reservePromotion, settlePromotionOrder } from "../services/khuyenmai";
import { taoThongBao } from "../services/notifications";

const router = Router();

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function addInputs(request: sql.Request, params: Record<string, unknown>) {
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) request.input(key, sql.NVarChar, null);
    else if (typeof value === "number") request.input(key, Number.isInteger(value) ? sql.Int : sql.Decimal(18, 2), value);
    else request.input(key, sql.NVarChar, String(value));
  });
  return request;
}

function txQuery(transaction: sql.Transaction, statement: string, params: Record<string, unknown> = {}) {
  return addInputs(new sql.Request(transaction), params).query(statement);
}

function positiveInt(value: unknown, fallback: number, maximum = 100) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function isSellable(product: any) {
  return product && Number(product.TrangThai) === 1 && !product.IsDeleted;
}

function parsePositiveSafeInteger(value: unknown): number | null {
  if ((typeof value !== "number" && typeof value !== "string") || (typeof value === "string" && !value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function currentCustomerId(req: AuthRequest) {
  if (!req.user) return null;
  const row = await queryOne<{ MaKhachHang: number }>(
    "SELECT MaKhachHang FROM KhachHang WHERE MaTaiKhoan=@MaTaiKhoan",
    { MaTaiKhoan: req.user.MaTaiKhoan },
  );
  return row?.MaKhachHang ?? null;
}

function parseProducts(rows: any[]) {
  return rows.map((row) => {
    let SanPhamTomTat: any[] = [];
    try { SanPhamTomTat = row.SanPhamJSON ? JSON.parse(row.SanPhamJSON) : []; } catch { SanPhamTomTat = []; }
    const { SanPhamJSON, ...rest } = row;
    return { ...rest, SanPhamTomTat };
  });
}

async function listOrders(req: AuthRequest, res: Response, forceOwn = false) {
  if (!req.user || !["KhachHang", "Admin", "NhanVien"].includes(req.user.VaiTro)) {
    return res.status(403).json({ success: false, message: "Không có quyền xem đơn hàng" });
  }
  const own = req.user.VaiTro === "KhachHang" || forceOwn;
  const customerId = own ? await currentCustomerId(req) : null;
  if (own && !customerId) return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ khách hàng" });

  const page = positiveInt(req.query.page, 1, 100000);
  const limit = positiveInt(req.query.limit, 8, 50);
  const offset = (page - 1) * limit;
  const params: Record<string, unknown> = { offset, limit };
  const clauses = ["1=1"];
  if (own) { clauses.push("hd.MaKhachHang=@customerId"); params.customerId = customerId; }
  else if (req.query.maKhachHang !== undefined) {
    const requestedCustomerId = Number(req.query.maKhachHang);
    if (!Number.isInteger(requestedCustomerId) || requestedCustomerId <= 0) return res.status(400).json({ success: false, message: "Mã khách hàng lọc đơn không hợp lệ" });
    clauses.push("hd.MaKhachHang=@customerId"); params.customerId = requestedCustomerId;
  }
  if (req.query.trangThai === "DANG_CHUAN_BI") {
    // The admin tab groups all preparation stages, matching the grouped counter
    // returned by /stats while preserving the exact status of each order row.
    clauses.push(req.query.exactStatus === "true" && req.user?.VaiTro === "KhachHang"
      ? "hd.TrangThai IN (N'DA_XAC_NHAN',N'DANG_CHUAN_BI')"
      : "hd.TrangThai IN (N'DA_XAC_NHAN',N'DANG_CHUAN_BI',N'DA_DONG_GOI')");
  } else if (req.query.trangThai) {
    clauses.push("hd.TrangThai=@trangThai");
    params.trangThai = req.query.trangThai;
  }
  const orderStatusGroups: Record<string, string[]> = {
    CHO_XAC_NHAN: ["CHO_XAC_NHAN"],
    CHO_CHUAN_BI: ["DA_XAC_NHAN", "DANG_CHUAN_BI"],
    CHO_BAN_GIAO: ["DA_DONG_GOI"],
    DANG_GIAO: ["DANG_GIAO"],
    HOAN_TAT: ["DA_GIAO", "HOAN_THANH"],
    DA_HUY: ["DA_HUY"],
  };
  if (req.query.nhomTrangThai) {
    const statuses = orderStatusGroups[String(req.query.nhomTrangThai)];
    if (!statuses) return res.status(400).json({ success: false, message: "Nhóm trạng thái đơn không hợp lệ" });
    const placeholders = statuses.map((status, index) => {
      const key = `statusGroup${index}`;
      params[key] = status;
      return `@${key}`;
    });
    clauses.push(`hd.TrangThai IN (${placeholders.join(",")})`);
  }
  if (req.query.thanhToan) { clauses.push("hd.TrangThaiThanhToan=@thanhToan"); params.thanhToan = req.query.thanhToan; }
  if (req.query.vanChuyen) { clauses.push("hd.TrangThaiVanChuyen=@vanChuyen"); params.vanChuyen = req.query.vanChuyen; }
  if (req.query.ngayDat) { clauses.push("CONVERT(date,hd.NgayLap)=CONVERT(date,@ngayDat)"); params.ngayDat = req.query.ngayDat; }
  const fromDate = req.query.tuNgay ? String(req.query.tuNgay) : "";
  const toDate = req.query.denNgay ? String(req.query.denNgay) : "";
  if ((fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) || (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate))) {
    return res.status(400).json({ success: false, message: "Ngày lọc không đúng định dạng YYYY-MM-DD" });
  }
  if (fromDate && toDate && fromDate > toDate) return res.status(400).json({ success: false, message: "Ngày bắt đầu không được sau ngày kết thúc" });
  if (fromDate) { clauses.push("hd.NgayLap>=CONVERT(date,@tuNgay)"); params.tuNgay = fromDate; }
  if (toDate) { clauses.push("hd.NgayLap<DATEADD(day,1,CONVERT(date,@denNgay))"); params.denNgay = toDate; }
  if (req.query.search) {
    clauses.push("(CONVERT(varchar(20),hd.MaHoaDon) LIKE @search OR N'DH'+RIGHT(N'00000000'+CONVERT(nvarchar(20),hd.MaHoaDon),8) LIKE @search OR COALESCE(hd.TenNguoiNhan,kh.HoTen,'') LIKE @search OR COALESCE(hd.SoDienThoaiNhan,kh.SoDienThoai,'') LIKE @search)");
    params.search = `%${String(req.query.search).trim()}%`;
  }
  const where = `WHERE ${clauses.join(" AND ")}`;
  const total = (await queryOne<{ total: number }>(`SELECT COUNT(1) total FROM HoaDon hd LEFT JOIN KhachHang kh ON kh.MaKhachHang=hd.MaKhachHang ${where}`, params))?.total || 0;
  const rows = await query<any>(`SELECT hd.MaHoaDon,hd.MaKhachHang,hd.MaNhanVien,hd.NgayLap,hd.PhuongThucThanhToan,
      hd.TrangThai,hd.GhiChu,hd.TenNguoiNhan,hd.SoDienThoaiNhan,hd.DiaChiGiaoHang,hd.TamTinh,hd.GiamGia,
      hd.PhiVanChuyen,hd.TongTien,hd.TrangThaiThanhToan,hd.NgayThanhToan,hd.LyDoHuy,hd.NgayCapNhat,
      hd.GiamGiaSanPham,hd.GiamGiaVoucher,COALESCE(hd.TenNguoiNhan,kh.HoTen,N'Khách lẻ') HoTen,
      COALESCE(hd.SoDienThoaiNhan,kh.SoDienThoai) SoDienThoai,
      COALESCE(vc.TenDonVi,hd.DonViVanChuyen) DonViVanChuyen,
      COALESCE(vc.MaVanDon,hd.MaVanDon) MaVanDon,
      COALESCE(vc.TrangThai,hd.TrangThaiVanChuyen,N'CHUA_TAO_VAN_DON') TrangThaiVanChuyen,
      (SELECT TOP 4 ct.MaSanPham, COALESCE(ct.TenSanPhamSnapshot,sp.TenSanPham) TenSanPham,
        COALESCE(ct.HinhAnhSnapshot,sp.HinhAnh) HinhAnh, ct.SoLuong
       FROM ChiTietHoaDon ct LEFT JOIN SanPham sp ON sp.MaSanPham=ct.MaSanPham
       WHERE ct.MaHoaDon=hd.MaHoaDon FOR JSON PATH) SanPhamJSON,
      (SELECT COUNT(1) FROM ChiTietHoaDon ct WHERE ct.MaHoaDon=hd.MaHoaDon) SoDongSanPham,
      (SELECT ISNULL(SUM(ct.SoLuong),0) FROM ChiTietHoaDon ct WHERE ct.MaHoaDon=hd.MaHoaDon) TongSoLuong
    FROM HoaDon hd LEFT JOIN KhachHang kh ON kh.MaKhachHang=hd.MaKhachHang
    OUTER APPLY(SELECT TOP 1 v.MaVanDon,v.TrangThai,dv.TenDonVi FROM VanChuyen v
      JOIN DonViVanChuyen dv ON dv.Id=v.DonViVanChuyenId WHERE v.HoaDonId=hd.MaHoaDon
      ORDER BY CASE WHEN v.TrangThai=N'DA_HUY_VAN_DON' THEN 1 ELSE 0 END,v.Id DESC) vc ${where}
    ORDER BY hd.NgayLap DESC,hd.MaHoaDon DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params);
  return res.json({ success: true, data: parseProducts(rows), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
}

router.get("/stats", authorizeRoles("Admin", "NhanVien"), async (_req, res) => {
  try {
    const stats = await queryOne<any>(`SELECT COUNT(1) TongDon,
      SUM(CASE WHEN TrangThai=N'CHO_XAC_NHAN' THEN 1 ELSE 0 END) ChoXacNhan,
      SUM(CASE WHEN TrangThai IN(N'DA_XAC_NHAN',N'DANG_CHUAN_BI') THEN 1 ELSE 0 END) ChoChuanBi,
      SUM(CASE WHEN TrangThai=N'DA_DONG_GOI' THEN 1 ELSE 0 END) ChoBanGiao,
      SUM(CASE WHEN TrangThai IN(N'DA_XAC_NHAN',N'DANG_CHUAN_BI',N'DA_DONG_GOI') THEN 1 ELSE 0 END) DangChuanBi,
      SUM(CASE WHEN TrangThai=N'DANG_GIAO' THEN 1 ELSE 0 END) DangGiao,
      SUM(CASE WHEN TrangThai=N'DA_GIAO' THEN 1 ELSE 0 END) DaGiao,
      SUM(CASE WHEN TrangThai=N'HOAN_THANH' THEN 1 ELSE 0 END) HoanThanh,
      SUM(CASE WHEN TrangThai=N'GIAO_THAT_BAI' THEN 1 ELSE 0 END) GiaoThatBai,
      SUM(CASE WHEN TrangThai=N'DA_HUY' THEN 1 ELSE 0 END) DaHuy,
      ISNULL(SUM(CASE WHEN CONVERT(date,NgayThanhToan)=CONVERT(date,GETDATE()) AND TrangThaiThanhToan=N'DA_THANH_TOAN' THEN TongTien ELSE 0 END),0) DoanhThuHomNay
      FROM HoaDon`);
    res.json({ success: true, data: stats });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message || "Không thể tải thống kê đơn hàng" }); }
});

router.get("/", async (req: AuthRequest, res) => {
  try { await listOrders(req, res); }
  catch (error: any) { res.status(500).json({ success: false, message: error.message || "Không thể tải đơn hàng" }); }
});

router.get("/me", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try { await listOrders(req, res, true); }
  catch (error: any) { res.status(500).json({ success: false, message: error.message || "Không thể tải đơn hàng" }); }
});

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    if (!req.user || !["KhachHang", "Admin", "NhanVien"].includes(req.user.VaiTro)) return res.status(403).json({ success: false, message: "Không có quyền xem đơn hàng" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: "Mã đơn hàng không hợp lệ" });
    const order = await queryOne<any>(`SELECT hd.MaHoaDon,hd.MaKhachHang,hd.MaNhanVien,hd.NgayLap,hd.PhuongThucThanhToan,
      hd.TrangThai,hd.GhiChu,hd.TenNguoiNhan,hd.SoDienThoaiNhan,hd.DiaChiGiaoHang,hd.TamTinh,hd.GiamGia,
      hd.PhiVanChuyen,hd.TongTien,hd.TrangThaiThanhToan,hd.NgayThanhToan,hd.LyDoHuy,hd.NgayCapNhat,
      hd.GiamGiaSanPham,hd.GiamGiaVoucher,
      COALESCE(kh.HoTen,N'Khách lẻ') KhachDat,kh.SoDienThoai SoDienThoaiKhach,
      COALESCE(hd.TenNguoiNhan,kh.HoTen,N'Khách lẻ') HoTen,
      COALESCE(hd.SoDienThoaiNhan,kh.SoDienThoai) SoDienThoai,${req.user.VaiTro === "NhanVien" ? "" : "kh.Email,"}
      COALESCE(vc.TenDonVi,hd.DonViVanChuyen) DonViVanChuyen,COALESCE(vc.MaVanDon,hd.MaVanDon) MaVanDon,
      COALESCE(vc.TrangThai,hd.TrangThaiVanChuyen,N'CHUA_TAO_VAN_DON') TrangThaiVanChuyen
      FROM HoaDon hd LEFT JOIN KhachHang kh ON kh.MaKhachHang=hd.MaKhachHang
      OUTER APPLY(SELECT TOP 1 v.MaVanDon,v.TrangThai,dv.TenDonVi FROM VanChuyen v JOIN DonViVanChuyen dv ON dv.Id=v.DonViVanChuyenId
        WHERE v.HoaDonId=hd.MaHoaDon ORDER BY CASE WHEN v.TrangThai=N'DA_HUY_VAN_DON' THEN 1 ELSE 0 END,v.Id DESC) vc
      WHERE hd.MaHoaDon=@id`, { id });
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    if (req.user.VaiTro === "KhachHang") {
      const customerId = await currentCustomerId(req);
      if (!customerId || order.MaKhachHang !== customerId) return res.status(403).json({ success: false, message: "Không có quyền xem đơn hàng này" });
    }
    const details = await query<any>(`SELECT ct.MaSanPham,ct.MaBienThe,ct.SoLuong,ct.DonGia,ct.ThanhTien,ct.GiaGocLucMua,ct.KhuyenMaiId,ct.TienGiamKhuyenMai,ct.GiaSauKhuyenMai,ct.TienVoucherPhanBo,ct.GiaThucTra,km.MaChuongTrinh MaChuongTrinhSnapshot,km.TenChuongTrinh TenChuongTrinhSnapshot,
      COALESCE(ct.TenSanPhamSnapshot,sp.TenSanPham) TenSanPham,
      COALESCE(ct.HinhAnhSnapshot,sp.HinhAnh) HinhAnh,
      COALESCE(ct.MaSKUSnapshot,sp.MaSKU) MaSKU,
      COALESCE(ct.BienTheSnapshot,CASE WHEN sp.DungTich IS NOT NULL THEN CONCAT(CONVERT(varchar(30),sp.DungTich),' ',ISNULL(sp.DonVi,'')) ELSE sp.QuyCachDongGoi END) BienThe
      FROM ChiTietHoaDon ct LEFT JOIN SanPham sp ON sp.MaSanPham=ct.MaSanPham LEFT JOIN dbo.KhuyenMai km ON km.Id=ct.KhuyenMaiId WHERE ct.MaHoaDon=@id`, { id });
    const history = await query<any>(`SELECT ls.MaLichSu,ls.TrangThaiCu,ls.TrangThaiMoi,ls.GhiChu,ls.NgayThayDoi,
      COALESCE(tk.TenDangNhap,N'Hệ thống') NguoiThayDoi
      FROM LichSuTrangThaiHoaDon ls LEFT JOIN TaiKhoan tk ON tk.MaTaiKhoan=ls.NguoiThayDoi
      WHERE ls.MaHoaDon=@id ORDER BY ls.NgayThayDoi,ls.MaLichSu`, { id });
    const appliedDiscounts = await query<any>(`SELECT N'KHUYEN_MAI' LoaiApDung,MaChuongTrinhSnapshot MaCode,TenChuongTrinhSnapshot TenChuongTrinh,TienGiam SoTienGiam
      FROM dbo.HoaDonKhuyenMai WHERE MaHoaDon=@id
      UNION ALL
      SELECT CONCAT(N'VOUCHER_',LoaiApDung),MaVoucherSnapshot,TenChuongTrinhSnapshot,SoTienGiam
      FROM dbo.HoaDonVoucher WHERE MaHoaDon=@id`, { id });
    const paid = await queryOne<any>("SELECT ISNULL(SUM(SoTien),0) SoTienDaThu FROM dbo.ThuTienDonHang WHERE MaHoaDon=@id", { id });
    const amountPaid=Number(paid?.SoTienDaThu || 0);
    const codDue=["COD","Tiền mặt"].includes(String(order.PhuongThucThanhToan)) ? Math.max(0,Number(order.TongTien || 0)-amountPaid) : 0;
    res.json({ success: true, data: { ...order, SoTienDaThu:amountPaid, CODConPhaiThu:codDue, ChiTiet: details, UuDai: appliedDiscounts, LichSuTrangThai: history } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message || "Không thể tải chi tiết đơn hàng" }); }
});

// Customer checkout. Prices and FEFO holds are calculated by the server in one transaction.
router.post("/", async (req: AuthRequest, res) => {
  let transaction: sql.Transaction | undefined;
  try {
    if (!req.user || !["KhachHang", "Admin", "NhanVien"].includes(req.user.VaiTro)) throw new HttpError(403, "Không có quyền tạo đơn hàng");
    const { MaKhachHang, MaNhanVien, PhuongThucThanhToan, GhiChu, danhSachSanPham, TenNguoiNhan, SoDienThoaiNhan, DiaChiGiaoHang, MaVoucher, MaVoucherPhiShip, ExpectedTotal, ExpectedVoucherDiscount } = req.body;
    const paymentMethod = String(PhuongThucThanhToan || "COD").trim();
    if (!["COD", "Tiền mặt", "Banking"].includes(paymentMethod)) throw new HttpError(400, "Phương thức thanh toán không được hỗ trợ");
    if (req.user.VaiTro === "KhachHang" && paymentMethod === "Tiền mặt") throw new HttpError(400, "Khách hàng vui lòng chọn COD hoặc chuyển khoản ngân hàng");
    const idempotencyKey = typeof req.body.IdempotencyKey === "string" ? req.body.IdempotencyKey.trim() : "";
    if (idempotencyKey && (idempotencyKey.length > 100 || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey))) throw new HttpError(400, "Mã yêu cầu đặt hàng không hợp lệ");
    if (!Array.isArray(danhSachSanPham) || !danhSachSanPham.length) throw new HttpError(400, "Đơn hàng phải có ít nhất một sản phẩm");
    const customerId = req.user.VaiTro === "KhachHang" ? await currentCustomerId(req) : Number(MaKhachHang) || null;
    if (req.user.VaiTro === "KhachHang" && !customerId) throw new HttpError(404, "Không tìm thấy hồ sơ khách hàng");
    const quantities = new Map<string, { MaSanPham: number; MaBienThe: number | null; SoLuong: number }>();
    for (const value of danhSachSanPham) {
      const productId = parsePositiveSafeInteger(value?.MaSanPham); const quantity = parsePositiveSafeInteger(value?.SoLuong);
      if (productId === null || quantity === null) throw new HttpError(400, "Sản phẩm và số lượng phải là số nguyên dương");
      const variantId = value?.MaBienThe == null || value?.MaBienThe === "" ? null : parsePositiveSafeInteger(value.MaBienThe);
      if (value?.MaBienThe != null && value?.MaBienThe !== "" && variantId === null) throw new HttpError(400, "Mã biến thể không hợp lệ");
      const key=`${productId}:${variantId ?? "legacy"}`, previous=quantities.get(key);
      quantities.set(key, { MaSanPham: productId, MaBienThe: variantId, SoLuong: (previous?.SoLuong || 0) + quantity });
    }
    const customer = customerId ? await queryOne<any>("SELECT HoTen,SoDienThoai,DiaChi FROM KhachHang WHERE MaKhachHang=@id", { id: customerId }) : null;
    const pool = await getPool(); transaction = new sql.Transaction(pool); await transaction.begin();
    let recipientName = String(TenNguoiNhan || customer?.HoTen || "").trim();
    let recipientPhone = String(SoDienThoaiNhan || customer?.SoDienThoai || "").trim();
    let deliveryAddress = String(DiaChiGiaoHang || customer?.DiaChi || "").trim();
    const addressId = req.user.VaiTro === "KhachHang" ? parsePositiveSafeInteger(req.body.IdDiaChiNhanHang) : null;
    if (req.user.VaiTro === "KhachHang" && addressId === null) throw new HttpError(400, "Vui lòng chọn địa chỉ nhận hàng đã lưu");
    if (idempotencyKey && customerId) {
      const lockName = `beautystore:checkout:${customerId}:${idempotencyKey}`;
      const lock = await txQuery(transaction, "DECLARE @result int; EXEC @result=sp_getapplock @Resource=@resource,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=15000; SELECT @result Result", { resource: lockName });
      if (Number(lock.recordset[0]?.Result) < 0) throw new HttpError(409, "Yêu cầu đặt hàng đang được xử lý; vui lòng kiểm tra đơn hàng trước khi thử lại");
      const prior = (await txQuery(transaction, "SELECT MaHoaDon,TrangThai,TrangThaiThanhToan,PhuongThucThanhToan,TenNguoiNhan,SoDienThoaiNhan,DiaChiGiaoHang,TamTinh,GiamGiaSanPham,GiamGiaVoucher,PhiVanChuyen,TongTien FROM HoaDon WITH(UPDLOCK,HOLDLOCK) WHERE MaKhachHang=@customerId AND IdempotencyKey=@key", { customerId, key: idempotencyKey })).recordset[0];
      if (prior) {
        const previousLines = await txQuery(transaction, "SELECT MaSanPham,MaBienThe,SoLuong FROM ChiTietHoaDon WHERE MaHoaDon=@id", { id: prior.MaHoaDon });
        const previousVouchers = await txQuery(transaction, "SELECT MaVoucherSnapshot,LoaiApDung FROM HoaDonVoucher WHERE MaHoaDon=@id", { id: prior.MaHoaDon });
        const previousQuantities = new Map<string, number>();
        for (const line of previousLines.recordset) { const key=`${Number(line.MaSanPham)}:${line.MaBienThe == null ? "legacy" : Number(line.MaBienThe)}`; previousQuantities.set(key, (previousQuantities.get(key) || 0) + Number(line.SoLuong)); }
        const requestedVouchers = [MaVoucher, MaVoucherPhiShip].filter(Boolean).map((code: string) => String(code).trim().toUpperCase()).sort();
        const storedVouchers = previousVouchers.recordset.map((voucher: any) => String(voucher.MaVoucherSnapshot).trim().toUpperCase()).sort();
        const sameLines = quantities.size === previousQuantities.size && [...quantities].every(([key, line]) => previousQuantities.get(key) === line.SoLuong);
        const sameSnapshot = sameLines
          && String(prior.PhuongThucThanhToan) === paymentMethod
          && String(prior.TenNguoiNhan || "").trim() === recipientName
          && String(prior.SoDienThoaiNhan || "").trim() === recipientPhone
          && String(prior.DiaChiGiaoHang || "").trim() === deliveryAddress
          && requestedVouchers.length === storedVouchers.length
          && requestedVouchers.every((code, index) => code === storedVouchers[index]);
        if (!sameSnapshot) throw new HttpError(409, "Mã yêu cầu này đã được dùng cho nội dung đơn khác. Hãy kiểm tra đơn trước khi tạo yêu cầu mới.");
        await transaction.rollback(); transaction = undefined;
        return res.json({ success: true, message: "Đơn hàng đã được tạo trước đó", data: prior });
      }
    }
    if (req.user.VaiTro === "KhachHang") {
      const savedAddress = (await txQuery(transaction, `SELECT TenNguoiNhan,SoDienThoai,DiaChi
        FROM dbo.DiaChiNhanHang WITH(UPDLOCK,HOLDLOCK)
        WHERE Id=@addressId AND MaKhachHang=@customerId AND TrangThai=1`, { addressId, customerId })).recordset[0];
      if (!savedAddress) throw new HttpError(404, "Không tìm thấy địa chỉ nhận hàng của tài khoản này");
      recipientName = String(savedAddress.TenNguoiNhan).trim();
      recipientPhone = String(savedAddress.SoDienThoai).trim();
      deliveryAddress = String(savedAddress.DiaChi).trim();
    }
    const items: any[] = [];
    for (const { MaSanPham, MaBienThe, SoLuong } of quantities.values()) {
      const product = (await txQuery(transaction, "SELECT * FROM SanPham WITH(UPDLOCK,ROWLOCK) WHERE MaSanPham=@MaSanPham", { MaSanPham })).recordset[0];
      if (!product) throw new HttpError(404, "Không tìm thấy sản phẩm");
      if (!isSellable(product)) throw new HttpError(409, `Sản phẩm ${product.TenSanPham} không còn được bán`);
      const variant = MaBienThe === null ? null : (await txQuery(transaction, "SELECT * FROM dbo.BienTheSanPham WITH(UPDLOCK,ROWLOCK) WHERE MaBienThe=@MaBienThe AND MaSanPham=@MaSanPham", { MaBienThe, MaSanPham })).recordset[0];
      if (MaBienThe !== null && !variant) throw new HttpError(404, "Biến thể không thuộc sản phẩm");
      if (variant && !Number(variant.TrangThai)) throw new HttpError(409, `Biến thể ${variant.MaSKU} đã ngừng bán`);
      const available = (await txQuery(transaction, `SELECT ISNULL(SUM(SoLuongTon-SoLuongDaGiu),0) SoLuongCoTheBan
        FROM LoSanPham WITH(UPDLOCK,ROWLOCK) WHERE MaSanPham=@MaSanPham AND TrangThai<>N'Đã hủy'
        AND (HanSuDung IS NULL OR HanSuDung>=CONVERT(date,GETDATE())) AND (@MaBienThe IS NULL OR MaBienThe=@MaBienThe)`, { MaSanPham, MaBienThe })).recordset[0];
      if (Number(available.SoLuongCoTheBan) < SoLuong) throw new HttpError(409, `Sản phẩm ${product.TenSanPham} không đủ tồn khả dụng`);
      const DonGiaGocSnapshot = Number(variant?.GiaBan ?? product.GiaBan);
      const program = await promotionForProduct({MaSanPham,MaDanhMuc:Number(product.MaDanhMuc),ThuongHieu:product.ThuongHieu,GiaBan:DonGiaGocSnapshot,SoLuong},transaction);
      const DonGia = program ? program.price : DonGiaGocSnapshot;
      const promotion = program;
      const variantDescription=variant ? [variant.DungTich&&`${variant.DungTich} ${variant.DonViDungTich||""}`,variant.KhoiLuong&&`${variant.KhoiLuong} ${variant.DonViKhoiLuong||""}`,variant.TenMau||variant.MaMau,variant.MuiHuong,variant.QuyCachDongGoi].filter(Boolean).join(" · ") : (product.DungTich ? `${product.DungTich} ${product.DonVi || ""}`.trim() : product.QuyCachDongGoi || null);
      items.push({ MaSanPham, MaBienThe, SoLuong, DonGia, DonGiaCuoiCung:DonGia, DonGiaGocSnapshot, GiaCuLegacy:DonGiaGocSnapshot, promotionMinOrder:promotion?.minOrder||0, GiamGiaTrucTiepSnapshot: DonGiaGocSnapshot - DonGia, KhuyenMaiId: promotion?.id || null, TienGiamKhuyenMai: promotion ? DonGiaGocSnapshot-DonGia : 0, MaChuongTrinhSnapshot: promotion?.code || null, TenChuongTrinhSnapshot: promotion?.name || null, ChoPhepKetHopVoucher: promotion?.combineVoucher ?? true, MaDanhMuc: Number(product.MaDanhMuc), ThuongHieu: product.ThuongHieu || null, TenSanPhamSnapshot: product.TenSanPham, HinhAnhSnapshot: variant?.HinhAnh || product.HinhAnh || null, MaSKUSnapshot: variant?.MaSKU || product.MaSKU || null, BienTheSnapshot: variantDescription });
    }
    const basketAfterProductDiscounts = items.reduce((sum,item)=>sum+item.DonGia*item.SoLuong,0);
    for (const item of items) if (item.KhuyenMaiId && basketAfterProductDiscounts < item.promotionMinOrder) {
      item.DonGia=item.GiaCuLegacy; item.KhuyenMaiId=null; item.TienGiamKhuyenMai=0; item.MaChuongTrinhSnapshot=null; item.TenChuongTrinhSnapshot=null; item.ChoPhepKetHopVoucher=true;
      item.GiamGiaTrucTiepSnapshot=item.DonGiaGocSnapshot-item.DonGia;
    }
    const TamTinh = items.reduce((sum, item) => sum + item.SoLuong * item.DonGiaGocSnapshot, 0);
    const afterPromotionSubtotal = items.reduce((sum, item) => sum + item.SoLuong * item.DonGia, 0);
    const directDiscount = Math.max(0,TamTinh-afterPromotionSubtotal);
    const voucherLines:VoucherLine[]=items.map(({MaSanPham,SoLuong,DonGia,MaDanhMuc,ThuongHieu})=>({MaSanPham,SoLuong,DonGia,MaDanhMuc,ThuongHieu}));
    const voucherEvaluations=[];
    if((MaVoucher||MaVoucherPhiShip)&&!customerId)throw new HttpError(400,"Voucher chỉ áp dụng cho tài khoản khách hàng");
    if(MaVoucher&&MaVoucherPhiShip&&String(MaVoucher).trim().toUpperCase()===String(MaVoucherPhiShip).trim().toUpperCase()) throw new HttpError(400,"Không thể áp dụng cùng một voucher hai lần");
    if(MaVoucher){const evaluation=await evaluateVoucher(transaction,String(MaVoucher),Number(customerId),voucherLines,0,{lock:true,pendingShipping:true});if(evaluation.loaiApDung!=="SAN_PHAM")throw new HttpError(400,"Mã này là voucher phí vận chuyển; hãy nhập ở ô phí vận chuyển");voucherEvaluations.push(evaluation);}
    if(MaVoucherPhiShip){const evaluation=await evaluateVoucher(transaction,String(MaVoucherPhiShip),Number(customerId),voucherLines,0,{lock:true,pendingShipping:true});if(evaluation.loaiApDung!=="PHI_SHIP")throw new HttpError(400,"Mã này không phải voucher phí vận chuyển");if(voucherEvaluations.length&&!voucherEvaluations[0].voucher.ChoPhepKetHopPhiShip)throw new HttpError(409,"Voucher sản phẩm không cho phép kết hợp voucher phí vận chuyển");if(!evaluation.voucher.ChoPhepKetHopPhiShip&&voucherEvaluations.length)throw new HttpError(409,"Voucher phí vận chuyển không cho phép kết hợp");voucherEvaluations.push(evaluation);}
    const productEvaluation=voucherEvaluations.find(x=>x.loaiApDung==="SAN_PHAM");
    if (voucherEvaluations.length && items.some(item => item.KhuyenMaiId && !item.ChoPhepKetHopVoucher)) throw new HttpError(409,"Khuyến mại sản phẩm không cho phép kết hợp voucher");
    const productDiscount=productEvaluation?.soTienGiam||0;
    const productTotal=Math.max(0,afterPromotionSubtotal-productDiscount);
    const totalDiscount=directDiscount+productDiscount;
    if(ExpectedTotal!==undefined&&Number(ExpectedTotal)!==productTotal||ExpectedVoucherDiscount!==undefined&&Number(ExpectedVoucherDiscount)!==productDiscount) throw new HttpError(409,"Giá hoặc voucher vừa thay đổi. Chưa tạo đơn; hãy xem báo giá mới rồi xác nhận lại.");
    const paymentStatus = ["COD", "Tiền mặt"].includes(paymentMethod) ? "CHUA_THANH_TOAN" : "CHO_THANH_TOAN";
    const created = await txQuery(transaction, `INSERT INTO HoaDon(MaKhachHang,MaNhanVien,NgayLap,PhuongThucThanhToan,TrangThai,TrangThaiThanhToan,TrangThaiVanChuyen,TenNguoiNhan,SoDienThoaiNhan,DiaChiGiaoHang,TamTinh,GiamGia,GiamGiaSanPham,GiamGiaVoucher,GiamGiaPhiShipVoucher,PhiVanChuyen,TongTien,GhiChu,NgayCapNhat,IdempotencyKey)
      OUTPUT INSERTED.MaHoaDon VALUES(@MaKhachHang,@MaNhanVien,GETDATE(),@PhuongThucThanhToan,N'CHO_XAC_NHAN',@TrangThaiThanhToan,N'CHUA_TAO_VAN_DON',@TenNguoiNhan,@SoDienThoaiNhan,@DiaChiGiaoHang,@TamTinh,@totalDiscount,@directDiscount,@productDiscount,0,0,@productTotal,@GhiChu,GETDATE(),@IdempotencyKey)`, {
      MaKhachHang: customerId, MaNhanVien: MaNhanVien || null, PhuongThucThanhToan: paymentMethod, TrangThaiThanhToan: paymentStatus,
      TenNguoiNhan: recipientName || null, SoDienThoaiNhan: recipientPhone || null,
      DiaChiGiaoHang: deliveryAddress || null, TamTinh, totalDiscount, productDiscount, directDiscount, productTotal, GhiChu: GhiChu || null, IdempotencyKey: idempotencyKey || null,
    });
    const orderId = created.recordset[0].MaHoaDon;
    const appliedPrograms = new Map<number, any>();
    for (const item of items) if (item.KhuyenMaiId) appliedPrograms.set(item.KhuyenMaiId,item);
    if (customerId) for (const [promotionId,item] of appliedPrograms) {
      await reservePromotion(transaction,promotionId,Number(customerId),orderId);
      await txQuery(transaction,"INSERT INTO dbo.HoaDonKhuyenMai(MaHoaDon,KhuyenMaiId,MaChuongTrinhSnapshot,TenChuongTrinhSnapshot,TienGiam) VALUES(@order,@promotion,@code,@name,@discount)",{order:orderId,promotion:promotionId,code:item.MaChuongTrinhSnapshot,name:item.TenChuongTrinhSnapshot,discount:items.filter(x=>x.KhuyenMaiId===promotionId).reduce((sum,x)=>sum+x.TienGiamKhuyenMai*x.SoLuong,0)});
    }
    for(const evaluation of voucherEvaluations) await reserveVoucher(transaction,evaluation,Number(customerId),orderId);
    await txQuery(transaction, "INSERT INTO LichSuTrangThaiHoaDon(MaHoaDon,TrangThaiMoi,NguoiThayDoi,GhiChu) VALUES(@id,N'CHO_XAC_NHAN',@userId,N'Khách hàng đặt đơn')", { id: orderId, userId: req.user.MaTaiKhoan });
    let allocated=0;
    const eligibleIndexes=items.map((item,index)=>productEvaluation?.eligible.some(x=>x.MaSanPham===item.MaSanPham)?index:-1).filter(index=>index>=0);
    for (let itemIndex=0;itemIndex<items.length;itemIndex++) {
      const item=items[itemIndex];
      const eligible=productEvaluation?.eligible.some(x=>x.MaSanPham===item.MaSanPham);
      const eligibleBase=productEvaluation?.giaTriDuocApDung||0;
      let lineVoucher=eligible&&eligibleBase>0?(itemIndex===eligibleIndexes[eligibleIndexes.length-1]?Math.max(0,productDiscount-allocated):Math.round(productDiscount*(item.DonGia*item.SoLuong)/eligibleBase*100)/100):0;
      if(lineVoucher>item.DonGia*item.SoLuong)lineVoucher=item.DonGia*item.SoLuong;
      allocated+=lineVoucher;
      const unitVoucher=item.SoLuong?lineVoucher/item.SoLuong:0;
      await txQuery(transaction, `INSERT INTO ChiTietHoaDon(MaHoaDon,MaSanPham,MaBienThe,SoLuong,DonGia,TenSanPhamSnapshot,HinhAnhSnapshot,MaSKUSnapshot,BienTheSnapshot,DonGiaGocSnapshot,GiamGiaTrucTiepSnapshot,GiamGiaVoucherSnapshot,GiaThucTraSnapshot,KhuyenMaiId,TienGiamKhuyenMai,GiaSauKhuyenMai,TienVoucherPhanBo,GiaThucTra,GiaGocLucMua)
        VALUES(@id,@MaSanPham,@MaBienThe,@SoLuong,@DonGia,@TenSanPhamSnapshot,@HinhAnhSnapshot,@MaSKUSnapshot,@BienTheSnapshot,@DonGiaGocSnapshot,@GiamGiaTrucTiepSnapshot,@lineVoucher,@paid,@KhuyenMaiId,@TienGiamKhuyenMai,@DonGia,@lineVoucher,@paid,@DonGiaGocSnapshot)`, { id: orderId, ...item, lineVoucher, paid:Math.max(0,item.DonGia-unitVoucher) });
      const lots = await txQuery(transaction, `SELECT MaLo,SoLuongTon,SoLuongDaGiu FROM LoSanPham WITH(UPDLOCK,ROWLOCK)
        WHERE MaSanPham=@MaSanPham AND (@MaBienThe IS NULL OR MaBienThe=@MaBienThe) AND TrangThai<>N'Đã hủy' AND (HanSuDung IS NULL OR HanSuDung>=CONVERT(date,GETDATE())) AND SoLuongTon>SoLuongDaGiu
        ORDER BY CASE WHEN HanSuDung IS NULL THEN 1 ELSE 0 END,HanSuDung,MaLo`, item);
      let remaining = item.SoLuong;
      for (const lot of lots.recordset) {
        if (!remaining) break;
        const quantity = Math.min(remaining, Number(lot.SoLuongTon) - Number(lot.SoLuongDaGiu));
        await txQuery(transaction, "UPDATE LoSanPham SET SoLuongDaGiu=SoLuongDaGiu+@quantity WHERE MaLo=@MaLo AND SoLuongTon-SoLuongDaGiu>=@quantity", { MaLo: lot.MaLo, quantity });
        await txQuery(transaction, "INSERT INTO GiuHangDonHang(MaHoaDon,MaLo,SoLuong,HetHanLuc) VALUES(@id,@MaLo,@quantity,DATEADD(MINUTE,30,GETDATE()))", { id: orderId, MaLo: lot.MaLo, quantity });
        await txQuery(transaction, "INSERT INTO BienDongKho(MaSanPham,MaLo,MaHoaDon,MaTaiKhoan,Loai,SoLuong,TonTruoc,TonSau,GhiChu) VALUES(@MaSanPham,@MaLo,@id,@userId,N'Giữ hàng',@delta,@stock,@stock,N'Giữ hàng khi tạo đơn')", { MaSanPham: item.MaSanPham, MaLo: lot.MaLo, id: orderId, userId: req.user.MaTaiKhoan, delta: -quantity, stock: lot.SoLuongTon });
        remaining -= quantity;
      }
      if (remaining > 0) throw new HttpError(409, `Sản phẩm ${item.TenSanPhamSnapshot} không đủ tồn khả dụng`);
      // Buy-now orders are an isolated checkout selection and must not consume
      // or delete an existing cart line for the same product.
      if (customerId && req.body.MuaNgay !== true) await txQuery(transaction, "DELETE ct FROM ChiTietGioHang ct JOIN GioHang gh ON gh.MaGioHang=ct.MaGioHang WHERE gh.MaKhachHang=@customerId AND ct.MaSanPham=@MaSanPham AND ((@MaBienThe IS NULL AND ct.MaBienThe IS NULL) OR ct.MaBienThe=@MaBienThe)", { customerId, MaSanPham: item.MaSanPham, MaBienThe:item.MaBienThe });
    }
    await transaction.commit(); transaction = undefined;
    res.status(201).json({ success: true, message: "Tạo đơn hàng thành công", data: { MaHoaDon: orderId, TrangThai: "CHO_XAC_NHAN", TrangThaiThanhToan: paymentStatus, TamTinh, GiamGiaSanPham:directDiscount, GiamGiaVoucher:productDiscount, TongTien: productTotal, VoucherPhiShipChoApDung:Boolean(MaVoucherPhiShip) } });
  } catch (error: any) {
    if (transaction) try { await transaction.rollback(); } catch { /* keep original error */ }
    res.status(error instanceof HttpError ? error.status : 500).json({ success: false, message: error.message || "Không thể tạo đơn hàng" });
  }
});

type OrderAction = "confirm" | "start_prepare" | "pack" | "complete" | "reject" | "cancel" | "mark_paid";

router.post("/:id/actions", authorizeRoles("Admin", "NhanVien", "KhachHang"), async (req: AuthRequest, res) => {
  let transaction: sql.Transaction | undefined;
  try {
    const id = Number(req.params.id);
    const action = String(req.body.action || "") as OrderAction;
    if (!Number.isInteger(id)) throw new HttpError(400, "Mã đơn hàng không hợp lệ");
    const supported: OrderAction[] = ["confirm", "start_prepare", "pack", "complete", "reject", "cancel", "mark_paid"];
    if (!supported.includes(action)) throw new HttpError(400, "Thao tác đơn hàng không hợp lệ");
    const reason = String(req.body.reason || req.body.GhiChu || "").trim();
    if (["reject", "cancel"].includes(action) && !reason) throw new HttpError(400, "Vui lòng nhập lý do");

    const pool = await getPool(); transaction = new sql.Transaction(pool); await transaction.begin();
    const order = (await txQuery(transaction, "SELECT * FROM HoaDon WITH(UPDLOCK,HOLDLOCK) WHERE MaHoaDon=@id", { id })).recordset[0];
    if (!order) throw new HttpError(404, "Không tìm thấy đơn hàng");
    const isCustomer = req.user!.VaiTro === "KhachHang";
    if (isCustomer) {
      if (action !== "cancel") throw new HttpError(403, "Khách hàng chỉ được yêu cầu hủy đơn của mình");
      const customerId = await currentCustomerId(req);
      if (!customerId || Number(order.MaKhachHang) !== Number(customerId)) throw new HttpError(403, "Không có quyền thao tác đơn hàng này");
    }
    let nextStatus = order.TrangThai;
    let nextShipping = order.TrangThaiVanChuyen || "CHUA_TAO_VAN_DON";
    let nextPayment = order.TrangThaiThanhToan || "CHUA_THANH_TOAN";
    let historyNote = reason;

    if (action === "confirm") {
      if (order.TrangThai === "DA_XAC_NHAN") { await transaction.rollback(); transaction = undefined; return res.json({ success: true, message: "Đơn đã được xác nhận trước đó" }); }
      if (order.TrangThai !== "CHO_XAC_NHAN") throw new HttpError(409, "Chỉ có thể xác nhận đơn đang chờ xác nhận");
      const availability = await txQuery(transaction, `SELECT ct.MaSanPham,ct.SoLuong,
        ISNULL(SUM(CASE WHEN gh.TrangThai=N'Đang giữ' AND l.MaLo IS NOT NULL AND (l.HanSuDung IS NULL OR l.HanSuDung>=CONVERT(date,GETDATE())) THEN gh.SoLuong ELSE 0 END),0) SoLuongDangGiu,
        MAX(CASE WHEN sp.TrangThai=1 AND sp.IsDeleted=0 THEN 1 ELSE 0 END) DuocBan
        FROM ChiTietHoaDon ct JOIN SanPham sp ON sp.MaSanPham=ct.MaSanPham
        LEFT JOIN GiuHangDonHang gh ON gh.MaHoaDon=ct.MaHoaDon
        LEFT JOIN LoSanPham l ON l.MaLo=gh.MaLo AND l.MaSanPham=ct.MaSanPham
        WHERE ct.MaHoaDon=@id GROUP BY ct.MaSanPham,ct.SoLuong`, { id });
      if (availability.recordset.some((item: any) => !item.DuocBan || Number(item.SoLuongDangGiu) < Number(item.SoLuong))) {
        throw new HttpError(409, "Hàng đang giữ không còn đủ hoặc sản phẩm đã ngừng bán");
      }
      nextStatus = "DA_XAC_NHAN"; historyNote = "Đã xác nhận đơn hàng";
      await settleOrderVouchers(transaction,id,"DA_SU_DUNG");
      await settlePromotionOrder(transaction,id,"DA_SU_DUNG");
    } else if (action === "start_prepare") {
      if (order.TrangThai === "DANG_CHUAN_BI") { await transaction.rollback(); transaction = undefined; return res.json({ success: true, message: "Đơn đã bắt đầu chuẩn bị trước đó" }); }
      if (order.TrangThai !== "DA_XAC_NHAN") throw new HttpError(409, "Chỉ có thể chuẩn bị đơn đã xác nhận");
      nextStatus = "DANG_CHUAN_BI"; historyNote = "Bắt đầu chuẩn bị hàng";
    } else if (action === "pack") {
      if (order.TrangThai === "DA_DONG_GOI") { await transaction.rollback(); transaction = undefined; return res.json({ success: true, message: "Đơn đã được đóng gói trước đó" }); }
      if (order.TrangThai !== "DANG_CHUAN_BI") throw new HttpError(409, "Chỉ có thể đóng gói đơn đang chuẩn bị");
      nextStatus = "DA_DONG_GOI"; historyNote = "Đã đóng gói";
    } else if (action === "complete") {
      if (order.TrangThai === "HOAN_THANH") { await transaction.rollback(); transaction = undefined; return res.json({ success: true, message: "Đơn đã hoàn thành trước đó" }); }
      if (order.TrangThai !== "DA_GIAO") throw new HttpError(409, "Chỉ có thể hoàn thành đơn đã giao");
      nextStatus = "HOAN_THANH"; historyNote = "Hoàn thành đơn hàng";
    } else if (action === "mark_paid") {
      throw new HttpError(400, "Không thể chỉ đổi trạng thái thanh toán. Ghi nhận khoản tiền thực nhận qua endpoint thu tiền kèm mã giao dịch/chứng từ.");
    } else {
      const allowedStatus = action === "reject" || isCustomer ? ["CHO_XAC_NHAN"] : ["DA_XAC_NHAN", "DANG_CHUAN_BI"];
      if (!allowedStatus.includes(order.TrangThai)) throw new HttpError(409, action === "reject" ? "Chỉ có thể từ chối đơn đang chờ xác nhận" : "Chỉ có thể hủy đơn đã xác nhận hoặc đang chuẩn bị");
      const holds = await txQuery(transaction, `SELECT gh.MaGiuHang,gh.MaLo,gh.SoLuong,l.MaSanPham,l.SoLuongTon
        FROM GiuHangDonHang gh JOIN LoSanPham l WITH(UPDLOCK,ROWLOCK) ON l.MaLo=gh.MaLo WHERE gh.MaHoaDon=@id AND gh.TrangThai=N'Đang giữ'`, { id });
      for (const hold of holds.recordset) {
        const changed = await txQuery(transaction, "UPDATE LoSanPham SET SoLuongDaGiu=SoLuongDaGiu-@qty WHERE MaLo=@MaLo AND SoLuongDaGiu>=@qty", { MaLo: hold.MaLo, qty: hold.SoLuong });
        if (!changed.rowsAffected[0]) throw new HttpError(409, "Không thể hoàn lượng hàng đang giữ");
        await txQuery(transaction, "UPDATE GiuHangDonHang SET TrangThai=N'Đã hủy' WHERE MaGiuHang=@holdId AND TrangThai=N'Đang giữ'", { holdId: hold.MaGiuHang });
        await txQuery(transaction, "INSERT INTO BienDongKho(MaSanPham,MaLo,MaHoaDon,MaTaiKhoan,Loai,SoLuong,TonTruoc,TonSau,GhiChu) VALUES(@productId,@MaLo,@id,@userId,N'Bỏ giữ',@qty,@stock,@stock,@note)", { productId: hold.MaSanPham, MaLo: hold.MaLo, id, userId: req.user!.MaTaiKhoan, qty: hold.SoLuong, stock: hold.SoLuongTon, note: reason });
      }
      nextStatus = "DA_HUY"; nextShipping = "CHUA_TAO_VAN_DON";
      await settleOrderVouchers(transaction,id,"DA_TRA_LAI_LUOT");
      await settlePromotionOrder(transaction,id,"DA_TRA_LAI");
    }

    await txQuery(transaction, `UPDATE HoaDon SET TrangThai=@status,TrangThaiVanChuyen=@shipping,TrangThaiThanhToan=@payment,
      NgayHoanTat=CASE WHEN @status=N'HOAN_THANH' AND NgayHoanTat IS NULL THEN SYSDATETIME() ELSE NgayHoanTat END,
      NgayThanhToan=CASE WHEN @payment=N'DA_THANH_TOAN' AND NgayThanhToan IS NULL THEN GETDATE() ELSE NgayThanhToan END,
      LyDoHuy=CASE WHEN @status=N'DA_HUY' THEN @reason ELSE LyDoHuy END,NgayCapNhat=GETDATE()
      WHERE MaHoaDon=@id`, { status: nextStatus, shipping: nextShipping, payment: nextPayment, reason: reason || null, id });
    await txQuery(transaction, "INSERT INTO LichSuTrangThaiHoaDon(MaHoaDon,TrangThaiCu,TrangThaiMoi,NguoiThayDoi,GhiChu) VALUES(@id,@oldStatus,@newStatus,@userId,@note)", { id, oldStatus: order.TrangThai, newStatus: nextStatus, userId: req.user!.MaTaiKhoan, note: historyNote || null });
    if (nextStatus !== order.TrangThai && Number(order.MaKhachHang) > 0) {
      const eventId = await txQuery(transaction, "SELECT MAX(MaLichSu) Id FROM LichSuTrangThaiHoaDon WHERE MaHoaDon=@id", { id });
      await taoThongBao(transaction, { customerId:Number(order.MaKhachHang),type:"DON_HANG",title:"Đơn hàng được cập nhật",body:`Đơn DH${String(id).padStart(8,"0")}: ${String(nextStatus).replace(/_/g," ")}`,referenceType:"DON_HANG",referenceId:id,eventKey:`order:${id}:${eventId.recordset[0]?.Id||nextStatus}` });
    }
    await transaction.commit(); transaction = undefined;
    res.json({ success: true, message: "Cập nhật đơn hàng thành công", data: { MaHoaDon: id, TrangThai: nextStatus, TrangThaiThanhToan: nextPayment, TrangThaiVanChuyen: nextShipping } });
  } catch (error: any) {
    if (transaction) try { await transaction.rollback(); } catch { /* keep original error */ }
    const status = error?.number === 2601 || error?.number === 2627 ? 409 : error instanceof HttpError ? error.status : 500;
    const message = error?.number === 2601 || error?.number === 2627 ? "Mã vận đơn đã được sử dụng" : error.message || "Không thể cập nhật đơn hàng";
    res.status(status).json({ success: false, message });
  }
});

router.put("/:id", authorizeRoles("Admin", "NhanVien"), async (_req, res) => {
  res.status(410).json({ success: false, message: "Vui lòng dùng endpoint thao tác đơn hàng mới" });
});

export default router;
