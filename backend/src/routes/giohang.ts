import { Router } from "express";
import { execute, query, queryOne } from "../config/database";
import { AuthRequest, authorizeRoles } from "../middleware/auth";
import { attachPromotionPrices, resolveCartPromotionMinimum } from "../services/khuyenmai";

const router = Router();

async function customerId(req: AuthRequest): Promise<number | null> {
  if (!req.user) return null;
  const customer = await queryOne<{ MaKhachHang: number }>("SELECT MaKhachHang FROM KhachHang WHERE MaTaiKhoan=@MaTaiKhoan", { MaTaiKhoan: req.user.MaTaiKhoan });
  return customer?.MaKhachHang ?? null;
}

async function getOrCreateCart(maKhachHang: number) {
  let cart = await queryOne<any>("SELECT * FROM GioHang WHERE MaKhachHang=@maKhachHang", { maKhachHang });
  if (!cart) {
    const result = await execute("INSERT INTO GioHang (MaKhachHang) OUTPUT INSERTED.MaGioHang VALUES (@maKhachHang)", { maKhachHang });
    cart = { MaGioHang: result.recordset[0].MaGioHang, MaKhachHang: maKhachHang };
  }
  return cart;
}

async function cartPayload(maKhachHang: number) {
  const cart = await getOrCreateCart(maKhachHang);
  // Keep cart quantity unambiguous. Selecting ct.* together with sp.SoLuong
  // creates duplicate JSON keys; mssql serializes those as [cartQty, stockQty],
  // which made clients see NaN or concatenate quantities as strings.
  const items = await query<any>(`SELECT ct.MaGioHang, ct.MaSanPham, ct.MaBienThe, ct.SoLuong,
      sp.MaDanhMuc, sp.TenSanPham, COALESCE(v.GiaBan,sp.GiaBan) GiaBan, sp.GiaKhuyenMai, COALESCE(v.HinhAnh,sp.HinhAnh) HinhAnh, sp.ThuongHieu,
      v.MaSKU MaSKUBienThe,v.DungTich,v.DonViDungTich,v.KhoiLuong,v.DonViKhoiLuong,v.MaMau,v.TenMau,v.MaHEX,v.MuiHuong,v.QuyCachDongGoi,
      CASE WHEN sp.TrangThai=1 AND ISNULL(sp.IsDeleted,0)=0 AND (ct.MaBienThe IS NULL OR v.TrangThai=1) THEN 1 ELSE 0 END DuocBan, inv.TonThucTe, inv.DaGiu, inv.CoTheBan,
      CASE WHEN sp.MaSanPham IS NULL THEN N'Sản phẩm không còn tồn tại'
        WHEN ISNULL(sp.TrangThai,0)=0 OR sp.IsDeleted=1 OR (ct.MaBienThe IS NOT NULL AND ISNULL(v.TrangThai,0)=0) THEN N'Sản phẩm hoặc biến thể đã ngừng bán'
        WHEN inv.CoTheBan<=0 THEN N'Hết hàng' ELSE NULL END LyDoKhongMuaDuoc
    FROM ChiTietGioHang ct LEFT JOIN SanPham sp ON ct.MaSanPham = sp.MaSanPham LEFT JOIN BienTheSanPham v ON v.MaBienThe=ct.MaBienThe AND v.MaSanPham=ct.MaSanPham
    OUTER APPLY (SELECT COALESCE(SUM(l.SoLuongTon),0) TonThucTe,COALESCE(SUM(l.SoLuongDaGiu),0) DaGiu,
      COALESCE(SUM(CASE WHEN l.HanSuDung IS NULL OR l.HanSuDung>=CAST(GETDATE() AS date) THEN l.SoLuongTon-l.SoLuongDaGiu ELSE 0 END),0) CoTheBan
      FROM LoSanPham l WHERE l.MaSanPham=sp.MaSanPham AND (ct.MaBienThe IS NULL OR l.MaBienThe=ct.MaBienThe) AND l.TrangThai<>N'Đã hủy') inv
    WHERE ct.MaGioHang = @MaGioHang`, { MaGioHang: cart.MaGioHang });
  return { ...cart, items: resolveCartPromotionMinimum(await attachPromotionPrices(items)) };
}

