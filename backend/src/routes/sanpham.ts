import { Router } from "express";
import { execute, query, queryOne, getPool, sql } from "../config/database";
import { AuthRequest, authorizeRoles } from "../middleware/auth";
import { attachPromotionPrices } from "../services/khuyenmai";

const router = Router();
const STAFF = ["Admin", "NhanVien"];
const STORE_NOW = "CONVERT(datetime2(0),SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time')";
const STORE_NEW_UNTIL = "CONVERT(varchar(33),DATEADD(month,1,sp.NgayCongKhai),126)+N'+07:00'";
const nullable = (value: unknown) => value === "" || value === undefined ? null : value;

function input(body: any) {
  const value: any = { TenSanPham: String(body.TenSanPham || "").trim(), MaDanhMuc: Number(body.MaDanhMuc), MaSKU: nullable(body.MaSKU), MaVach: nullable(body.MaVach), ThuongHieu: nullable(body.ThuongHieu), XuatXu: nullable(body.XuatXu), ThanhPhan: nullable(body.ThanhPhan), CongDung: nullable(body.CongDung), HuongDanSuDung: nullable(body.HuongDanSuDung), DoiTuongSuDung: nullable(body.DoiTuongSuDung), LoaiDaPhuHop: nullable(body.LoaiDaPhuHop), CanhBaoKichUng: nullable(body.CanhBaoKichUng), DungTich: nullable(body.DungTich), DonVi: nullable(body.DonVi), QuyCachDongGoi: nullable(body.QuyCachDongGoi), GiaNhap: Number(body.GiaNhap || 0), GiaBan: Number(body.GiaBan), GiaKhuyenMai: nullable(body.GiaKhuyenMai), SoLuong: Number(body.SoLuong || 0), NgaySanXuat: nullable(body.NgaySanXuat), HanSuDung: nullable(body.HanSuDung), NguongCanhBaoTonKho: nullable(body.NguongCanhBaoTonKho), NguonThongTin: nullable(body.NguonThongTin), MoTa: nullable(body.MoTa), HinhAnh: nullable(body.HinhAnh), TrangThai: body.TrangThai === undefined ? 1 : Number(body.TrangThai) };
  if (!value.TenSanPham || !Number.isInteger(value.MaDanhMuc) || !Number.isFinite(value.GiaBan)) throw new Error("Tên, danh mục và giá bán là bắt buộc");
  if ([value.GiaNhap, value.GiaBan, value.SoLuong].some((n) => !Number.isFinite(n) || n < 0)) throw new Error("Giá và số lượng không được âm");
  if (value.GiaKhuyenMai !== null && (!Number.isFinite(Number(value.GiaKhuyenMai)) || Number(value.GiaKhuyenMai) < 0 || Number(value.GiaKhuyenMai) > value.GiaBan)) throw new Error("Giá khuyến mãi phải từ 0 đến giá bán");
  if (value.NgaySanXuat && value.HanSuDung && new Date(value.HanSuDung) <= new Date(value.NgaySanXuat)) throw new Error("Hạn sử dụng phải sau ngày sản xuất");
  return value;
}
async function validate(value: any, id = 0) {
  if (!await queryOne("SELECT MaDanhMuc FROM DanhMuc WHERE MaDanhMuc=@id", { id: value.MaDanhMuc })) throw new Error("Danh mục không tồn tại");
  for (const field of ["MaSKU", "MaVach"]) if (value[field]) if (await queryOne(`SELECT MaSanPham FROM SanPham WHERE ${field}=@value AND MaSanPham<>@id`, { value: value[field], id })) throw new Error(field === "MaSKU" ? "Mã sản phẩm đã tồn tại" : "Mã vạch đã tồn tại");
}
function fail(res: any, e: any) { const message = e?.message || "Không thể xử lý sản phẩm"; res.status(message.includes("tồn tại") ? 409 : 400).json({ success: false, message }); }
const columns = "TenSanPham,MaDanhMuc,MaSKU,MaVach,ThuongHieu,XuatXu,ThanhPhan,CongDung,HuongDanSuDung,DoiTuongSuDung,LoaiDaPhuHop,CanhBaoKichUng,DungTich,DonVi,QuyCachDongGoi,GiaNhap,GiaBan,GiaKhuyenMai,SoLuong,NgaySanXuat,HanSuDung,NguongCanhBaoTonKho,NguonThongTin,MoTa,HinhAnh,TrangThai";
const values = columns.split(",").map((c) => `@${c}`).join(",");

