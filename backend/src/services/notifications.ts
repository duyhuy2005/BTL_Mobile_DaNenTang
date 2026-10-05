import { sql } from "../config/database";

export async function taoThongBao(tx:sql.Transaction,input:{customerId:number;type:string;title:string;body:string;referenceType?:string;referenceId?:number;eventKey:string}){
  const r=new sql.Request(tx);
  r.input("customerId",sql.Int,input.customerId).input("type",sql.VarChar(30),input.type)
   .input("title",sql.NVarChar(160),input.title).input("body",sql.NVarChar(500),input.body)
   .input("referenceType",sql.VarChar(20),input.referenceType||null).input("referenceId",sql.Int,input.referenceId||null)
   .input("eventKey",sql.VarChar(120),input.eventKey);
  await r.query(`IF NOT EXISTS(SELECT 1 FROM dbo.ThongBaoKhachHang WITH(UPDLOCK,HOLDLOCK) WHERE MaKhachHang=@customerId AND MaSuKien=@eventKey)
    INSERT dbo.ThongBaoKhachHang(MaKhachHang,Loai,TieuDe,NoiDung,LoaiThamChieu,MaThamChieu,MaSuKien)
    VALUES(@customerId,@type,@title,@body,@referenceType,@referenceId,@eventKey)`);
}
