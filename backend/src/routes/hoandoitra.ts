import { Router, Response } from "express";
import multer from "multer";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { AuthRequest, authorizeRoles } from "../middleware/auth";
import { getPool, query, queryOne, sql } from "../config/database";
import { taoThongBao } from "../services/notifications";

const router = Router();
const STAFF = authorizeRoles("Admin", "NhanVien");
const ALLOWED_REASONS = ["GIAO_SAI", "GIAO_THIEU", "HU_HONG", "HET_HAN_CHAT_LUONG", "KHONG_DUNG_MO_TA", "DI_UNG", "DOI_Y"];
const TERMINAL = ["TU_CHOI", "TU_CHOI_SAU_KIEM_TRA", "DA_HOAN_TIEN", "DA_DOI_HANG", "HOAN_TAT", "DA_HUY"];

class ReturnError extends Error { constructor(public status: number, message: string) { super(message); } }
const fail = (res: Response, error: any) => res.status(error instanceof ReturnError ? error.status : 500).json({ success: false, message: error.message || "Không thể xử lý yêu cầu hoàn trả" });
const asInt = (value: unknown) => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : 0;
const requestIn = (tx: sql.Transaction, values: Record<string, any>) => {
  const r = new sql.Request(tx);
  for (const [key, value] of Object.entries(values)) {
    if (key === "amount" || key.startsWith("money")) r.input(key, sql.Decimal(18, 2), value ?? null);
    else if (value instanceof Date) r.input(key, sql.DateTime2, value);
    else if (key.startsWith("is") || key.startsWith("has") || key.startsWith("used")) r.input(key, sql.Bit, value ? 1 : 0);
    else if (typeof value === "number" || value === null) r.input(key, sql.Int, value);
    else r.input(key, sql.NVarChar, value === undefined ? null : String(value));
  }
  return r;
};
async function ownCustomerId(req: AuthRequest) {
  return (await queryOne<{ MaKhachHang: number }>("SELECT MaKhachHang FROM KhachHang WHERE MaTaiKhoan=@uid", { uid: req.user!.MaTaiKhoan }))?.MaKhachHang ?? null;
}
type ReturnPolicy = { SoNgayDuocYeuCau: number; ChoPhepKhachYeuCau: boolean };
async function getReturnPolicy(): Promise<ReturnPolicy> {
  const policy = await queryOne<ReturnPolicy>("SELECT SoNgayDuocYeuCau,ChoPhepKhachYeuCau FROM ChinhSachHoanTra WHERE Id=1");
  if (!policy) throw new ReturnError(503, "Chưa cấu hình chính sách hoàn trả");
  return policy;
}
async function evaluateReturnEligibility(orderId: number, customerId: number) {
  const policy = await getReturnPolicy();
  const order = await queryOne<any>(`SELECT hd.MaHoaDon,hd.TrangThai,hd.TrangThaiThanhToan,hd.TongTien,hd.NgayLap,
      delivery.DeliveredAt,DATEADD(day,@days,delivery.DeliveredAt) HanCuoi,
      COALESCE(paid.PaidTotal,0) PaidTotal,
      CASE WHEN delivery.DeliveredAt IS NOT NULL AND DATEADD(day,@days,delivery.DeliveredAt)>=SYSDATETIME() THEN 1 ELSE 0 END TrongHan
    FROM HoaDon hd
    OUTER APPLY(SELECT MAX(COALESCE(ls.ThoiDiemSuKien,ls.CreatedAt)) DeliveredAt
      FROM LichSuVanChuyen ls JOIN VanChuyen vc ON vc.Id=ls.VanChuyenId
      WHERE vc.HoaDonId=hd.MaHoaDon AND ls.TrangThaiMoi=N'GIAO_THANH_CONG') delivery
    OUTER APPLY(SELECT SUM(SoTien) PaidTotal FROM ThuTienDonHang WHERE MaHoaDon=hd.MaHoaDon) paid
    WHERE hd.MaHoaDon=@orderId AND hd.MaKhachHang=@customerId`, { orderId, customerId, days: Number(policy.SoNgayDuocYeuCau) });
  if (!order) throw new ReturnError(404, "Không tìm thấy đơn hàng thuộc tài khoản của bạn");
  const result = { canRequestReturn: false, reason: "", SoNgayDuocYeuCau: Number(policy.SoNgayDuocYeuCau), NgayGiaoThanhCong: order.DeliveredAt || null, HanCuoi: order.HanCuoi || null, order: { MaHoaDon: order.MaHoaDon, NgayLap: order.NgayLap, TrangThai: order.TrangThai, TongTien: Number(order.TongTien), TrangThaiThanhToan: order.TrangThaiThanhToan }, SanPham: [] as any[] };
  if (!policy.ChoPhepKhachYeuCau) { result.reason = "Cửa hàng hiện tạm dừng tiếp nhận yêu cầu hoàn trả"; return result; }
  if (!["DA_GIAO", "HOAN_THANH"].includes(String(order.TrangThai))) { result.reason = "Đơn hàng chưa được giao thành công"; return result; }
  if (!order.DeliveredAt) { result.reason = "Đơn hàng chưa có thời điểm giao thành công được ghi nhận; vui lòng liên hệ cửa hàng"; return result; }
  if (!order.TrongHan) { result.reason = `Đã hết thời hạn ${policy.SoNgayDuocYeuCau} ngày tính từ lúc giao thành công`; return result; }
  if (!["DA_THANH_TOAN", "HOAN_MOT_PHAN"].includes(String(order.TrangThaiThanhToan)) || Number(order.PaidTotal || 0) < Number(order.TongTien)) {
    result.reason = "Khoản thanh toán của đơn chưa được xác nhận đầy đủ; đơn COD chỉ đủ điều kiện sau khi cửa hàng/vận chuyển ghi nhận đã thu"; return result;
  }
  const items = await query<any>(`SELECT ct.MaSanPham,ct.MaBienThe,COALESCE(ct.TenSanPhamSnapshot,sp.TenSanPham) TenSanPham,
      ct.SoLuong SoLuongMua,ct.SoLuong-ISNULL(ret.SoLuongDaYeuCau,0) SoLuongConLai,
      ISNULL(ret.CoYeuCauDangXuLy,0) CoYeuCauDangXuLy,
      COALESCE(ct.HinhAnhSnapshot,sp.HinhAnh) HinhAnh
    FROM ChiTietHoaDon ct JOIN SanPham sp ON sp.MaSanPham=ct.MaSanPham
    OUTER APPLY(SELECT SUM(i.SoLuongTra) SoLuongDaYeuCau,
        MAX(CASE WHEN r.TrangThai IN('CHO_DUYET','DA_DUYET','CHO_KHACH_GUI_HANG','CHO_LAY_HANG_HOAN','DA_LAY_HANG_HOAN','DANG_HOAN_VE','DA_NHAN_HANG_HOAN','DANG_KIEM_TRA','CHAP_NHAN_HOAN','CHO_HOAN_TIEN','DANG_HOAN_TIEN','HOAN_TIEN_THAT_BAI') THEN 1 ELSE 0 END) CoYeuCauDangXuLy
      FROM ChiTietYeuCauHoanTra i JOIN YeuCauHoanTra r ON r.Id=i.YeuCauId
      WHERE i.MaHoaDon=ct.MaHoaDon AND i.MaSanPham=ct.MaSanPham AND ((i.MaBienThe IS NULL AND ct.MaBienThe IS NULL) OR i.MaBienThe=ct.MaBienThe) AND r.TrangThai NOT IN('TU_CHOI','TU_CHOI_SAU_KIEM_TRA','DA_HUY')) ret
    WHERE ct.MaHoaDon=@orderId AND ct.SoLuong>ISNULL(ret.SoLuongDaYeuCau,0)`, { orderId });
  result.SanPham = items.filter((item: any) => Number(item.SoLuongConLai) > 0 && Number(item.CoYeuCauDangXuLy || 0) === 0);
  if (!result.SanPham.length) { result.reason = items.some((item: any) => Number(item.CoYeuCauDangXuLy || 0) > 0) ? "Các sản phẩm còn số lượng đều đang có yêu cầu hoàn trả xử lý" : "Không còn số lượng sản phẩm hợp lệ để yêu cầu hoàn trả"; return result; }
  result.canRequestReturn = true;
  return result;
}
async function changeStatus(tx: sql.Transaction, id: number, from: string[], to: string, userId: number, note?: string) {
  const current = await requestIn(tx, { id }).query("SELECT TrangThai FROM YeuCauHoanTra WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id");
  const old = current.recordset[0]?.TrangThai;
  if (!old) throw new ReturnError(404, "Không tìm thấy yêu cầu hoàn trả");
  if (!from.includes(old)) throw new ReturnError(409, `Không thể chuyển yêu cầu từ trạng thái ${old}`);
  await requestIn(tx, { id, old, to, userId, note: note || null }).query("UPDATE YeuCauHoanTra SET TrangThai=@to,NguoiXuLy=@userId,UpdatedAt=SYSDATETIME() WHERE Id=@id; INSERT LichSuYeuCauHoanTra(YeuCauId,TrangThaiCu,TrangThaiMoi,GhiChu,NguoiThaoTac) VALUES(@id,@old,@to,@note,@userId)");
  const event=(await requestIn(tx,{id}).query("SELECT r.MaKhachHang,(SELECT MAX(Id) FROM LichSuYeuCauHoanTra WHERE YeuCauId=@id) LichSuId FROM YeuCauHoanTra r WHERE r.Id=@id")).recordset[0];
  if(event)await taoThongBao(tx,{customerId:Number(event.MaKhachHang),type:"HOAN_TRA",title:"Yêu cầu hoàn trả được cập nhật",body:`Yêu cầu RT${String(id).padStart(8,"0")}: ${to.replace(/_/g," ")}`,referenceType:"HOAN_TRA",referenceId:id,eventKey:`return:${id}:${event.LichSuId}`});
  return old;
}
async function getRequest(id: number, ownerId?: number) {
  const ownerSql = ownerId === undefined ? "" : " AND r.MaKhachHang=@ownerId";
  const params = ownerId === undefined ? { id } : { id, ownerId };
  const head = await queryOne<any>(`SELECT r.*,N'RT'+RIGHT(N'00000000'+CONVERT(nvarchar(20),r.Id),8) MaYeuCau,
      N'DH'+RIGHT(N'00000000'+CONVERT(nvarchar(20),r.MaHoaDon),8) MaHoaDonHienThi,
      kh.HoTen TenKhachHang,kh.SoDienThoai,kh.Email,hd.NgayLap,hd.PhuongThucThanhToan,hd.TrangThai TrangThaiDon,
      hd.TrangThaiThanhToan,hd.TongTien TongTienDonHang
    FROM YeuCauHoanTra r JOIN KhachHang kh ON kh.MaKhachHang=r.MaKhachHang JOIN HoaDon hd ON hd.MaHoaDon=r.MaHoaDon
    WHERE r.Id=@id${ownerSql}`, params);
  if (!head) return null;
  const [items, evidence, timeline, shipment, inspection, refunds] = await Promise.all([
    query<any>(`SELECT i.*,sp.GiaBan,COALESCE(i.TenSanPhamSnapshot,sp.TenSanPham,N'Sản phẩm đã ngừng kinh doanh') TenSanPham,COALESCE(i.HinhAnhSnapshot,sp.HinhAnh) HinhAnh,
      (SELECT ISNULL(SUM(k.SoLuong),0) FROM BienDongKhoHoanTra k WHERE k.ChiTietYeuCauId=i.Id) SoLuongDaXuLy,
      (SELECT TOP 1 l.HanSuDung FROM GiuHangDonHang gh JOIN LoSanPham l ON l.MaLo=gh.MaLo WHERE gh.MaHoaDon=i.MaHoaDon AND l.MaSanPham=i.MaSanPham AND gh.TrangThai=N'Đã xuất' ORDER BY l.HanSuDung) HanSuDung
      FROM ChiTietYeuCauHoanTra i LEFT JOIN SanPham sp ON sp.MaSanPham=i.MaSanPham WHERE i.YeuCauId=@id ORDER BY i.Id`, { id }),
    query<any>("SELECT * FROM BangChungYeuCauHoanTra WHERE YeuCauId=@id ORDER BY NgayTao", { id }),
    query<any>(`SELECT h.*,COALESCE(tk.HoTen,tk.TenDangNhap,N'Hệ thống') TenNguoiThaoTac FROM LichSuYeuCauHoanTra h LEFT JOIN TaiKhoan tk ON tk.MaTaiKhoan=h.NguoiThaoTac WHERE h.YeuCauId=@id ORDER BY h.NgayTao,h.Id`, { id }),
    queryOne<any>("SELECT v.*,d.TenDonVi FROM VanDonHoanTra v JOIN DonViVanChuyen d ON d.Id=v.DonViVanChuyenId WHERE v.YeuCauId=@id AND v.TrangThai<>N'DA_HUY'", { id }),
    query<any>(`SELECT b.*,tk.HoTen NguoiKiemTra,i.ChiTietYeuCauId,i.SoLuongThucNhan,i.TemCon,i.DaMo,i.DaSuDung,i.TinhTrang,i.PhanLoaiKho,i.GhiChu GhiChuSanPham
      FROM BienBanKiemTraHoanTra b JOIN TaiKhoan tk ON tk.MaTaiKhoan=b.NguoiKiemTra LEFT JOIN ChiTietKiemTraYeuCauHoanTra i ON i.BienBanId=b.Id WHERE b.YeuCauId=@id ORDER BY b.Id DESC`, { id }),
    query<any>("SELECT * FROM GiaoDichHoanTienTra WHERE YeuCauId=@id ORDER BY NgayTao DESC", { id }),
  ]);
  return { ...head, chiTiet: items, bangChung: evidence, timeline, vanDonHoan: shipment, bienBanKiemTra: inspection, giaoDichHoanTien: refunds };
}