const inventoryApply = `OUTER APPLY (SELECT COALESCE(SUM(l.SoLuongTon),0) TonThucTe,COALESCE(SUM(l.SoLuongDaGiu),0) DaGiu,
  COALESCE(SUM(CASE WHEN l.HanSuDung IS NULL OR l.HanSuDung>=CAST(GETDATE() AS date) THEN l.SoLuongTon-l.SoLuongDaGiu ELSE 0 END),0) CoTheBan
  FROM LoSanPham l WHERE l.MaSanPham=sp.MaSanPham AND l.TrangThai<>N'Đã hủy') inv`;

function normalizeVariant(raw: any) {
  const numeric = (v: unknown, name: string) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v); if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} phải là số dương hợp lệ`); return n;
  };
  const v = {
    MaBienThe: raw.MaBienThe == null || raw.MaBienThe === "" ? null : Number(raw.MaBienThe),
    MaSKU: String(raw.MaSKU || "").trim(),
    DungTich: numeric(raw.DungTich, "Dung tích"), DonViDungTich: nullable(raw.DonViDungTich),
    KhoiLuong: numeric(raw.KhoiLuong, "Khối lượng"), DonViKhoiLuong: nullable(raw.DonViKhoiLuong),
    MaMau: nullable(raw.MaMau), TenMau: nullable(raw.TenMau), MaHEX: nullable(raw.MaHEX),
    MuiHuong: nullable(raw.MuiHuong), QuyCachDongGoi: nullable(raw.QuyCachDongGoi),
    GiaBan: Number(raw.GiaBan), HinhAnh: nullable(raw.HinhAnh), TrangThai: raw.TrangThai === false || raw.TrangThai === 0 ? 0 : 1,
  };
  if (v.MaBienThe !== null && (!Number.isSafeInteger(v.MaBienThe) || v.MaBienThe <= 0)) throw new Error("Mã biến thể không hợp lệ");
  if (!v.MaSKU || v.MaSKU.length > 80) throw new Error("SKU biến thể là bắt buộc (tối đa 80 ký tự)");
  if (!Number.isFinite(v.GiaBan) || v.GiaBan < 0) throw new Error(`Giá bán của SKU ${v.MaSKU} không hợp lệ`);
  if (!v.DungTich && !v.KhoiLuong && !v.MaMau && !v.MuiHuong && !v.QuyCachDongGoi) throw new Error(`SKU ${v.MaSKU} phải có ít nhất một thuộc tính biến thể`);
  if (v.MaHEX && !/^#[0-9a-fA-F]{6}$/.test(String(v.MaHEX))) throw new Error(`Mã HEX của SKU ${v.MaSKU} phải theo dạng #RRGGBB`);
  const key = JSON.stringify([v.DungTich,v.DonViDungTich,v.KhoiLuong,v.DonViKhoiLuong,v.MaMau,v.TenMau,v.MaHEX,v.MuiHuong,v.QuyCachDongGoi].map(x => x == null ? null : String(x).trim().toLocaleLowerCase("vi-VN")));
  return { ...v, ThuocTinhKey: key };
}
async function getProductVariants(productId: number) {
  return query<any>(`SELECT v.*,ISNULL(i.TonThucTe,0) TonThucTe,ISNULL(i.DaGiu,0) DaGiu,ISNULL(i.CoTheBan,0) CoTheBan,
    CASE WHEN v.TrangThai=1 AND sp.TrangThai=1 AND sp.IsDeleted=0 AND ISNULL(i.CoTheBan,0)>0 THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END DuocBan
    FROM dbo.BienTheSanPham v JOIN dbo.SanPham sp ON sp.MaSanPham=v.MaSanPham
    OUTER APPLY(SELECT SUM(l.SoLuongTon) TonThucTe,SUM(l.SoLuongDaGiu) DaGiu,
      SUM(CASE WHEN l.HanSuDung IS NULL OR l.HanSuDung>=CONVERT(date,GETDATE()) THEN l.SoLuongTon-l.SoLuongDaGiu ELSE 0 END) CoTheBan
      FROM dbo.LoSanPham l WHERE l.MaBienThe=v.MaBienThe AND l.MaSanPham=v.MaSanPham AND l.TrangThai<>N'Đã hủy') i
    WHERE v.MaSanPham=@productId ORDER BY v.MaBienThe`, { productId });
}

