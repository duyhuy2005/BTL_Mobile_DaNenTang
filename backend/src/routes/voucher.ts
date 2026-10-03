import { Router } from "express";
import { AuthRequest, authorizeRoles } from "../middleware/auth";
import { getPool, query, queryOne, sql } from "../config/database";
import { evaluateVoucher, VoucherError, VoucherLine, txRequest } from "../services/voucher";
import { promotionForProduct } from "../services/khuyenmai";

const router = Router();
const admin = authorizeRoles("Admin");
const viewers = authorizeRoles("Admin", "NhanVien");
const customer = authorizeRoles("KhachHang");

function fail(res:any,error:any){
  const status=error instanceof VoucherError?error.status:error?.number===2601||error?.number===2627?409:500;
  if(status>=500) console.error("Voucher API failure:",error);
  const message=error instanceof VoucherError?error.message:status===409?"Mã voucher đã tồn tại hoặc dữ liệu đang được sử dụng.":"Không thể lưu voucher lúc này. Vui lòng kiểm tra dữ liệu và thử lại.";
  res.status(status).json({success:false,message});
}
function num(v:any, fallback=0){const x=Number(v);return Number.isFinite(x)?x:fallback;}
function ids(v:any):number[]{return Array.isArray(v)?[...new Set(v.map(Number).filter(Number.isInteger))]:[];}
export function voucherDate(value:unknown, field:"Ngày bắt đầu"|"Ngày kết thúc"):Date {
  if(typeof value!=="string") throw new VoucherError(400,`${field}: vui lòng chọn ngày giờ hợp lệ.`);
  const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if(!match) throw new VoucherError(400,`${field}: dùng định dạng ISO 8601 có múi giờ (ví dụ 2026-10-05T09:30:00+07:00).`);
  const [,ys,mos,ds,hs,mis,ss="00",fraction="0",zone]=match;
  const [y,mo,d,h,mi,s]=[ys,mos,ds,hs,mis,ss].map(Number);
  const milli=Number(fraction.padEnd(3,"0"));
  const calendar=new Date(Date.UTC(y,mo-1,d,h,mi,s,milli));
  if(y<1||calendar.getUTCFullYear()!==y||calendar.getUTCMonth()!==mo-1||calendar.getUTCDate()!==d||h>23||mi>59||s>59)
    throw new VoucherError(400,`${field}: ngày hoặc giờ không tồn tại.`);
  let offsetMinutes=0;
  if(zone!=="Z") {
    const sign=zone[0]==="+"?1:-1, offsetHour=Number(zone.slice(1,3)), offsetMinute=Number(zone.slice(4,6));
    if(offsetHour>14||offsetMinute>59||(offsetHour===14&&offsetMinute!==0)) throw new VoucherError(400,`${field}: múi giờ không hợp lệ.`);
    offsetMinutes=sign*(offsetHour*60+offsetMinute);
  }
  // Voucher time is stored as Asia/Ho_Chi_Minh wall time in the existing datetime2 columns.
  const shopTime=new Date(calendar.getTime()-(offsetMinutes*60_000)+(7*60*60_000));
  return new Date(shopTime.getUTCFullYear(),shopTime.getUTCMonth(),shopTime.getUTCDate(),shopTime.getUTCHours(),shopTime.getUTCMinutes(),shopTime.getUTCSeconds(),shopTime.getUTCMilliseconds());
}
async function customerId(req:AuthRequest){return (await queryOne<{MaKhachHang:number}>("SELECT MaKhachHang FROM KhachHang WHERE MaTaiKhoan=@id",{id:req.user!.MaTaiKhoan}))?.MaKhachHang;}
function state(v:any){
  if(v.TrangThai==="NHAP"||v.TrangThai==="TAM_DUNG"||v.TrangThai==="DA_HUY")return v.TrangThai;
  if(v.TrangThaiSQL)return v.TrangThaiSQL;
  if(new Date(v.NgayKetThuc).getTime()<=Date.now())return "HET_HAN";
  if(num(v.LuotDaSuDung)+num(v.LuotDangGiu)>=num(v.TongLuotSuDung))return "HET_LUOT";
  if(new Date(v.NgayBatDau).getTime()>Date.now())return "SAP_DIEN_RA";
  return "DANG_HOAT_DONG";
}
async function parseLines(tx:sql.Transaction,raw:any[]):Promise<VoucherLine[]>{
  if(!Array.isArray(raw)||!raw.length)throw new VoucherError(400,"Giỏ hàng đang trống");
  const merged=new Map<number,number>();
  for(const x of raw){const id=Number(x.MaSanPham),q=Number(x.SoLuong);if(!Number.isInteger(id)||!Number.isInteger(q)||q<1)throw new VoucherError(400,"Sản phẩm hoặc số lượng không hợp lệ");merged.set(id,(merged.get(id)||0)+q);}
  const result:VoucherLine[]=[];
  for(const [id,q] of merged){
    const p=(await txRequest(tx,{id}).query("SELECT MaSanPham,GiaBan,GiaKhuyenMai,MaDanhMuc,ThuongHieu,TrangThai,IsDeleted FROM SanPham WHERE MaSanPham=@id")).recordset[0];
    if(!p||!p.TrangThai||p.IsDeleted)throw new VoucherError(409,"Giỏ hàng có sản phẩm không còn được bán");
    const promo=await promotionForProduct({MaSanPham:id,MaDanhMuc:num(p.MaDanhMuc),ThuongHieu:p.ThuongHieu||null,GiaBan:num(p.GiaBan),SoLuong:q},tx);
    result.push({MaSanPham:id,SoLuong:q,DonGia:promo?.price??num(p.GiaBan),MaDanhMuc:num(p.MaDanhMuc),ThuongHieu:p.ThuongHieu||null,ChoPhepKetHopVoucher:promo?.combineVoucher??true,_basePrice:num(p.GiaBan),_minimum:promo?.minOrder||0,_hasProgram:Boolean(promo)} as any);
  }
  const subtotal=result.reduce((sum,line:any)=>sum+line.DonGia*line.SoLuong,0);
  return result.map((line:any)=>{const { _basePrice,_minimum,_hasProgram,...clean }=line;return _hasProgram&&subtotal<_minimum?{...clean,DonGia:_basePrice,ChoPhepKetHopVoucher:true}:clean;});
}
async function writeScope(tx:sql.Transaction,id:number,b:any){
  const categories=ids(b.MaDanhMuc),products=ids(b.MaSanPham),brands=Array.isArray(b.ThuongHieu)?[...new Set(b.ThuongHieu.map((x:any)=>String(x).trim()).filter(Boolean))]:[];
  if(b.PhamVi==="DANH_MUC"){
    if(!categories.length)throw new VoucherError(400,"Chọn ít nhất một danh mục");
    const found=(await txRequest(tx).query(`SELECT MaDanhMuc FROM DanhMuc WHERE TrangThai=1 AND MaDanhMuc IN (${categories.join(",")})`)).recordset.length;
    if(found!==categories.length)throw new VoucherError(400,"Danh mục không tồn tại hoặc đang ẩn");
  }
  if(b.PhamVi==="SAN_PHAM"){
    if(!products.length)throw new VoucherError(400,"Chọn ít nhất một sản phẩm");
    const found=(await txRequest(tx).query(`SELECT MaSanPham FROM SanPham WHERE TrangThai=1 AND IsDeleted=0 AND MaSanPham IN (${products.join(",")})`)).recordset.length;
    if(found!==products.length)throw new VoucherError(400,"Sản phẩm không tồn tại hoặc ngừng bán");
  }
  if(b.PhamVi==="THUONG_HIEU"){
    if(!brands.length)throw new VoucherError(400,"Chọn ít nhất một thương hiệu");
    for(const brand of brands){const found=await txRequest(tx,{brand}).query("SELECT TOP 1 1 FROM SanPham WHERE TrangThai=1 AND IsDeleted=0 AND ThuongHieu=@brand");if(!found.recordset.length)throw new VoucherError(400,`Thương hiệu ${brand} không có sản phẩm đang bán`);}
  }
  if(b.DoiTuong==="KHACH_HANG_CU_THE"){
    const customers=ids(b.MaKhachHang);if(!customers.length)throw new VoucherError(400,"Chọn khách hàng được nhận voucher");
    const found=await txRequest(tx).query(`SELECT MaKhachHang FROM KhachHang WHERE MaKhachHang IN (${customers.join(",")})`);if(found.recordset.length!==customers.length)throw new VoucherError(400,"Có khách hàng không tồn tại");
    for(const cid of customers)await txRequest(tx,{id,cid}).query("INSERT VoucherKhachHang(VoucherId,MaKhachHang) VALUES(@id,@cid)");
  }
  for(const cid of categories)await txRequest(tx,{id,cid}).query("INSERT VoucherDanhMuc(VoucherId,MaDanhMuc) VALUES(@id,@cid)");
  for(const pid of products)await txRequest(tx,{id,pid}).query("INSERT VoucherSanPham(VoucherId,MaSanPham) VALUES(@id,@pid)");
  for(const brand of brands)await txRequest(tx,{id,brand}).query("INSERT VoucherThuongHieu(VoucherId,TenThuongHieu) VALUES(@id,@brand)");
}
function validate(b:any){
  const types=["PHAN_TRAM","SO_TIEN_CO_DINH","MIEN_GIAM_PHI_SHIP"],scopes=["TOAN_BO_DON_HANG","DANH_MUC","SAN_PHAM","THUONG_HIEU","PHI_VAN_CHUYEN"],audiences=["TAT_CA_KHACH_HANG","KHACH_HANG_MOI","KHACH_HANG_CU_THE"];
  if(!String(b.MaVoucher||"").trim()||!String(b.TenChuongTrinh||"").trim())throw new VoucherError(400,"Nhập mã voucher và tên chương trình");
  if(!types.includes(b.LoaiGiam)||!scopes.includes(b.PhamVi)||!audiences.includes(b.DoiTuong))throw new VoucherError(400,"Loại giảm, phạm vi hoặc đối tượng không hợp lệ");
  if((b.LoaiGiam==="MIEN_GIAM_PHI_SHIP")!==(b.PhamVi==="PHI_VAN_CHUYEN"))throw new VoucherError(400,"Voucher phí vận chuyển phải dùng đúng loại giảm và phạm vi phí vận chuyển");
  if(num(b.GiaTri)<0||num(b.DonHangToiThieu)<0||num(b.TongLuotSuDung)<1||num(b.MoiKhachToiDa)<1)throw new VoucherError(400,"Giá trị hoặc giới hạn voucher không hợp lệ");
  if(b.LoaiGiam==="PHAN_TRAM"&&(num(b.GiaTri)<1||num(b.GiaTri)>100))throw new VoucherError(400,"Phần trăm giảm phải từ 1 đến 100");
  if(b.GiamToiDa!==null&&b.GiamToiDa!==""&&num(b.GiamToiDa)<0)throw new VoucherError(400,"Mức giảm tối đa không hợp lệ");
  b.NgayBatDau=voucherDate(b.NgayBatDau,"Ngày bắt đầu");
  b.NgayKetThuc=voucherDate(b.NgayKetThuc,"Ngày kết thúc");
  if(b.NgayBatDau.getTime()>=b.NgayKetThuc.getTime()) throw new VoucherError(400,"Ngày bắt đầu phải trước ngày kết thúc.");
}