// Customer: only list their own after-sales requests.
router.get("/cua-toi", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const customerId = await ownCustomerId(req); if (!customerId) throw new ReturnError(404, "Không tìm thấy hồ sơ khách hàng");
    const page=Math.max(1,asInt(req.query.page)||1),limit=Math.min(50,Math.max(1,asInt(req.query.limit)||10)),status=String(req.query.status||"");
    const returnFilter=status==="DANG_XU_LY"?"AND TrangThai NOT IN('HOAN_TAT','DA_HOAN_TIEN','TU_CHOI','TU_CHOI_SAU_KIEM_TRA','DA_HUY')":status==="HOAN_TAT"?"AND TrangThai IN('HOAN_TAT','DA_HOAN_TIEN')":status?"AND TrangThai=@status":"";
    const total=Number((await queryOne<any>(`SELECT COUNT(*) total FROM YeuCauHoanTra WHERE MaKhachHang=@customerId ${returnFilter}`,{customerId,status}))?.total||0);
    const data = await query<any>(`SELECT r.Id,N'RT'+RIGHT(N'00000000'+CONVERT(nvarchar(20),r.Id),8) MaYeuCau,r.MaHoaDon,r.TrangThai,r.LoaiYeuCau,r.LyDo,r.SoTienDuKien,r.NgayYeuCau,
      (SELECT COUNT(*) FROM ChiTietYeuCauHoanTra i WHERE i.YeuCauId=r.Id) SoSanPham FROM YeuCauHoanTra r WHERE r.MaKhachHang=@customerId ${returnFilter} ORDER BY r.NgayYeuCau DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { customerId,status,offset:(page-1)*limit,limit });
    res.json({ success: true, data, pagination:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))} });
  } catch (e) { fail(res, e); }
});

// Admin/staff list, filters and pagination.
router.get("/", STAFF, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, asInt(req.query.page) || 1), limit = Math.min(100, Math.max(1, asInt(req.query.limit) || 10));
    const from = req.query.from ? String(req.query.from) : "", to = req.query.to ? String(req.query.to) : "";
    const validDate = (value: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const parsed = new Date(`${value}T00:00:00Z`); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value; };
    if ((from && !validDate(from)) || (to && !validDate(to))) throw new ReturnError(400, "Ngày lọc phải có định dạng YYYY-MM-DD hợp lệ");
    if (from && to && from > to) throw new ReturnError(400, "Ngày bắt đầu không được sau ngày kết thúc");
    const params: any = { offset: (page - 1) * limit, limit, search: `%${String(req.query.search || "").trim()}%`, status: String(req.query.status || ""), refundStatus: String(req.query.refundStatus || ""), reason: String(req.query.reason || ""), type: String(req.query.type || ""), from: req.query.from || null, to: req.query.to || null };
    const where = `WHERE (@status=N'' OR (@status=N'DA_NHAN_HANG_HOAN' AND r.TrangThai IN('DA_NHAN_HANG_HOAN','DANG_KIEM_TRA')) OR (@status=N'DANG_HOAN_VE' AND r.TrangThai IN('CHO_LAY_HANG_HOAN','DA_LAY_HANG_HOAN','DANG_HOAN_VE')) OR (@status=N'CHO_HOAN_TIEN' AND r.TrangThai IN('CHO_HOAN_TIEN','DANG_HOAN_TIEN','HOAN_TIEN_THAT_BAI')) OR r.TrangThai=@status) AND (@reason=N'' OR r.LyDo=@reason) AND (@type=N'' OR r.LoaiYeuCau=@type)
      AND (@refundStatus=N'' OR (@refundStatus=N'CHUA_HOAN' AND r.SoTienDaHoan<r.SoTienDuKien AND r.TrangThai IN('CHO_HOAN_TIEN','DANG_HOAN_TIEN','HOAN_TIEN_THAT_BAI')) OR (@refundStatus=N'DA_HOAN' AND r.SoTienDaHoan>0 AND r.TrangThai IN('HOAN_TAT','DA_HOAN_TIEN')) OR (@refundStatus=N'DANG_HOAN' AND r.TrangThai='DANG_HOAN_TIEN') OR (@refundStatus=N'THAT_BAI' AND r.TrangThai='HOAN_TIEN_THAT_BAI'))
      AND (@search=N'%%' OR N'RT'+RIGHT(N'00000000'+CONVERT(nvarchar(20),r.Id),8) LIKE @search OR CONVERT(nvarchar(20),r.MaHoaDon) LIKE @search OR kh.HoTen LIKE @search OR kh.SoDienThoai LIKE @search)
      AND (@from IS NULL OR r.NgayYeuCau>=TRY_CONVERT(date,@from)) AND (@to IS NULL OR r.NgayYeuCau<DATEADD(day,1,TRY_CONVERT(date,@to)))`;
    const total = (await queryOne<any>(`SELECT COUNT(*) total FROM YeuCauHoanTra r JOIN KhachHang kh ON kh.MaKhachHang=r.MaKhachHang ${where}`, params))?.total || 0;
    const data = await query<any>(`SELECT r.Id,N'RT'+RIGHT(N'00000000'+CONVERT(nvarchar(20),r.Id),8) MaYeuCau,r.MaHoaDon,N'DH'+RIGHT(N'00000000'+CONVERT(nvarchar(20),r.MaHoaDon),8) MaHoaDonHienThi,
      r.MaKhachHang,kh.HoTen TenKhachHang,kh.SoDienThoai,r.LoaiYeuCau,r.LyDo,r.MoTa,r.TrangThai,r.NgayYeuCau,r.SoTienDuKien,r.PhuongThucNhanTien,
      (SELECT TOP 1 TenSanPhamSnapshot FROM ChiTietYeuCauHoanTra i WHERE i.YeuCauId=r.Id ORDER BY i.Id) TenSanPhamDau,
      (SELECT TOP 1 HinhAnhSnapshot FROM ChiTietYeuCauHoanTra i WHERE i.YeuCauId=r.Id ORDER BY i.Id) HinhAnhDau,
      (SELECT COUNT(*) FROM ChiTietYeuCauHoanTra i WHERE i.YeuCauId=r.Id) SoSanPham
      FROM YeuCauHoanTra r JOIN KhachHang kh ON kh.MaKhachHang=r.MaKhachHang ${where}
      ORDER BY r.NgayYeuCau DESC,r.Id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params);
    res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (e) { fail(res, e); }
});

