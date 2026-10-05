const dotenv = require("dotenv");
const path = require("path");
const sql = require("mssql");
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const { promotionForProduct, reservePromotion, settlePromotionOrder } = require("../dist/services/khuyenmai");

async function main() {
  const pool = await sql.connect({ server: process.env.DB_SERVER || "TRANHUY", port: Number(process.env.DB_PORT) || 1433,
    database: process.env.DB_DATABASE || "QuanLyCuaHangMyPham", user: process.env.DB_USER || "beauty_user", password: process.env.DB_PASSWORD || "",
    options: { encrypt: false, trustServerCertificate: true, useUTC: false } });
  const products = (await pool.request().query("SELECT TOP 1 MaSanPham,MaDanhMuc,ThuongHieu,GiaBan FROM dbo.SanPham WHERE TrangThai=1 AND IsDeleted=0 AND GiaBan>0 ORDER BY MaSanPham")).recordset;
  if (!products.length) throw new Error("Không có sản phẩm thật đang bán để kiểm thử");
  const p = products[0]; const tx = new sql.Transaction(pool); await tx.begin();
  try {
    const code1 = `SMOKE-P-${Date.now()}-1`, code2 = `SMOKE-P-${Date.now()}-2`;
    const insert = async (code, value, cap, priority, type="GIAM_PHAN_TRAM", scope="SAN_PHAM") => {
      const r = await new sql.Request(tx).input("code",sql.NVarChar(50),code).input("type",sql.VarChar(24),type).input("value",sql.Decimal(18,2),value).input("cap",sql.Decimal(18,2),cap).input("priority",sql.Int,priority).input("scope",sql.VarChar(16),scope).input("pid",sql.Int,p.MaSanPham).input("start",sql.DateTime2,new Date(Date.now()-60000)).input("end",sql.DateTime2,new Date(Date.now()+3600000)).query(`INSERT dbo.KhuyenMai(MaChuongTrinh,TenChuongTrinh,LoaiKhuyenMai,GiaTri,GiamToiDa,NgayBatDau,NgayKetThuc,TongLuot,DoUuTien,PhamVi,TrangThai,CreatedAt,UpdatedAt) OUTPUT INSERTED.Id VALUES(@code,@code,@type,@value,@cap,@start,@end,NULL,@priority,@scope,'DANG_HOAT_DONG',SYSDATETIME(),SYSDATETIME())`);
      const id=r.recordset[0].Id;
      if(scope==="SAN_PHAM") await new sql.Request(tx).input("id",sql.Int,id).input("pid",sql.Int,p.MaSanPham).query("INSERT dbo.KhuyenMaiSanPham(KhuyenMaiId,MaSanPham) VALUES(@id,@pid)");
      return id;
    };
    await insert(code1,20,1000,4);
    await insert(code2,50,10000,9);
    let selected=await promotionForProduct(p,tx);
    const expectedCapPrice=Math.max(0,Math.min(Number(p.GiaBan),Math.round(Number(p.GiaBan)-Math.min(Number(p.GiaBan)*0.5,10000))));
    if(!selected||selected.code!==code2||selected.price!==expectedCapPrice)throw new Error("Không chọn ưu tiên cao nhất hoặc không áp dụng đúng mức giảm tối đa");
    const customer=(await new sql.Request(tx).query("SELECT TOP 1 MaKhachHang FROM dbo.KhachHang ORDER BY MaKhachHang")).recordset[0];
    const order=(await new sql.Request(tx).query("SELECT TOP 1 MaHoaDon FROM dbo.HoaDon ORDER BY MaHoaDon")).recordset[0];
    if(customer&&order){
      await reservePromotion(tx,selected.id,customer.MaKhachHang,order.MaHoaDon);
      const held=(await new sql.Request(tx).input("id",sql.Int,selected.id).query("SELECT LuotDaGiu,LuotDaSuDung FROM dbo.KhuyenMai WHERE Id=@id")).recordset[0];
      if(held.LuotDaGiu!==1||held.LuotDaSuDung!==0)throw new Error("Đặt đơn không giữ đúng một lượt");
      await settlePromotionOrder(tx,order.MaHoaDon,"DA_SU_DUNG");
      const used=(await new sql.Request(tx).input("id",sql.Int,selected.id).query("SELECT LuotDaGiu,LuotDaSuDung FROM dbo.KhuyenMai WHERE Id=@id")).recordset[0];
      if(used.LuotDaGiu!==0||used.LuotDaSuDung!==1)throw new Error("Xác nhận đơn không chốt lượt");
      await settlePromotionOrder(tx,order.MaHoaDon,"DA_TRA_LAI");
      const released=(await new sql.Request(tx).input("id",sql.Int,selected.id).query("SELECT LuotDaGiu,LuotDaSuDung FROM dbo.KhuyenMai WHERE Id=@id")).recordset[0];
      if(released.LuotDaGiu!==0||released.LuotDaSuDung!==0)throw new Error("Hủy đơn trước giao không trả lượt");
    }
    await tx.rollback();
    console.log(JSON.stringify({ok:true,productId:p.MaSanPham,grossPrice:Number(p.GiaBan),selectedCode:code2,promoPrice:selected.price,priceCapVerified:true,priorityVerified:true,holdConfirmCancelVerified:Boolean(customer&&order),testDataRolledBack:true}));
  } catch(e) { try{await tx.rollback()}catch{} throw e; }
  finally { await pool.close(); }
}
main().catch(e=>{console.error("Promotion smoke test failed:",e.message);process.exitCode=1});