function parseInteger(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
function isPositiveInteger(value: unknown) {
  const parsed = parseInteger(value);
  return parsed !== null && parsed > 0;
}
function canSell(product: any) { return product && Number(product.TrangThai) === 1 && !product.IsDeleted && (product.MaBienThe == null || Number(product.BienTheTrangThai) === 1); }

async function validateProductQuantity(maSanPham: number, maBienThe: number | null, quantity: number) {
  const product = await queryOne<any>(`SELECT sp.*,v.MaBienThe,v.TrangThai BienTheTrangThai,inv.CoTheBan FROM SanPham sp LEFT JOIN BienTheSanPham v ON v.MaBienThe=@MaBienThe AND v.MaSanPham=sp.MaSanPham OUTER APPLY (SELECT COALESCE(SUM(CASE
      WHEN l.HanSuDung IS NULL OR l.HanSuDung>=CAST(GETDATE() AS date) THEN l.SoLuongTon-l.SoLuongDaGiu ELSE 0 END),0) CoTheBan
      FROM LoSanPham l WHERE l.MaSanPham=sp.MaSanPham AND (@MaBienThe IS NULL OR l.MaBienThe=@MaBienThe) AND l.TrangThai<>N'Đã hủy') inv WHERE sp.MaSanPham=@MaSanPham`, { MaSanPham: maSanPham, MaBienThe: maBienThe });
  if (!product) return { status: 404, message: "Không tìm thấy sản phẩm" };
  if (maBienThe !== null && !product.MaBienThe) return { status: 404, message: "Biến thể không thuộc sản phẩm" };
  if (!canSell(product)) return { status: 409, message: "Sản phẩm hiện không được phép bán" };
  if (quantity > Number(product.CoTheBan || 0)) return { status: 409, message: `Chỉ còn ${Number(product.CoTheBan || 0)} sản phẩm có thể bán` };
  return null;
}

async function addItem(maKhachHang: number, rawProductId: unknown, rawVariantId: unknown, rawQuantity: unknown) {
  const MaSanPham = parseInteger(rawProductId); const SoLuong = parseInteger(rawQuantity);
  const parsedVariant = rawVariantId == null || rawVariantId === "" ? null : parseInteger(rawVariantId);
  if (rawVariantId != null && rawVariantId !== "" && (!parsedVariant || parsedVariant <= 0)) return { status: 400, message: "Mã biến thể không hợp lệ" };
  if (!MaSanPham || !SoLuong || !isPositiveInteger(MaSanPham) || !isPositiveInteger(SoLuong)) return { status: 400, message: "Sản phẩm và số lượng phải là số nguyên dương" };
  const cart = await getOrCreateCart(maKhachHang);
  const existing = await queryOne<any>("SELECT * FROM ChiTietGioHang WHERE MaGioHang=@MaGioHang AND MaSanPham=@MaSanPham AND ((@MaBienThe IS NULL AND MaBienThe IS NULL) OR MaBienThe=@MaBienThe)", { MaGioHang: cart.MaGioHang, MaSanPham, MaBienThe: parsedVariant });
  const nextQuantity = Number(existing?.SoLuong || 0) + Number(SoLuong);
  const invalid = await validateProductQuantity(Number(MaSanPham), parsedVariant, nextQuantity);
  if (invalid) return invalid;
  if (existing) await execute("UPDATE ChiTietGioHang SET SoLuong=@SoLuong WHERE MaGioHang=@MaGioHang AND MaSanPham=@MaSanPham AND ((@MaBienThe IS NULL AND MaBienThe IS NULL) OR MaBienThe=@MaBienThe)", { SoLuong: nextQuantity, MaGioHang: cart.MaGioHang, MaSanPham, MaBienThe: parsedVariant });
  else await execute("INSERT INTO ChiTietGioHang (MaGioHang, MaSanPham, MaBienThe, SoLuong) VALUES (@MaGioHang, @MaSanPham, @MaBienThe, @SoLuong)", { MaGioHang: cart.MaGioHang, MaSanPham, MaBienThe: parsedVariant, SoLuong });
  return null;
}

async function requireCustomer(req: AuthRequest, res: any) {
  const id = await customerId(req);
  if (!id) { res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ khách hàng" }); return null; }
  return id;
}

// New customer-safe routes: ownership comes solely from the JWT.
router.get("/me", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try { const id = await requireCustomer(req, res); if (id) res.json({ success: true, data: await cartPayload(id) }); }
  catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete("/me", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const result = await execute(`DELETE ct FROM ChiTietGioHang ct
      JOIN GioHang gh ON gh.MaGioHang=ct.MaGioHang
      JOIN KhachHang kh ON kh.MaKhachHang=gh.MaKhachHang
      WHERE kh.MaTaiKhoan=@MaTaiKhoan`, { MaTaiKhoan: req.user!.MaTaiKhoan });
    res.json({ success: true, message: "Đã xóa giỏ hàng", data: { SoDongDaXoa: result.rowsAffected || 0 } });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message || "Không thể xóa giỏ hàng" }); }
});

