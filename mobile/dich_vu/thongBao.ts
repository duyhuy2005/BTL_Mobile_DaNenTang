import { api } from "./api";

export type Notice = {
  Id: number;
  Loai: string;
  TieuDe: string;
  NoiDung: string;
  LoaiThamChieu?: string;
  MaThamChieu?: number;
  DaDoc: boolean;
  NgayTao: string;
};

type SupportResponse = {
  success: boolean;
  data: {
    faqs: Array<{ Id: number; TieuDe: string; NoiDung: string }>;
    contacts: Array<{ Id: number; TieuDe: string; NoiDung: string; GiaTri?: string }>;
  };
};

export const thongBaoService = {
  mine: (page = 1) => api.get<{
    success: boolean;
    data: Notice[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    unread: number;
  }>(`/thongbao/cua-toi?page=${page}&limit=20`),
  read: (id: number) => api.patch(`/thongbao/${id}/doc`, {}),
  readAll: () => api.post("/thongbao/doc-tat-ca", {}),
  support: () => api.get<SupportResponse>("/thongbao/ho-tro"),
};
