export type QuickBuySelection = { MaSanPham: number; MaBienThe?: number | null; SoLuong: number };

let selection: QuickBuySelection | null = null;

export function setQuickBuySelection(value: QuickBuySelection) {
  if (!Number.isSafeInteger(value.MaSanPham) || value.MaSanPham <= 0 || !Number.isSafeInteger(value.SoLuong) || value.SoLuong <= 0) {
    throw new Error("Lựa chọn mua ngay không hợp lệ.");
  }
  if (value.MaBienThe != null && (!Number.isSafeInteger(value.MaBienThe) || value.MaBienThe <= 0)) throw new Error("Biến thể mua ngay không hợp lệ.");
  selection = { MaSanPham: value.MaSanPham, MaBienThe: value.MaBienThe ?? null, SoLuong: value.SoLuong };
}

export function getQuickBuySelection() {
  return selection ? { ...selection } : null;
}

export function clearQuickBuySelection() {
  selection = null;
}
