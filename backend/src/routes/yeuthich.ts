import { Router } from "express";
import { execute, query, queryOne } from "../config/database";
import { AuthRequest, authorizeRoles } from "../middleware/auth";
import { attachPromotionPrices } from "../services/khuyenmai";
const router = Router();
async function me(req: AuthRequest) { return req.user ? queryOne<{ MaKhachHang: number }>("SELECT MaKhachHang FROM KhachHang WHERE MaTaiKhoan=@uid", { uid: req.user.MaTaiKhoan }) : null; }
router.get("/me", authorizeRoles("KhachHang"), async (req: AuthRequest, res) => { try {
  const c=await me(req); if(!c) return res.status(404).json({success:false,message:"Không tìm thấy hồ sơ khách hàng"});
  const rows=await query<any>(`WITH VisibleCategories AS (
    SELECT MaDanhMuc,MaDanhMucCha FROM DanhMuc WHERE TrangThai=1 AND MaDanhMucCha IS NULL
    UNION ALL SELECT child.MaDanhMuc,child.MaDanhMucCha FROM DanhMuc child JOIN VisibleCategories parent ON child.MaDanhMucCha=parent.MaDanhMuc WHERE child.TrangThai=1
  )
  SELECT yt.MaYeuThich,yt.MaSanPham,yt.NgayThem,yt.GhiChu,sp.MaDanhMuc,sp.TenSanPham,sp.GiaBan,sp.GiaKhuyenMai,sp.HinhAnh,sp.ThuongHieu,sp.TrangThai,dm.TenDanhMuc,
    CASE WHEN sp.NgayCongKhai IS NOT NULL AND GETDATE()<DATEADD(month,1,sp.NgayCongKhai) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END isNew,DATEADD(month,1,sp.NgayCongKhai) newUntil,
    CASE WHEN vc.MaDanhMuc IS NOT NULL THEN 1 ELSE 0 END DanhMucDangBan,COALESCE(inv.CoTheBan,0) SoLuong
  FROM SanPhamYeuThich yt JOIN SanPham sp ON yt.MaSanPham=sp.MaSanPham LEFT JOIN DanhMuc dm ON sp.MaDanhMuc=dm.MaDanhMuc
  LEFT JOIN VisibleCategories vc ON vc.MaDanhMuc=dm.MaDanhMuc
  OUTER APPLY(SELECT COALESCE(SUM(CASE WHEN l.HanSuDung IS NULL OR l.HanSuDung>=CAST(GETDATE() AS date) THEN l.SoLuongTon-l.SoLuongDaGiu ELSE 0 END),0) CoTheBan FROM LoSanPham l WHERE l.MaSanPham=sp.MaSanPham AND l.TrangThai<>N'Đã hủy') inv
  WHERE yt.MaKhachHang=@id ORDER BY yt.NgayThem DESC OPTION (MAXRECURSION 100)`,{id:c.MaKhachHang});
  const data=await attachPromotionPrices(rows); res.json({success:true,data,total:data.length});
} catch(e:any){res.status(500).json({success:false,message:e.message});} });
router.post("/", authorizeRoles("KhachHang"), async (req: AuthRequest,res)=>{ try { const c=await me(req); if(!c) return res.status(404).json({success:false,message:"Không tìm thấy hồ sơ khách hàng"}); const MaSanPham=Number(req.body.MaSanPham); if(!Number.isInteger(MaSanPham)) return res.status(400).json({success:false,message:"Mã sản phẩm không hợp lệ"}); if(!await queryOne("SELECT MaSanPham FROM SanPham WHERE MaSanPham=@id",{id:MaSanPham})) return res.status(404).json({success:false,message:"Không tìm thấy sản phẩm"}); if(await queryOne("SELECT MaYeuThich FROM SanPhamYeuThich WHERE MaKhachHang=@kh AND MaSanPham=@sp",{kh:c.MaKhachHang,sp:MaSanPham})) return res.status(409).json({success:false,message:"Sản phẩm đã có trong danh sách yêu thích"}); const r=await execute("INSERT INTO SanPhamYeuThich (MaKhachHang,MaSanPham,GhiChu) OUTPUT INSERTED.MaYeuThich VALUES (@kh,@sp,@gc)",{kh:c.MaKhachHang,sp:MaSanPham,gc:req.body.GhiChu||null}); res.status(201).json({success:true,message:"Đã thêm vào danh sách yêu thích",data:{MaYeuThich:r.recordset[0].MaYeuThich}}); }catch(e:any){res.status(500).json({success:false,message:e.message});} });
router.delete("/:maSanPham", authorizeRoles("KhachHang"), async(req:AuthRequest,res)=>{try{const c=await me(req);if(!c)return res.status(404).json({success:false,message:"Không tìm thấy hồ sơ khách hàng"});const r=await execute("DELETE FROM SanPhamYeuThich WHERE MaKhachHang=@kh AND MaSanPham=@sp",{kh:c.MaKhachHang,sp:Number(req.params.maSanPham)});if(!r.rowsAffected)return res.status(404).json({success:false,message:"Không tìm thấy sản phẩm yêu thích"});res.json({success:true,message:"Đã xóa khỏi danh sách yêu thích"});}catch(e:any){res.status(500).json({success:false,message:e.message});}});
export default router;
