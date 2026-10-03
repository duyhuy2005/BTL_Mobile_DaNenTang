import { Router } from "express";
import { getPool, query, queryOne, sql } from "../config/database";
import { AuthRequest, authorizeRoles } from "../middleware/auth";
import { taoThongBao } from "../services/notifications";

const router = Router();
const staff = authorizeRoles("Admin", "NhanVien");

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const fail = (res: any, error: any) => {
  const duplicate = error?.number === 2601 || error?.number === 2627;
  return res.status(duplicate ? 409 : error instanceof ApiError ? error.status : 500).json({
    success: false,
    message: duplicate ? "Mã tham chiếu, mã giao dịch hoặc vận đơn đã được sử dụng" : error.message || "Không thể xử lý vận chuyển",
  });
};

function request(tx: sql.Transaction, values: Record<string, unknown> = {}) {
  const req = new sql.Request(tx);
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === "") req.input(key, sql.NVarChar, null);
    else if (value instanceof Date) req.input(key, sql.DateTime, value);
    else if (typeof value === "number") req.input(key, Number.isInteger(value) ? sql.Int : sql.Decimal(18, 2), value);
    else req.input(key, sql.NVarChar, String(value));
  }
  return req;
}

const txQuery = (tx: sql.Transaction, text: string, values: Record<string, unknown> = {}) => request(tx, values).query(text);
const pageOf = (req: any) => ({ page: Math.max(1, Number(req.query.page) || 1), limit: Math.min(100, Math.max(1, Number(req.query.limit) || 10)) });

async function customerId(req: AuthRequest) {
  if (!req.user) return null;
  const customer = await queryOne<{ MaKhachHang: number }>("SELECT MaKhachHang FROM KhachHang WHERE MaTaiKhoan=@id", { id: req.user.MaTaiKhoan });
  return customer?.MaKhachHang ?? null;
}

router.get("/stats", staff, async (_req, res) => {
  try {
    const data = await queryOne<any>(`SELECT COUNT(*) TongSo,
      ISNULL(SUM(CASE WHEN TrangThai=N'CHO_LAY_HANG' THEN 1 ELSE 0 END),0) ChoLayHang,
      ISNULL(SUM(CASE WHEN TrangThai IN(N'DA_LAY_HANG',N'DANG_VAN_CHUYEN') THEN 1 ELSE 0 END),0) DangVanChuyen,
      ISNULL(SUM(CASE WHEN TrangThai IN(N'DANG_GIAO',N'CHO_GIAO_LAI') THEN 1 ELSE 0 END),0) DangGiao,
      ISNULL(SUM(CASE WHEN TrangThai=N'GIAO_THANH_CONG' THEN 1 ELSE 0 END),0) GiaoThanhCong,
      ISNULL(SUM(CASE WHEN TrangThai=N'GIAO_THANH_CONG' AND NgayGiaoThanhCong>=CONVERT(date,GETDATE()) AND NgayGiaoThanhCong<DATEADD(day,1,CONVERT(date,GETDATE())) THEN 1 ELSE 0 END),0) GiaoThanhCongHomNay,
      ISNULL(SUM(CASE WHEN TrangThai=N'GIAO_THAT_BAI' THEN 1 ELSE 0 END),0) GiaoThatBai,
      ISNULL(SUM(CASE WHEN TrangThai=N'DANG_HOAN_VE' THEN 1 ELSE 0 END),0) DangHoanVe FROM VanChuyen`);
    res.json({ success: true, data });
  } catch (error) { fail(res, error); }
});

router.get("/carriers", staff, async (_req, res) => {
  try { res.json({ success: true, data: await query("SELECT Id,MaDonVi,TenDonVi,SoDienThoai FROM DonViVanChuyen WHERE TrangThai=1 ORDER BY TenDonVi") }); }
  catch (error) { fail(res, error); }
});

router.get(["/eligible-orders", "/don-hang-du-dieu-kien"], staff, async (_req, res) => {
  try {
    const data = await query<any>(`SELECT hd.MaHoaDon,hd.NgayLap,hd.TenNguoiNhan,hd.SoDienThoaiNhan,hd.DiaChiGiaoHang,
      hd.PhuongThucThanhToan,hd.TrangThaiThanhToan,hd.TamTinh,hd.GiamGia,hd.PhiVanChuyen,hd.TongTien,kh.Email,
      (SELECT SUM(ct.SoLuong) FROM ChiTietHoaDon ct WHERE ct.MaHoaDon=hd.MaHoaDon) TongSoLuong,
      ISNULL(hd.TamTinh,0) TongGiaTriHang,
      CASE WHEN hd.PhuongThucThanhToan IN(N'COD',N'Tiền mặt') AND hd.TrangThaiThanhToan NOT IN(N'DA_THANH_TOAN',N'HOAN_MOT_PHAN',N'DA_HOAN_TIEN')
        THEN CASE WHEN ISNULL(hd.TongTien,hd.TamTinh)-ISNULL(paid.SoTien,0)>0 THEN ISNULL(hd.TongTien,hd.TamTinh)-ISNULL(paid.SoTien,0) ELSE 0 END ELSE 0 END TienCOD,
      CAST((SELECT ISNULL(SUM(ct.SoLuong),0)*0.25 FROM ChiTietHoaDon ct WHERE ct.MaHoaDon=hd.MaHoaDon) AS DECIMAL(10,2)) KhoiLuongDuKien,
      (SELECT ct.MaSanPham,COALESCE(ct.TenSanPhamSnapshot,sp.TenSanPham) TenSanPham,ct.SoLuong,ct.DonGia,
        COALESCE(ct.HinhAnhSnapshot,sp.HinhAnh) HinhAnh FROM ChiTietHoaDon ct LEFT JOIN SanPham sp ON sp.MaSanPham=ct.MaSanPham
        WHERE ct.MaHoaDon=hd.MaHoaDon FOR JSON PATH) SanPhamJSON
      FROM HoaDon hd LEFT JOIN KhachHang kh ON kh.MaKhachHang=hd.MaKhachHang
      OUTER APPLY(SELECT SUM(SoTien) SoTien FROM ThuTienDonHang WHERE MaHoaDon=hd.MaHoaDon) paid
      WHERE hd.TrangThai=N'DA_DONG_GOI'
      AND NULLIF(LTRIM(RTRIM(hd.TenNguoiNhan)),N'') IS NOT NULL
      AND LEN(LTRIM(RTRIM(hd.SoDienThoaiNhan))) BETWEEN 9 AND 15
      AND NULLIF(LTRIM(RTRIM(hd.DiaChiGiaoHang)),N'') IS NOT NULL
      AND EXISTS(SELECT 1 FROM ChiTietHoaDon ct WHERE ct.MaHoaDon=hd.MaHoaDon AND ct.SoLuong>0)
      AND NOT EXISTS(SELECT 1 FROM VanChuyen vc WHERE vc.HoaDonId=hd.MaHoaDon AND vc.TrangThai<>N'DA_HUY_VAN_DON') ORDER BY hd.NgayLap DESC`);
    res.json({ success: true, data: data.map((row: any) => {
      let SanPham: any[] = [];
      try { SanPham = row.SanPhamJSON ? JSON.parse(row.SanPhamJSON) : []; } catch { SanPham = []; }
      const { SanPhamJSON, ...order } = row;
      return { ...order, SanPham };
    }) });
  } catch (error) { fail(res, error); }
});