router.put("/:id/bien-the", authorizeRoles(...STAFF), async (req: AuthRequest, res) => {
  const productId = Number(req.params.id); let tx: sql.Transaction | undefined;
  try {
    if (!Number.isSafeInteger(productId) || productId <= 0 || !Array.isArray(req.body?.BienThe)) throw new Error("Danh sách biến thể không hợp lệ");
    const variants = req.body.BienThe.map(normalizeVariant);
    if (new Set(variants.map((x:any)=>x.MaSKU.toLocaleLowerCase())).size !== variants.length) throw new Error("SKU biến thể bị trùng");
    if (new Set(variants.map((x:any)=>x.ThuocTinhKey)).size !== variants.length) throw new Error("Có tổ hợp thuộc tính biến thể bị trùng");
    const pool = await getPool(); tx = new sql.Transaction(pool); await tx.begin();
    const request = () => new sql.Request(tx!);
    const product = await request().input("productId", sql.Int, productId).query("SELECT MaSanPham FROM dbo.SanPham WITH(UPDLOCK,HOLDLOCK) WHERE MaSanPham=@productId AND IsDeleted=0");
    if (!product.recordset[0]) throw new Error("Sản phẩm không tồn tại");
    for (const v of variants) {
      const q=request().input("productId",sql.Int,productId).input("variantId",sql.Int,v.MaBienThe).input("sku",sql.VarChar(80),v.MaSKU).input("key",sql.NVarChar(1000),v.ThuocTinhKey)
        .input("volume",sql.Decimal(10,2),v.DungTich).input("volumeUnit",sql.NVarChar(20),v.DonViDungTich).input("weight",sql.Decimal(10,2),v.KhoiLuong).input("weightUnit",sql.NVarChar(20),v.DonViKhoiLuong)
        .input("color",sql.NVarChar(80),v.MaMau).input("colorName",sql.NVarChar(120),v.TenMau).input("hex",sql.Char(7),v.MaHEX).input("scent",sql.NVarChar(120),v.MuiHuong).input("pack",sql.NVarChar(120),v.QuyCachDongGoi)
        .input("price",sql.Decimal(18,2),v.GiaBan).input("image",sql.VarChar(500),v.HinhAnh).input("status",sql.Bit,v.TrangThai);
      if (v.MaBienThe) {
        const own=await request().input("variantId",sql.Int,v.MaBienThe).input("productId",sql.Int,productId).query("SELECT MaBienThe FROM dbo.BienTheSanPham WHERE MaBienThe=@variantId AND MaSanPham=@productId");
        if (!own.recordset[0]) throw new Error("Biến thể không thuộc sản phẩm đang sửa");
        await q.query(`UPDATE dbo.BienTheSanPham SET MaSKU=@sku,ThuocTinhKey=@key,DungTich=@volume,DonViDungTich=@volumeUnit,KhoiLuong=@weight,DonViKhoiLuong=@weightUnit,MaMau=@color,TenMau=@colorName,MaHEX=@hex,MuiHuong=@scent,QuyCachDongGoi=@pack,GiaBan=@price,HinhAnh=@image,TrangThai=@status,UpdatedAt=SYSDATETIME() WHERE MaBienThe=@variantId`);
      } else await q.query(`INSERT dbo.BienTheSanPham(MaSanPham,MaSKU,ThuocTinhKey,DungTich,DonViDungTich,KhoiLuong,DonViKhoiLuong,MaMau,TenMau,MaHEX,MuiHuong,QuyCachDongGoi,GiaBan,HinhAnh,TrangThai) VALUES(@productId,@sku,@key,@volume,@volumeUnit,@weight,@weightUnit,@color,@colorName,@hex,@scent,@pack,@price,@image,@status)`);
    }
    // Omitted variants are retained and disabled. Compare by submitted SKU after inserts so a newly-created
    // variant is not accidentally disabled because it did not have an ID at request start.
    const stored=(await request().input("productId",sql.Int,productId).query("SELECT MaBienThe,MaSKU FROM dbo.BienTheSanPham WHERE MaSanPham=@productId")).recordset;
    const wanted=new Set(variants.map((v:any)=>v.MaSKU.toLocaleLowerCase()));
    const disableIds=stored.filter((v:any)=>!wanted.has(String(v.MaSKU).toLocaleLowerCase())).map((v:any)=>Number(v.MaBienThe));
    if(disableIds.length) await request().input("productId",sql.Int,productId).query(`UPDATE dbo.BienTheSanPham SET TrangThai=0,UpdatedAt=SYSDATETIME() WHERE MaSanPham=@productId AND MaBienThe IN (${disableIds.join(",")})`);
    await tx.commit(); tx=undefined; res.json({success:true,data:await getProductVariants(productId)});
  } catch(e:any) { if(tx)try{await tx.rollback()}catch{}; const m=e?.message||"Không lưu được biến thể";res.status(m.includes("trùng")?409:m.includes("không tồn tại")?404:400).json({success:false,message:m}); }
});
router.get("/stats", authorizeRoles(...STAFF), async (_req, res) => { try { const data = await queryOne(`SELECT COUNT(*) TongSanPham,
  COALESCE(SUM(CASE WHEN sp.TrangThai=1 THEN 1 ELSE 0 END),0) DangBan,
  COALESCE(SUM(CASE WHEN inv.CoTheBan>0 AND inv.CoTheBan<=COALESCE(sp.NguongCanhBaoTonKho,10) THEN 1 ELSE 0 END),0) SapHetHang,
  COALESCE(SUM(CASE WHEN inv.CoTheBan<=0 THEN 1 ELSE 0 END),0) HetHang
  FROM SanPham sp ${inventoryApply} WHERE sp.IsDeleted=0`); res.json({ success:true,data }); } catch(e:any){res.status(500).json({success:false,message:e.message});} });
