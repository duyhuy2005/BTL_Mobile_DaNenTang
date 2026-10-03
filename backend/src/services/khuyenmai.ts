import { getPool, sql } from "../config/database";

export type PromotionProduct = { MaSanPham: number; MaDanhMuc: number; ThuongHieu?: string | null; GiaBan: number; SoLuong?: number };
export type AppliedPromotion = { id: number; code: string; name: string; type: string; discount: number; price: number; percent: number; endAt: Date; combineVoucher: boolean; priority: number; minOrder: number };

/** Return one server-authoritative automatic direct discount per product. */
export async function promotionForProduct(product: PromotionProduct, tx?: sql.Transaction): Promise<AppliedPromotion | null> {
  const request = tx ? new sql.Request(tx) : (await getPool()).request();
  const rows = (await request.input("productId", sql.Int, product.MaSanPham)
    .input("categoryId", sql.Int, product.MaDanhMuc)
    .input("brand", sql.NVarChar(160), product.ThuongHieu ?? null)
    .query<any>(`SELECT TOP 100 km.Id,km.MaChuongTrinh,km.TenChuongTrinh,km.LoaiKhuyenMai,km.GiaTri,km.GiamToiDa,km.DonToiThieu,km.NgayKetThuc,km.ChoPhepKetHopVoucher,km.DoUuTien,km.NgayBatDau
      FROM dbo.KhuyenMai km WITH(UPDLOCK,ROWLOCK)
      WHERE (km.TrangThai=N'DANG_HOAT_DONG' OR (km.TuDongKichHoat=1 AND km.TrangThai IN('NHAP','CHO_AP_DUNG'))) AND SYSDATETIME()>=km.NgayBatDau AND SYSDATETIME()<km.NgayKetThuc
        AND (km.TongLuot IS NULL OR km.LuotDaGiu+km.LuotDaSuDung<km.TongLuot)
        AND km.LoaiKhuyenMai IN('GIAM_PHAN_TRAM','GIAM_CO_DINH','DONG_GIA')
        AND (km.PhamVi='TOAN_BO' OR (km.PhamVi='SAN_PHAM' AND EXISTS(SELECT 1 FROM dbo.KhuyenMaiSanPham x WHERE x.KhuyenMaiId=km.Id AND x.MaSanPham=@productId))
          OR (km.PhamVi='DANH_MUC' AND EXISTS(SELECT 1 FROM dbo.KhuyenMaiDanhMuc x WHERE x.KhuyenMaiId=km.Id AND x.MaDanhMuc=@categoryId))
          OR (km.PhamVi='THUONG_HIEU' AND EXISTS(SELECT 1 FROM dbo.KhuyenMaiThuongHieu x WHERE x.KhuyenMaiId=km.Id AND x.ThuongHieu=@brand)))
      ORDER BY km.DoUuTien DESC,km.NgayBatDau ASC`)).recordset;
  const candidates = rows.map((r: any) => {
    let price = product.GiaBan;
    if (r.LoaiKhuyenMai === "GIAM_PHAN_TRAM") {
      const discount = Math.min(product.GiaBan * Number(r.GiaTri) / 100, r.GiamToiDa == null ? Infinity : Number(r.GiamToiDa));
      price = product.GiaBan - discount;
    } else if (r.LoaiKhuyenMai === "GIAM_CO_DINH") price = product.GiaBan - Number(r.GiaTri);
    else if (r.LoaiKhuyenMai === "DONG_GIA") price = Number(r.GiaTri);
    price = Math.max(0, Math.min(product.GiaBan, Math.round(price)));
    const amount = product.GiaBan - price;
    const minimum = Number(r.DonToiThieu || 0);
    return { id: r.Id, code: r.MaChuongTrinh, name: r.TenChuongTrinh, type: r.LoaiKhuyenMai, declaredValue:Number(r.GiaTri), discount: amount, price, percent: product.GiaBan ? Math.floor(amount * 100 / product.GiaBan) : 0, endAt: r.NgayKetThuc, combineVoucher: Boolean(r.ChoPhepKetHopVoucher), priority: r.DoUuTien, minOrder: minimum, startAt: r.NgayBatDau };
  }).filter((r: any) => r.discount > 0 && (r.type !== "GIAM_CO_DINH" || product.GiaBan > r.declaredValue) && (r.type !== "DONG_GIA" || (r.declaredValue > 0 && r.declaredValue < product.GiaBan)));
  candidates.sort((a: any, b: any) => b.priority - a.priority || b.discount - a.discount || new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return candidates[0] ?? null;
}

export async function attachPromotionPrices<T extends PromotionProduct>(products: T[]): Promise<(T & Record<string, unknown>)[]> {
  return Promise.all(products.map(async product => {
    const promo = product.MaSanPham && product.GiaBan > 0 ? await promotionForProduct(product) : null;
    const promoWins = Boolean(promo);
    const price = promoWins ? promo!.price : product.GiaBan;
    const saved = product.GiaBan - price;
    return { ...product, GiaGoc: product.GiaBan, GiaKhuyenMaiHienTai: price, PhanTramGiam: product.GiaBan ? Math.floor(saved * 100 / product.GiaBan) : 0,
      DangKhuyenMai: saved > 0, MaChuongTrinhKhuyenMai: promoWins ? promo!.id : null,
      MaKhuyenMai: promoWins ? promo!.code : null,
      TenKhuyenMai: promoWins ? promo!.name : null,
      LoaiKhuyenMai: promoWins ? promo!.type : null,
      ThoiGianKetThucKhuyenMai: promoWins ? promo!.endAt : null, DonToiThieuKhuyenMai: promoWins ? promo!.minOrder : 0, ChoPhepKetHopVoucher: promoWins ? promo!.combineVoucher : true };
  }));
}

export function resolveCartPromotionMinimum<T extends Record<string, any>>(items: T[]): T[] {
  const basketTotal = items.reduce((sum, item) => sum + Number(item.GiaKhuyenMaiHienTai ?? item.GiaBan) * Number(item.SoLuong || 0), 0);
  return items.map(item => {
    if (!item.DangKhuyenMai || !item.MaChuongTrinhKhuyenMai || Number(item.DonToiThieuKhuyenMai || 0) <= basketTotal) return item;
    const price = Number(item.GiaBan);
    const saving = Number(item.GiaBan) - price;
    return { ...item, GiaKhuyenMaiHienTai: price, PhanTramGiam: Number(item.GiaBan) ? Math.floor(saving * 100 / Number(item.GiaBan)) : 0,
      DangKhuyenMai: false, MaChuongTrinhKhuyenMai: null, MaKhuyenMai: null,
      TenKhuyenMai: null, LoaiKhuyenMai: null, DonToiThieuKhuyenMai: 0 };
  });
}

export async function reservePromotion(tx: sql.Transaction, id: number, customerId: number, orderId: number, qty = 1) {
  const program = (await new sql.Request(tx).input("id", sql.Int, id).query<any>("SELECT MoiKhachToiDa FROM dbo.KhuyenMai WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id")).recordset[0];
  if (!program) throw Object.assign(new Error("Không tìm thấy chương trình khuyến mại"), { status: 404 });
  if (program.MoiKhachToiDa != null) {
    const usage = (await new sql.Request(tx).input("id", sql.Int, id).input("customer", sql.Int, customerId).query<any>("SELECT ISNULL(SUM(SoLuong),0) Used FROM dbo.LichSuSuDungKhuyenMai WITH(UPDLOCK,HOLDLOCK) WHERE KhuyenMaiId=@id AND MaKhachHang=@customer AND TrangThai IN('DA_GIU_SUAT','DA_SU_DUNG')")).recordset[0];
    if (Number(usage.Used) + qty > Number(program.MoiKhachToiDa)) throw Object.assign(new Error("Bạn đã đạt giới hạn sử dụng chương trình này"), { status: 409 });
  }
  const updated = await new sql.Request(tx).input("id", sql.Int, id).input("qty", sql.Int, qty).query(`UPDATE dbo.KhuyenMai WITH(UPDLOCK,ROWLOCK)
    SET LuotDaGiu=LuotDaGiu+@qty,UpdatedAt=SYSDATETIME() WHERE Id=@id AND (TrangThai=N'DANG_HOAT_DONG' OR (TuDongKichHoat=1 AND TrangThai IN('NHAP','CHO_AP_DUNG')))
    AND NgayBatDau<=SYSDATETIME() AND NgayKetThuc>SYSDATETIME()
    AND (TongLuot IS NULL OR LuotDaGiu+LuotDaSuDung+@qty<=TongLuot)`);
  if (!updated.rowsAffected[0]) throw Object.assign(new Error("Chương trình vừa hết suất, vui lòng thử lại"), { status: 409 });
  await new sql.Request(tx).input("id", sql.Int, id).input("customer", sql.Int, customerId).input("order", sql.Int, orderId).input("qty", sql.Int, qty)
    .query("INSERT INTO dbo.LichSuSuDungKhuyenMai(KhuyenMaiId,MaKhachHang,MaHoaDon,SoLuong,TrangThai) VALUES(@id,@customer,@order,@qty,'DA_GIU_SUAT')");
}

export async function settlePromotionOrder(tx: sql.Transaction, orderId: number, outcome: "DA_SU_DUNG" | "DA_TRA_LAI") {
  const allowed = outcome === "DA_SU_DUNG" ? "TrangThai='DA_GIU_SUAT'" : "TrangThai IN('DA_GIU_SUAT','DA_SU_DUNG')";
  const rows = (await new sql.Request(tx).input("order", sql.Int, orderId).query<any>(`SELECT KhuyenMaiId,SoLuong,TrangThai FROM dbo.LichSuSuDungKhuyenMai WITH(UPDLOCK,ROWLOCK) WHERE MaHoaDon=@order AND ${allowed}`)).recordset;
  for (const row of rows) {
    const id = Number(row.KhuyenMaiId); const qty = Number(row.SoLuong);
    if (outcome === "DA_SU_DUNG") {
      const r = await new sql.Request(tx).input("id", sql.Int, id).input("qty", sql.Int, qty).query("UPDATE dbo.KhuyenMai SET LuotDaGiu=LuotDaGiu-@qty,LuotDaSuDung=LuotDaSuDung+@qty,UpdatedAt=SYSDATETIME() WHERE Id=@id AND LuotDaGiu>=@qty");
      if (!r.rowsAffected[0]) throw new Error("Không thể chốt lượt khuyến mại đã giữ");
    } else if (row.TrangThai === "DA_GIU_SUAT") {
      const r = await new sql.Request(tx).input("id", sql.Int, id).input("qty", sql.Int, qty).query("UPDATE dbo.KhuyenMai SET LuotDaGiu=LuotDaGiu-@qty,UpdatedAt=SYSDATETIME() WHERE Id=@id AND LuotDaGiu>=@qty");
      if (!r.rowsAffected[0]) throw new Error("Không thể trả lượt khuyến mại đang giữ");
    } else {
      const r = await new sql.Request(tx).input("id", sql.Int, id).input("qty", sql.Int, qty).query("UPDATE dbo.KhuyenMai SET LuotDaSuDung=LuotDaSuDung-@qty,UpdatedAt=SYSDATETIME() WHERE Id=@id AND LuotDaSuDung>=@qty");
      if (!r.rowsAffected[0]) throw new Error("Không thể trả lượt khuyến mại đã dùng");
    }
    await new sql.Request(tx).input("order", sql.Int, orderId).input("id", sql.Int, id).input("outcome", sql.VarChar(16), outcome).query("UPDATE dbo.LichSuSuDungKhuyenMai SET TrangThai=@outcome,UpdatedAt=SYSDATETIME() WHERE MaHoaDon=@order AND KhuyenMaiId=@id AND TrangThai IN('DA_GIU_SUAT','DA_SU_DUNG')");
  }
}