router.get("/thong-ke", STAFF, async (_req, res) => {
  try {
    const data = await queryOne<any>(`SELECT COUNT(*) TongYeuCau,
      COALESCE(SUM(CASE WHEN TrangThai='CHO_DUYET' THEN 1 ELSE 0 END),0) ChoDuyet,
      COALESCE(SUM(CASE WHEN TrangThai IN('CHO_LAY_HANG_HOAN','DA_LAY_HANG_HOAN','DANG_HOAN_VE') THEN 1 ELSE 0 END),0) DangHoanVe,
      COALESCE(SUM(CASE WHEN TrangThai IN('DA_NHAN_HANG_HOAN','DANG_KIEM_TRA') THEN 1 ELSE 0 END),0) ChoKiemTra,
      COALESCE(SUM(CASE WHEN TrangThai IN('CHO_HOAN_TIEN','DANG_HOAN_TIEN','HOAN_TIEN_THAT_BAI') THEN 1 ELSE 0 END),0) ChoHoanTien,
      COALESCE(SUM(CASE WHEN TrangThai IN('HOAN_TAT','DA_HOAN_TIEN','DA_DOI_HANG') THEN 1 ELSE 0 END),0) HoanTat,
      ISNULL(SUM(CASE WHEN TrangThai IN('DA_HOAN_TIEN','HOAN_TAT') THEN SoTienDaHoan ELSE 0 END),0) TongTienDaHoan FROM YeuCauHoanTra`);
    res.json({ success: true, data });
  } catch (e) { fail(res, e); }
});

router.get("/chinh-sach", authorizeRoles("Admin"), async (_req, res) => {
  try { res.json({ success: true, data: await getReturnPolicy() }); } catch (e) { fail(res, e); }
});
router.put("/chinh-sach", authorizeRoles("Admin"), async (req: AuthRequest, res) => {
  try {
    const days = Number(req.body.SoNgayDuocYeuCau), enabled = req.body.ChoPhepKhachYeuCau;
    if (!Number.isInteger(days) || days < 1 || days > 365 || typeof enabled !== "boolean") throw new ReturnError(400, "Số ngày phải từ 1–365 và trạng thái tiếp nhận phải là true/false");
    await query("UPDATE ChinhSachHoanTra SET SoNgayDuocYeuCau=@days,ChoPhepKhachYeuCau=@enabled,UpdatedAt=SYSDATETIME(),UpdatedBy=@userId WHERE Id=1", { days, enabled: enabled ? 1 : 0, userId: req.user!.MaTaiKhoan });
    res.json({ success: true, data: await getReturnPolicy() });
  } catch (e) { fail(res, e); }
});

router.get("/dieu-kien/:orderId", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const orderId = asInt(req.params.orderId), customerId = await ownCustomerId(req);
    if (!orderId) throw new ReturnError(400, "Mã đơn hàng không hợp lệ");
    if (!customerId) throw new ReturnError(404, "Không tìm thấy hồ sơ khách hàng");
    res.json({ success: true, data: await evaluateReturnEligibility(orderId, customerId) });
  } catch (e) { fail(res, e); }
});

router.get("/don-hang-cua-toi", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const customerId = await ownCustomerId(req); if (!customerId) throw new ReturnError(404, "Không tìm thấy hồ sơ khách hàng");
    const candidates = await query<any>("SELECT TOP 50 MaHoaDon FROM HoaDon WHERE MaKhachHang=@customerId AND TrangThai IN(N'DA_GIAO',N'HOAN_THANH') ORDER BY NgayLap DESC", { customerId });
    const evaluated = await Promise.all(candidates.map((order: any) => evaluateReturnEligibility(Number(order.MaHoaDon), customerId)));
    const data = evaluated.filter((item: any) => item.canRequestReturn).map((item: any) => ({
      ...item.order, SanPham: item.SanPham.map((p: any) => ({ ...p, SoLuong: Number(p.SoLuongConLai) })),
    }));
    res.json({ success: true, data });
  } catch (e) { fail(res, e); }
});
router.get("/don-vi-van-chuyen", STAFF, async (_req, res) => { try { res.json({ success: true, data: await query("SELECT Id,MaDonVi,TenDonVi FROM DonViVanChuyen WHERE TrangThai=1 ORDER BY TenDonVi") }); } catch(e) { fail(res,e); } });

router.get("/:id/lich-su", authorizeRoles("Admin", "NhanVien", "KhachHang"), async (req: AuthRequest, res) => {
  try {
    const id = asInt(req.params.id); const ownerId = req.user?.VaiTro === "KhachHang" ? await ownCustomerId(req) : undefined;
    const detail = await getRequest(id, ownerId ?? undefined); if (!detail) throw new ReturnError(404, "Không tìm thấy yêu cầu hoàn trả");
    const timeline = req.user?.VaiTro === "KhachHang" ? detail.timeline.map(({ GhiChu, ...item }: any) => item) : detail.timeline;
    res.json({ success: true, data: timeline });
  } catch (e) { fail(res, e); }
});

router.get("/:id", authorizeRoles("Admin", "NhanVien", "KhachHang"), async (req: AuthRequest, res) => {
  try {
    const id = asInt(req.params.id); if (!id) throw new ReturnError(400, "Mã yêu cầu không hợp lệ");
    const ownerId = req.user?.VaiTro === "KhachHang" ? await ownCustomerId(req) : undefined;
    const data = await getRequest(id, ownerId ?? undefined); if (!data) throw new ReturnError(404, "Không tìm thấy yêu cầu hoàn trả");
    if (req.user?.VaiTro === "KhachHang") data.timeline = data.timeline.map(({ GhiChu, ...item }: any) => item);
    res.json({ success: true, data });
  } catch (e) { fail(res, e); }
});

