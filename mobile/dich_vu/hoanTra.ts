import { api } from "./api";

export type ReturnOrder = {
  MaHoaDon: number;
  NgayLap: string;
  TrangThai: string;
  TongTien: number;
  TrangThaiThanhToan: string;
  SanPham: Array<{ MaSanPham: number; SoLuong: number; DonGia: number; ThanhTien: number; TenSanPham: string; HinhAnh?: string }>;
};

export type ReturnEligibility = {
  canRequestReturn: boolean;
  reason: string;
  SoNgayDuocYeuCau: number;
  NgayGiaoThanhCong: string | null;
  HanCuoi: string | null;
  order: ReturnOrder;
  SanPham: Array<ReturnOrder["SanPham"][number] & { SoLuongConLai: number; CoYeuCauDangXuLy: number }>;
};

export type MyReturn = {
  Id: number;
  MaYeuCau: string;
  MaHoaDon: number;
  TrangThai: string;
  LoaiYeuCau: string;
  LyDo: string;
  SoTienDuKien: number;
  NgayYeuCau: string;
  SoSanPham?: number;
};

export type ReturnDetail = MyReturn & {
  MoTa?: string | null; LyDoTuChoi?: string | null; PhuongThucNhanTien?: string | null;
  SoTienHang: number; GiamGiaPhanBo: number; SoTienDaHoan: number; TrangThaiThanhToan: string;
  chiTiet: Array<{Id:number;MaSanPham:number;TenSanPham:string;HinhAnh?:string;SoLuongTra:number;SoTienDuKien:number;DonGiaSnapshot:number}>;
  bangChung: Array<{Id:number;Url:string;Loai:string}>;
  timeline: Array<{TrangThaiCu?:string;TrangThaiMoi:string;NgayTao:string}>;
  giaoDichHoanTien: Array<{SoTien:number;PhuongThuc:string;TrangThai:string;NgayTao:string}>;
};

export const hoanTraService = {
  dieuKien: (orderId: number) => api.get<{ success: boolean; data: ReturnEligibility }>(`/hoantra/dieu-kien/${orderId}`),
  layDonHangDuocTra: () => api.get<{ success: boolean; data: ReturnOrder[] }>("/hoantra/don-hang-cua-toi"),
  layYeuCauCuaToi: (params?:{page?:number;limit?:number;status?:string}) => api.get<{ success: boolean; data: MyReturn[]; pagination:{page:number;limit:number;total:number;totalPages:number} }>(`/hoantra/cua-toi?page=${params?.page||1}&limit=${params?.limit||10}${params?.status?`&status=${encodeURIComponent(params.status)}`:""}`),
  chiTiet: (id:number) => api.get<{success:boolean;data:ReturnDetail}>(`/hoantra/${id}`),
  huy: (id:number) => api.patch<{success:boolean}>(`/hoantra/${id}/huy`,{}),
  taoYeuCau: (data: {
    MaHoaDon: number;
    items: Array<{ MaSanPham: number; SoLuong: number }>;
    LyDo: string;
    MoTa?: string;
    LoaiYeuCau: "HOAN_TIEN" | "DOI_HANG";
    PhuongThucNhanTien: string;
    XacNhanNguyenTem?: boolean;
    IdempotencyKey: string;
  }) => api.post<{ success: boolean; data: { Id: number; SoTienDuKien: number } }>("/hoantra", data),
  taiBangChung: (id: number, files: Array<{ uri: string; name: string; mimeType: string }>) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", { uri: file.uri, name: file.name, type: file.mimeType } as any));
    return api.postForm<{ success: boolean; data: Array<{ url: string }> }>(`/hoantra/${id}/bang-chung`, form);
  },
};
