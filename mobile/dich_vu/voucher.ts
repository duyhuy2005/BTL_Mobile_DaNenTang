import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

export const VOUCHER_SELECTED_KEY = "beautystore.voucher.selected";
const checkoutKey=(sessionId:string)=>`beautystore.checkout.${sessionId}.voucher`;
export type Voucher = { Id:number; MaVoucher:string; TenChuongTrinh:string; MoTa?:string; LoaiGiam:string; PhamVi:string; GiaTri:number; GiamToiDa?:number|null; DonHangToiThieu:number; TongLuotSuDung:number; LuotDaSuDung:number; LuotDangGiu?:number; LuotKhachDaDung?:number; NgayBatDau:string; NgayKetThuc:string; TrangThaiHienThi:string; TrangThaiLuu?:string; LyDoKhongDung?:string|null };
export const voucherService = {
  available: (token:string) => api.get<{success:boolean;data:Voucher[]}>('/voucher/kha-dung',token),
  mine: (token:string) => api.get<{success:boolean;data:Voucher[]}>('/voucher/cua-toi',token),
  save: (id:number,token:string) => api.post('/voucher/'+id+'/luu',{},token),
  unsave: (id:number,token:string) => api.delete('/voucher/'+id+'/bo-luu',token),
  check: (data:{danhSachSanPham:{MaSanPham:number;SoLuong:number}[];MaVoucher?:string;MaVoucherPhiShip?:string;PhiVanChuyen?:number},token:string) => api.post<any>('/voucher/kiem-tra',data,token),
  best: (data:any,token:string) => api.post<any>('/voucher/goi-y-tot-nhat',data,token),
  checkoutOptions: (data:{danhSachSanPham:{MaSanPham:number;SoLuong:number}[];mode:"AUTO"|"MANUAL"|"NONE";MaVoucher?:string;MaVoucherPhiShip?:string},token:string) => api.post<any>('/voucher/checkout-options',data,token),
  setSelected: (codes:string[]) => AsyncStorage.setItem(VOUCHER_SELECTED_KEY,JSON.stringify(codes)),
  getSelected: async():Promise<string[]> => { try{return JSON.parse((await AsyncStorage.getItem(VOUCHER_SELECTED_KEY))||'[]')}catch{return []} },
  setCheckoutMode: (sessionId:string,mode:"AUTO"|"MANUAL"|"NONE") => AsyncStorage.setItem(`${checkoutKey(sessionId)}.mode`,mode),
  getCheckoutMode: async(sessionId:string):Promise<"AUTO"|"MANUAL"|"NONE"> => { const value=await AsyncStorage.getItem(`${checkoutKey(sessionId)}.mode`); return value==="MANUAL"||value==="NONE"?value:"AUTO"; },
  setCheckoutSelection: (sessionId:string,codes:string[]) => AsyncStorage.setItem(checkoutKey(sessionId),JSON.stringify(codes)),
  getCheckoutSelection: async(sessionId:string):Promise<string[]> => { try{return JSON.parse((await AsyncStorage.getItem(checkoutKey(sessionId)))||'[]')}catch{return []} },
  clearCheckoutSelection: (sessionId:string) => AsyncStorage.multiRemove([checkoutKey(sessionId),`${checkoutKey(sessionId)}.mode`]),
};
