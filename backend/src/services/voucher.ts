import { sql } from "../config/database";

export type VoucherLine = { MaSanPham:number; SoLuong:number; DonGia:number; MaDanhMuc:number; ThuongHieu:string|null; ChoPhepKetHopVoucher?:boolean };
export type VoucherEvaluation = { voucher:any; loaiApDung:"SAN_PHAM"|"PHI_SHIP"; eligible:VoucherLine[]; giaTriDuocApDung:number; soTienGiam:number; thieu:number; pendingShipping:boolean };
export class VoucherError extends Error { constructor(public status:number,message:string){super(message)} }

export function txRequest(tx:sql.Transaction, values:Record<string,unknown>={}) {
  const request=new sql.Request(tx);
  for(const [key,value] of Object.entries(values)) {
    if(value===null||value===undefined) request.input(key,sql.NVarChar,null);
    else if(value instanceof Date) request.input(key,sql.DateTime2,value);
    else if(typeof value==="number") request.input(key,Number.isInteger(value)?sql.Int:sql.Decimal(18,2),value);
    else if(typeof value==="boolean") request.input(key,sql.Bit,value);
    else request.input(key,sql.NVarChar,String(value));
  }
  return request;
}

export async function evaluateVoucher(tx:sql.Transaction, code:string, customerId:number, lines:VoucherLine[], shippingFee:number, options:{lock?:boolean;pendingShipping?:boolean;allowBelowMinimum?:boolean}={}):Promise<VoucherEvaluation> {
  const clean=String(code||"").trim().toUpperCase();
  if(!clean) throw new VoucherError(400,"Vui lòng nhập mã voucher");
  const lock=options.lock?" WITH(UPDLOCK,HOLDLOCK)":"";
  const voucher=(await txRequest(tx,{code:clean}).query(`SELECT *,CASE WHEN SYSDATETIME()<NgayBatDau THEN 1 ELSE 0 END ChuaBatDau,CASE WHEN SYSDATETIME()>=NgayKetThuc THEN 1 ELSE 0 END DaHetHan FROM Voucher${lock} WHERE MaVoucherKey=@code`)).recordset[0];
  if(!voucher) throw new VoucherError(404,"Mã voucher không tồn tại");
  if(voucher.TrangThai==="DA_HUY"||voucher.TrangThai==="TAM_DUNG"||voucher.TrangThai==="NHAP") throw new VoucherError(409,"Voucher hiện không hoạt động");
  if(voucher.ChuaBatDau) throw new VoucherError(409,"Voucher chưa đến thời gian sử dụng");
  if(voucher.DaHetHan) throw new VoucherError(409,"Voucher đã hết hạn");
  if(Number(voucher.LuotDaSuDung)+Number(voucher.LuotDangGiu)>=Number(voucher.TongLuotSuDung)) throw new VoucherError(409,"Voucher đã hết lượt sử dụng");
  const perCustomer=(await txRequest(tx,{id:voucher.Id,customerId}).query("SELECT COUNT(*) n FROM LichSuSuDungVoucher WHERE VoucherId=@id AND MaKhachHang=@customerId AND TrangThai IN('DA_GIU_LUOT','DA_SU_DUNG')")).recordset[0]?.n||0;
  if(Number(perCustomer)>=Number(voucher.MoiKhachToiDa)) throw new VoucherError(409,"Bạn đã dùng hết lượt voucher này");
  if(voucher.DoiTuong==="KHACH_HANG_MOI") {
    const prior=(await txRequest(tx,{customerId}).query("SELECT TOP 1 1 Found FROM HoaDon WHERE MaKhachHang=@customerId AND TrangThai IN(N'HOAN_THANH',N'DA_GIAO')")).recordset[0];
    if(prior) throw new VoucherError(403,"Voucher này chỉ dành cho khách hàng mới");
  }
  if(voucher.DoiTuong==="KHACH_HANG_CU_THE") {
    const assigned=(await txRequest(tx,{id:voucher.Id,customerId}).query("SELECT 1 Found FROM VoucherKhachHang WHERE VoucherId=@id AND MaKhachHang=@customerId")).recordset[0];
    if(!assigned) throw new VoucherError(403,"Voucher này không được cấp cho tài khoản của bạn");
  }
  let eligible:VoucherLine[]=[];
  if(voucher.LoaiGiam==="MIEN_GIAM_PHI_SHIP"||voucher.PhamVi==="PHI_VAN_CHUYEN") {
    if(!(shippingFee>0)) {
      if(!options.pendingShipping) throw new VoucherError(409,"Voucher phí vận chuyển chỉ dùng được khi đã có phí vận chuyển thực tế");
      const orderSubtotal=lines.reduce((sum,x)=>sum+Number(x.DonGia)*Number(x.SoLuong),0);
      const missing=Math.max(0,Number(voucher.DonHangToiThieu||0)-orderSubtotal);
      if(missing>0&&!options.allowBelowMinimum)throw new VoucherError(409,`Đơn hàng cần thêm ${Math.ceil(missing).toLocaleString("vi-VN")}đ để đạt mức tối thiểu`);
      return {voucher,loaiApDung:"PHI_SHIP",eligible:[],giaTriDuocApDung:orderSubtotal,soTienGiam:0,thieu:missing,pendingShipping:true};
    }
    eligible=[];
  } else if(voucher.PhamVi==="TOAN_BO_DON_HANG") eligible=lines;
  else if(voucher.PhamVi==="DANH_MUC") {
    const ids=(await txRequest(tx,{id:voucher.Id}).query("SELECT MaDanhMuc FROM VoucherDanhMuc WHERE VoucherId=@id")).recordset.map((x:any)=>Number(x.MaDanhMuc));
    eligible=lines.filter(x=>ids.includes(x.MaDanhMuc));
  } else if(voucher.PhamVi==="SAN_PHAM") {
    const ids=(await txRequest(tx,{id:voucher.Id}).query("SELECT MaSanPham FROM VoucherSanPham WHERE VoucherId=@id")).recordset.map((x:any)=>Number(x.MaSanPham));
    eligible=lines.filter(x=>ids.includes(x.MaSanPham));
  } else if(voucher.PhamVi==="THUONG_HIEU") {
    const brands=(await txRequest(tx,{id:voucher.Id}).query("SELECT TenThuongHieu FROM VoucherThuongHieu WHERE VoucherId=@id")).recordset.map((x:any)=>String(x.TenThuongHieu).trim().toLocaleLowerCase());
    eligible=lines.filter(x=>brands.includes(String(x.ThuongHieu||"").trim().toLocaleLowerCase()));
  }
  const eligibleAmount=eligible.reduce((sum,x)=>sum+Math.max(0,Number(x.DonGia))*Math.max(0,Number(x.SoLuong)),0);
  const orderSubtotal=lines.reduce((sum,x)=>sum+Number(x.DonGia)*Number(x.SoLuong),0);
  const thresholdBase=voucher.LoaiGiam==="MIEN_GIAM_PHI_SHIP"?orderSubtotal:eligibleAmount;
  const min=Number(voucher.DonHangToiThieu||0);
  const missing=Math.max(0,min-thresholdBase);
  if(missing>0&&!options.allowBelowMinimum) throw new VoucherError(409,`Đơn hàng cần thêm ${Math.ceil(missing).toLocaleString("vi-VN")}đ để đạt mức tối thiểu`);
  if(voucher.LoaiGiam!=="MIEN_GIAM_PHI_SHIP"&&eligibleAmount<=0) throw new VoucherError(409,"Giỏ hàng không có sản phẩm phù hợp với voucher");
  let discount=0;
  if(missing>0) discount=0;
  else if(voucher.LoaiGiam==="PHAN_TRAM") discount=Math.round(eligibleAmount*Number(voucher.GiaTri)/100*100)/100;
  else if(voucher.LoaiGiam==="SO_TIEN_CO_DINH") discount=Math.min(eligibleAmount,Number(voucher.GiaTri));
  else discount=Number(voucher.GiaTri);
  if(voucher.GiamToiDa!==null&&voucher.GiamToiDa!==undefined) discount=Math.min(discount,Number(voucher.GiamToiDa));
  discount=Math.min(Math.max(0,discount),voucher.LoaiGiam==="MIEN_GIAM_PHI_SHIP"?shippingFee:eligibleAmount);
  return {voucher,loaiApDung:voucher.LoaiGiam==="MIEN_GIAM_PHI_SHIP"?"PHI_SHIP":"SAN_PHAM",eligible,giaTriDuocApDung:thresholdBase,soTienGiam:discount,thieu:0,pendingShipping:false};
}