router.get("/filters", authorizeRoles(...STAFF), async (_req, res) => { try {
  const brands = await query<any>(`SELECT DISTINCT LTRIM(RTRIM(ThuongHieu)) ThuongHieu FROM SanPham WHERE IsDeleted=0 AND NULLIF(LTRIM(RTRIM(ThuongHieu)),'') IS NOT NULL ORDER BY ThuongHieu`);
  res.json({ success:true,data:{brands:brands.map((x:any)=>x.ThuongHieu)} });
} catch(e:any){res.status(500).json({success:false,message:e.message});} });

// Public facets are derived from sellable catalogue rows; no hard-coded filter values.
router.get("/facets", async (_req, res) => { try {
  const visible=`WITH VisibleCategories AS (SELECT MaDanhMuc,MaDanhMucCha FROM DanhMuc WHERE TrangThai=1 AND MaDanhMucCha IS NULL UNION ALL SELECT child.MaDanhMuc,child.MaDanhMucCha FROM DanhMuc child JOIN VisibleCategories parent ON child.MaDanhMucCha=parent.MaDanhMuc WHERE child.TrangThai=1) `;
  const brands = await query<any>(`${visible}SELECT DISTINCT LTRIM(RTRIM(sp.ThuongHieu)) value FROM SanPham sp JOIN VisibleCategories dm ON dm.MaDanhMuc=sp.MaDanhMuc WHERE sp.IsDeleted=0 AND sp.TrangThai=1 AND NULLIF(LTRIM(RTRIM(sp.ThuongHieu)),'') IS NOT NULL ORDER BY value OPTION (MAXRECURSION 100)`);
  const skinTypes = await query<any>(`${visible}SELECT DISTINCT LTRIM(RTRIM(sp.LoaiDaPhuHop)) value FROM SanPham sp JOIN VisibleCategories dm ON dm.MaDanhMuc=sp.MaDanhMuc WHERE sp.IsDeleted=0 AND sp.TrangThai=1 AND NULLIF(LTRIM(RTRIM(sp.LoaiDaPhuHop)),'') IS NOT NULL ORDER BY value OPTION (MAXRECURSION 100)`);
  res.json({ success:true,data:{brands:brands.map((x:any)=>x.value),skinTypes:skinTypes.map((x:any)=>x.value)} });
} catch(e:any){res.status(500).json({success:false,message:e.message});} });