router.post("/", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try {
    const customerId = await ownCustomerId(req); if (!customerId) throw new ReturnError(404, "Không tìm thấy hồ sơ khách hàng");
    const orderId = asInt(req.body.MaHoaDon), items = req.body.items;
    const reason = String(req.body.LyDo || ""); const type = req.body.LoaiYeuCau === "DOI_HANG" ? "DOI_HANG" : "HOAN_TIEN";
    if (type === "DOI_HANG") throw new ReturnError(501, "Quy trình đổi hàng chưa được triển khai; vui lòng chọn hoàn tiền để không tạo yêu cầu bị kẹt");
    if (!orderId || !Array.isArray(items) || !items.length) throw new ReturnError(400, "Chọn đơn hàng và ít nhất một sản phẩm cần trả");
    if (!ALLOWED_REASONS.includes(reason)) throw new ReturnError(400, "Lý do hoàn trả không hợp lệ");
    if (reason === "DOI_Y" && req.body.XacNhanNguyenTem !== true) throw new ReturnError(400, "Sản phẩm đổi ý chỉ được trả khi còn nguyên tem, chưa mở và chưa sử dụng");
    const pool = await getPool(); tx = new sql.Transaction(pool); await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const idempotencyKey=String(req.body.IdempotencyKey||"").trim();
    if(!/^[A-Za-z0-9_-]{16,80}$/.test(idempotencyKey))throw new ReturnError(400,"Mã yêu cầu gửi lặp không hợp lệ");
    const previous=(await requestIn(tx,{customerId,idempotencyKey}).query("SELECT Id,SoTienDuKien FROM YeuCauHoanTra WITH(UPDLOCK,HOLDLOCK) WHERE MaKhachHang=@customerId AND IdempotencyKey=@idempotencyKey")).recordset[0];
    if(previous){await tx.rollback();tx=undefined;return res.status(200).json({success:true,message:"Yêu cầu này đã được tiếp nhận trước đó",data:{Id:previous.Id,SoTienDuKien:previous.SoTienDuKien,daTonTai:true}});}
    const policy=(await requestIn(tx,{}).query("SELECT SoNgayDuocYeuCau,ChoPhepKhachYeuCau FROM ChinhSachHoanTra WITH(UPDLOCK,HOLDLOCK) WHERE Id=1")).recordset[0];
    if(!policy)throw new ReturnError(503,"Chưa cấu hình chính sách hoàn trả");
    if(!policy.ChoPhepKhachYeuCau)throw new ReturnError(409,"Cửa hàng hiện tạm dừng tiếp nhận yêu cầu hoàn trả");
    const windowDays=Number(policy.SoNgayDuocYeuCau);
    const order = (await requestIn(tx, { orderId, customerId }).query(`SELECT * FROM HoaDon WITH(UPDLOCK,HOLDLOCK) WHERE MaHoaDon=@orderId AND MaKhachHang=@customerId`)).recordset[0];
    if (!order) throw new ReturnError(404, "Không tìm thấy đơn hàng thuộc tài khoản của bạn");
    if (!["DA_GIAO", "HOAN_THANH"].includes(order.TrangThai)) throw new ReturnError(409, "Chỉ được yêu cầu trả đơn đã giao thành công");
    const delivery=(await requestIn(tx,{orderId}).query(`SELECT MAX(COALESCE(ls.ThoiDiemSuKien,ls.CreatedAt)) DeliveredAt
      FROM LichSuVanChuyen ls WITH(HOLDLOCK) JOIN VanChuyen vc WITH(HOLDLOCK) ON vc.Id=ls.VanChuyenId
      WHERE vc.HoaDonId=@orderId AND ls.TrangThaiMoi=N'GIAO_THANH_CONG'`)).recordset[0]?.DeliveredAt;
    if(!delivery)throw new ReturnError(409,"Đơn hàng chưa có thời điểm giao thành công được ghi nhận; vui lòng liên hệ cửa hàng");
    const age=(await requestIn(tx,{orderId,windowDays,deliveredAt:delivery}).query("SELECT CASE WHEN DATEADD(day,@windowDays,@deliveredAt)>=SYSDATETIME() THEN 1 ELSE 0 END ok")).recordset[0]?.ok;
    if(!age)throw new ReturnError(409,`Đã hết thời hạn ${windowDays} ngày tính từ lúc giao thành công`);
    if (!["DA_THANH_TOAN", "HOAN_MOT_PHAN"].includes(order.TrangThaiThanhToan)) throw new ReturnError(409, "Đơn hàng chưa được xác nhận đã thanh toán; đơn COD được chấp nhận sau khi khoản thu thực tế được ghi nhận");
    const paidRows=(await requestIn(tx,{orderId}).query("SELECT ISNULL(SUM(SoTien),0) Total FROM ThuTienDonHang WHERE MaHoaDon=@orderId")).recordset[0];
    const paid=Number(paidRows?.Total||0);
    if(paid<Number(order.TongTien))throw new ReturnError(409,"Chưa có đủ khoản thanh toán thực tế được ghi nhận để tạo yêu cầu hoàn tiền");
    const requestRow = (await requestIn(tx, { orderId, customerId, type, reason, description: String(req.body.MoTa || "").trim() || null, method: String(req.body.PhuongThucNhanTien || "CHUYEN_KHOAN"), userId: req.user!.MaTaiKhoan,idempotencyKey:idempotencyKey||null }).query(`INSERT YeuCauHoanTra(MaHoaDon,MaKhachHang,LoaiYeuCau,LyDo,MoTa,PhuongThucNhanTien,TrangThai,NguoiTao,IdempotencyKey)
      OUTPUT INSERTED.Id VALUES(@orderId,@customerId,@type,@reason,@description,@method,'CHO_DUYET',@userId,@idempotencyKey)`)).recordset[0];
    let requestedGross = 0, requestedDiscount = 0;
    for (const entry of items) {
      const productId = asInt(entry.MaSanPham), variantId=entry.MaBienThe == null || entry.MaBienThe === '' ? null : asInt(entry.MaBienThe), quantity = asInt(entry.SoLuong); if (!productId || !quantity || (entry.MaBienThe != null && entry.MaBienThe !== '' && !variantId)) throw new ReturnError(400, "Sản phẩm, biến thể hoặc số lượng không hợp lệ");
      const orderLine = (await requestIn(tx, { orderId, productId,variantId }).query(`SELECT ct.MaHoaDon,ct.MaSanPham,ct.MaBienThe,ct.SoLuong,ct.DonGia,ct.ThanhTien,ct.GiamGiaVoucherSnapshot,ct.GiaThucTraSnapshot,
        COALESCE(ct.TenSanPhamSnapshot,sp.TenSanPham) TenSanPham,COALESCE(ct.HinhAnhSnapshot,sp.HinhAnh) HinhAnh
        FROM ChiTietHoaDon ct JOIN SanPham sp ON sp.MaSanPham=ct.MaSanPham WHERE ct.MaHoaDon=@orderId AND ct.MaSanPham=@productId AND ((@variantId IS NULL AND ct.MaBienThe IS NULL) OR ct.MaBienThe=@variantId)`)).recordset[0];
      if (!orderLine) throw new ReturnError(400, "Sản phẩm không thuộc đơn hàng đã chọn");
      const used = await requestIn(tx, { orderId, productId,variantId }).query(`SELECT ISNULL(SUM(i.SoLuongTra),0) used,
        SUM(CASE WHEN r.TrangThai IN('CHO_DUYET','DA_DUYET','CHO_KHACH_GUI_HANG','CHO_LAY_HANG_HOAN','DA_LAY_HANG_HOAN','DANG_HOAN_VE','DA_NHAN_HANG_HOAN','DANG_KIEM_TRA','CHAP_NHAN_HOAN','CHO_HOAN_TIEN','DANG_HOAN_TIEN','HOAN_TIEN_THAT_BAI') THEN 1 ELSE 0 END) active
        FROM ChiTietYeuCauHoanTra i JOIN YeuCauHoanTra r ON r.Id=i.YeuCauId WHERE i.MaHoaDon=@orderId AND i.MaSanPham=@productId AND ((@variantId IS NULL AND i.MaBienThe IS NULL) OR i.MaBienThe=@variantId) AND r.TrangThai NOT IN('TU_CHOI','TU_CHOI_SAU_KIEM_TRA','DA_HUY')`);
      const already = Number(used.recordset[0]?.used || 0);
      if (Number(used.recordset[0]?.active || 0) > 0) throw new ReturnError(409, `Sản phẩm ${orderLine.TenSanPham} đã có yêu cầu đang xử lý`);
      if (already + quantity > Number(orderLine.SoLuong)) throw new ReturnError(409, `Số lượng trả vượt số lượng còn được trả của ${orderLine.TenSanPham}`);
      // Return against the immutable per-line checkout allocation. Do not use the current catalog price
      // or redistribute the order-wide voucher across products that may not have qualified for it.
      const returnGross = Math.round(Number(orderLine.DonGia) * quantity * 100) / 100;
      const allocated = Math.round((Number(orderLine.GiamGiaVoucherSnapshot || 0) / Number(orderLine.SoLuong)) * quantity * 100) / 100;
      const refund = Math.max(0, Math.round((returnGross - allocated) * 100) / 100);
      requestedGross += returnGross; requestedDiscount += allocated;
      await requestIn(tx, { requestId: requestRow.Id, orderId, productId,variantId, name: orderLine.TenSanPham, image: orderLine.HinhAnh || null, unitPrice: Number(orderLine.DonGia), purchased: Number(orderLine.SoLuong), quantity, lineGross: returnGross, discount: allocated, refund }).query(`INSERT ChiTietYeuCauHoanTra(YeuCauId,MaHoaDon,MaSanPham,MaBienThe,TenSanPhamSnapshot,HinhAnhSnapshot,DonGiaSnapshot,SoLuongMua,SoLuongTra,TienHang,GiamGiaPhanBo,SoTienDuKien)
        VALUES(@requestId,@orderId,@productId,@variantId,@name,@image,@unitPrice,@purchased,@quantity,@lineGross,@discount,@refund)`);
    }
    const expected = Math.max(0, Math.round((requestedGross - requestedDiscount) * 100) / 100);
    const prev = (await requestIn(tx, { orderId }).query(`SELECT ISNULL(SUM(f.SoTien),0) refunded FROM GiaoDichHoanTienTra f JOIN YeuCauHoanTra r ON r.Id=f.YeuCauId WHERE r.MaHoaDon=@orderId AND f.TrangThai IN('DA_HOAN_TIEN','DANG_HOAN_TIEN')`)).recordset[0].refunded;
    if (expected > Math.max(0, paid - Number(prev))) throw new ReturnError(409, "Số tiền dự kiến vượt số tiền khách đã thanh toán còn lại");
    await requestIn(tx, { id: requestRow.Id, moneyGross: requestedGross, moneyDiscount: requestedDiscount, amount: expected, userId: req.user!.MaTaiKhoan }).query(`UPDATE YeuCauHoanTra SET SoTienHang=@moneyGross,GiamGiaPhanBo=@moneyDiscount,SoTienDuKien=@amount WHERE Id=@id;
      INSERT LichSuYeuCauHoanTra(YeuCauId,TrangThaiCu,TrangThaiMoi,GhiChu,NguoiThaoTac) VALUES(@id,NULL,'CHO_DUYET',N'Khách tạo yêu cầu hoàn trả',@userId)`);
    await tx.commit(); tx = undefined;
    res.status(201).json({ success: true, message: "Đã gửi yêu cầu hoàn trả", data: { Id: requestRow.Id, SoTienDuKien: expected } });
  } catch (e) { if (tx) try { await tx.rollback(); } catch {} fail(res, e); }
});