export async function reserveVoucher(tx:sql.Transaction, evaluation:VoucherEvaluation, customerId:number, orderId:number) {
  const id=Number(evaluation.voucher.Id);
  const updated=await txRequest(tx,{id}).query("UPDATE Voucher SET LuotDangGiu=LuotDangGiu+1,UpdatedAt=SYSDATETIME() WHERE Id=@id AND LuotDaSuDung+LuotDangGiu<TongLuotSuDung AND TrangThai NOT IN('DA_HUY','TAM_DUNG','NHAP')");
  if(!updated.rowsAffected[0]) throw new VoucherError(409,"Voucher vừa hết lượt, vui lòng thử mã khác");
  await txRequest(tx,{id,customerId,orderId,type:evaluation.loaiApDung,amount:evaluation.soTienGiam}).query("INSERT LichSuSuDungVoucher(VoucherId,MaKhachHang,MaHoaDon,LoaiApDung,TrangThai,SoTienGiam) VALUES(@id,@customerId,@orderId,@type,'DA_GIU_LUOT',@amount); INSERT HoaDonVoucher(MaHoaDon,VoucherId,LoaiApDung,MaVoucherSnapshot,TenChuongTrinhSnapshot,SoTienGiam) SELECT @orderId,Id,@type,MaVoucher,TenChuongTrinh,@amount FROM Voucher WHERE Id=@id");
}