// Customer routes are declared before /:id to keep these names from being parsed as IDs.
router.get("/kha-dung",customer,async(req:AuthRequest,res)=>{try{
  const cid=await customerId(req);if(!cid)return res.status(404).json({success:false,message:"Không tìm thấy hồ sơ khách hàng"});
  const rows=await query<any>(`SELECT v.*,CASE WHEN v.NgayKetThuc<=SYSDATETIME() THEN 'HET_HAN' WHEN v.LuotDaSuDung+v.LuotDangGiu>=v.TongLuotSuDung THEN 'HET_LUOT' WHEN v.NgayBatDau>SYSDATETIME() THEN 'SAP_DIEN_RA' ELSE 'DANG_HOAT_DONG' END TrangThaiSQL FROM Voucher v WHERE v.TrangThai='DANG_HOAT_DONG' AND v.NgayBatDau<=SYSDATETIME() AND v.NgayKetThuc>SYSDATETIME()
    AND (v.DoiTuong<>'KHACH_HANG_CU_THE' OR EXISTS(SELECT 1 FROM VoucherKhachHang x WHERE x.VoucherId=v.Id AND x.MaKhachHang=@cid))
    AND (v.DoiTuong<>'KHACH_HANG_MOI' OR NOT EXISTS(SELECT 1 FROM HoaDon h WHERE h.MaKhachHang=@cid AND h.TrangThai IN(N'HOAN_THANH',N'DA_GIAO')))
    AND (SELECT COUNT(1) FROM LichSuSuDungVoucher l WHERE l.VoucherId=v.Id AND l.MaKhachHang=@cid AND l.TrangThai IN('DA_GIU_LUOT','DA_SU_DUNG'))<v.MoiKhachToiDa
    AND (v.TrangThai<>'DANG_HOAT_DONG' OR v.LuotDaSuDung+v.LuotDangGiu<v.TongLuotSuDung)
    ORDER BY CASE WHEN v.TrangThai='DANG_HOAT_DONG' THEN 0 ELSE 1 END,v.NgayKetThuc`,{cid});
  res.json({success:true,data:rows.map(x=>({...x,TrangThaiHienThi:state(x)}))});
}catch(e){fail(res,e);}});
router.get("/cua-toi",customer,async(req:AuthRequest,res)=>{try{const cid=await customerId(req);if(!cid)return res.status(404).json({success:false,message:"Không tìm thấy hồ sơ khách hàng"});const rows=await query<any>(`SELECT v.*,u.TrangThai TrangThaiLuu,
    (SELECT COUNT(1) FROM LichSuSuDungVoucher l WHERE l.VoucherId=v.Id AND l.MaKhachHang=@cid AND l.TrangThai='DA_SU_DUNG') LuotKhachDaDung,
    CASE WHEN v.TrangThai IN('NHAP','TAM_DUNG','DA_HUY') THEN v.TrangThai WHEN v.NgayKetThuc<=SYSDATETIME() THEN 'HET_HAN' WHEN v.NgayBatDau>SYSDATETIME() THEN 'SAP_DIEN_RA' WHEN v.LuotDaSuDung+v.LuotDangGiu>=v.TongLuotSuDung THEN 'HET_LUOT' WHEN (SELECT COUNT(1) FROM LichSuSuDungVoucher l WHERE l.VoucherId=v.Id AND l.MaKhachHang=@cid AND l.TrangThai IN('DA_GIU_LUOT','DA_SU_DUNG'))>=v.MoiKhachToiDa THEN 'DA_DUNG' ELSE 'DANG_HOAT_DONG' END TrangThaiSQL
    FROM Voucher v LEFT JOIN VoucherNguoiDung u ON u.VoucherId=v.Id AND u.MaKhachHang=@cid
    WHERE u.MaKhachHang=@cid
       OR EXISTS(SELECT 1 FROM LichSuSuDungVoucher l WHERE l.VoucherId=v.Id AND l.MaKhachHang=@cid)
       OR (v.TrangThai='DANG_HOAT_DONG' AND v.NgayBatDau<=SYSDATETIME() AND v.NgayKetThuc>SYSDATETIME()
          AND v.LuotDaSuDung+v.LuotDangGiu<v.TongLuotSuDung
          AND (v.DoiTuong<>'KHACH_HANG_CU_THE' OR EXISTS(SELECT 1 FROM VoucherKhachHang x WHERE x.VoucherId=v.Id AND x.MaKhachHang=@cid))
          AND (v.DoiTuong<>'KHACH_HANG_MOI' OR NOT EXISTS(SELECT 1 FROM HoaDon h WHERE h.MaKhachHang=@cid AND h.TrangThai IN(N'HOAN_THANH',N'DA_GIAO')))
          AND (SELECT COUNT(1) FROM LichSuSuDungVoucher l WHERE l.VoucherId=v.Id AND l.MaKhachHang=@cid AND l.TrangThai IN('DA_GIU_LUOT','DA_SU_DUNG'))<v.MoiKhachToiDa)
    ORDER BY COALESCE(u.CreatedAt,v.CreatedAt) DESC`,{cid});res.json({success:true,data:rows.map(x=>({...x,TrangThaiHienThi:state(x),LyDoKhongDung:x.TrangThaiSQL==='HET_LUOT'?'Voucher đã hết lượt sử dụng':x.TrangThaiSQL==='DA_DUNG'?'Bạn đã dùng hết lượt cho phép':x.TrangThaiSQL==='HET_HAN'?'Voucher đã hết hạn':x.TrangThaiSQL==='TAM_DUNG'?'Voucher đang tạm dừng':x.TrangThaiSQL==='NHAP'?'Voucher chưa được phát hành':x.TrangThaiSQL==='DA_HUY'?'Voucher đã bị hủy':null}))});}catch(e){fail(res,e);}});
