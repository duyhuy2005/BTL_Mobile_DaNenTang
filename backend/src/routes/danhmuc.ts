import { Router } from "express";
import { execute, query, queryOne } from "../config/database";
import { AuthRequest, authorizeRoles } from "../middleware/auth";
const router=Router(); const STAFF=["Admin","NhanVien"];
const nil=(x:any)=>x===""||x===undefined?null:x;
async function validate(body:any,id=0){const parent=nil(body.MaDanhMucCha);if(parent!==null){if(Number(parent)===id)throw new Error("Danh mục không thể là cha của chính nó");if(!await queryOne("SELECT MaDanhMuc FROM DanhMuc WHERE MaDanhMuc=@id",{id:Number(parent)}))throw new Error("Danh mục cha không tồn tại");}if(body.MaDanhMucCode&&await queryOne("SELECT MaDanhMuc FROM DanhMuc WHERE MaDanhMucCode=@code AND MaDanhMuc<>@id",{code:body.MaDanhMucCode,id}))throw new Error("Mã danh mục đã tồn tại");return parent;}
router.get("/stats",authorizeRoles(...STAFF),async(_req,res)=>{try{const data=await queryOne("SELECT COUNT(*) TongDanhMuc,SUM(CASE WHEN TrangThai=1 THEN 1 ELSE 0 END) DangHoatDong,SUM(CASE WHEN TrangThai=0 THEN 1 ELSE 0 END) DangAn,SUM(CASE WHEN MaDanhMucCha IS NOT NULL THEN 1 ELSE 0 END) DanhMucCon FROM DanhMuc");res.json({success:true,data})}catch(e:any){res.status(500).json({success:false,message:e.message})}});
router.get("/",async(req:AuthRequest,res)=>{try{
  const storefront=!req.user||req.user.VaiTro==="KhachHang";
  const visible=storefront?`WITH VisibleCategories AS (SELECT dm.* FROM DanhMuc dm WHERE dm.TrangThai=1 AND dm.MaDanhMucCha IS NULL UNION ALL SELECT child.* FROM DanhMuc child JOIN VisibleCategories parent ON child.MaDanhMucCha=parent.MaDanhMuc WHERE child.TrangThai=1) `:"";
  const data=await query(`${visible}SELECT dm.*,cha.TenDanhMuc TenDanhMucCha,(SELECT COUNT(*) FROM SanPham sp JOIN DanhMuc spdm ON spdm.MaDanhMuc=sp.MaDanhMuc WHERE sp.MaDanhMuc=dm.MaDanhMuc AND sp.IsDeleted=0 ${storefront?"AND sp.TrangThai=1 AND spdm.TrangThai=1":""}) SoSanPham FROM ${storefront?"VisibleCategories":"DanhMuc"} dm LEFT JOIN DanhMuc cha ON cha.MaDanhMuc=dm.MaDanhMucCha ORDER BY dm.ThuTuHienThi,dm.MaDanhMuc OPTION (MAXRECURSION 100)`);
  res.json({success:true,data})
}catch(e:any){res.status(500).json({success:false,message:e.message})}});
router.get("/:id",async(req:AuthRequest,res)=>{try{
  const storefront=!STAFF.includes(req.user?.VaiTro||"");
  const visible=storefront?`WITH VisibleCategories AS (SELECT MaDanhMuc,MaDanhMucCha FROM DanhMuc WHERE TrangThai=1 AND MaDanhMucCha IS NULL UNION ALL SELECT child.MaDanhMuc,child.MaDanhMucCha FROM DanhMuc child JOIN VisibleCategories parent ON child.MaDanhMucCha=parent.MaDanhMuc WHERE child.TrangThai=1) `:"";
  const data:any=await queryOne(`${visible}SELECT dm.* FROM ${storefront?"VisibleCategories":"DanhMuc"} dm WHERE dm.MaDanhMuc=@id OPTION (MAXRECURSION 100)`,{id:Number(req.params.id)});
  if(!data)return res.status(404).json({success:false,message:"Không tìm thấy danh mục đang hoạt động"});res.json({success:true,data})
}catch(e:any){res.status(500).json({success:false,message:e.message})}});
router.post("/",authorizeRoles(...STAFF),async(req,res)=>{try{const b=req.body;if(!String(b.TenDanhMuc||"").trim())throw new Error("Tên danh mục là bắt buộc");if(!validCategoryImage(b.HinhAnh))throw new Error("Danh mục mới phải có ảnh đã tải lên máy chủ");const parent=await validate(b);const r=await execute("INSERT INTO DanhMuc (TenDanhMuc,MaDanhMucCode,MaDanhMucCha,MoTa,HinhAnh,ThuTuHienThi,TrangThai) OUTPUT INSERTED.MaDanhMuc VALUES (@TenDanhMuc,@MaDanhMucCode,@MaDanhMucCha,@MoTa,@HinhAnh,@ThuTuHienThi,@TrangThai)",{TenDanhMuc:b.TenDanhMuc.trim(),MaDanhMucCode:nil(b.MaDanhMucCode),MaDanhMucCha:parent,MoTa:nil(b.MoTa),HinhAnh:b.HinhAnh,ThuTuHienThi:Number(b.ThuTuHienThi||0),TrangThai:b.TrangThai===undefined?1:Number(b.TrangThai)});res.status(201).json({success:true,data:{MaDanhMuc:r.recordset[0].MaDanhMuc}})}catch(e:any){res.status(400).json({success:false,message:e.message})}});
router.put("/:id",authorizeRoles(...STAFF),async(req,res)=>{try{const id=Number(req.params.id),b=req.body,parent=await validate(b,id);if(b.HinhAnh&&!validCategoryImage(b.HinhAnh))throw new Error("Đường dẫn ảnh danh mục không hợp lệ");const current=await queryOne<any>("SELECT MaDanhMuc FROM DanhMuc WHERE MaDanhMuc=@id",{id});if(!current)return res.status(404).json({success:false,message:"Không tìm thấy danh mục"});await execute("UPDATE DanhMuc SET TenDanhMuc=@TenDanhMuc,MaDanhMucCode=@MaDanhMucCode,MaDanhMucCha=@MaDanhMucCha,MoTa=@MoTa,HinhAnh=COALESCE(@HinhAnh,HinhAnh),ThuTuHienThi=@ThuTuHienThi,TrangThai=@TrangThai WHERE MaDanhMuc=@id",{TenDanhMuc:b.TenDanhMuc,MaDanhMucCode:nil(b.MaDanhMucCode),MaDanhMucCha:parent,MoTa:nil(b.MoTa),HinhAnh:nil(b.HinhAnh),ThuTuHienThi:Number(b.ThuTuHienThi||0),TrangThai:b.TrangThai===undefined?1:Number(b.TrangThai),id});res.json({success:true})}catch(e:any){res.status(400).json({success:false,message:e.message})}});
router.delete("/:id",authorizeRoles("Admin"),async(req,res)=>{try{const id=Number(req.params.id);if(await queryOne("SELECT 1 x FROM DanhMuc WHERE MaDanhMucCha=@id",{id}))return res.status(409).json({success:false,message:"Không thể xóa danh mục đang có danh mục con"});if(await queryOne("SELECT 1 x FROM SanPham WHERE MaDanhMuc=@id",{id}))return res.status(409).json({success:false,message:"Không thể xóa danh mục đang có sản phẩm"});await execute("DELETE FROM DanhMuc WHERE MaDanhMuc=@id",{id});res.json({success:true})}catch(e:any){res.status(500).json({success:false,message:e.message})}});
export default router;

function validCategoryImage(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const path = value.trim();
  return /^\/uploads\/categories\/category-[a-z0-9-]+\.(?:jpg|png|webp)$/i.test(path);
}