router.get("/", async (req:AuthRequest,res)=>{try{
  const q:any=req.query, storefront=!req.user||req.user.VaiTro==="KhachHang", params:any={};
  const conditions=[storefront?"sp.IsDeleted=0 AND sp.TrangThai=1 AND dm.TrangThai=1":"sp.IsDeleted=0"];
  if(q.search){conditions.push("(sp.TenSanPham COLLATE Vietnamese_100_CI_AI LIKE @search OR sp.MaSKU LIKE @search OR sp.MaVach LIKE @search OR sp.ThuongHieu COLLATE Vietnamese_100_CI_AI LIKE @search)");params.search=`%${String(q.search).trim()}%`;}
  if(q.maDanhMuc){const id=Number(q.maDanhMuc);if(!Number.isInteger(id)||id<=0)return res.status(400).json({success:false,message:"Mã danh mục không hợp lệ"});params.maDanhMuc=id;conditions.push(storefront?"EXISTS(SELECT 1 FROM CategoryDescendants cd WHERE cd.MaSanPhamDanhMuc=sp.MaDanhMuc)":"sp.MaDanhMuc=@maDanhMuc");}
  if(storefront&&(q.chiSanPhamMoi==="true"||q.chiSanPhamMoi==="1"))conditions.push(`sp.NgayCongKhai IS NOT NULL AND ${STORE_NOW}<DATEADD(month,1,sp.NgayCongKhai)`);
  if(q.thuongHieu){conditions.push("sp.ThuongHieu=@thuongHieu");params.thuongHieu=q.thuongHieu;}
  if(q.loaiDa){conditions.push("sp.LoaiDaPhuHop COLLATE Vietnamese_100_CI_AI LIKE @loaiDa");params.loaiDa=`%${String(q.loaiDa).trim()}%`;}
  const giaTu=q.giaTu!==undefined&&q.giaTu!==""?Number(q.giaTu):undefined,giaDen=q.giaDen!==undefined&&q.giaDen!==""?Number(q.giaDen):undefined;
  if(giaTu!==undefined&&(!Number.isFinite(giaTu)||giaTu<0)||giaDen!==undefined&&(!Number.isFinite(giaDen)||giaDen<0))return res.status(400).json({success:false,message:"Khoảng giá không hợp lệ"});
  if(giaTu!==undefined&&giaDen!==undefined&&giaTu>giaDen)return res.status(400).json({success:false,message:"Giá từ phải nhỏ hơn hoặc bằng giá đến"});
  if(q.conHang==="true"||q.conHang==="1")conditions.push("inv.CoTheBan>0");
  if(!storefront&&q.trangThai!==undefined&&q.trangThai!==""){conditions.push("sp.TrangThai=@trangThai");params.trangThai=Number(q.trangThai)}
  if(!storefront&&q.tonKho==="het")conditions.push("inv.CoTheBan<=0");if(!storefront&&q.tonKho==="sapHet")conditions.push("inv.CoTheBan>0 AND inv.CoTheBan<=COALESCE(sp.NguongCanhBaoTonKho,10)");if(!storefront&&q.tonKho==="con")conditions.push("inv.CoTheBan>COALESCE(sp.NguongCanhBaoTonKho,10)");
  if(storefront&&!params.hasOwnProperty("maDanhMuc"))params.maDanhMuc=null;
  const visibleCte=storefront?`WITH VisibleCategories AS (
    SELECT MaDanhMuc,MaDanhMucCha FROM DanhMuc WHERE TrangThai=1 AND MaDanhMucCha IS NULL
    UNION ALL SELECT child.MaDanhMuc,child.MaDanhMucCha FROM DanhMuc child JOIN VisibleCategories parent ON child.MaDanhMucCha=parent.MaDanhMuc WHERE child.TrangThai=1
  ), CategoryDescendants AS (
    SELECT vc.MaDanhMuc MaSanPhamDanhMuc FROM VisibleCategories vc WHERE @maDanhMuc IS NOT NULL AND vc.MaDanhMuc=@maDanhMuc
    UNION ALL SELECT child.MaDanhMuc FROM VisibleCategories child JOIN CategoryDescendants parent ON child.MaDanhMucCha=parent.MaSanPhamDanhMuc
  ) `:"";
  if(storefront)conditions.push("EXISTS(SELECT 1 FROM VisibleCategories vc WHERE vc.MaDanhMuc=dm.MaDanhMuc)");
  const from=`FROM SanPham sp LEFT JOIN DanhMuc dm ON dm.MaDanhMuc=sp.MaDanhMuc ${inventoryApply}`;
  const limit=Math.min(Math.max(Number(q.limit||20),1),100),page=Math.max(Number(q.page||1),1);
  const sort=String(q.sort||"newest");
  const order=sort==="price_asc"?"sp.GiaBan ASC,sp.MaSanPham DESC":sort==="price_desc"?"sp.GiaBan DESC,sp.MaSanPham DESC":sort==="popular"?"COALESCE(sales.SoLuongDaBan,0) DESC,sp.MaSanPham DESC":sort==="new"?"sp.NgayCongKhai DESC,sp.MaSanPham DESC":"sp.NgayTao DESC,sp.MaSanPham DESC";
  const newOnly=storefront&&(q.chiSanPhamMoi==="true"||q.chiSanPhamMoi==="1");
  if(newOnly){params.offset=(page-1)*limit;params.limit=limit;}
  const rows=await query<any>(`${visibleCte}SELECT sp.*,dm.TenDanhMuc,inv.TonThucTe,inv.DaGiu,inv.CoTheBan,COALESCE(sales.SoLuongDaBan,0) SoLuongDaBan,CASE WHEN sp.NgayCongKhai IS NOT NULL AND ${STORE_NOW}<DATEADD(month,1,sp.NgayCongKhai) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END isNew,${STORE_NEW_UNTIL} newUntil,COALESCE(rating.DiemTrungBinh,0) DiemTrungBinh,COALESCE(rating.SoDanhGia,0) SoDanhGia,${newOnly?"COUNT(*) OVER()":"CAST(NULL AS int)"} totalCount ${from} OUTER APPLY (SELECT SUM(ct.SoLuong) SoLuongDaBan FROM ChiTietHoaDon ct JOIN HoaDon hd ON hd.MaHoaDon=ct.MaHoaDon WHERE ct.MaSanPham=sp.MaSanPham AND hd.TrangThai IN(N'DA_XAC_NHAN',N'DANG_CHUAN_BI',N'DA_DONG_GOI',N'DANG_GIAO',N'DA_GIAO',N'HOAN_THANH')) sales OUTER APPLY (SELECT AVG(CAST(d.SoSao AS decimal(5,2))) DiemTrungBinh,COUNT(*) SoDanhGia FROM DanhGiaSanPham d WHERE d.MaSanPham=sp.MaSanPham AND d.TrangThai='HIEN_THI') rating WHERE ${conditions.join(" AND ")} ORDER BY ${order}${newOnly?" OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY":""} OPTION (MAXRECURSION 100)`,params);
  let data=await attachPromotionPrices(rows);
  if(storefront&&(q.chiKhuyenMai==="true"||q.chiKhuyenMai==="1"))data=data.filter((row:any)=>row.DangKhuyenMai===true);
  if(storefront&&giaTu!==undefined)data=data.filter((row:any)=>Number(row.GiaKhuyenMaiHienTai??row.GiaBan)>=giaTu);
  if(storefront&&giaDen!==undefined)data=data.filter((row:any)=>Number(row.GiaKhuyenMaiHienTai??row.GiaBan)<=giaDen);
  if(q.sort==="price_asc")data.sort((a:any,b:any)=>Number(a.GiaKhuyenMaiHienTai??a.GiaBan)-Number(b.GiaKhuyenMaiHienTai??b.GiaBan));
  if(q.sort==="price_desc")data.sort((a:any,b:any)=>Number(b.GiaKhuyenMaiHienTai??b.GiaBan)-Number(a.GiaKhuyenMaiHienTai??a.GiaBan));
  const total=newOnly?Number(rows[0]?.totalCount||0):data.length, paged=newOnly?data:data.slice((page-1)*limit,page*limit);
  const publicData=storefront?paged.map((row:any)=>({...row,SoLuong:Number(row.CoTheBan??row.SoLuong??0)})):paged;
  res.json({success:true,data:publicData,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}})
}catch(e:any){res.status(500).json({success:false,message:e.message})}});
router.get("/:id",async(req:AuthRequest,res)=>{try{
  const storefront=!req.user||req.user.VaiTro==="KhachHang", id=Number(req.params.id);
  const visibleCte=storefront?`WITH VisibleCategories AS (SELECT MaDanhMuc,MaDanhMucCha FROM DanhMuc WHERE TrangThai=1 AND MaDanhMucCha IS NULL UNION ALL SELECT child.MaDanhMuc,child.MaDanhMucCha FROM DanhMuc child JOIN VisibleCategories parent ON child.MaDanhMucCha=parent.MaDanhMuc WHERE child.TrangThai=1) `:"";
  const product=await queryOne<any>(`${visibleCte}SELECT sp.*,dm.TenDanhMuc,inv.TonThucTe,inv.DaGiu,inv.CoTheBan,COALESCE(sales.SoLuongDaBan,0) SoLuongDaBan,CASE WHEN sp.NgayCongKhai IS NOT NULL AND ${STORE_NOW}<DATEADD(month,1,sp.NgayCongKhai) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END isNew,${STORE_NEW_UNTIL} newUntil,COALESCE(rating.DiemTrungBinh,0) DiemTrungBinh,COALESCE(rating.SoDanhGia,0) SoDanhGia FROM SanPham sp LEFT JOIN DanhMuc dm ON dm.MaDanhMuc=sp.MaDanhMuc ${inventoryApply} OUTER APPLY (SELECT SUM(ct.SoLuong) SoLuongDaBan FROM ChiTietHoaDon ct JOIN HoaDon hd ON hd.MaHoaDon=ct.MaHoaDon WHERE ct.MaSanPham=sp.MaSanPham AND hd.TrangThai IN(N'DA_XAC_NHAN',N'DANG_CHUAN_BI',N'DA_DONG_GOI',N'DANG_GIAO',N'DA_GIAO',N'HOAN_THANH')) sales OUTER APPLY (SELECT AVG(CAST(d.SoSao AS decimal(5,2))) DiemTrungBinh,COUNT(*) SoDanhGia FROM DanhGiaSanPham d WHERE d.MaSanPham=sp.MaSanPham AND d.TrangThai='HIEN_THI') rating WHERE sp.MaSanPham=@id AND sp.IsDeleted=0 ${storefront?"AND sp.TrangThai=1 AND EXISTS(SELECT 1 FROM VisibleCategories vc WHERE vc.MaDanhMuc=dm.MaDanhMuc)":""} OPTION (MAXRECURSION 100)`,{id});
  if(!product)return res.status(404).json({success:false,message:"Không tìm thấy sản phẩm đang được phép bán"});
  const [images,data,BienThe]=await Promise.all([query("SELECT MaHinhAnh,DuongDan,LaAnhDaiDien,ThuTu FROM SanPhamHinhAnh WHERE MaSanPham=@id ORDER BY LaAnhDaiDien DESC,ThuTu",{id}),attachPromotionPrices([{...product,SoLuong:Number(product.CoTheBan??product.SoLuong??0)}]),getProductVariants(id)]);
  res.json({success:true,data:{...data[0],HinhAnhChiTiet:images,BienThe}})
}catch(e:any){res.status(500).json({success:false,message:e.message})}});
router.post("/",authorizeRoles(...STAFF),async(req,res)=>{try{const v=input(req.body);v.SoLuong=0;await validate(v);const published=Number(v.TrangThai)===1;const r=await execute(`INSERT INTO SanPham (${columns},NgayCongKhai,DaTungCongKhai,NgayTao,UpdatedAt) OUTPUT INSERTED.MaSanPham VALUES (${values},${published?STORE_NOW:"NULL"},${published?1:0},GETDATE(),GETDATE())`,v);res.status(201).json({success:true,data:{MaSanPham:r.recordset[0].MaSanPham},message:"Đã tạo sản phẩm với tồn kho bằng 0; hãy dùng phiếu nhập để tăng tồn"})}catch(e:any){fail(res,e)}});
router.put("/:id",authorizeRoles(...STAFF),async(req,res)=>{try{const v=input(req.body),id=Number(req.params.id);const current=await queryOne<any>("SELECT MaSanPham,SoLuong,GiaKhuyenMai FROM SanPham WHERE MaSanPham=@id AND IsDeleted=0",{id});if(!current)throw new Error("Sản phẩm không tồn tại");v.SoLuong=current.SoLuong;if(req.body.GiaKhuyenMai===undefined)v.GiaKhuyenMai=current.GiaKhuyenMai;await validate(v,id);const update=columns.split(",").map(c=>`${c}=@${c}`).join(",");await execute(`UPDATE SanPham SET ${update},NgayCongKhai=CASE WHEN TrangThai=0 AND @TrangThai=1 AND DaTungCongKhai=0 THEN ${STORE_NOW} ELSE NgayCongKhai END,DaTungCongKhai=CASE WHEN TrangThai=0 AND @TrangThai=1 THEN 1 ELSE DaTungCongKhai END,UpdatedAt=GETDATE() WHERE MaSanPham=@id`,{...v,id});res.json({success:true,message:"Cập nhật thành công; tồn kho không bị thay đổi"})}catch(e:any){fail(res,e)}});
router.post("/:id/copy",authorizeRoles(...STAFF),async(req,res)=>{try{const source=await queryOne<any>("SELECT * FROM SanPham WHERE MaSanPham=@id AND IsDeleted=0",{id:Number(req.params.id)});if(!source)throw new Error("Sản phẩm không tồn tại");source.MaSKU=req.body.MaSKU||null;source.MaVach=req.body.MaVach||null;source.TenSanPham=req.body.TenSanPham||`${source.TenSanPham} (bản sao)`;const v=input(source);v.SoLuong=0;v.TrangThai=0;await validate(v);const r=await execute(`INSERT INTO SanPham (${columns},NgayCongKhai,DaTungCongKhai,NgayTao,UpdatedAt) OUTPUT INSERTED.MaSanPham VALUES (${values},NULL,0,GETDATE(),GETDATE())`,v);res.status(201).json({success:true,data:{MaSanPham:r.recordset[0].MaSanPham}})}catch(e:any){fail(res,e)}});
router.patch("/:id/status",authorizeRoles("Admin"),async(req,res)=>{try{const TrangThai=Number(req.body.TrangThai)?1:0;await execute(`UPDATE SanPham SET NgayCongKhai=CASE WHEN TrangThai=0 AND @TrangThai=1 AND DaTungCongKhai=0 THEN ${STORE_NOW} ELSE NgayCongKhai END,DaTungCongKhai=CASE WHEN TrangThai=0 AND @TrangThai=1 THEN 1 ELSE DaTungCongKhai END,TrangThai=@TrangThai,UpdatedAt=GETDATE() WHERE MaSanPham=@id AND IsDeleted=0`,{TrangThai,id:Number(req.params.id)});res.json({success:true})}catch(e:any){fail(res,e)}});
router.delete("/:id",authorizeRoles("Admin"),async(req,res)=>{try{const id=Number(req.params.id);if(await queryOne("SELECT 1 used FROM ChiTietHoaDon WHERE MaSanPham=@id",{id}))return res.status(409).json({success:false,message:"Sản phẩm đã phát sinh đơn hàng, không thể xóa"});await execute("UPDATE SanPham SET IsDeleted=1,TrangThai=0,UpdatedAt=GETDATE() WHERE MaSanPham=@id",{id});res.json({success:true,message:"Đã xóa mềm sản phẩm"})}catch(e:any){fail(res,e)}});
export default router;