router.post("/:id/luu",customer,async(req:AuthRequest,res)=>{try{const cid=await customerId(req);if(!cid)return res.status(404).json({success:false,message:"Không tìm thấy hồ sơ khách hàng"});const id=Number(req.params.id);const v=await queryOne<any>("SELECT * FROM Voucher WHERE Id=@id AND TrangThai='DANG_HOAT_DONG' AND NgayBatDau<=SYSDATETIME() AND NgayKetThuc>SYSDATETIME() AND LuotDaSuDung+LuotDangGiu<TongLuotSuDung",{id});if(!v)throw new VoucherError(409,"Voucher hiện không thể lưu");if(v.DoiTuong==="KHACH_HANG_CU_THE"&&!await queryOne("SELECT 1 ok FROM VoucherKhachHang WHERE VoucherId=@id AND MaKhachHang=@cid",{id,cid}))throw new VoucherError(403,"Voucher này không dành cho tài khoản của bạn");if(v.DoiTuong==="KHACH_HANG_MOI"&&await queryOne("SELECT TOP 1 1 Found FROM HoaDon WHERE MaKhachHang=@cid AND TrangThai IN(N'HOAN_THANH',N'DA_GIAO')",{cid}))throw new VoucherError(403,"Voucher này chỉ dành cho khách hàng mới");await query("IF NOT EXISTS(SELECT 1 FROM VoucherNguoiDung WHERE VoucherId=@id AND MaKhachHang=@cid) INSERT VoucherNguoiDung(VoucherId,MaKhachHang) VALUES(@id,@cid)",{id,cid});res.json({success:true,message:"Đã lưu voucher"});}catch(e){fail(res,e);}});
router.delete("/:id/bo-luu",customer,async(req:AuthRequest,res)=>{try{const cid=await customerId(req);await query("DELETE FROM VoucherNguoiDung WHERE VoucherId=@id AND MaKhachHang=@cid AND TrangThai='DA_LUU'",{id:Number(req.params.id),cid});res.json({success:true,message:"Đã bỏ lưu voucher"});}catch(e){fail(res,e);}});
// Read-only checkout quote: evaluate every active voucher against current server prices,
// rank by the actual discount, and roll back the read transaction (no usage is consumed).
router.post("/checkout-options",customer,async(req:AuthRequest,res)=>{let tx:sql.Transaction|undefined;try{
  const cid=await customerId(req);if(!cid)throw new VoucherError(404,"Không tìm thấy hồ sơ khách hàng");
  const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();
  const lines=await parseLines(tx,req.body.danhSachSanPham);
  const mode=String(req.body.mode||"AUTO").toUpperCase();
  if(!["AUTO","MANUAL","NONE"].includes(mode))throw new VoucherError(400,"Chế độ chọn voucher không hợp lệ");
  const rows=(await txRequest(tx,{cid}).query(`SELECT TOP 200 v.* FROM Voucher v WHERE v.TrangThai='DANG_HOAT_DONG' AND v.NgayBatDau<=SYSDATETIME() AND v.NgayKetThuc>SYSDATETIME() AND v.LuotDaSuDung+v.LuotDangGiu<v.TongLuotSuDung AND (v.DoiTuong<>'KHACH_HANG_CU_THE' OR EXISTS(SELECT 1 FROM VoucherKhachHang x WHERE x.VoucherId=v.Id AND x.MaKhachHang=@cid)) AND (v.DoiTuong<>'KHACH_HANG_MOI' OR NOT EXISTS(SELECT 1 FROM HoaDon h WHERE h.MaKhachHang=@cid AND h.TrangThai IN(N'HOAN_THANH',N'DA_GIAO'))) AND (SELECT COUNT(1) FROM LichSuSuDungVoucher l WHERE l.VoucherId=v.Id AND l.MaKhachHang=@cid AND l.TrangThai IN('DA_GIU_LUOT','DA_SU_DUNG'))<v.MoiKhachToiDa ORDER BY v.NgayKetThuc,v.Id`)).recordset;
  const offers:any[]=[];
  for(const voucher of rows){
    try{const evaluation=await evaluateVoucher(tx,String(voucher.MaVoucher),Number(cid),lines,0,{pendingShipping:true,allowBelowMinimum:true});
      const promotionConflict=evaluation.loaiApDung==="SAN_PHAM"&&lines.some((line:any)=>line.ChoPhepKetHopVoucher===false);
      const eligible=evaluation.thieu===0&&!evaluation.pendingShipping&&!promotionConflict;
      offers.push({MaVoucher:voucher.MaVoucher,TenChuongTrinh:voucher.TenChuongTrinh,LoaiApDung:evaluation.loaiApDung,HopLe:eligible,ThongBao:promotionConflict?"Khuyến mại của sản phẩm không cho phép kết hợp voucher.":evaluation.pendingShipping?"Phí vận chuyển chưa được báo giá; chưa thể áp dụng voucher phí ship.":(eligible?null:`Cần mua thêm ${Math.ceil(evaluation.thieu).toLocaleString("vi-VN")}đ để đủ điều kiện.`),SoTienGiamTamTinh:evaluation.soTienGiam,PhiVanChuyenChuaBiet:evaluation.pendingShipping});
    }catch(error){offers.push({MaVoucher:voucher.MaVoucher,TenChuongTrinh:voucher.TenChuongTrinh,LoaiApDung:voucher.LoaiGiam==="MIEN_GIAM_PHI_SHIP"?"PHI_SHIP":"SAN_PHAM",HopLe:false,ThongBao:error instanceof Error?error.message:"Voucher hiện không áp dụng được.",SoTienGiamTamTinh:0});}
  }
  const selectedCodes:string[]=[];
  if(mode==="AUTO"){
    const best=offers.filter(x=>x.HopLe&&x.LoaiApDung==="SAN_PHAM").sort((a,b)=>Number(b.SoTienGiamTamTinh)-Number(a.SoTienGiamTamTinh))[0];
    if(best)selectedCodes.push(best.MaVoucher);
  }else if(mode==="MANUAL"){
    const productCode=String(req.body.MaVoucher||"").trim().toUpperCase();const shippingCode=String(req.body.MaVoucherPhiShip||"").trim().toUpperCase();
    for(const code of [productCode,shippingCode])if(code&&!selectedCodes.includes(code))selectedCodes.push(code);
  }
  for(const code of selectedCodes){
    if(offers.some(x=>String(x.MaVoucher).toUpperCase()===code))continue;
    try{const evaluation=await evaluateVoucher(tx,code,Number(cid),lines,0,{pendingShipping:true,allowBelowMinimum:true});const conflict=evaluation.loaiApDung==="SAN_PHAM"&&lines.some((line:any)=>line.ChoPhepKetHopVoucher===false);offers.push({MaVoucher:evaluation.voucher.MaVoucher,TenChuongTrinh:evaluation.voucher.TenChuongTrinh,LoaiApDung:evaluation.loaiApDung,HopLe:evaluation.thieu===0&&!evaluation.pendingShipping&&!conflict,ThongBao:conflict?"Khuyến mại của sản phẩm không cho phép kết hợp voucher.":evaluation.pendingShipping?"Phí vận chuyển chưa được báo giá; chưa thể áp dụng voucher phí ship.":(evaluation.thieu?`Cần mua thêm ${Math.ceil(evaluation.thieu).toLocaleString("vi-VN")}đ để đủ điều kiện.`:null),SoTienGiamTamTinh:evaluation.soTienGiam,PhiVanChuyenChuaBiet:evaluation.pendingShipping});}
    catch(error){offers.push({MaVoucher:code,LoaiApDung:"SAN_PHAM",HopLe:false,ThongBao:error instanceof Error?error.message:"Voucher hiện không áp dụng được.",SoTienGiamTamTinh:0});}
  }
  let applied=selectedCodes.map(code=>offers.find(x=>String(x.MaVoucher).toUpperCase()===code)).filter(Boolean);
  const invalid=applied.find(x=>!x.HopLe);
  const invalidProduct=applied.find(x=>!x.HopLe&&x.LoaiApDung==="SAN_PHAM");
  if(invalidProduct)applied=[];
  else applied=applied.filter(x=>x.HopLe);
  if(applied.length===2){
    const compatible=(await txRequest(tx,{code1:applied[0].MaVoucher,code2:applied[1].MaVoucher}).query("SELECT COUNT(1) n FROM Voucher WHERE MaVoucherKey IN(@code1,@code2) AND ChoPhepKetHopPhiShip=1")).recordset[0]?.n;
    if(Number(compatible)!==2)applied=[];
  }
  const subtotal=lines.reduce((sum,line)=>sum+line.DonGia*line.SoLuong,0);
  const discount=applied.reduce((sum,x)=>sum+Number(x.SoTienGiamTamTinh||0),0);
  await tx.rollback();tx=undefined;
  res.json({success:true,data:{mode,offers,selected:applied.map(x=>x.MaVoucher),voucher:applied,subtotal,discount,totalAfterDiscount:Math.max(0,subtotal-discount),selectionReason:invalid?.ThongBao||null,shippingPending:applied.some(x=>x.PhiVanChuyenChuaBiet),notice:"Báo giá tạm tính từ giá hiện tại; voucher và giá sẽ được kiểm tra lại khi tạo đơn."}});
}catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e);}});
router.post("/kiem-tra",customer,async(req:AuthRequest,res)=>{let tx:sql.Transaction|undefined;try{const cid=await customerId(req);if(!cid)throw new VoucherError(404,"Không tìm thấy hồ sơ khách hàng");const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();const lines=await parseLines(tx,req.body.danhSachSanPham);const codes=[req.body.MaVoucher,req.body.MaVoucherPhiShip].filter(Boolean);if(codes.length>2)throw new VoucherError(400,"Chỉ dùng tối đa hai voucher");const result:any[]=[];for(const code of codes){const evaluation=await evaluateVoucher(tx,String(code),cid,lines,num(req.body.PhiVanChuyen),{pendingShipping:true,allowBelowMinimum:true});result.push({MaVoucher:evaluation.voucher.MaVoucher,LoaiApDung:evaluation.loaiApDung,HopLe:evaluation.thieu===0,ThongBao:evaluation.thieu?`Cần mua thêm ${Math.ceil(evaluation.thieu).toLocaleString('vi-VN')}đ để đủ điều kiện`:null,Thieu:evaluation.thieu,SoTienGiamTamTinh:evaluation.soTienGiam,GiaTriDuocApDung:evaluation.giaTriDuocApDung,MaSanPhamDuocApDung:evaluation.loaiApDung==="SAN_PHAM"?evaluation.eligible.map(x=>x.MaSanPham):[],MaSanPhamKhongDuocApDung:evaluation.loaiApDung==="SAN_PHAM"?lines.filter(x=>!evaluation.eligible.some(y=>y.MaSanPham===x.MaSanPham)).map(x=>x.MaSanPham):[],PhiVanChuyenChuaBiet:evaluation.pendingShipping});}if(result.length===2){const vv=(await txRequest(tx,{code1:String(codes[0]).trim().toUpperCase(),code2:String(codes[1]).trim().toUpperCase()}).query("SELECT Id,ChoPhepKetHopPhiShip FROM Voucher WHERE MaVoucherKey IN(@code1,@code2)")).recordset;if(vv.length!==2||vv.some((x:any)=>!x.ChoPhepKetHopPhiShip))throw new VoucherError(409,"Hai voucher này không được phép kết hợp");}const subtotal=lines.reduce((s,x)=>s+x.DonGia*x.SoLuong,0),discount=result.filter(x=>x.LoaiApDung==="SAN_PHAM").reduce((s,x)=>s+x.SoTienGiamTamTinh,0)+result.filter(x=>x.LoaiApDung==="PHI_SHIP").reduce((s,x)=>s+x.SoTienGiamTamTinh,0);await tx.rollback();tx=undefined;res.json({success:true,data:{voucher:result,tamTinh:subtotal,tongTienSauGiam:Math.max(0,subtotal+num(req.body.PhiVanChuyen)-discount),thongBao:"Tiền giảm chỉ là tạm tính; hệ thống kiểm tra lại khi đặt hàng."}});}catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e);}});
router.post("/goi-y-tot-nhat",customer,async(req:AuthRequest,res)=>{try{const cid=await customerId(req);if(!cid)return res.json({success:true,data:null});const list=await query<any>("SELECT TOP 100 MaVoucher,LoaiGiam,PhamVi,NgayKetThuc FROM Voucher WHERE TrangThai='DANG_HOAT_DONG' AND NgayBatDau<=SYSDATETIME() AND NgayKetThuc>SYSDATETIME() AND LuotDaSuDung+LuotDangGiu<TongLuotSuDung AND (DoiTuong<>'KHACH_HANG_CU_THE' OR EXISTS(SELECT 1 FROM VoucherKhachHang x WHERE x.VoucherId=Voucher.Id AND x.MaKhachHang=@cid)) AND (DoiTuong<>'KHACH_HANG_MOI' OR NOT EXISTS(SELECT 1 FROM HoaDon h WHERE h.MaKhachHang=@cid AND h.TrangThai IN(N'HOAN_THANH',N'DA_GIAO'))) AND (SELECT COUNT(1) FROM LichSuSuDungVoucher l WHERE l.VoucherId=Voucher.Id AND l.MaKhachHang=@cid AND l.TrangThai IN('DA_GIU_LUOT','DA_SU_DUNG'))<MoiKhachToiDa ORDER BY GiaTri DESC",{cid});res.json({success:true,data:list[0]||null});}catch(e){fail(res,e);}});

