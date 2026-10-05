export const MAUCHU = {
  HONG: "#e91e8c",
  HONG_DAM: "#c2185b",
  HONG_NHAT: "#fce4ec",
  HONG_NEN: "#fff0f5",
  TIM: "#7c3aed",
  DEN: "#212121",
  XAM_DAM: "#424242",
  XAM: "#757575",
  XAM_NHAT: "#f5f5f5",
  XAM_VIEN: "#e0e0e0",
  TRANG: "#ffffff",
  DO: "#ff5252",
  CAM: "#ff9800",
  XANH: "#4caf50",
  XANH_DUONG: "#2196f3",
};

export const KY_TU = {
  TEN_APP: "BloomBeauty",
  SLOGAN: "Vẻ đẹp từ thiên nhiên",
  PHIEN_BAN: "1.0.0",
};

export const GIAO_DIEN = {
  PADDING_NGANG: 20,
  PADDING_DOC: 16,
  BORDER_RADIUS: 12,
  BORDER_RADIUS_LN: 24,
  DO_CAO_NUT: 52,
  DO_CAO_INPUT: 52,
  BONG: {
    shadowColor: "#e91e8c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const API_URL = {
  BASE:
    process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://localhost:3000/api",
};