export async function settleOrderVouchers(tx:sql.Transaction, orderId:number, action:"DA_SU_DUNG"|"DA_TRA_LAI_LUOT") {
  const rows=(await txRequest(tx,{orderId}).query("SELECT Id,VoucherId FROM LichSuSuDungVoucher WITH(UPDLOCK,HOLDLOCK) WHERE MaHoaDon=@orderId AND TrangThai='DA_GIU_LUOT'")).recordset;
  for(const row of rows) {
    if(action==="DA_SU_DUNG") {
      const result=await txRequest(tx,{voucherId:row.VoucherId}).query("UPDATE Voucher SET LuotDangGiu=LuotDangGiu-1,LuotDaSuDung=LuotDaSuDung+1,UpdatedAt=SYSDATETIME() WHERE Id=@voucherId AND LuotDangGiu>0");
      if(!result.rowsAffected[0]) throw new VoucherError(409,"Không thể xác nhận lượt giữ voucher");
    } else {
      const result=await txRequest(tx,{voucherId:row.VoucherId}).query("UPDATE Voucher SET LuotDangGiu=LuotDangGiu-1,UpdatedAt=SYSDATETIME() WHERE Id=@voucherId AND LuotDangGiu>0");
      if(!result.rowsAffected[0]) throw new VoucherError(409,"Không thể trả lượt voucher đang giữ");
    }
    await txRequest(tx,{id:row.Id,action}).query("UPDATE LichSuSuDungVoucher SET TrangThai=@action,NgayCapNhat=SYSDATETIME() WHERE Id=@id AND TrangThai='DA_GIU_LUOT'");
    if(action==="DA_SU_DUNG") await txRequest(tx,{voucherId:row.VoucherId,orderId}).query("UPDATE VoucherNguoiDung SET TrangThai='DA_SU_DUNG' WHERE VoucherId=@voucherId AND MaKhachHang=(SELECT TOP 1 MaKhachHang FROM HoaDon WHERE MaHoaDon=@orderId) AND TrangThai='DA_LUU'");
  }
}
