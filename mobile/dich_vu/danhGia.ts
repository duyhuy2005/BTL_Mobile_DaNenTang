import {api} from "./api";
export type ReviewCandidate={MaHoaDon:number;NgayLap:string;MaSanPham:number;TenSanPham:string;HinhAnh?:string;SoLuong:number};
export const danhGiaService={
  candidates:()=>api.get<{success:boolean;data:ReviewCandidate[]}>("/danhgia/cua-toi/co-the-danh-gia"),
  mine:()=>api.get<{success:boolean;data:Array<{Id:number;MaHoaDon:number;MaSanPham:number;TenSanPham:string;HinhAnh?:string;SoSao:number;NoiDung:string;TrangThai:string;Anh:string[];NgayTao:string}>}>("/danhgia/cua-toi"),
  create:(data:{MaHoaDon:number;MaSanPham:number;SoSao:number;NoiDung:string})=>api.post<{success:boolean;data:{Id:number;TrangThai:string;message:string}}>("/danhgia",data),
  upload:(id:number,files:Array<{uri:string;name:string;mimeType:string}>)=>{const form=new FormData();files.forEach(f=>form.append("files",{uri:f.uri,name:f.name,type:f.mimeType} as any));return api.postForm<{success:boolean;data:Array<{url:string}>}>(`/danhgia/${id}/anh`,form)},
};