// Approve or reject. Rejecting must include a reason.
router.patch("/:id/chap-nhan", STAFF, async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try { const pool = await getPool(); tx = new sql.Transaction(pool); await tx.begin(); await changeStatus(tx, asInt(req.params.id), ["CHO_DUYET"], "DA_DUYET", req.user!.MaTaiKhoan, "Chấp nhận yêu cầu"); await tx.commit(); tx = undefined; res.json({ success: true }); }
  catch (e) { if (tx) try { await tx.rollback(); } catch {} fail(res, e); }
});
router.patch("/:id/tu-choi", STAFF, async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try { const reason = String(req.body.LyDo || "").trim(); if (!reason) throw new ReturnError(400, "Cần nhập lý do từ chối"); const pool = await getPool(); tx = new sql.Transaction(pool); await tx.begin(); await requestIn(tx,{id:asInt(req.params.id),reason,userId:req.user!.MaTaiKhoan}).query("UPDATE YeuCauHoanTra SET LyDoTuChoi=@reason WHERE Id=@id"); await changeStatus(tx, asInt(req.params.id), ["CHO_DUYET"], "TU_CHOI", req.user!.MaTaiKhoan, reason); await tx.commit(); tx = undefined; res.json({ success: true }); }
  catch (e) { if (tx) try { await tx.rollback(); } catch {} fail(res, e); }
});

router.patch("/:id/khach-tu-gui", STAFF, async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try { const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();await changeStatus(tx,asInt(req.params.id),["DA_DUYET"],"CHO_KHACH_GUI_HANG",req.user!.MaTaiKhoan,"Khách tự gửi hàng hoàn");await tx.commit();tx=undefined;res.json({success:true}); }
  catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e)}
});