router.get("/", staff, async (req, res) => {
  try {
    const { page, limit } = pageOf(req);
    const values: Record<string, unknown> = { offset: (page - 1) * limit, limit };
    const where: string[] = ["1=1"];
    const search = String(req.query.search || "").trim();
    if (search) { where.push("(vc.MaVanDon LIKE @search OR CONVERT(varchar(20),vc.HoaDonId) LIKE @search OR vc.TenNguoiNhan LIKE @search OR vc.SoDienThoaiNhan LIKE @search)"); values.search = `%${search}%`; }
    if (req.query.status === "DANG_VAN_CHUYEN") where.push("vc.TrangThai IN(N'DA_LAY_HANG',N'DANG_VAN_CHUYEN')");
    else if (req.query.status === "DANG_GIAO") where.push("vc.TrangThai IN(N'DANG_GIAO',N'CHO_GIAO_LAI')");
    else if (req.query.status) { where.push("vc.TrangThai=@status"); values.status = req.query.status; }
    if (req.query.carrier) { where.push("dv.MaDonVi=@carrier"); values.carrier = req.query.carrier; }
    if (req.query.date) { where.push("CONVERT(date,vc.CreatedAt)=@date"); values.date = req.query.date; }
    const dateFrom = req.query.from ? String(req.query.from) : "";
    const dateTo = req.query.to ? String(req.query.to) : "";
    const validDate = (value: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const parsed = new Date(`${value}T00:00:00Z`); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value; };
    if ((dateFrom && !validDate(dateFrom)) || (dateTo && !validDate(dateTo))) throw new ApiError(400, "Khoảng ngày phải có định dạng YYYY-MM-DD hợp lệ");
    if (dateFrom && dateTo && dateFrom > dateTo) throw new ApiError(400, "Ngày bắt đầu không được sau ngày kết thúc");
    if (dateFrom) { where.push("vc.CreatedAt>=CONVERT(date,@dateFrom)"); values.dateFrom = dateFrom; }
    if (dateTo) { where.push("vc.CreatedAt<DATEADD(day,1,CONVERT(date,@dateTo))"); values.dateTo = dateTo; }
    if (req.query.payment === "COD") where.push("vc.PhuongThucThanhToan IN(N'COD',N'Tiền mặt')");
    if (req.query.payment === "ONLINE") where.push("vc.PhuongThucThanhToan NOT IN(N'COD',N'Tiền mặt')");
    const predicate = where.join(" AND ");
    const total = await queryOne<{ total: number }>(`SELECT COUNT(*) total FROM VanChuyen vc JOIN DonViVanChuyen dv ON dv.Id=vc.DonViVanChuyenId WHERE ${predicate}`, values);
    const data = await query<any>(`SELECT vc.Id,vc.HoaDonId,vc.MaVanDon,vc.TenNguoiNhan,vc.SoDienThoaiNhan,vc.TienThuHo,
      vc.NgayDuKienGiao,vc.TrangThai,vc.TrangThaiCOD,vc.CreatedAt,vc.SoLanGiao,dv.MaDonVi,dv.TenDonVi,
      hd.TrangThai TrangThaiDonHang,hd.TrangThaiThanhToan FROM VanChuyen vc JOIN DonViVanChuyen dv ON dv.Id=vc.DonViVanChuyenId JOIN HoaDon hd ON hd.MaHoaDon=vc.HoaDonId
      WHERE ${predicate} ORDER BY vc.CreatedAt DESC,vc.Id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, values);
    res.json({ success: true, data, pagination: { page, limit, total: total?.total || 0, totalPages: Math.ceil((total?.total || 0) / limit) } });
  } catch (error) { fail(res, error); }
});

router.get("/me", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const id = await customerId(req);
    if (!id) throw new ApiError(404, "Không tìm thấy hồ sơ khách hàng");
    const data = await query<any>(`SELECT vc.Id,vc.HoaDonId,vc.MaVanDon,vc.TrangThai,vc.TrangThaiCOD,vc.NgayDuKienGiao,vc.CreatedAt,dv.TenDonVi
      FROM VanChuyen vc JOIN HoaDon hd ON hd.MaHoaDon=vc.HoaDonId JOIN DonViVanChuyen dv ON dv.Id=vc.DonViVanChuyenId
      WHERE hd.MaKhachHang=@id ORDER BY vc.CreatedAt DESC`, { id });
    res.json({ success: true, data });
  } catch (error) { fail(res, error); }
});

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ApiError(400, "Mã vận đơn không hợp lệ");
    const delivery = await queryOne<any>(`SELECT vc.*,dv.MaDonVi,dv.TenDonVi,hd.MaKhachHang,hd.TamTinh,hd.GiamGia,hd.TongTien,
      hd.TrangThai TrangThaiDonHang,hd.TrangThaiThanhToan,hd.GhiChu GhiChuDonHang,kh.Email
      FROM VanChuyen vc JOIN DonViVanChuyen dv ON dv.Id=vc.DonViVanChuyenId JOIN HoaDon hd ON hd.MaHoaDon=vc.HoaDonId
      LEFT JOIN KhachHang kh ON kh.MaKhachHang=hd.MaKhachHang WHERE vc.Id=@id`, { id });
    if (!delivery) throw new ApiError(404, "Không tìm thấy vận đơn");
    if (req.user?.VaiTro === "KhachHang" && delivery.MaKhachHang !== await customerId(req)) throw new ApiError(403, "Bạn không có quyền xem vận đơn này");
    if (!req.user || !["Admin", "NhanVien", "KhachHang"].includes(req.user.VaiTro)) throw new ApiError(403, "Không có quyền truy cập");
    const products = await query<any>(`SELECT ct.MaSanPham,ct.SoLuong,ct.DonGia,
      COALESCE(ct.TenSanPhamSnapshot,sp.TenSanPham) TenSanPham,COALESCE(ct.HinhAnhSnapshot,sp.HinhAnh) HinhAnh,
      COALESCE(ct.MaSKUSnapshot,sp.MaSKU) MaSKU,COALESCE(ct.BienTheSnapshot,CASE WHEN sp.DungTich IS NOT NULL THEN CONCAT(CONVERT(varchar(30),sp.DungTich),' ',ISNULL(sp.DonVi,'')) ELSE sp.QuyCachDongGoi END) BienThe
      FROM ChiTietHoaDon ct LEFT JOIN SanPham sp ON sp.MaSanPham=ct.MaSanPham WHERE ct.MaHoaDon=@orderId`, { orderId: delivery.HoaDonId });
    const timeline = await query<any>(`SELECT ls.Id,ls.TrangThaiCu,ls.TrangThaiMoi,ls.ViTri,ls.GhiChu,ls.LyDoThatBai,
      COALESCE(ls.ThoiDiemSuKien,ls.CreatedAt) ThoiDiemSuKien,ls.CreatedAt ThoiDiemNhan,COALESCE(ls.NguonCapNhat,N'CHUA_GHI_NHAN') NguonCapNhat,
      COALESCE(tk.HoTen,tk.TenDangNhap,N'Hệ thống') NguoiCapNhat FROM LichSuVanChuyen ls LEFT JOIN TaiKhoan tk ON tk.MaTaiKhoan=ls.NguoiCapNhatId
      WHERE ls.VanChuyenId=@id ORDER BY ls.CreatedAt,ls.Id`, { id });
    const inspection = await query<any>(`SELECT ct.*,kt.GhiChu GhiChuKiemTra,kt.CreatedAt NgayKiemTra
      FROM KiemTraHangHoan kt JOIN ChiTietKiemTraHangHoan ct ON ct.KiemTraHangHoanId=kt.Id WHERE kt.VanChuyenId=@id`, { id });
    const safeDelivery = req.user.VaiTro === "KhachHang" ? { ...delivery, GhiChuDonHang: undefined } : delivery;
    const finance = req.user.VaiTro === "KhachHang" ? null : {
      collections: await query<any>("SELECT Id,NguonThu,SoTien,PhuongThuc,MaThamChieu,ChungTuUrl,ThoiDiemThu,GhiChu FROM ThuTienDonHang WHERE VanChuyenId=@id ORDER BY ThoiDiemThu,Id", { id }),
      settlements: await query<any>("SELECT Id,TienShopNhan,PhiKhauTru,DieuChinh,LyDoDieuChinh,MaGiaoDich,ChungTuUrl,ThoiDiemNhan FROM DoiSoatCOD WHERE VanChuyenId=@id ORDER BY ThoiDiemNhan,Id", { id }),
    };
    res.json({ success: true, data: { ...safeDelivery, SanPham: products, Timeline: timeline, KiemTraHangHoan: inspection, ...(finance ? { TienTe: finance } : {}) } });
  } catch (error) { fail(res, error); }
});

router.post("/", staff, async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try {
    const orderId = Number(req.body.HoaDonId); const carrierId = Number(req.body.DonViVanChuyenId);
    const service = String(req.body.LoaiDichVu || "").trim(); const weight = Number(req.body.KhoiLuong); const fee = Number(req.body.PhiVanChuyen);
    if (!Number.isInteger(orderId) || !Number.isInteger(carrierId)) throw new ApiError(400, "Đơn hàng và đơn vị vận chuyển là bắt buộc");
    if (!service) throw new ApiError(400, "Vui lòng chọn loại dịch vụ");
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(fee) || fee < 0) throw new ApiError(400, "Khối lượng hoặc phí vận chuyển không hợp lệ");
    if (!req.body.NgayDuKienGiao) throw new ApiError(400, "Ngày dự kiến giao là bắt buộc");
    const pool = await getPool(); tx = new sql.Transaction(pool); await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const order = (await txQuery(tx, `SELECT hd.*,kh.Email FROM HoaDon hd WITH(UPDLOCK,HOLDLOCK) LEFT JOIN KhachHang kh ON kh.MaKhachHang=hd.MaKhachHang WHERE hd.MaHoaDon=@orderId`, { orderId })).recordset[0];
    if (!order) throw new ApiError(404, "Không tìm thấy đơn hàng");
    if (order.TrangThai !== "DA_DONG_GOI") throw new ApiError(409, "Chỉ đơn đã đóng gói mới được tạo vận đơn");
    if (!order.TenNguoiNhan || !order.SoDienThoaiNhan || !order.DiaChiGiaoHang) throw new ApiError(409, "Đơn hàng thiếu snapshot người nhận");
    if (!/^\+?[0-9][0-9 .-]{7,18}$/.test(String(order.SoDienThoaiNhan))) throw new ApiError(409, "Số điện thoại người nhận không hợp lệ");
    const hasItems = (await txQuery(tx, "SELECT TOP 1 1 Found FROM ChiTietHoaDon WHERE MaHoaDon=@orderId AND SoLuong>0", { orderId })).recordset.length > 0;
    if (!hasItems) throw new ApiError(409, "Đơn hàng không có sản phẩm để giao");
    const carrier = (await txQuery(tx, "SELECT * FROM DonViVanChuyen WHERE Id=@carrierId AND TrangThai=1", { carrierId })).recordset[0];
    if (!carrier) throw new ApiError(404, "Đơn vị vận chuyển không hoạt động");
    const today = new Date(); const prefix = `VC-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-`;
    const sequence = (await txQuery(tx, "SELECT ISNULL(MAX(TRY_CONVERT(int,RIGHT(MaVanDon,4))),0)+1 NextNo FROM VanChuyen WITH(TABLOCKX) WHERE MaVanDon LIKE @prefix", { prefix: `${prefix}%` })).recordset[0].NextNo;
    if (sequence > 9999) throw new ApiError(409, "Đã vượt giới hạn mã vận đơn trong ngày");
    const tracking = `${prefix}${String(sequence).padStart(4, "0")}`; const method = String(order.PhuongThucThanhToan || "COD");
    const heldShipVoucher = (await txQuery(tx, `SELECT TOP 1 hv.Id HoaDonVoucherId,hv.VoucherId,v.GiaTri,v.GiamToiDa
      FROM HoaDonVoucher hv JOIN Voucher v WITH(UPDLOCK,HOLDLOCK) ON v.Id=hv.VoucherId
      JOIN LichSuSuDungVoucher ls WITH(UPDLOCK,HOLDLOCK) ON ls.VoucherId=hv.VoucherId AND ls.MaHoaDon=hv.MaHoaDon
      WHERE hv.MaHoaDon=@orderId AND hv.LoaiApDung='PHI_SHIP' AND ls.TrangThai='DA_GIU_LUOT'`, { orderId })).recordset[0];
    // Shipping voucher terms were reserved at checkout; apply against the actual carrier fee now.
    const shippingDiscount = heldShipVoucher ? Math.min(fee, Math.max(0, Number(heldShipVoucher.GiaTri)), heldShipVoucher.GiamToiDa == null ? fee : Math.max(0, Number(heldShipVoucher.GiamToiDa))) : 0;
    const total = Math.max(0, Number(order.TamTinh || 0) - Number(order.GiamGia || 0) + fee - shippingDiscount);
    const collectedAlready=Number((await txQuery(tx,"SELECT ISNULL(SUM(SoTien),0) Total FROM ThuTienDonHang WHERE MaHoaDon=@orderId",{orderId})).recordset[0].Total);
    const cod = ["COD", "Tiền mặt"].includes(method) ? Math.max(0,total-collectedAlready) : 0;
    const created = await txQuery(tx, `INSERT VanChuyen(HoaDonId,MaVanDon,DonViVanChuyenId,LoaiDichVu,TenNguoiNhan,SoDienThoaiNhan,EmailNguoiNhan,DiaChiGiaoHang,GhiChuGiaoHang,KhoiLuong,KichThuoc,PhiVanChuyen,TienThuHo,PhuongThucThanhToan,TrangThai,TrangThaiCOD,NgayDuKienGiao,CreatedBy)
      OUTPUT INSERTED.Id,INSERTED.MaVanDon VALUES(@orderId,@tracking,@carrierId,@service,@recipient,@phone,@email,@address,@note,@weight,@dimensions,@fee,@cod,@method,N'CHO_LAY_HANG',@codStatus,@expected,@userId)`, {
      orderId, tracking, carrierId, service, recipient: order.TenNguoiNhan, phone: order.SoDienThoaiNhan, email: order.Email, address: order.DiaChiGiaoHang,
      note: req.body.GhiChuGiaoHang || order.GhiChu || null, weight, dimensions: req.body.KichThuoc || null, fee, cod, method,
      codStatus: cod > 0 ? "CHUA_THU_HO" : "KHONG_COD", expected: req.body.NgayDuKienGiao, userId: req.user!.MaTaiKhoan,
    });
    const shipment = created.recordset[0];
    await txQuery(tx, "INSERT LichSuVanChuyen(VanChuyenId,TrangThaiMoi,ViTri,GhiChu,NguoiCapNhatId) VALUES(@id,N'CHO_LAY_HANG',N'BeautyStore',N'Tạo vận đơn trên hệ thống',@userId)", { id: shipment.Id, userId: req.user!.MaTaiKhoan });
    await txQuery(tx, "UPDATE HoaDon SET DonViVanChuyen=@carrier,MaVanDon=@tracking,TrangThaiVanChuyen=N'CHO_LAY_HANG',PhiVanChuyen=@fee,GiamGiaPhiShipVoucher=@shippingDiscount,TongTien=@total,NgayCapNhat=GETDATE() WHERE MaHoaDon=@orderId", { carrier: carrier.TenDonVi, tracking, fee, shippingDiscount, total, orderId });
    if (heldShipVoucher) {
      await txQuery(tx, "UPDATE HoaDonVoucher SET SoTienGiam=@shippingDiscount WHERE Id=@voucherOrderId", { voucherOrderId: heldShipVoucher.HoaDonVoucherId, shippingDiscount });
      await txQuery(tx, "UPDATE LichSuSuDungVoucher SET SoTienGiam=@shippingDiscount,NgayCapNhat=SYSDATETIME() WHERE VoucherId=@voucherId AND MaHoaDon=@orderId AND TrangThai='DA_GIU_LUOT'", { voucherId: heldShipVoucher.VoucherId, orderId, shippingDiscount });
    }
    await txQuery(tx, "INSERT LichSuTrangThaiHoaDon(MaHoaDon,TrangThaiCu,TrangThaiMoi,NguoiThayDoi,GhiChu) VALUES(@orderId,@status,@status,@userId,@note)", { orderId, status: order.TrangThai, userId: req.user!.MaTaiKhoan, note: `Tạo vận đơn ${tracking}` });
    await taoThongBao(tx,{customerId:Number(order.MaKhachHang),type:"VAN_CHUYEN",title:"Đơn hàng đã có vận đơn",body:`Đơn DH${String(orderId).padStart(8,"0")} đang chờ đơn vị vận chuyển lấy hàng.`,referenceType:"DON_HANG",referenceId:orderId,eventKey:`shipping:${shipment.Id}:CHO_LAY_HANG`});
    await tx.commit(); tx = undefined;
    res.status(201).json({ success: true, message: "Tạo vận đơn thành công", data: shipment });
  } catch (error) { if (tx) try { await tx.rollback(); } catch { /* keep original */ } fail(res, error); }
});

type ShippingAction = "cancel" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "reschedule" | "retry_delivery" | "return_to_shop" | "returned" | "cod_collected" | "cod_pending" | "cod_reconciled" | "cod_transferred";

// Manual collection/reconciliation is an explicit, auditable cash event; it does
// not imply a real bank/carrier integration. Admin confirms money actually received.
router.post("/orders/:orderId/receipts", staff, async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try {
    const orderId = Number(req.params.orderId), amount = Number(req.body.SoTien);
    const key = String(req.body.IdempotencyKey || "").trim(), reference = String(req.body.MaThamChieu || "").trim();
    const method = String(req.body.PhuongThuc || "").trim(), evidence = String(req.body.ChungTuUrl || "").trim();
    const eventAt = req.body.ThoiDiemThu ? new Date(req.body.ThoiDiemThu) : new Date();
    if (!Number.isInteger(orderId) || !Number.isFinite(amount) || amount <= 0 || !key || !reference || !["TIEN_MAT","CHUYEN_KHOAN"].includes(method) || (!evidence && method === "CHUYEN_KHOAN")) return res.status(400).json({success:false,message:"Cần số tiền dương, phương thức hợp lệ, mã tham chiếu, khóa chống gửi lặp và chứng từ chuyển khoản"});
    if (key.length > 100 || reference.length > 120 || !Number.isFinite(eventAt.getTime()) || eventAt.getTime() > Date.now()+300000) return res.status(400).json({success:false,message:"Thông tin giao dịch hoặc thời điểm không hợp lệ"});
    if (req.user?.VaiTro !== "Admin") return res.status(403).json({success:false,message:"Chỉ Admin được xác nhận tiền đã thực nhận tại cửa hàng"});
    const pool=await getPool(); tx=new sql.Transaction(pool); await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const order=(await txQuery(tx,"SELECT * FROM HoaDon WITH(UPDLOCK,HOLDLOCK) WHERE MaHoaDon=@id",{id:orderId})).recordset[0];
    if(!order) throw new ApiError(404,"Không tìm thấy đơn hàng"); if(order.TrangThai==="DA_HUY"||order.TrangThai==="GIAO_THAT_BAI") throw new ApiError(409,"Không thể ghi nhận thanh toán cho đơn đã hủy hoặc giao thất bại");
    const old=(await txQuery(tx,"SELECT Id FROM ThuTienDonHang WHERE MaHoaDon=@id AND IdempotencyKey=@key",{id:orderId,key})).recordset[0];
    if(old){await tx.rollback();tx=undefined;return res.json({success:true,message:"Giao dịch này đã được ghi nhận trước đó",data:{Id:old.Id,Idempotent:true}})}
    const oldReference=(await txQuery(tx,"SELECT Id FROM ThuTienDonHang WHERE MaHoaDon=@id AND NguonThu='SHOP_TRUC_TIEP' AND MaThamChieu=@reference",{id:orderId,reference})).recordset[0];
    if(oldReference) throw new ApiError(409,"Mã tham chiếu này đã được ghi nhận cho đơn hàng");
    const paidRow=(await txQuery(tx,"SELECT ISNULL(SUM(SoTien),0) Amount FROM ThuTienDonHang WHERE MaHoaDon=@id",{id:orderId})).recordset[0];
    const paid=Number(paidRow.Amount)||(["DA_THANH_TOAN","HOAN_MOT_PHAN","DA_HOAN_TIEN"].includes(String(order.TrangThaiThanhToan))?Number(order.TongTien):0);
    const refund=(await txQuery(tx,"SELECT ISNULL(SUM(f.SoTien),0) Amount FROM GiaoDichHoanTienTra f JOIN YeuCauHoanTra r ON r.Id=f.YeuCauId WHERE r.MaHoaDon=@id AND f.TrangThai='DA_HOAN_TIEN'",{id:orderId})).recordset[0].Amount;
    const outstanding=Math.max(0,Number(order.TongTien)-Number(paid)-Number(refund)); if(amount>outstanding) throw new ApiError(409,"Số tiền thu vượt số tiền đơn còn phải thu");
    const vc=(await txQuery(tx,"SELECT TOP 1 Id FROM VanChuyen WHERE HoaDonId=@id AND TrangThai<>N'DA_HUY_VAN_DON' ORDER BY Id DESC",{id:orderId})).recordset[0];
    const inserted=await txQuery(tx,`INSERT ThuTienDonHang(MaHoaDon,VanChuyenId,NguonThu,SoTien,PhuongThuc,MaThamChieu,ChungTuUrl,GhiChu,ThoiDiemThu,NguoiXacNhan,IdempotencyKey)
      OUTPUT INSERTED.Id VALUES(@id,@shipmentId,'SHOP_TRUC_TIEP',@amount,@method,@reference,@evidence,@note,@eventAt,@userId,@key)`,{id:orderId,shipmentId:vc?.Id||null,amount,method,reference,evidence:evidence||null,note:String(req.body.GhiChu||"").trim()||null,eventAt,userId:req.user!.MaTaiKhoan,key});
    const totalPaid=Number(paid)+amount, totalRefund=Number(refund), status=totalRefund>0?(totalRefund>=totalPaid?"DA_HOAN_TIEN":"HOAN_MOT_PHAN"):(totalPaid>=Number(order.TongTien)?"DA_THANH_TOAN":"THANH_TOAN_MOT_PHAN");
    await txQuery(tx,"UPDATE HoaDon SET TrangThaiThanhToan=@status,NgayThanhToan=CASE WHEN @status=N'DA_THANH_TOAN' AND NgayThanhToan IS NULL THEN @eventAt ELSE NgayThanhToan END,NgayCapNhat=GETDATE() WHERE MaHoaDon=@id",{status,eventAt,id:orderId});
    if(vc) await txQuery(tx,"UPDATE VanChuyen SET TrangThaiCOD=N'SHOP_THU_TRUC_TIEP',UpdatedAt=GETDATE() WHERE Id=@id AND TrangThaiCOD NOT IN(N'DA_THU_HO',N'DA_CHUYEN_TIEN')",{id:vc.Id});
    await tx.commit();tx=undefined;res.status(201).json({success:true,message:"Đã ghi nhận khoản cửa hàng trực tiếp thực nhận",data:{Id:inserted.recordset[0].Id,TrangThaiThanhToan:status}});
  }catch(error){if(tx)try{await tx.rollback()}catch{}fail(res,error)}
});

router.post("/:id/settlements", staff, async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try {
    if(req.user?.VaiTro!=="Admin") return res.status(403).json({success:false,message:"Chỉ Admin được xác nhận tiền đối soát thực vào tài khoản"});
    const id=Number(req.params.id), received=Number(req.body.TienShopNhan), fee=Number(req.body.PhiKhauTru||0), adjustment=Number(req.body.DieuChinh||0);
    const key=String(req.body.IdempotencyKey||"").trim(), reference=String(req.body.MaGiaoDich||"").trim(), reason=String(req.body.LyDoDieuChinh||"").trim(), evidence=String(req.body.ChungTuUrl||"").trim();
    const eventAt=req.body.ThoiDiemNhan?new Date(req.body.ThoiDiemNhan):new Date();
    if(!Number.isInteger(id)||!Number.isFinite(received)||received<0||!Number.isFinite(fee)||fee<0||!Number.isFinite(adjustment)||!key||!reference||received+fee<=0||(!evidence&&!reference)||((adjustment!==0)&&!reason)) return res.status(400).json({success:false,message:"Nhập tiền thực nhận, phí/điều chỉnh hợp lệ, mã giao dịch và lý do điều chỉnh nếu có"});
    if(!Number.isFinite(eventAt.getTime())||eventAt.getTime()>Date.now()+300000) return res.status(400).json({success:false,message:"Thời điểm nhận tiền không hợp lệ"});
    const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const shipment=(await txQuery(tx,"SELECT * FROM VanChuyen WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id",{id})).recordset[0];if(!shipment)throw new ApiError(404,"Không tìm thấy vận đơn");
    const duplicate=(await txQuery(tx,"SELECT Id FROM DoiSoatCOD WHERE VanChuyenId=@id AND IdempotencyKey=@key",{id,key})).recordset[0];if(duplicate){await tx.rollback();tx=undefined;return res.json({success:true,message:"Đợt đối soát này đã được ghi nhận trước đó",data:{Id:duplicate.Id,Idempotent:true}})}
    const collected=(await txQuery(tx,"SELECT ISNULL(SUM(SoTien),0) Total FROM ThuTienDonHang WHERE VanChuyenId=@id AND NguonThu='VAN_CHUYEN'",{id})).recordset[0].Total;
    const accounted=(await txQuery(tx,"SELECT ISNULL(SUM(TienShopNhan+PhiKhauTru+DieuChinh),0) Total FROM DoiSoatCOD WHERE VanChuyenId=@id",{id})).recordset[0].Total;
    if(Number(collected)<=0)throw new ApiError(409,"Chưa có khoản COD nào được đơn vị vận chuyển xác nhận đã thu");
    if(received+fee+adjustment<=0||Number(accounted)+received+fee+adjustment>Number(collected))throw new ApiError(409,"Đợt đối soát vượt số COD đơn vị vận chuyển còn phải quyết toán");
    const inserted=await txQuery(tx,`INSERT DoiSoatCOD(VanChuyenId,TienShopNhan,PhiKhauTru,DieuChinh,LyDoDieuChinh,MaGiaoDich,ChungTuUrl,ThoiDiemNhan,NguoiXacNhan,IdempotencyKey)
      OUTPUT INSERTED.Id VALUES(@id,@received,@fee,@adjustment,@reason,@reference,@evidence,@eventAt,@userId,@key)`,{id,received,fee,adjustment,reason:reason||null,reference,evidence:evidence||null,eventAt,userId:req.user!.MaTaiKhoan,key});
    const nowAccounted=Number(accounted)+received+fee+adjustment, status=nowAccounted>=Number(collected)?"DA_CHUYEN_TIEN":"NHAN_MOT_PHAN";
    await txQuery(tx,"UPDATE VanChuyen SET TrangThaiCOD=@status,UpdatedAt=GETDATE() WHERE Id=@id",{status,id});
    await tx.commit();tx=undefined;res.status(201).json({success:true,message:"Đã ghi nhận khoản tiền đối soát thực nhận; không phát sinh doanh thu mới",data:{Id:inserted.recordset[0].Id,TrangThaiCOD:status,CODConDoiSoat:Number(collected)-nowAccounted}});
  }catch(error){if(tx)try{await tx.rollback()}catch{}fail(res,error)}
});

router.post("/:id/actions", staff, async (req: AuthRequest, res) => {
  let tx: sql.Transaction | undefined;
  try {
    const id = Number(req.params.id); const action = String(req.body.action || "") as ShippingAction;
    const allowed: ShippingAction[] = ["cancel", "picked_up", "in_transit", "out_for_delivery", "delivered", "failed", "reschedule", "retry_delivery", "return_to_shop", "returned", "cod_collected", "cod_pending", "cod_reconciled", "cod_transferred"];
    if (!Number.isInteger(id) || !allowed.includes(action)) throw new ApiError(400, "Thao tác vận chuyển không hợp lệ");
    const reason = String(req.body.reason || "").trim(); const note = String(req.body.note || "").trim();
    if (["cod_reconciled", "cod_transferred"].includes(action) && req.user?.VaiTro !== "Admin") throw new ApiError(403, "Chỉ Admin được xác nhận đối soát hoặc chuyển tiền COD");
    const eventAt = req.body.eventAt ? new Date(req.body.eventAt) : new Date();
    if (!Number.isFinite(eventAt.getTime()) || eventAt.getTime() > Date.now() + 5 * 60 * 1000) throw new ApiError(400, "Thời điểm sự kiện không hợp lệ hoặc nằm trong tương lai");
    const pool = await getPool(); tx = new sql.Transaction(pool); await tx.begin();
    const shipment = (await txQuery(tx, `SELECT vc.*,hd.MaKhachHang,hd.TrangThai TrangThaiDonHang,hd.TrangThaiThanhToan,hd.PhuongThucThanhToan
      FROM VanChuyen vc WITH(UPDLOCK,HOLDLOCK) JOIN HoaDon hd WITH(UPDLOCK,HOLDLOCK) ON hd.MaHoaDon=vc.HoaDonId WHERE vc.Id=@id`, { id })).recordset[0];
    if (!shipment) throw new ApiError(404, "Không tìm thấy vận đơn");
    if (action === "cod_collected") {
      const key=String(req.body.IdempotencyKey||"").trim();
      if(key){const prior=(await txQuery(tx,"SELECT Id FROM ThuTienDonHang WHERE MaHoaDon=@orderId AND IdempotencyKey=@key",{orderId:shipment.HoaDonId,key})).recordset[0];if(prior){await tx.rollback();tx=undefined;return res.json({success:true,message:"Khoản thu COD này đã được ghi nhận trước đó",data:{Id:prior.Id,Idempotent:true}})}}
    }
    let next = shipment.TrangThai; let orderStatus = shipment.TrangThaiDonHang; let orderShipping = shipment.TrangThai;
    let paymentStatus = shipment.TrangThaiThanhToan; let codStatus = shipment.TrangThaiCOD; let historyNote = note;

    if (action === "cancel") {
      if (shipment.TrangThai === "DA_HUY_VAN_DON") { await tx.rollback(); tx = undefined; return res.json({ success: true, message: "Vận đơn đã được hủy trước đó" }); }
      if (shipment.TrangThai !== "CHO_LAY_HANG") throw new ApiError(409, "Chỉ có thể hủy vận đơn trước khi lấy hàng");
      if (!reason) throw new ApiError(400, "Vui lòng nhập lý do hủy vận đơn");
      next = "DA_HUY_VAN_DON"; orderShipping = "DA_HUY_VAN_DON"; historyNote = reason;
    } else if (action === "picked_up") {
      if (shipment.TrangThai !== "CHO_LAY_HANG") {
        const existed = await txQuery(tx, "SELECT TOP 1 Id FROM LichSuVanChuyen WHERE VanChuyenId=@id AND TrangThaiMoi=N'DA_LAY_HANG'", { id });
        if (existed.recordset.length) { await tx.rollback(); tx = undefined; return res.json({ success: true, message: "Đơn đã xuất kho và được lấy hàng trước đó" }); }
        throw new ApiError(409, "Vận đơn không ở trạng thái chờ lấy hàng");
      }
      const holds = await txQuery(tx, `SELECT gh.MaGiuHang,gh.MaLo,gh.SoLuong,l.MaSanPham,l.SoLuongTon,l.SoLuongDaGiu,l.HanSuDung
        FROM GiuHangDonHang gh JOIN LoSanPham l WITH(UPDLOCK,ROWLOCK) ON l.MaLo=gh.MaLo WHERE gh.MaHoaDon=@orderId AND gh.TrangThai=N'Đang giữ'
        ORDER BY CASE WHEN l.HanSuDung IS NULL THEN 1 ELSE 0 END,l.HanSuDung,l.MaLo`, { orderId: shipment.HoaDonId });
      if (!holds.recordset.length) throw new ApiError(409, "Đơn hàng không còn lượng hàng đang giữ để xuất kho");
      for (const hold of holds.recordset) {
        if (hold.HanSuDung && new Date(hold.HanSuDung) < new Date(new Date().toDateString())) throw new ApiError(409, "Không thể xuất lô đã hết hạn");
        const lot = await txQuery(tx, "UPDATE LoSanPham SET SoLuongTon=SoLuongTon-@qty,SoLuongDaGiu=SoLuongDaGiu-@qty WHERE MaLo=@lotId AND SoLuongTon>=@qty AND SoLuongDaGiu>=@qty", { lotId: hold.MaLo, qty: hold.SoLuong });
        if (!lot.rowsAffected[0]) throw new ApiError(409, "Tồn kho lô không đủ để xuất");
        const product = await txQuery(tx, "UPDATE SanPham SET SoLuong=SoLuong-@qty,UpdatedAt=GETDATE() WHERE MaSanPham=@productId AND SoLuong>=@qty", { productId: hold.MaSanPham, qty: hold.SoLuong });
        if (!product.rowsAffected[0]) throw new ApiError(409, "Tồn kho sản phẩm không đủ để xuất");
        await txQuery(tx, "UPDATE GiuHangDonHang SET TrangThai=N'Đã xuất' WHERE MaGiuHang=@holdId AND TrangThai=N'Đang giữ'", { holdId: hold.MaGiuHang });
        await txQuery(tx, "INSERT BienDongKho(MaSanPham,MaLo,MaHoaDon,MaTaiKhoan,Loai,SoLuong,TonTruoc,TonSau,GhiChu) VALUES(@productId,@lotId,@orderId,@userId,N'Xuất',@delta,@before,@after,N'Đơn vị vận chuyển đã lấy hàng')", { productId: hold.MaSanPham, lotId: hold.MaLo, orderId: shipment.HoaDonId, userId: req.user!.MaTaiKhoan, delta: -hold.SoLuong, before: hold.SoLuongTon, after: hold.SoLuongTon - hold.SoLuong });
      }
      next = "DA_LAY_HANG"; orderStatus = "DANG_GIAO"; orderShipping = "DA_LAY_HANG"; historyNote = note || "Đơn vị vận chuyển đã lấy hàng và xuất kho theo FEFO";
    } else if (action === "in_transit") {
      if (shipment.TrangThai !== "DA_LAY_HANG") throw new ApiError(409, "Chỉ cập nhật đang vận chuyển sau khi đã lấy hàng");
      next = "DANG_VAN_CHUYEN"; orderShipping = "DANG_VAN_CHUYEN";
    } else if (action === "out_for_delivery") {
      if (shipment.TrangThai !== "DANG_VAN_CHUYEN") throw new ApiError(409, "Chỉ cập nhật đang giao từ trạng thái đang vận chuyển");
      next = "DANG_GIAO"; orderShipping = "DANG_GIAO";
    } else if (action === "delivered") {
      if (shipment.TrangThai === "GIAO_THANH_CONG") { await tx.rollback(); tx = undefined; return res.json({ success: true, message: "Vận đơn đã giao thành công trước đó" }); }
      if (shipment.TrangThai !== "DANG_GIAO") throw new ApiError(409, "Vận đơn chưa ở trạng thái đang giao");
      next = "GIAO_THANH_CONG"; orderStatus = "DA_GIAO"; orderShipping = "GIAO_THANH_CONG"; historyNote = note || "Giao hàng thành công";
    } else if (action === "failed") {
      if (shipment.TrangThai !== "DANG_GIAO") throw new ApiError(409, "Chỉ ghi nhận thất bại khi đang giao");
      if (!reason) throw new ApiError(400, "Vui lòng chọn lý do giao thất bại");
      if (Number(shipment.SoLanGiao) >= 3) throw new ApiError(409, "Vận đơn đã đạt tối đa ba lần giao");
      next = "GIAO_THAT_BAI"; orderStatus = "GIAO_THAT_BAI"; orderShipping = "GIAO_THAT_BAI";
      codStatus = Number(shipment.TienThuHo) > 0 ? "THU_HO_THAT_BAI" : shipment.TrangThaiCOD; historyNote = note || reason;
    } else if (action === "reschedule") {
      if (shipment.TrangThai !== "GIAO_THAT_BAI") throw new ApiError(409, "Chỉ lên lịch giao lại cho vận đơn thất bại");
      if (Number(shipment.SoLanGiao) >= 3) throw new ApiError(409, "Không thể giao lại quá ba lần");
      if (!req.body.expectedDate) throw new ApiError(400, "Vui lòng chọn ngày dự kiến giao lại");
      next = "CHO_GIAO_LAI"; orderShipping = "CHO_GIAO_LAI";
      await txQuery(tx, "UPDATE VanChuyen SET NgayDuKienGiao=@expected WHERE Id=@id", { expected: req.body.expectedDate, id });
    } else if (action === "retry_delivery") {
      if (shipment.TrangThai !== "CHO_GIAO_LAI") throw new ApiError(409, "Vận đơn chưa được lên lịch giao lại");
      next = "DANG_GIAO"; orderStatus = "DANG_GIAO"; orderShipping = "DANG_GIAO"; codStatus = Number(shipment.TienThuHo) > 0 ? "CHUA_THU_HO" : shipment.TrangThaiCOD;
    } else if (action === "return_to_shop") {
      if (shipment.TrangThai !== "GIAO_THAT_BAI") throw new ApiError(409, "Chỉ chuyển hoàn vận đơn giao thất bại");
      next = "DANG_HOAN_VE"; orderStatus = "DANG_HOAN_HANG"; orderShipping = "DANG_HOAN_VE";
    } else if (action === "returned") {
      if (shipment.TrangThai !== "DANG_HOAN_VE") throw new ApiError(409, "Vận đơn chưa ở trạng thái đang hoàn về");
      if (!Array.isArray(req.body.items) || !req.body.items.length) throw new ApiError(400, "Vui lòng kiểm tra từng sản phẩm hoàn về");
      const existingInspection = await txQuery(tx, "SELECT Id FROM KiemTraHangHoan WHERE VanChuyenId=@id", { id });
      if (existingInspection.recordset.length) { await tx.rollback(); tx = undefined; return res.json({ success: true, message: "Hàng hoàn đã được kiểm tra trước đó" }); }
      const ordered = await txQuery(tx, "SELECT MaSanPham,SoLuong FROM ChiTietHoaDon WHERE MaHoaDon=@orderId", { orderId: shipment.HoaDonId });
      const input = new Map<number, any>(req.body.items.map((item: any) => [Number(item.MaSanPham), item]));
      if (ordered.recordset.some((item: any) => !input.has(Number(item.MaSanPham)))) throw new ApiError(400, "Cần khai báo tình trạng của tất cả sản phẩm trong kiện");
      const inspection = await txQuery(tx, "INSERT KiemTraHangHoan(VanChuyenId,NguoiKiemTraId,GhiChu) OUTPUT INSERTED.Id VALUES(@id,@userId,@note)", { id, userId: req.user!.MaTaiKhoan, note: note || null });
      for (const orderItem of ordered.recordset) {
        const item = input.get(Number(orderItem.MaSanPham)); const sellable = Number(item.SoLuongNhapLai || 0); const damaged = Number(item.SoLuongHuHong || 0); const received = sellable + damaged;
        if (![sellable, damaged].every(Number.isInteger) || sellable < 0 || damaged < 0 || received > Number(orderItem.SoLuong)) throw new ApiError(400, "Số lượng kiểm tra hàng hoàn không hợp lệ");
        if (!String(item.TinhTrang || "").trim()) throw new ApiError(400, "Vui lòng chọn tình trạng hàng hoàn");
        await txQuery(tx, "INSERT ChiTietKiemTraHangHoan(KiemTraHangHoanId,MaSanPham,SoLuongNhan,SoLuongNhapLai,SoLuongHuHong,TinhTrang,GhiChu) VALUES(@inspectionId,@productId,@received,@sellable,@damaged,@condition,@itemNote)", { inspectionId: inspection.recordset[0].Id, productId: orderItem.MaSanPham, received, sellable, damaged, condition: item.TinhTrang, itemNote: item.GhiChu || null });
        if (sellable > 0) {
          const lots = await txQuery(tx, `SELECT gh.MaLo,l.SoLuongTon,l.HanSuDung,gh.SoLuong FROM GiuHangDonHang gh JOIN LoSanPham l WITH(UPDLOCK,ROWLOCK) ON l.MaLo=gh.MaLo
            WHERE gh.MaHoaDon=@orderId AND l.MaSanPham=@productId AND gh.TrangThai=N'Đã xuất' AND (l.HanSuDung IS NULL OR l.HanSuDung>=CONVERT(date,GETDATE())) ORDER BY CASE WHEN l.HanSuDung IS NULL THEN 1 ELSE 0 END,l.HanSuDung,l.MaLo`, { orderId: shipment.HoaDonId, productId: orderItem.MaSanPham });
          let remaining = sellable;
          for (const lot of lots.recordset) {
            if (!remaining) break; const qty = Math.min(remaining, Number(lot.SoLuong));
            await txQuery(tx, "UPDATE LoSanPham SET SoLuongTon=SoLuongTon+@qty WHERE MaLo=@lotId", { qty, lotId: lot.MaLo });
            await txQuery(tx, "INSERT BienDongKho(MaSanPham,MaLo,MaHoaDon,MaTaiKhoan,Loai,SoLuong,TonTruoc,TonSau,GhiChu) VALUES(@productId,@lotId,@orderId,@userId,N'Hoàn kho',@qty,@before,@after,N'Hàng hoàn đủ điều kiện bán')", { productId: orderItem.MaSanPham, lotId: lot.MaLo, orderId: shipment.HoaDonId, userId: req.user!.MaTaiKhoan, qty, before: lot.SoLuongTon, after: Number(lot.SoLuongTon) + qty });
            remaining -= qty;
          }
          if (remaining) throw new ApiError(409, "Không có lô còn hạn phù hợp để nhập lại hàng hoàn");
          await txQuery(tx, "UPDATE SanPham SET SoLuong=SoLuong+@qty,UpdatedAt=GETDATE() WHERE MaSanPham=@productId", { qty: sellable, productId: orderItem.MaSanPham });
        }
        if (damaged > 0) await txQuery(tx, "INSERT BienDongKho(MaSanPham,MaHoaDon,MaTaiKhoan,Loai,SoLuong,TonTruoc,TonSau,GhiChu) SELECT @productId,@orderId,@userId,N'Hàng hoàn lỗi',0,ISNULL(SoLuong,0),ISNULL(SoLuong,0),@note FROM SanPham WHERE MaSanPham=@productId", { productId: orderItem.MaSanPham, orderId: shipment.HoaDonId, userId: req.user!.MaTaiKhoan, note: `${damaged} sản phẩm: ${item.TinhTrang}` });
      }
      next = "DA_HOAN_VE"; orderStatus = "DA_HOAN_HANG"; orderShipping = "DA_HOAN_VE"; historyNote = note || "Đã kiểm tra hàng hoàn";
      if (paymentStatus === "DA_THANH_TOAN") paymentStatus = "CHO_HOAN_TIEN";
    } else if (action === "cod_collected") {
      if (shipment.TrangThai !== "GIAO_THANH_CONG") throw new ApiError(409, "Chỉ ghi nhận thu COD sau khi giao thành công");
      if (!["COD", "Tiền mặt"].includes(String(shipment.PhuongThucThanhToan)) || Number(shipment.TienThuHo) <= 0) throw new ApiError(409, "Vận đơn này không có khoản COD cần thu");
      const amount=Number(req.body.SoTien),key=String(req.body.IdempotencyKey||"").trim(),reference=String(req.body.MaThamChieu||"").trim(),method=String(req.body.PhuongThuc||"").trim(),evidence=String(req.body.ChungTuUrl||"").trim();
      if(!Number.isFinite(amount)||amount<=0||!key||!reference||!["TIEN_MAT","CHUYEN_KHOAN"].includes(method)) throw new ApiError(400,"Cần số tiền COD thực thu, phương thức, mã tham chiếu và khóa chống gửi lặp");
      const eventAt=req.body.ThoiDiemThu?new Date(req.body.ThoiDiemThu):new Date();if(!Number.isFinite(eventAt.getTime())||eventAt.getTime()>Date.now()+300000)throw new ApiError(400,"Thời điểm thu COD không hợp lệ");
      const old=(await txQuery(tx,"SELECT Id FROM ThuTienDonHang WHERE MaHoaDon=@orderId AND IdempotencyKey=@key",{orderId:shipment.HoaDonId,key})).recordset[0];
      if(old) { await tx.rollback(); tx=undefined; return res.json({success:true,message:"Khoản thu này đã được ghi nhận trước đó",data:{Id:old.Id,Idempotent:true}}); }
      if (!["CHUA_THU_HO", "THU_HO_THAT_BAI", "THU_MOT_PHAN"].includes(String(shipment.TrangThaiCOD))) throw new ApiError(409, "Trạng thái thu hộ COD đã thay đổi hoặc COD đã thanh toán trực tiếp");
      const oldReference=(await txQuery(tx,"SELECT Id FROM ThuTienDonHang WHERE MaHoaDon=@orderId AND NguonThu='VAN_CHUYEN' AND MaThamChieu=@reference",{orderId:shipment.HoaDonId,reference})).recordset[0];
      if(oldReference) throw new ApiError(409,"Mã tham chiếu thu COD này đã được sử dụng");
      const collected=(await txQuery(tx,"SELECT ISNULL(SUM(SoTien),0) Amount FROM ThuTienDonHang WHERE VanChuyenId=@id AND NguonThu='VAN_CHUYEN'",{id})).recordset[0].Amount;
      if(Number(collected)+amount>Number(shipment.TienThuHo))throw new ApiError(409,"Số thu vượt khoản COD vận chuyển được giao thu");
      const paidRow=(await txQuery(tx,"SELECT ISNULL(SUM(SoTien),0) Amount FROM ThuTienDonHang WHERE MaHoaDon=@orderId",{orderId:shipment.HoaDonId})).recordset[0];
      const paid=Number(paidRow.Amount)||(["DA_THANH_TOAN","HOAN_MOT_PHAN","DA_HOAN_TIEN"].includes(String(shipment.TrangThaiThanhToan))?Number(shipment.TongTien):0);
      const refund=(await txQuery(tx,"SELECT ISNULL(SUM(f.SoTien),0) Amount FROM GiaoDichHoanTienTra f JOIN YeuCauHoanTra r ON r.Id=f.YeuCauId WHERE r.MaHoaDon=@orderId AND f.TrangThai='DA_HOAN_TIEN'",{orderId:shipment.HoaDonId})).recordset[0].Amount;
      if(Number(paid)+amount-Number(refund)>Number(shipment.TongTien||0))throw new ApiError(409,"Khoản thu vượt số dư đơn còn phải thu");
      await txQuery(tx,`INSERT ThuTienDonHang(MaHoaDon,VanChuyenId,NguonThu,SoTien,PhuongThuc,MaThamChieu,ChungTuUrl,GhiChu,ThoiDiemThu,NguoiXacNhan,IdempotencyKey)
        VALUES(@orderId,@id,'VAN_CHUYEN',@amount,@method,@reference,@evidence,@note,@eventAt,@userId,@key)`,{orderId:shipment.HoaDonId,id,amount,method,reference,evidence:evidence||null,note:note||null,eventAt,userId:req.user!.MaTaiKhoan,key});
      const newCollected=Number(collected)+amount, paidAfter=Number(paid)+amount;
      codStatus=newCollected>=Number(shipment.TienThuHo)?"DA_THU_HO":"THU_MOT_PHAN";
      paymentStatus=Number(refund)>0?(Number(refund)>=paidAfter?"DA_HOAN_TIEN":"HOAN_MOT_PHAN"):(paidAfter>=Number(shipment.TongTien||0)?"DA_THANH_TOAN":"THANH_TOAN_MOT_PHAN");
      historyNote=note||`Đơn vị vận chuyển xác nhận thu ${amount}đ (${reference})`;
    } else {
      throw new ApiError(400, "Không hỗ trợ đổi trạng thái COD bằng tay. Ghi nhận số tiền thực thu hoặc dùng chức năng đối soát kèm giao dịch/chứng từ.");
    }

    await txQuery(tx, `UPDATE VanChuyen SET TrangThai=@next,TrangThaiCOD=@codStatus,LyDoThatBai=CASE WHEN @next=N'GIAO_THAT_BAI' THEN @reason ELSE LyDoThatBai END,
      SoLanGiao=CASE WHEN @next=N'GIAO_THAT_BAI' THEN SoLanGiao+1 WHEN @next=N'GIAO_THANH_CONG' AND SoLanGiao=0 THEN 1 ELSE SoLanGiao END,
      NgayGiaoThanhCong=CASE WHEN @next=N'GIAO_THANH_CONG' THEN @eventAt ELSE NgayGiaoThanhCong END,UpdatedAt=GETDATE() WHERE Id=@id`, { next, codStatus, reason: reason || null, eventAt, id });
    await txQuery(tx, `UPDATE HoaDon SET TrangThai=@orderStatus,TrangThaiVanChuyen=@orderShipping,TrangThaiThanhToan=@payment,
      NgayHoanTat=CASE WHEN @orderStatus IN(N'DA_GIAO',N'HOAN_THANH') AND NgayHoanTat IS NULL THEN @eventAt ELSE NgayHoanTat END,
      NgayThanhToan=CASE WHEN @payment=N'DA_THANH_TOAN' AND NgayThanhToan IS NULL THEN @eventAt ELSE NgayThanhToan END,NgayCapNhat=GETDATE() WHERE MaHoaDon=@orderId`, { orderStatus, orderShipping, payment: paymentStatus, eventAt, orderId: shipment.HoaDonId });
    await txQuery(tx, "INSERT LichSuVanChuyen(VanChuyenId,TrangThaiCu,TrangThaiMoi,ViTri,GhiChu,LyDoThatBai,NguoiCapNhatId,ThoiDiemSuKien,NguonCapNhat) VALUES(@id,@old,@next,@location,@note,@reason,@userId,@eventAt,N'THU_CONG')", { id, old: shipment.TrangThai, next, location: req.body.location || null, note: historyNote || null, reason: reason || null, userId: req.user!.MaTaiKhoan, eventAt });
    if (orderStatus !== shipment.TrangThaiDonHang || orderShipping !== shipment.TrangThai) await txQuery(tx, "INSERT LichSuTrangThaiHoaDon(MaHoaDon,TrangThaiCu,TrangThaiMoi,NguoiThayDoi,GhiChu) VALUES(@orderId,@old,@next,@userId,@note)", { orderId: shipment.HoaDonId, old: shipment.TrangThaiDonHang, next: orderStatus, userId: req.user!.MaTaiKhoan, note: historyNote || orderShipping });
    if (next !== shipment.TrangThai) await taoThongBao(tx,{customerId:Number(shipment.MaKhachHang),type:"VAN_CHUYEN",title:"Trạng thái giao hàng được cập nhật",body:`Đơn DH${String(shipment.HoaDonId).padStart(8,"0")}: ${String(next).replace(/_/g," ")}`,referenceType:"DON_HANG",referenceId:Number(shipment.HoaDonId),eventKey:`shipping:${id}:${next}:${eventAt.toISOString()}`});
    await tx.commit(); tx = undefined;
    res.json({ success: true, message: "Cập nhật vận chuyển thành công", data: { Id: id, TrangThai: next, TrangThaiCOD: codStatus, TrangThaiDonHang: orderStatus } });
  } catch (error) { if (tx) try { await tx.rollback(); } catch { /* keep original */ } fail(res, error); }
});

export default router;
