// Tiện ích định dạng dùng chung

export function dinhDangTien(gia: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(gia);
}

export function dinhDangNgay(ngay: string | Date): string {
  const d = typeof ngay === "string" ? new Date(ngay) : ngay;
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function dinhDangNgayGio(ngay: string | Date): string {
  const d = typeof ngay === "string" ? new Date(ngay) : ngay;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function rutGonChuoi(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function mauTrangThaiDon(trangThai: string): string {
  switch (trangThai) {
    case "Chờ xác nhận":
      return "#ff9800";
    case "Đang chuẩn bị":
      return "#2196f3";
    case "Đang giao":
      return "#9c27b0";
    case "Đã giao":
      return "#4caf50";
    case "Đã hủy":
      return "#f44336";
    default:
      return "#757575";
  }
}