router.get("/thong-ke",viewers,async(_req,res)=>{try{const data=await queryOne<any>(`SELECT SUM(CASE WHEN TrangThai='DANG_HOAT_DONG' AND NgayBatDau<=SYSDATETIME() AND NgayKetThuc>SYSDATETIME() AND LuotDaSuDung+LuotDangGiu<TongLuotSuDung THEN 1 ELSE 0 END) DangHoatDong,SUM(CASE WHEN TrangThai<>'DA_HUY' AND NgayBatDau>SYSDATETIME() THEN 1 ELSE 0 END) SapDienRa,SUM(CASE WHEN NgayKetThuc<=SYSDATETIME() OR TrangThai='HET_HAN' THEN 1 ELSE 0 END) HetHan,(SELECT COUNT(1) FROM LichSuSuDungVoucher WHERE TrangThai='DA_SU_DUNG' AND NgayCapNhat>=CONVERT(date,GETDATE())) LuotDungHomNay,(SELECT ISNULL(SUM(l.SoTienGiam),0) FROM LichSuSuDungVoucher l WHERE l.TrangThai='DA_SU_DUNG' AND l.NgayCapNhat>=DATEFROMPARTS(YEAR(GETDATE()),MONTH(GETDATE()),1)) TongGiamThang FROM Voucher`);res.json({success:true,data});}catch(e){fail(res,e);}});
router.get("/",viewers,async(req,res)=>{try{const rows=await query<any>(`SELECT *,CASE WHEN TrangThai IN('NHAP','TAM_DUNG','DA_HUY') THEN TrangThai WHEN NgayKetThuc<=SYSDATETIME() THEN 'HET_HAN' WHEN LuotDaSuDung+LuotDangGiu>=TongLuotSuDung THEN 'HET_LUOT' WHEN NgayBatDau>SYSDATETIME() THEN 'SAP_DIEN_RA' ELSE 'DANG_HOAT_DONG' END TrangThaiSQL FROM Voucher ORDER BY CreatedAt DESC`);const status=String(req.query.trangThai||""),type=String(req.query.loaiGiam||""),scope=String(req.query.phamVi||""),search=String(req.query.search||"").toLocaleLowerCase();const filtered=rows.map(v=>({...v,TrangThaiHienThi:state(v)})).filter(v=>(!status||status===v.TrangThaiHienThi||status===v.TrangThai)&&(!type||type===v.LoaiGiam)&&(!scope||scope===v.PhamVi)&&(!search||`${v.MaVoucher} ${v.TenChuongTrinh}`.toLocaleLowerCase().includes(search)));const page=Math.max(1,num(req.query.page,1)),limit=Math.min(100,Math.max(1,num(req.query.limit,10))),total=filtered.length;res.json({success:true,data:filtered.slice((page-1)*limit,page*limit),pagination:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}});}catch(e){fail(res,e);}});
router.get("/:id/lich-su-su-dung",viewers,async(req,res)=>{try{res.json({success:true,data:await query<any>("SELECT l.*,kh.HoTen,hd.NgayLap FROM LichSuSuDungVoucher l JOIN KhachHang kh ON kh.MaKhachHang=l.MaKhachHang LEFT JOIN HoaDon hd ON hd.MaHoaDon=l.MaHoaDon WHERE l.VoucherId=@id ORDER BY l.NgayTao DESC",{id:Number(req.params.id)})});}catch(e){fail(res,e);}});
router.get("/:id/lich-su-thay-doi",viewers,async(req,res)=>{try{res.json({success:true,data:await query<any>("SELECT l.Id,l.HanhDong,l.ChiTiet,l.CreatedAt,COALESCE(tk.TenDangNhap,N'Hệ thống') NguoiThayDoi FROM LichSuThayDoiVoucher l LEFT JOIN TaiKhoan tk ON tk.MaTaiKhoan=l.MaTaiKhoan WHERE l.VoucherId=@id ORDER BY l.CreatedAt DESC,l.Id DESC",{id:Number(req.params.id)})});}catch(e){fail(res,e);}});
router.get("/:id/don-hang",viewers,async(req,res)=>{try{res.json({success:true,data:await query<any>("SELECT hd.MaHoaDon,hd.NgayLap,hd.TrangThai,hv.LoaiApDung,hv.SoTienGiam,hv.MaVoucherSnapshot FROM HoaDonVoucher hv JOIN HoaDon hd ON hd.MaHoaDon=hv.MaHoaDon WHERE hv.VoucherId=@id ORDER BY hd.NgayLap DESC",{id:Number(req.params.id)})});}catch(e){fail(res,e);}});
router.get("/:id",viewers,async(req,res)=>{try{const id=Number(req.params.id);const v=await queryOne<any>("SELECT *,CASE WHEN TrangThai IN('NHAP','TAM_DUNG','DA_HUY') THEN TrangThai WHEN NgayKetThuc<=SYSDATETIME() THEN 'HET_HAN' WHEN LuotDaSuDung+LuotDangGiu>=TongLuotSuDung THEN 'HET_LUOT' WHEN NgayBatDau>SYSDATETIME() THEN 'SAP_DIEN_RA' ELSE 'DANG_HOAT_DONG' END TrangThaiSQL FROM Voucher WHERE Id=@id",{id});if(!v)return res.status(404).json({success:false,message:"Không tìm thấy voucher"});const [c,p,b,k]=await Promise.all([query<any>("SELECT MaDanhMuc FROM VoucherDanhMuc WHERE VoucherId=@id",{id}),query<any>("SELECT MaSanPham FROM VoucherSanPham WHERE VoucherId=@id",{id}),query<any>("SELECT TenThuongHieu FROM VoucherThuongHieu WHERE VoucherId=@id",{id}),query<any>("SELECT MaKhachHang FROM VoucherKhachHang WHERE VoucherId=@id",{id})]);res.json({success:true,data:{...v,TrangThaiHienThi:state(v),MaDanhMuc:c.map(x=>x.MaDanhMuc),MaSanPham:p.map(x=>x.MaSanPham),ThuongHieu:b.map(x=>x.TenThuongHieu),MaKhachHang:k.map(x=>x.MaKhachHang)}});}catch(e){fail(res,e);}});
router.post("/",admin,async(req:AuthRequest,res)=>{let tx:sql.Transaction|undefined;try{const b=req.body;validate(b);const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();const status=b.TrangThai==="NHAP"?"NHAP":"DANG_HOAT_DONG";const inserted=await txRequest(tx,{...b,actor:req.user!.MaTaiKhoan,status}).query(`INSERT Voucher(MaVoucher,TenChuongTrinh,MoTa,LoaiGiam,GiaTri,GiamToiDa,DonHangToiThieu,TongLuotSuDung,MoiKhachToiDa,PhamVi,DoiTuong,ChoPhepKetHopPhiShip,TuDongKichHoat,NgayBatDau,NgayKetThuc,TrangThai,CreatedBy,UpdatedBy) OUTPUT INSERTED.Id VALUES(@MaVoucher,@TenChuongTrinh,@MoTa,@LoaiGiam,@GiaTri,@GiamToiDa,@DonHangToiThieu,@TongLuotSuDung,@MoiKhachToiDa,@PhamVi,@DoiTuong,@ChoPhepKetHopPhiShip,@TuDongKichHoat,@NgayBatDau,@NgayKetThuc,@status,@actor,@actor)`);const id=inserted.recordset[0].Id;await writeScope(tx,id,b);await txRequest(tx,{id,actor:req.user!.MaTaiKhoan}).query("INSERT LichSuThayDoiVoucher(VoucherId,MaTaiKhoan,HanhDong,ChiTiet) VALUES(@id,@actor,'TAO',N'Tạo voucher')");await tx.commit();tx=undefined;res.status(201).json({success:true,data:{Id:id}});}catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e);}});
router.put("/:id",admin,async(req:AuthRequest,res)=>{let tx:sql.Transaction|undefined;try{
  const b=req.body,id=Number(req.params.id);validate(b);const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();
  const old=(await txRequest(tx,{id}).query("SELECT * FROM Voucher WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id")).recordset[0];if(!old)throw new VoucherError(404,"Không tìm thấy voucher");
  const used=num(old.LuotDaSuDung)+num(old.LuotDangGiu)>0;
  if(used&&(old.MaVoucher!==b.MaVoucher||old.LoaiGiam!==b.LoaiGiam||num(old.GiaTri)!==num(b.GiaTri)||old.PhamVi!==b.PhamVi||old.DoiTuong!==b.DoiTuong||num(old.DonHangToiThieu)!==num(b.DonHangToiThieu)||num(old.GiamToiDa)!==num(b.GiamToiDa)||Boolean(old.ChoPhepKetHopPhiShip)!==Boolean(b.ChoPhepKetHopPhiShip)))throw new VoucherError(409,"Voucher đã phát sinh lượt: chỉ được sửa tên/mô tả, thời gian và tăng giới hạn lượt");
  if(used&&(num(b.TongLuotSuDung)<num(old.TongLuotSuDung)||num(b.MoiKhachToiDa)<num(old.MoiKhachToiDa)))throw new VoucherError(409,"Không thể giảm giới hạn lượt sau khi voucher đã được sử dụng");
  await txRequest(tx,{...b,id,actor:req.user!.MaTaiKhoan}).query(used
    ?"UPDATE Voucher SET TenChuongTrinh=@TenChuongTrinh,MoTa=@MoTa,TongLuotSuDung=@TongLuotSuDung,MoiKhachToiDa=@MoiKhachToiDa,NgayBatDau=@NgayBatDau,NgayKetThuc=@NgayKetThuc,UpdatedBy=@actor,UpdatedAt=SYSDATETIME() WHERE Id=@id"
    :"UPDATE Voucher SET MaVoucher=@MaVoucher,TenChuongTrinh=@TenChuongTrinh,MoTa=@MoTa,LoaiGiam=@LoaiGiam,GiaTri=@GiaTri,GiamToiDa=@GiamToiDa,DonHangToiThieu=@DonHangToiThieu,TongLuotSuDung=@TongLuotSuDung,MoiKhachToiDa=@MoiKhachToiDa,PhamVi=@PhamVi,DoiTuong=@DoiTuong,ChoPhepKetHopPhiShip=@ChoPhepKetHopPhiShip,TuDongKichHoat=@TuDongKichHoat,NgayBatDau=@NgayBatDau,NgayKetThuc=@NgayKetThuc,UpdatedBy=@actor,UpdatedAt=SYSDATETIME() WHERE Id=@id");
  if(!used){await txRequest(tx,{id}).query("DELETE FROM VoucherDanhMuc WHERE VoucherId=@id; DELETE FROM VoucherSanPham WHERE VoucherId=@id; DELETE FROM VoucherThuongHieu WHERE VoucherId=@id; DELETE FROM VoucherKhachHang WHERE VoucherId=@id");await writeScope(tx,id,b);}
  await txRequest(tx,{id,actor:req.user!.MaTaiKhoan}).query("INSERT LichSuThayDoiVoucher(VoucherId,MaTaiKhoan,HanhDong,ChiTiet) VALUES(@id,@actor,'CAP_NHAT',N'Cập nhật thông tin voucher')");
  await tx.commit();tx=undefined;res.json({success:true,message:"Đã cập nhật voucher"});
}catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e);}});
router.post("/:id/sao-chep",admin,async(req:AuthRequest,res)=>{let tx:sql.Transaction|undefined;try{
  const sourceId=Number(req.params.id),pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();const old=(await txRequest(tx,{id:sourceId}).query("SELECT * FROM Voucher WHERE Id=@id")).recordset[0];if(!old)throw new VoucherError(404,"Không tìm thấy voucher");
  const code=String(req.body.MaVoucher||`${old.MaVoucher}-COPY`).slice(0,50);const result=await txRequest(tx,{sourceId,code,name:`${old.TenChuongTrinh} (bản sao)`,actor:req.user!.MaTaiKhoan}).query("INSERT Voucher(MaVoucher,TenChuongTrinh,MoTa,LoaiGiam,GiaTri,GiamToiDa,DonHangToiThieu,TongLuotSuDung,MoiKhachToiDa,PhamVi,DoiTuong,ChoPhepKetHopPhiShip,TuDongKichHoat,NgayBatDau,NgayKetThuc,TrangThai,CreatedBy,UpdatedBy) OUTPUT INSERTED.Id SELECT @code,CONCAT(TenChuongTrinh,N' (bản sao)'),MoTa,LoaiGiam,GiaTri,GiamToiDa,DonHangToiThieu,TongLuotSuDung,MoiKhachToiDa,PhamVi,DoiTuong,ChoPhepKetHopPhiShip,0,DATEADD(day,1,GETDATE()),DATEADD(day,8,GETDATE()),'NHAP',@actor,@actor FROM Voucher WHERE Id=@sourceId");
  const id=result.recordset[0].Id;
  for(const table of ["VoucherDanhMuc","VoucherSanPham","VoucherThuongHieu","VoucherKhachHang"]){const columns=table==="VoucherDanhMuc"?"MaDanhMuc":table==="VoucherSanPham"?"MaSanPham":table==="VoucherThuongHieu"?"TenThuongHieu":"MaKhachHang";await txRequest(tx,{id,sourceId}).query(`INSERT ${table}(VoucherId,${columns}) SELECT @id,${columns} FROM ${table} WHERE VoucherId=@sourceId`);}
  await txRequest(tx,{id,actor:req.user!.MaTaiKhoan}).query("INSERT LichSuThayDoiVoucher(VoucherId,MaTaiKhoan,HanhDong,ChiTiet) VALUES(@id,@actor,'SAO_CHEP',N'Sao chép voucher')");await tx.commit();tx=undefined;res.status(201).json({success:true,data:{Id:id}});
}catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e);}});
for(const [action,status] of [["kich-hoat","DANG_HOAT_DONG"],["tam-dung","TAM_DUNG"],["huy","DA_HUY"]] as const)router.patch(`/:id/${action}`,admin,async(req,res)=>{let tx:sql.Transaction|undefined;try{const id=Number(req.params.id),pool=await getPool();tx=new sql.Transaction(pool);await tx.begin();const changed=await txRequest(tx,{id,status,actor:(req as AuthRequest).user!.MaTaiKhoan}).query("UPDATE Voucher SET TrangThai=@status,UpdatedAt=SYSDATETIME(),UpdatedBy=@actor OUTPUT INSERTED.Id WHERE Id=@id AND TrangThai<>'DA_HUY'");if(!changed.recordset.length){await tx.rollback();tx=undefined;return res.status(404).json({success:false,message:"Không tìm thấy voucher hoặc voucher đã hủy"});}await txRequest(tx,{id,actor:(req as AuthRequest).user!.MaTaiKhoan,action:action.toUpperCase()}).query("INSERT LichSuThayDoiVoucher(VoucherId,MaTaiKhoan,HanhDong,ChiTiet) VALUES(@id,@actor,@action,N'Thay đổi trạng thái voucher')");await tx.commit();tx=undefined;res.json({success:true,message:"Đã cập nhật trạng thái"});}catch(e){if(tx)try{await tx.rollback()}catch{}fail(res,e);}});

export default router;
