import AsyncStorage from "@react-native-async-storage/async-storage";
import { TaiKhoan, KhachHang } from "@/src/kieu_du_lieu";
import { tokenStore } from "@/dich_vu/tokenStore";

const KEYS = {
  TOKEN: "token",
  USER: "user",
  KHACH_HANG: "khachHang",
};

export const authStorage = {
  async save(token: string, user: TaiKhoan, khachHang: KhachHang | null) {
    void user; void khachHang;
    await AsyncStorage.multiRemove([KEYS.USER, KEYS.KHACH_HANG]);
    await tokenStore.set(token);
  },

  async load(): Promise<{
    token: string | null;
    user: TaiKhoan | null;
    khachHang: KhachHang | null;
  }> {
    const token = await tokenStore.get();
    await AsyncStorage.multiRemove([KEYS.USER, KEYS.KHACH_HANG]);
    return {
      token,
      user: null,
      khachHang: null,
    };
  },

  async clear() {
    await tokenStore.remove();
    await AsyncStorage.multiRemove([KEYS.USER, KEYS.KHACH_HANG]);
  },

  async updateKhachHang(kh: KhachHang) {
    void kh;
  },
};