router.post("/:id/van-don-hoan", STAFF, async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try {
    const id=asInt(req.params.id), carrierId=asInt(req.body.DonViVanChuyenId);if(!carrierId)throw new ReturnError(400,"Chọn đơn vị vận chuyển");
    const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();
    const request=(await requestIn(tx,{id}).query("SELECT r.*,kh.DiaChi,kh.SoDienThoai FROM YeuCauHoanTra r WITH(UPDLOCK,HOLDLOCK) JOIN KhachHang kh ON kh.MaKhachHang=r.MaKhachHang WHERE r.Id=@id")).recordset[0];
    if(!request)throw new ReturnError(404,"Không tìm thấy yêu cầu");if(request.TrangThai!=="DA_DUYET")throw new ReturnError(409,"Chỉ tạo vận đơn cho yêu cầu đã duyệt");
    const carrier=(await requestIn(tx,{carrierId}).query("SELECT TenDonVi FROM DonViVanChuyen WHERE Id=@carrierId AND TrangThai=1")).recordset[0];if(!carrier)throw new ReturnError(400,"Đơn vị vận chuyển không hợp lệ");
    const tracking=`RT-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const created=(await requestIn(tx,{id,carrierId,tracking,address:String(request.DiaChi||req.body.DiaChiLayHang||""),store:String(req.body.DiaChiNhanHang||process.env.STORE_RETURN_ADDRESS||"BeautyStore - Kho nhận hàng"),fee:Math.max(0,Number(req.body.PhiHoan)||0),payer:req.body.BenChiuPhi==="KHACH_HANG"?"KHACH_HANG":"SHOP",note:String(req.body.GhiChu||"")||null,userId:req.user!.MaTaiKhoan}).query(`INSERT VanDonHoanTra(YeuCauId,DonViVanChuyenId,MaVanDon,DiaChiLayHang,DiaChiNhanHang,PhiHoan,BenChiuPhi,TienThuHo,GhiChu,TrangThai,NguoiTao)
      OUTPUT INSERTED.Id VALUES(@id,@carrierId,@tracking,@address,@store,@fee,@payer,0,@note,'CHO_LAY_HANG_HOAN',@userId)`)).recordset[0];
    await requestIn(tx,{shipmentId:created.Id,userId:req.user!.MaTaiKhoan,note:"Tạo vận đơn hoàn; COD bằng 0"}).query("INSERT LichSuVanDonHoanTra(VanDonId,TrangThaiCu,TrangThaiMoi,GhiChu,NguoiThaoTac) VALUES(@shipmentId,NULL,'CHO_LAY_HANG_HOAN',@note,@userId)");
    await changeStatus(tx,id,["DA_DUYET"],"CHO_LAY_HANG_HOAN",req.user!.MaTaiKhoan,`Tạo vận đơn hoàn ${tracking}`);await tx.commit();tx=undefined;res.status(201).json({success:true,data:{Id:created.Id,MaVanDon:tracking,TenDonVi:carrier.TenDonVi}});
  }catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e)}
});

router.patch("/:id/van-don-hoan/:shipmentId", STAFF, async (req: AuthRequest, res) => {
  let tx:sql.Transaction|undefined;
  try {
    const id=asInt(req.params.id),shipmentId=asInt(req.params.shipmentId),action=String(req.body.action||""),reason=String(req.body.reason||"").trim();
    const map:Record<string,{from:string;shipmentTo:string;requestTo:string}>={picked_up:{from:"CHO_LAY_HANG_HOAN",shipmentTo:"DA_LAY_HANG_HOAN",requestTo:"DA_LAY_HANG_HOAN"},in_transit:{from:"DA_LAY_HANG_HOAN",shipmentTo:"DANG_HOAN_VE",requestTo:"DANG_HOAN_VE"},received:{from:"DANG_HOAN_VE",shipmentTo:"DA_GIAO_HANG_HOAN",requestTo:"DA_NHAN_HANG_HOAN"},failed:{from:"CHO_LAY_HANG_HOAN",shipmentTo:"THAT_BAI",requestTo:"CHO_LAY_HANG_HOAN"},retry:{from:"THAT_BAI",shipmentTo:"CHO_LAY_HANG_HOAN",requestTo:"CHO_LAY_HANG_HOAN"},cancel:{from:"CHO_LAY_HANG_HOAN",shipmentTo:"DA_HUY",requestTo:"DA_DUYET"}};const step=map[action];if(!step)throw new ReturnError(400,"Sự kiện vận chuyển không hợp lệ");if(["failed","cancel"].includes(action)&&!reason)throw new ReturnError(400,"Cần nhập lý do");
    const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();const shipment=(await requestIn(tx,{id,shipmentId}).query("SELECT * FROM VanDonHoanTra WITH(UPDLOCK,HOLDLOCK) WHERE Id=@shipmentId AND YeuCauId=@id")).recordset[0];if(!shipment)throw new ReturnError(404,"Không tìm thấy vận đơn hoàn");if(shipment.TrangThai!==step.from)throw new ReturnError(409,"Vận đơn đang ở trạng thái khác, hãy tải lại");
    await requestIn(tx,{id,shipmentId,old:shipment.TrangThai,next:step.shipmentTo,reason:reason||null,userId:req.user!.MaTaiKhoan}).query("UPDATE VanDonHoanTra SET TrangThai=@next,UpdatedAt=SYSDATETIME() WHERE Id=@shipmentId; INSERT LichSuVanDonHoanTra(VanDonId,TrangThaiCu,TrangThaiMoi,GhiChu,NguoiThaoTac) VALUES(@shipmentId,@old,@next,@reason,@userId)");
    const requestCurrent=(await requestIn(tx,{id}).query("SELECT TrangThai FROM YeuCauHoanTra WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id")).recordset[0]?.TrangThai;
    if(action!=="failed"&&action!=="retry")await changeStatus(tx,id,[requestCurrent],step.requestTo,req.user!.MaTaiKhoan,reason||`Vận đơn hoàn: ${action}`);
    await tx.commit();tx=undefined;res.json({success:true});
  }catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e)}
});

router.patch("/:id/da-lay-hang", STAFF, async (req:AuthRequest,res)=>res.status(400).json({success:false,message:"Dùng sự kiện picked_up trên vận đơn hoàn"}));
router.patch("/:id/khach-da-gui", STAFF, async(req:AuthRequest,res)=>{let tx:sql.Transaction|undefined;try{const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();await changeStatus(tx,asInt(req.params.id),["CHO_KHACH_GUI_HANG"],"DANG_HOAN_VE",req.user!.MaTaiKhoan,String(req.body.MaVanDon||"Khách tự gửi hàng hoàn"));await tx.commit();tx=undefined;res.json({success:true})}catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e)}});
router.patch("/:id/da-nhan-hang", STAFF, async (req:AuthRequest,res)=>{
  let tx:sql.Transaction|undefined;try{const id=asInt(req.params.id),pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();const current=(await requestIn(tx,{id}).query("SELECT TrangThai FROM YeuCauHoanTra WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id")).recordset[0]?.TrangThai;if(current!=="DANG_HOAN_VE")throw new ReturnError(409,"Yêu cầu chưa ở trạng thái đang hoàn về");const shipment=(await requestIn(tx,{id}).query("SELECT TOP 1 * FROM VanDonHoanTra WITH(UPDLOCK,HOLDLOCK) WHERE YeuCauId=@id AND TrangThai='DANG_HOAN_VE' ORDER BY Id DESC")).recordset[0];if(shipment){await requestIn(tx,{id,shipmentId:shipment.Id,old:shipment.TrangThai,userId:req.user!.MaTaiKhoan,note:String(req.body.GhiChu||"Đã nhận kiện hàng hoàn")}).query("UPDATE VanDonHoanTra SET TrangThai='DA_GIAO_HANG_HOAN',UpdatedAt=SYSDATETIME() WHERE Id=@shipmentId; INSERT LichSuVanDonHoanTra(VanDonId,TrangThaiCu,TrangThaiMoi,GhiChu,NguoiThaoTac) VALUES(@shipmentId,@old,'DA_GIAO_HANG_HOAN',@note,@userId)")}await changeStatus(tx,id,["DANG_HOAN_VE"],"DA_NHAN_HANG_HOAN",req.user!.MaTaiKhoan,String(req.body.GhiChu||"Đã nhận kiện hàng hoàn"));await tx.commit();tx=undefined;res.json({success:true})}catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e)}
});
router.patch("/:id/bat-dau-kiem-tra", STAFF, async(req:AuthRequest,res)=>{
  let tx:sql.Transaction|undefined;try{const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();await changeStatus(tx,asInt(req.params.id),["DA_NHAN_HANG_HOAN"],"DANG_KIEM_TRA",req.user!.MaTaiKhoan,"Bắt đầu kiểm tra hàng hoàn");await tx.commit();tx=undefined;res.json({success:true})}catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e)}
});
router.post("/:id/bien-ban-kiem-tra", STAFF, async(req:AuthRequest,res)=>{
  let tx:sql.Transaction|undefined;try{
    const id=asInt(req.params.id),items=req.body.items;if(!Array.isArray(items)||!items.length)throw new ReturnError(400,"Biên bản cần có chi tiết sản phẩm");const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();
    const head=(await requestIn(tx,{id}).query("SELECT r.TrangThai,CASE WHEN EXISTS(SELECT 1 FROM BienBanKiemTraHoanTra b WHERE b.YeuCauId=r.Id) THEN 1 ELSE 0 END DaCoBienBan FROM YeuCauHoanTra r WITH(UPDLOCK,HOLDLOCK) WHERE r.Id=@id")).recordset[0];if(!head)throw new ReturnError(404,"Không tìm thấy yêu cầu");if(head.TrangThai!=="DANG_KIEM_TRA")throw new ReturnError(409,"Yêu cầu chưa ở trạng thái kiểm tra");if(head.DaCoBienBan)throw new ReturnError(409,"Biên bản kiểm tra đã được lập; không ghi trùng");
    const check=(await requestIn(tx,{id,userId:req.user!.MaTaiKhoan,note:String(req.body.GhiChu||"")||null,result:String(req.body.KetLuan||"")||null}).query("INSERT BienBanKiemTraHoanTra(YeuCauId,NguoiKiemTra,KetLuan,GhiChu) OUTPUT INSERTED.Id VALUES(@id,@userId,@result,@note)")).recordset[0];
    for(const item of items){const itemId=asInt(item.ChiTietYeuCauId),actual=Number(item.SoLuongThucNhan),category=String(item.PhanLoaiKho||""),valid=["BAN_LAI","HANG_HONG","CHO_XU_LY","TU_CHOI_NHAN"].includes(category);if(!itemId||!Number.isInteger(actual)||actual<0||!valid)throw new ReturnError(400,"Thông tin kiểm tra sản phẩm không hợp lệ");
      const requestItem=(await requestIn(tx,{id,itemId}).query("SELECT SoLuongTra FROM ChiTietYeuCauHoanTra WHERE Id=@itemId AND YeuCauId=@id")).recordset[0];if(!requestItem||actual>requestItem.SoLuongTra)throw new ReturnError(400,"Số lượng nhận không được vượt số lượng yêu cầu");if(category==="BAN_LAI"&&(item.DaMo||item.DaSuDung||!item.TemCon))throw new ReturnError(400,"Chỉ hàng còn nguyên tem, chưa mở và chưa sử dụng được phân loại bán lại");
      await requestIn(tx,{checkId:check.Id,itemId,actual,isTemCon:!!item.TemCon,isDaMo:!!item.DaMo,isDaSuDung:!!item.DaSuDung,tinhTrang:String(item.TinhTrang||""),category,note:String(item.GhiChu||"")||null}).query("INSERT ChiTietKiemTraYeuCauHoanTra(BienBanId,ChiTietYeuCauId,SoLuongThucNhan,TemCon,DaMo,DaSuDung,TinhTrang,PhanLoaiKho,GhiChu) VALUES(@checkId,@itemId,@actual,@isTemCon,@isDaMo,@isDaSuDung,@tinhTrang,@category,@note); UPDATE ChiTietYeuCauHoanTra SET SoLuongThucNhan=@actual,PhanLoaiKho=@category,SoTienDuKien=CASE WHEN @category='TU_CHOI_NHAN' THEN 0 ELSE ROUND(SoTienDuKien*@actual/SoLuongTra,2) END WHERE Id=@itemId");
    }
    await requestIn(tx,{id}).query("UPDATE r SET SoTienHang=x.TienHang,GiamGiaPhanBo=x.GiamGia,SoTienDuKien=x.DuKien FROM YeuCauHoanTra r CROSS APPLY(SELECT ISNULL(SUM(CASE WHEN i.PhanLoaiKho<>'TU_CHOI_NHAN' THEN i.TienHang*i.SoLuongThucNhan/i.SoLuongTra ELSE 0 END),0) TienHang,ISNULL(SUM(CASE WHEN i.PhanLoaiKho<>'TU_CHOI_NHAN' THEN i.GiamGiaPhanBo*i.SoLuongThucNhan/i.SoLuongTra ELSE 0 END),0) GiamGia,ISNULL(SUM(i.SoTienDuKien),0) DuKien FROM ChiTietYeuCauHoanTra i WHERE i.YeuCauId=r.Id) x WHERE r.Id=@id");
    await tx.commit();tx=undefined;res.status(201).json({success:true,data:{Id:check.Id}});
  }catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e)}
});
router.patch("/:id/chap-nhan-sau-kiem-tra", STAFF, async(req:AuthRequest,res)=>{
  let tx:sql.Transaction|undefined;try{const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();const rows=await requestIn(tx,{id:asInt(req.params.id)}).query("SELECT COUNT(*) n, SUM(CASE WHEN PhanLoaiKho IN('BAN_LAI','HANG_HONG','CHO_XU_LY') AND SoLuongThucNhan>0 THEN 1 ELSE 0 END) accepted FROM ChiTietYeuCauHoanTra WHERE YeuCauId=@id");if(!rows.recordset[0].n||!rows.recordset[0].accepted)throw new ReturnError(409,"Chưa có sản phẩm đủ điều kiện chấp nhận sau kiểm tra");await changeStatus(tx,asInt(req.params.id),["DANG_KIEM_TRA"],"CHAP_NHAN_HOAN",req.user!.MaTaiKhoan,String(req.body.GhiChu||"Chấp nhận sau kiểm tra"));await tx.commit();tx=undefined;res.json({success:true})}catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e)}
});
router.patch("/:id/tu-choi-sau-kiem-tra", STAFF, async(req:AuthRequest,res)=>{
  let tx:sql.Transaction|undefined;try{const reason=String(req.body.LyDo||"").trim();if(!reason)throw new ReturnError(400,"Cần nhập lý do từ chối sau kiểm tra");const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();await requestIn(tx,{id:asInt(req.params.id),reason}).query("UPDATE YeuCauHoanTra SET LyDoTuChoi=@reason WHERE Id=@id");await changeStatus(tx,asInt(req.params.id),["DANG_KIEM_TRA"],"TU_CHOI_SAU_KIEM_TRA",req.user!.MaTaiKhoan,reason);await tx.commit();tx=undefined;res.json({success:true})}catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e)}
});

router.post("/:id/xu-ly-kho", authorizeRoles("Admin"), async(req:AuthRequest,res)=>{
  let tx:sql.Transaction|undefined;try{
    const id=asInt(req.params.id),pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();const head=(await requestIn(tx,{id}).query("SELECT * FROM YeuCauHoanTra WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id")).recordset[0];if(!head)throw new ReturnError(404,"Không tìm thấy yêu cầu");if(head.TrangThai!=="CHAP_NHAN_HOAN")throw new ReturnError(409,"Yêu cầu chưa được chấp nhận sau kiểm tra");
    const lines=await requestIn(tx,{id}).query("SELECT i.*,sp.SoLuong FROM ChiTietYeuCauHoanTra i JOIN SanPham sp ON sp.MaSanPham=i.MaSanPham WHERE i.YeuCauId=@id");for(const item of lines.recordset){if(item.PhanLoaiKho==="BAN_LAI"&&item.SoLuongThucNhan>0){const source=(await requestIn(tx,{orderId:head.MaHoaDon,productId:item.MaSanPham}).query("SELECT TOP 1 l.MaLo,l.HanSuDung,l.SoLuongTon,l.SoLuongDaGiu FROM GiuHangDonHang g JOIN LoSanPham l ON l.MaLo=g.MaLo WHERE g.MaHoaDon=@orderId AND l.MaSanPham=@productId AND g.TrangThai=N'Đã xuất' AND (l.HanSuDung IS NULL OR l.HanSuDung>=CONVERT(date,GETDATE())) ORDER BY CASE WHEN l.HanSuDung IS NULL THEN 1 ELSE 0 END,l.HanSuDung,l.MaLo")).recordset[0];
        if(source){await requestIn(tx,{lotId:source.MaLo,qty:item.SoLuongThucNhan,productId:item.MaSanPham}).query("UPDATE LoSanPham SET SoLuongTon=SoLuongTon+@qty WHERE MaLo=@lotId; UPDATE SanPham SET SoLuong=SoLuong+@qty WHERE MaSanPham=@productId");await requestIn(tx,{id,itemId:item.Id,productId:item.MaSanPham,lotId:source.MaLo,qty:item.SoLuongThucNhan,userId:req.user!.MaTaiKhoan}).query("INSERT BienDongKhoHoanTra(YeuCauId,ChiTietYeuCauId,MaSanPham,MaLo,PhanLoaiKho,SoLuong,MaTaiKhoan) VALUES(@id,@itemId,@productId,@lotId,'BAN_LAI',@qty,@userId); INSERT BienDongKho(MaSanPham,MaLo,MaTaiKhoan,Loai,SoLuong,TonTruoc,TonSau,GhiChu,MaThamChieu) SELECT @productId,@lotId,@userId,N'Hoàn kho',@qty,SoLuong-@qty,SoLuong,N'Nhập lại từ yêu cầu hoàn trả '+CONVERT(nvarchar(20),@id),NEWID() FROM SanPham WHERE MaSanPham=@productId");}
        else {await requestIn(tx,{id,itemId:item.Id,productId:item.MaSanPham,qty:item.SoLuongThucNhan,userId:req.user!.MaTaiKhoan}).query("INSERT BienDongKhoHoanTra(YeuCauId,ChiTietYeuCauId,MaSanPham,MaLo,PhanLoaiKho,SoLuong,MaTaiKhoan) VALUES(@id,@itemId,@productId,NULL,'CHO_XU_LY',@qty,@userId); UPDATE ChiTietYeuCauHoanTra SET PhanLoaiKho='CHO_XU_LY' WHERE Id=@itemId");}
      } else if(["HANG_HONG","CHO_XU_LY"].includes(item.PhanLoaiKho)&&item.SoLuongThucNhan>0){await requestIn(tx,{id,itemId:item.Id,productId:item.MaSanPham,category:item.PhanLoaiKho,qty:item.SoLuongThucNhan,userId:req.user!.MaTaiKhoan}).query("INSERT BienDongKhoHoanTra(YeuCauId,ChiTietYeuCauId,MaSanPham,MaLo,PhanLoaiKho,SoLuong,MaTaiKhoan) VALUES(@id,@itemId,@productId,NULL,@category,@qty,@userId)");}}
    if(head.LoaiYeuCau==="DOI_HANG")throw new ReturnError(501,"Quy trình đổi hàng chưa được bật; yêu cầu được giữ nguyên để không đánh dấu hoàn tất khi chưa giao hàng thay thế");
    const fee=(await requestIn(tx,{id}).query("SELECT CASE WHEN v.BenChiuPhi='KHACH_HANG' THEN v.PhiHoan ELSE 0 END fee FROM YeuCauHoanTra r OUTER APPLY(SELECT TOP 1 * FROM VanDonHoanTra WHERE YeuCauId=r.Id AND TrangThai<>'DA_HUY' ORDER BY Id DESC) v WHERE r.Id=@id")).recordset[0]?.fee||0;
    const balance=(await requestIn(tx,{id,fee}).query("UPDATE YeuCauHoanTra SET PhiHoanKhachChiu=@fee,SoTienDuKien=CASE WHEN SoTienDuKien>@fee THEN SoTienDuKien-@fee ELSE 0 END WHERE Id=@id; SELECT SoTienDuKien FROM YeuCauHoanTra WHERE Id=@id")).recordset[0]?.SoTienDuKien||0;
    const next=Number(balance)>0?"CHO_HOAN_TIEN":"HOAN_TAT";await changeStatus(tx,id,["CHAP_NHAN_HOAN"],next,req.user!.MaTaiKhoan,"Đã xử lý phân loại kho; hàng hỏng không nhập tồn bán");await tx.commit();tx=undefined;res.json({success:true,message:"Đã ghi nhận xử lý kho"});
  }catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e)}
});

router.post("/:id/hoan-tien", authorizeRoles("Admin"), async(req:AuthRequest,res)=>{
  let tx:sql.Transaction|undefined;try{
    const id=asInt(req.params.id),method=String(req.body.PhuongThuc||"CHUYEN_KHOAN"),transactionCode=String(req.body.MaGiaoDich||"").trim(),proof=String(req.body.ChungTuUrl||"").trim();if(!["CHUYEN_KHOAN","VI_DIEN_TU","TIEN_MAT"].includes(method))throw new ReturnError(400,"Phương thức hoàn tiền không hợp lệ");if(!transactionCode&&!proof)throw new ReturnError(400,"Cần mã giao dịch hoặc đường dẫn chứng từ để xác nhận hoàn tiền");
    const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();const head=(await requestIn(tx,{id}).query("SELECT r.*,hd.TrangThaiThanhToan FROM YeuCauHoanTra r WITH(UPDLOCK,HOLDLOCK) JOIN HoaDon hd WITH(UPDLOCK,HOLDLOCK) ON hd.MaHoaDon=r.MaHoaDon WHERE r.Id=@id")).recordset[0];if(!head)throw new ReturnError(404,"Không tìm thấy yêu cầu");if(!["CHO_HOAN_TIEN","HOAN_TIEN_THAT_BAI"].includes(head.TrangThai))throw new ReturnError(409,"Chỉ hoàn tiền sau khi kho đã xử lý hàng hoàn");if(!["DA_THANH_TOAN","HOAN_MOT_PHAN"].includes(head.TrangThaiThanhToan))throw new ReturnError(409,"Đơn gốc chưa được xác nhận đã thu tiền; không thể ghi nhận hoàn tiền");
    const due=Number(head.SoTienDuKien)-Number(head.SoTienDaHoan);if(due<=0)throw new ReturnError(409,"Yêu cầu đã hoàn đủ số tiền");
    const paidAmount=Number((await requestIn(tx,{orderId:head.MaHoaDon}).query("SELECT ISNULL(SUM(SoTien),0) total FROM ThuTienDonHang WHERE MaHoaDon=@orderId")).recordset[0].total);
    const previous=Number((await requestIn(tx,{orderId:head.MaHoaDon}).query("SELECT ISNULL(SUM(f.SoTien),0) total FROM GiaoDichHoanTienTra f JOIN YeuCauHoanTra r ON r.Id=f.YeuCauId WHERE r.MaHoaDon=@orderId AND f.TrangThai='DA_HOAN_TIEN'")).recordset[0].total);
    if(paidAmount<=0)throw new ReturnError(409,"Đơn hàng chưa có khoản thu được xác minh; hãy đối chiếu khoản thanh toán trước khi hoàn tiền");if(due>paidAmount-previous)throw new ReturnError(409,"Số tiền hoàn vượt số tiền thực thu còn lại");
    if(transactionCode){const duplicate=(await requestIn(tx,{transactionCode}).query("SELECT TOP 1 Id FROM GiaoDichHoanTienTra WITH(UPDLOCK,HOLDLOCK) WHERE MaGiaoDich=@transactionCode")).recordset[0];if(duplicate)throw new ReturnError(409,"Mã giao dịch hoàn tiền đã được sử dụng");}
    if(head.TrangThai!=="DANG_HOAN_TIEN")await changeStatus(tx,id,[head.TrangThai],"DANG_HOAN_TIEN",req.user!.MaTaiKhoan,"Bắt đầu hoàn tiền thủ công");
    await requestIn(tx,{id,amount:due,method,transactionCode:transactionCode||null,proof:proof||null,note:String(req.body.GhiChu||"")||null,userId:req.user!.MaTaiKhoan}).query("INSERT GiaoDichHoanTienTra(YeuCauId,SoTien,PhuongThuc,MaGiaoDich,ChungTuUrl,TrangThai,GhiChu,NguoiThaoTac) VALUES(@id,@amount,@method,@transactionCode,@proof,'DA_HOAN_TIEN',@note,@userId); UPDATE YeuCauHoanTra SET SoTienDaHoan=SoTienDaHoan+@amount WHERE Id=@id");
    await changeStatus(tx,id,["DANG_HOAN_TIEN"],"HOAN_TAT",req.user!.MaTaiKhoan,"Đã xác nhận giao dịch hoàn tiền");
    const remaining=(await requestIn(tx,{orderId:head.MaHoaDon}).query("SELECT COUNT(*) total FROM ChiTietHoaDon ct WHERE ct.MaHoaDon=@orderId AND ct.SoLuong>ISNULL((SELECT SUM(i.SoLuongThucNhan) FROM ChiTietYeuCauHoanTra i JOIN YeuCauHoanTra r ON r.Id=i.YeuCauId WHERE i.MaHoaDon=ct.MaHoaDon AND i.MaSanPham=ct.MaSanPham AND r.TrangThai IN('HOAN_TAT','DA_HOAN_TIEN') AND i.PhanLoaiKho<>'TU_CHOI_NHAN'),0)")).recordset[0]?.total;
    await requestIn(tx,{orderId:head.MaHoaDon,returnStatus:Number(remaining)===0?"DA_HOAN_TOAN_BO":"HOAN_MOT_PHAN"}).query("UPDATE HoaDon SET TrangThaiHoanTra=@returnStatus WHERE MaHoaDon=@orderId");
    const paidTotal=paidAmount;
    const refundedTotal=Number((await requestIn(tx,{orderId:head.MaHoaDon}).query("SELECT ISNULL(SUM(f.SoTien),0) Refunded FROM GiaoDichHoanTienTra f JOIN YeuCauHoanTra r ON r.Id=f.YeuCauId WHERE r.MaHoaDon=@orderId AND f.TrangThai='DA_HOAN_TIEN'")).recordset[0]?.Refunded||0);
    const paymentStatus=refundedTotal>=paidTotal?"DA_HOAN_TIEN":"HOAN_MOT_PHAN";
    await requestIn(tx,{orderId:head.MaHoaDon,paymentStatus}).query("UPDATE HoaDon SET TrangThaiThanhToan=@paymentStatus,NgayCapNhat=GETDATE() WHERE MaHoaDon=@orderId");
    await tx.commit();tx=undefined;res.json({success:true,data:{SoTienHoan:due}});
  }catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e)}
});

// Evidence upload uses in-memory staging, signature sniffing and generated names.
const evidenceUpload=multer({storage:multer.memoryStorage(),limits:{files:6,fileSize:10*1024*1024}}).array("files",6);
router.post("/:id/bang-chung", authorizeRoles("Admin","NhanVien","KhachHang"), async(req:AuthRequest,res)=>{
  evidenceUpload(req,res,async(error:any)=>{
    if(error)return fail(res,new ReturnError(400,error.message||"Tệp không hợp lệ"));
    const files=(req.files as Express.Multer.File[]|undefined)||[];if(!files.length)return fail(res,new ReturnError(400,"Chọn ít nhất một ảnh hoặc video"));
    try{
      const ownerId=req.user?.VaiTro==="KhachHang"?await ownCustomerId(req):undefined;const detail=await getRequest(asInt(req.params.id),ownerId??undefined);if(!detail)return fail(res,new ReturnError(404,"Không tìm thấy yêu cầu"));if(req.user?.VaiTro==="KhachHang"&&detail.TrangThai!=="CHO_DUYET")return fail(res,new ReturnError(409,"Chỉ bổ sung bằng chứng cho yêu cầu đang chờ duyệt"));
      const dir=path.resolve(__dirname,"../../uploads/returns");await fs.mkdir(dir,{recursive:true});const added=[] as any[];for(const file of files){const b=file.buffer;let ext="",type="";if(b.subarray(0,3).equals(Buffer.from([0xff,0xd8,0xff]))){ext=".jpg";type="image"}else if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){ext=".png";type="image"}else if(b.subarray(0,4).toString()==="RIFF"&&b.subarray(8,12).toString()==="WEBP"){ext=".webp";type="image"}else if(b.subarray(4,8).toString()==="ftyp"){ext=".mp4";type="video"}else throw new ReturnError(400,"Chỉ nhận ảnh JPEG/PNG/WEBP hoặc video MP4, tối đa 10MB mỗi tệp");
        const name=`return-${asInt(req.params.id)}-${crypto.randomUUID()}${ext}`;await fs.writeFile(path.join(dir,name),b,{flag:"wx"});const url=`/uploads/returns/${name}`;await query("INSERT BangChungYeuCauHoanTra(YeuCauId,Url,Loai,KichThuoc) VALUES(@id,@url,@type,@size)",{id:asInt(req.params.id),url,type,size:file.size});added.push({url,type,size:file.size});}
      res.status(201).json({success:true,data:added});
    }catch(e){fail(res,e)}
  });
});

router.patch("/:id/huy", authorizeRoles("KhachHang", "Admin", "NhanVien"), async(req:AuthRequest,res)=>{
  let tx:sql.Transaction|undefined;try{const id=asInt(req.params.id),customerId=req.user!.VaiTro==="KhachHang"?await ownCustomerId(req):null,reason=String(req.body.LyDo||"").trim();if(req.user!.VaiTro!=="KhachHang"&&!reason)throw new ReturnError(400,"Nhập lý do bắt buộc để hủy yêu cầu");const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();const owned=req.user!.VaiTro==="KhachHang"?" AND MaKhachHang=@customerId":"";const head=(await requestIn(tx,{id,customerId}).query(`SELECT TrangThai FROM YeuCauHoanTra WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id${owned}`)).recordset[0];if(!head)throw new ReturnError(404,"Không tìm thấy yêu cầu");await changeStatus(tx,id,["CHO_DUYET","DA_DUYET","CHO_KHACH_GUI_HANG"],"DA_HUY",req.user!.MaTaiKhoan,reason||"Khách hủy yêu cầu");await tx.commit();tx=undefined;res.json({success:true})}catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e)}
});

export default router;
