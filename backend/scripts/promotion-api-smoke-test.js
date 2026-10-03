const dotenv=require("dotenv");const path=require("path");const jwt=require("jsonwebtoken");dotenv.config({path:path.resolve(__dirname,"../.env")});
const base=(process.env.API_URL||"http://localhost:3000/api").replace(/\/$/,"");
async function main(){
  const makeToken=(VaiTro)=>jwt.sign({MaTaiKhoan:1,TenDangNhap:"promotion-smoke",VaiTro},process.env.JWT_SECRET||"beauty_store_secret",{expiresIn:"2m"});
  const call=async(route,role)=>{const r=await fetch(`${base}${route}`,{headers:{Authorization:`Bearer ${makeToken(role)}`}});let body;try{body=await r.json()}catch{body=null}if(!r.ok)throw new Error(`${route} trả HTTP ${r.status}: ${body?.message||"không có nội dung"}`);if(!body?.success)throw new Error(`${route} không trả success`);return body};
  const health=await fetch(`${base}/health`);if(!health.ok)throw new Error(`/health trả HTTP ${health.status}`);
  const [stats,list,active,products]=await Promise.all([call("/khuyenmai/thong-ke","Admin"),call("/khuyenmai?page=1&limit=5","Admin"),call("/khuyenmai/dang-hoat-dong","KhachHang"),call("/sanpham?page=1&limit=5","KhachHang")]);
  if(!Array.isArray(list.data)||!list.pagination||!Array.isArray(active.data)||!Array.isArray(products.data))throw new Error("Response API không đúng cấu trúc đã công bố");
  console.log(JSON.stringify({health:health.status,adminStats:200,adminList:200,customerPromotions:200,customerProducts:200,rowsInProductPage:products.data.length,rowsInProgramPage:list.pagination.total,activeCustomerPromotions:active.data.length,priceFieldsPresent:products.data.every(p=>typeof p.GiaKhuyenMaiHienTai==="number"&&typeof p.DangKhuyenMai==="boolean")}));
}
main().catch(e=>{console.error("Promotion API smoke test failed:",e.message);process.exitCode=1});