router.post("/", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const id = await requireCustomer(req, res); if (!id) return;
    const error = await addItem(id, req.body.MaSanPham, req.body.MaBienThe, req.body.SoLuong ?? 1);
    if (error) return res.status(error.status).json({ success: false, message: error.message });
    res.status(201).json({ success: true, message: "Thêm vào giỏ hàng thành công", data: await cartPayload(id) });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

router.put("/", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const id = await requireCustomer(req, res); if (!id) return;
    const { MaSanPham, MaBienThe, SoLuong } = req.body;
    const productId = parseInteger(MaSanPham); const quantity = parseInteger(SoLuong);
    const variantId = MaBienThe == null || MaBienThe === "" ? null : parseInteger(MaBienThe);
    if (!productId || quantity === null || quantity < 0 || (MaBienThe != null && MaBienThe !== "" && !variantId)) return res.status(400).json({ success: false, message: "Mã sản phẩm, biến thể hoặc số lượng không hợp lệ" });
    const cart = await getOrCreateCart(id);
    if (quantity === 0) await execute("DELETE FROM ChiTietGioHang WHERE MaGioHang=@MaGioHang AND MaSanPham=@MaSanPham AND ((@MaBienThe IS NULL AND MaBienThe IS NULL) OR MaBienThe=@MaBienThe)", { MaGioHang: cart.MaGioHang, MaSanPham: productId, MaBienThe: variantId });
    else {
      const invalid = await validateProductQuantity(productId, variantId, quantity);
      if (invalid) return res.status(invalid.status).json({ success: false, message: invalid.message });
      const result = await execute("UPDATE ChiTietGioHang SET SoLuong=@SoLuong WHERE MaGioHang=@MaGioHang AND MaSanPham=@MaSanPham AND ((@MaBienThe IS NULL AND MaBienThe IS NULL) OR MaBienThe=@MaBienThe)", { SoLuong: quantity, MaGioHang: cart.MaGioHang, MaSanPham: productId, MaBienThe: variantId });
      if (!result.rowsAffected) return res.status(404).json({ success: false, message: "Sản phẩm không có trong giỏ hàng" });
    }
    res.json({ success: true, message: "Cập nhật thành công", data: await cartPayload(id) });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete("/:maSanPham", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => {
  try {
    const id = await requireCustomer(req, res); if (!id) return;
    const cart = await getOrCreateCart(id);
    const variantId=req.query.MaBienThe == null || req.query.MaBienThe === "" ? null : parseInteger(req.query.MaBienThe);
    await execute("DELETE FROM ChiTietGioHang WHERE MaGioHang=@MaGioHang AND MaSanPham=@MaSanPham AND ((@MaBienThe IS NULL AND MaBienThe IS NULL) OR MaBienThe=@MaBienThe)", { MaGioHang: cart.MaGioHang, MaSanPham: Number(req.params.maSanPham), MaBienThe: variantId });
    res.json({ success: true, message: "Xóa thành công" });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// Legacy staff routes remain, but a customer can never select another customer's cart.
async function legacyOwner(req: AuthRequest, res: any) {
  const target = Number(req.params.maKhachHang);
  if (!Number.isInteger(target) || target <= 0) { res.status(400).json({ success: false, message: "Mã khách hàng không hợp lệ" }); return null; }
  if (req.user?.VaiTro === "KhachHang") {
    const own = await requireCustomer(req, res);
    if (!own) return null;
    if (own !== target) { res.status(403).json({ success: false, message: "Không có quyền truy cập giỏ hàng này" }); return null; }
  } else if (req.user?.VaiTro !== "Admin" && req.user?.VaiTro !== "NhanVien") { res.status(403).json({ success: false, message: "Không có quyền truy cập" }); return null; }
  return target;
}

router.get("/:maKhachHang", async (req: AuthRequest, res) => { try { const id = await legacyOwner(req, res); if (id) res.json({ success: true, data: await cartPayload(id) }); } catch (err: any) { res.status(500).json({ success: false, message: err.message }); } });
router.post("/:maKhachHang/them", async (req: AuthRequest, res) => { try { const id = await legacyOwner(req, res); if (!id) return; const error = await addItem(id, req.body.MaSanPham, req.body.MaBienThe, req.body.SoLuong ?? 1); if (error) return res.status(error.status).json({ success: false, message: error.message }); res.json({ success: true, message: "Thêm vào giỏ hàng thành công" }); } catch (err: any) { res.status(500).json({ success: false, message: err.message }); } });
router.put("/:maKhachHang/capnhat", async (req: AuthRequest, res) => {
  try {
    const id = await legacyOwner(req, res); if (!id) return;
    const cart = await getOrCreateCart(id); const { MaSanPham, SoLuong } = req.body;
    const productId = parseInteger(MaSanPham); const quantity = parseInteger(SoLuong);
    if (!productId || quantity === null || quantity < 0) return res.status(400).json({ success: false, message: "Mã sản phẩm và số lượng phải là số nguyên hợp lệ" });
    if (quantity === 0) await execute("DELETE FROM ChiTietGioHang WHERE MaGioHang=@MaGioHang AND MaSanPham=@MaSanPham", { MaGioHang: cart.MaGioHang, MaSanPham: productId });
    else {
      const invalid = await validateProductQuantity(productId, null, quantity);
      if (invalid) return res.status(invalid.status).json({ success: false, message: invalid.message });
      await execute("UPDATE ChiTietGioHang SET SoLuong=@SoLuong WHERE MaGioHang=@MaGioHang AND MaSanPham=@MaSanPham", { SoLuong: quantity, MaGioHang: cart.MaGioHang, MaSanPham: productId });
    }
    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete("/:maKhachHang/xoa/:maSanPham", async (req: AuthRequest, res) => {
  try {
    const id = await legacyOwner(req, res); if (!id) return;
    const cart = await getOrCreateCart(id);
    await execute("DELETE FROM ChiTietGioHang WHERE MaGioHang=@MaGioHang AND MaSanPham=@MaSanPham", { MaGioHang: cart.MaGioHang, MaSanPham: Number(req.params.maSanPham) });
    res.json({ success: true, message: "Xóa thành công" });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

export default router;
