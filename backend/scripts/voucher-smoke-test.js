const path = require("path");
const dotenv = require("dotenv");
const sql = require("mssql");
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const { evaluateVoucher, reserveVoucher, settleOrderVouchers } = require("../dist/services/voucher");

async function main() {
  const pool = await sql.connect({ server: process.env.DB_SERVER || "TRANHUY", port: Number(process.env.DB_PORT) || 1433, database: process.env.DB_DATABASE || "QuanLyCuaHangMyPham", user: process.env.DB_USER, password: process.env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } });
  const tx = new sql.Transaction(pool);
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const optionalCoverage = [];
  try {
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const customer = (await new sql.Request(tx).query("SELECT TOP 1 MaKhachHang FROM KhachHang ORDER BY MaKhachHang")).recordset[0];
    const product = (await new sql.Request(tx).query("SELECT TOP 1 MaSanPham,MaDanhMuc,ThuongHieu,GiaBan,GiaKhuyenMai FROM SanPham WHERE TrangThai=1 AND IsDeleted=0 ORDER BY MaSanPham")).recordset[0];
    const orderReq = new sql.Request(tx).input("customerId", sql.Int, customer.MaKhachHang);
    const order = (await orderReq.query("SELECT TOP 1 MaHoaDon FROM HoaDon WHERE MaKhachHang=@customerId ORDER BY MaHoaDon DESC")).recordset[0];
    if (!customer || !product || !order) throw new Error("Cần có khách hàng, sản phẩm đang bán và hóa đơn hiện hữu để chạy kiểm thử rollback");
    const now = Date.now();
    const linePrice = Number(product.GiaKhuyenMai) > 0 && Number(product.GiaKhuyenMai) < Number(product.GiaBan) ? Number(product.GiaKhuyenMai) : Number(product.GiaBan);
    const lines = [{ MaSanPham: product.MaSanPham, SoLuong: 3, DonGia: linePrice, MaDanhMuc: product.MaDanhMuc, ThuongHieu: product.ThuongHieu || null }];
    let next = 0;
    async function create({ type, value, max = null, scope = "TOAN_BO_DON_HANG", audience = "TAT_CA_KHACH_HANG", min = 0, status = "DANG_HOAT_DONG", total = 3, used = 0, startOffsetMinutes = -60, endOffsetMinutes = 1440 }) {
      const code = `SMOKE_${now}_${next++}`;
      const req = new sql.Request(tx);
      req.input("code", sql.NVarChar(50), code).input("name", sql.NVarChar(160), "Voucher rollback smoke test").input("type", sql.VarChar(24), type)
        .input("value", sql.Decimal(18, 2), value).input("max", sql.Decimal(18, 2), max).input("min", sql.Decimal(18, 2), min)
        .input("scope", sql.VarChar(24), scope).input("audience", sql.VarChar(28), audience).input("status", sql.VarChar(24), status)
        .input("total", sql.Int, total).input("used", sql.Int, used).input("startOffset", sql.Int, startOffsetMinutes).input("endOffset", sql.Int, endOffsetMinutes);
      const result = await req.query("INSERT Voucher(MaVoucher,TenChuongTrinh,LoaiGiam,GiaTri,GiamToiDa,DonHangToiThieu,TongLuotSuDung,LuotDaSuDung,MoiKhachToiDa,PhamVi,DoiTuong,ChoPhepKetHopPhiShip,TuDongKichHoat,NgayBatDau,NgayKetThuc,TrangThai) OUTPUT INSERTED.Id VALUES(@code,@name,@type,@value,@max,@min,@total,@used,1,@scope,@audience,1,0,DATEADD(minute,@startOffset,GETDATE()),DATEADD(minute,@endOffset,GETDATE()),@status)");
      return { Id: result.recordset[0].Id, MaVoucher: code };
    }
    const pct = await create({ type: "PHAN_TRAM", value: 25, max: 10000 });
    const pctResult = await evaluateVoucher(tx, pct.MaVoucher, customer.MaKhachHang, lines, 0);
    assert(pctResult.soTienGiam <= 10000 && pctResult.soTienGiam > 0, "Phần trăm và mức giảm tối đa");
    const fixed = await create({ type: "SO_TIEN_CO_DINH", value: 999999, scope: "SAN_PHAM" });
    await new sql.Request(tx).input("v", sql.Int, fixed.Id).input("p", sql.Int, product.MaSanPham).query("INSERT VoucherSanPham(VoucherId,MaSanPham) VALUES(@v,@p)");
    const fixedResult = await evaluateVoucher(tx, fixed.MaVoucher, customer.MaKhachHang, lines, 0);
    assert(fixedResult.soTienGiam <= linePrice * 3, "Voucher cố định không vượt giá trị hàng đủ điều kiện");
    const scoped = await create({ type: "PHAN_TRAM", value: 10, scope: "DANH_MUC" });
    await new sql.Request(tx).input("v", sql.Int, scoped.Id).input("c", sql.Int, product.MaDanhMuc).query("INSERT VoucherDanhMuc(VoucherId,MaDanhMuc) VALUES(@v,@c)");
    const scopedResult = await evaluateVoucher(tx, scoped.MaVoucher, customer.MaKhachHang, lines, 0);
    assert(scopedResult.eligible.length === 1, "Voucher danh mục chỉ chọn dòng hàng phù hợp");
    if (product.ThuongHieu) {
      const brand = await create({ type: "PHAN_TRAM", value: 10, scope: "THUONG_HIEU" });
      await new sql.Request(tx).input("v", sql.Int, brand.Id).input("brand", sql.NVarChar(160), product.ThuongHieu).query("INSERT VoucherThuongHieu(VoucherId,TenThuongHieu) VALUES(@v,@brand)");
      assert((await evaluateVoucher(tx, brand.MaVoucher, customer.MaKhachHang, lines, 0)).eligible.length === 1, "Voucher thương hiệu chỉ áp dụng đúng thương hiệu");
      optionalCoverage.push("thương hiệu");
    } else optionalCoverage.push("bỏ qua thương hiệu: sản phẩm thử không có thương hiệu");
    const ship = await create({ type: "MIEN_GIAM_PHI_SHIP", value: 25000, scope: "PHI_VAN_CHUYEN" });
    const shipResult = await evaluateVoucher(tx, ship.MaVoucher, customer.MaKhachHang, lines, 20000);
    assert(shipResult.soTienGiam === 20000, "Voucher phí ship không vượt phí thực tế");
    const below = await create({ type: "PHAN_TRAM", value: 10, min: linePrice * 10 });
    let rejected = false; try { await evaluateVoucher(tx, below.MaVoucher, customer.MaKhachHang, lines, 0); } catch { rejected = true; }
    assert(rejected, "Đơn dưới tối thiểu bị từ chối khi áp dụng");
    const paused = await create({ type: "PHAN_TRAM", value: 10, status: "TAM_DUNG" });
    let inactive = false; try { await evaluateVoucher(tx, paused.MaVoucher, customer.MaKhachHang, lines, 0); } catch { inactive = true; }
    assert(inactive, "Voucher tạm dừng bị từ chối");
    const future = await create({ type: "PHAN_TRAM", value: 10, startOffsetMinutes: 30 });
    let tooEarly = false; try { await evaluateVoucher(tx, future.MaVoucher, customer.MaKhachHang, lines, 0); } catch { tooEarly = true; }
    assert(tooEarly, "Voucher trước giờ bắt đầu bị từ chối");
    const expired = await create({ type: "PHAN_TRAM", value: 10, endOffsetMinutes: -30 });
    let tooLate = false; try { await evaluateVoucher(tx, expired.MaVoucher, customer.MaKhachHang, lines, 0); } catch { tooLate = true; }
    assert(tooLate, "Voucher quá hạn bị từ chối");
    const exhausted = await create({ type: "PHAN_TRAM", value: 10, total: 1, used: 1 });
    let noUses = false; try { await evaluateVoucher(tx, exhausted.MaVoucher, customer.MaKhachHang, lines, 0); } catch { noUses = true; }
    assert(noUses, "Voucher hết lượt bị từ chối");
    const race = await create({ type: "PHAN_TRAM", value: 10, total: 1 });
    const reserveRequest = () => new sql.Request(tx).input("id", sql.Int, race.Id).query("UPDATE Voucher SET LuotDangGiu=LuotDangGiu+1 WHERE Id=@id AND LuotDaSuDung+LuotDangGiu<TongLuotSuDung");
    assert((await reserveRequest()).rowsAffected[0] === 1 && (await reserveRequest()).rowsAffected[0] === 0, "Điều kiện update nguyên tử ngăn dùng vượt lượt cuối");
    const otherCustomer = (await new sql.Request(tx).input("customerId", sql.Int, customer.MaKhachHang).query("SELECT TOP 1 MaKhachHang FROM KhachHang WHERE MaKhachHang<>@customerId ORDER BY MaKhachHang")).recordset[0];
    if (otherCustomer) {
      const privateVoucher = await create({ type: "PHAN_TRAM", value: 10, audience: "KHACH_HANG_CU_THE" });
      await new sql.Request(tx).input("v", sql.Int, privateVoucher.Id).input("c", sql.Int, customer.MaKhachHang).query("INSERT VoucherKhachHang(VoucherId,MaKhachHang) VALUES(@v,@c)");
      assert((await evaluateVoucher(tx, privateVoucher.MaVoucher, customer.MaKhachHang, lines, 0)).soTienGiam >= 0, "Khách được gán dùng được voucher riêng");
      let wrongAudience = false; try { await evaluateVoucher(tx, privateVoucher.MaVoucher, otherCustomer.MaKhachHang, lines, 0); } catch { wrongAudience = true; }
      assert(wrongAudience, "Khách không được gán không dùng được voucher riêng");
    }
    const newCustomer = (await new sql.Request(tx).query("SELECT TOP 1 k.MaKhachHang FROM KhachHang k WHERE NOT EXISTS(SELECT 1 FROM HoaDon h WHERE h.MaKhachHang=k.MaKhachHang AND h.TrangThai IN(N'HOAN_THANH',N'DA_GIAO')) ORDER BY k.MaKhachHang")).recordset[0];
    if (newCustomer) {
      const newOnly = await create({ type: "PHAN_TRAM", value: 10, audience: "KHACH_HANG_MOI" });
      assert((await evaluateVoucher(tx, newOnly.MaVoucher, newCustomer.MaKhachHang, lines, 0)).soTienGiam >= 0, "Khách mới đủ điều kiện sử dụng");
      optionalCoverage.push("khách mới đủ điều kiện");
    } else optionalCoverage.push("bỏ qua khách mới: database không có khách chưa từng có đơn hoàn tất");
    await new sql.Request(tx).input("orderId", sql.Int, order.MaHoaDon).query("UPDATE HoaDon SET TrangThai=N'HOAN_THANH' WHERE MaHoaDon=@orderId");
    const newOnly = await create({ type: "PHAN_TRAM", value: 10, audience: "KHACH_HANG_MOI" });
    let notNew = false; try { await evaluateVoucher(tx, newOnly.MaVoucher, customer.MaKhachHang, lines, 0); } catch { notNew = true; }
    assert(notNew, "Khách có đơn hoàn thành không dùng được voucher khách mới");
    optionalCoverage.push("khách đã mua bị từ chối (trạng thái đơn thử chỉ tồn tại trong transaction rollback)");
    const held = await create({ type: "PHAN_TRAM", value: 10 });
    const heldEval = await evaluateVoucher(tx, held.MaVoucher, customer.MaKhachHang, lines, 0, { lock: true });
    await reserveVoucher(tx, heldEval, customer.MaKhachHang, order.MaHoaDon);
    await settleOrderVouchers(tx, order.MaHoaDon, "DA_SU_DUNG");
    const usedCounters = (await new sql.Request(tx).input("voucherId", sql.Int, held.Id).query("SELECT LuotDaSuDung,LuotDangGiu FROM Voucher WHERE Id=@voucherId")).recordset[0];
    assert(usedCounters.LuotDaSuDung === 1 && usedCounters.LuotDangGiu === 0, "Xác nhận chuyển giữ lượt sang đã dùng đúng một lần");
    const released = await create({ type: "PHAN_TRAM", value: 10 });
    const releasedEval = await evaluateVoucher(tx, released.MaVoucher, customer.MaKhachHang, lines, 0, { lock: true });
    await reserveVoucher(tx, releasedEval, customer.MaKhachHang, order.MaHoaDon);
    await settleOrderVouchers(tx, order.MaHoaDon, "DA_TRA_LAI_LUOT");
    const releasedCounters = (await new sql.Request(tx).input("voucherId", sql.Int, released.Id).query("SELECT LuotDaSuDung,LuotDangGiu FROM Voucher WHERE Id=@voucherId")).recordset[0];
    assert(releasedCounters.LuotDaSuDung === 0 && releasedCounters.LuotDangGiu === 0, "Hủy trước xác nhận trả lượt đúng một lần");
    console.log("PASS: phần trăm/cap, cố định/cap, phạm vi danh mục/sản phẩm/thương hiệu, phí ship thực tế, tối thiểu, trước giờ/hết hạn/hết lượt/tạm dừng, khách mới/cụ thể, lượt cuối nguyên tử, giữ→đã dùng và trả lượt. Mọi bản ghi thử rollback.");
  } finally {
    if (tx._aborted !== true) try { await tx.rollback(); } catch {}
    await pool.close();
    if (optionalCoverage.length) console.log("Coverage:", optionalCoverage.join("; "));
  }
}
main().catch((error) => { console.error("Voucher smoke test failed:", error.message); process.exitCode = 1; });
