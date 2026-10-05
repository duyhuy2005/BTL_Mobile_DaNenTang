/** Định dạng tiền tệ VNĐ */
export const dinhDangTien = (so: number): string => {
  return so.toLocaleString("vi-VN") + "₫";
};

/** Định dạng ngày tháng dd/MM/yyyy */
export const dinhDangNgay = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

/** Kiểm tra email hợp lệ */
export const kiemTraEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/** Kiểm tra số điện thoại VN */
export const kiemTraSDT = (sdt: string): boolean => {
  return /^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(sdt);
};

/** Rút gọn văn bản */
export const rutGonChuoi = (str: string, maxLength: number): string => {
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
};

/** Tính phần trăm giảm giá */
export const tinhGiamGia = (giaGoc: number, giaMoi: number): number => {
  return Math.round(((giaGoc - giaMoi) / giaGoc) * 100);
};
