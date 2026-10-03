import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { TaiKhoan, KhachHang } from "@/kieu_du_lieu/KhachHang";
import { phienDangNhap } from "@/dich_vu/suKienPhien";
import { api, ApiError } from "@/dich_vu/api";
import { tokenStore } from "@/dich_vu/tokenStore";

export type AuthStatus = "restoring" | "guest" | "authenticated" | "error";
type AuthContextType = {
  token: string | null; user: TaiKhoan | null; khachHang: KhachHang | null;
  authStatus: AuthStatus; authError: string | null; dangTai: boolean;
  dangNhap: (token: string, user: TaiKhoan, khachHang?: KhachHang | null) => Promise<void>;
  dangXuat: () => Promise<void>; capNhatKhachHang: (kh: KhachHang) => Promise<void>;
  khoiPhucPhien: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
const TOKEN_KEY = "token";
const LEGACY_KEYS = ["accessToken", "refreshToken", "refresh_token", "user", "khachHang"];
const PRIVATE_KEYS = ["beautystore.voucher.selected"];
async function clearPrivateSession() {
  await tokenStore.remove();
  await AsyncStorage.multiRemove([TOKEN_KEY, ...LEGACY_KEYS, ...PRIVATE_KEYS]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<TaiKhoan | null>(null);
  const [khachHang, setKhachHang] = useState<KhachHang | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("restoring");
  const [authError, setAuthError] = useState<string | null>(null);
  const requestId = useRef(0);

  const khoiPhucPhien = useCallback(async () => {
    const id = ++requestId.current;
    setAuthStatus("restoring"); setAuthError(null);
    try {
      const savedToken = await tokenStore.get();
      const legacyToken = savedToken ? null : await AsyncStorage.getItem(TOKEN_KEY);
      const candidateToken = savedToken || legacyToken;
      // Cached identity/profile are intentionally never read: only the backend can
      // confirm role, account state and customer ownership for a persisted token.
      await AsyncStorage.multiRemove(LEGACY_KEYS);
      if (!candidateToken) {
        await AsyncStorage.multiRemove(PRIVATE_KEYS);
        if (requestId.current === id) { setToken(null); setUser(null); setKhachHang(null); setAuthStatus("guest"); }
        return;
      }
      const [session, profile] = await Promise.all([
        api.get<{ success: boolean; data: { user: TaiKhoan } }>("/auth/me", candidateToken),
        api.get<{ success: boolean; data: KhachHang }>("/khachhang/me", candidateToken),
      ]);
      const verifiedUser = session.data?.user;
      if (!session.success || verifiedUser?.VaiTro !== "KhachHang" || !profile.success || !profile.data) {
        throw new ApiError("Phiên không thuộc tài khoản khách hàng đang hoạt động.", 403);
      }
      if (requestId.current !== id) return;
      if (!savedToken) { await tokenStore.set(candidateToken); await AsyncStorage.removeItem(TOKEN_KEY); }
      setToken(candidateToken); setUser(verifiedUser); setKhachHang(profile.data); setAuthStatus("authenticated");
    } catch (error) {
      if (requestId.current !== id) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await clearPrivateSession(); setToken(null); setUser(null); setKhachHang(null); setAuthStatus("guest");
        return;
      }
      // On network/server failure, do not expose cached user data or turn the
      // session into a guest silently. Keep the token for an explicit retry.
      setToken(null); setUser(null); setKhachHang(null); setAuthStatus("error");
      setAuthError(error instanceof Error ? error.message : "Không thể xác minh phiên đăng nhập. Hãy thử lại.");
    }
  }, []);

  useEffect(() => {
    void khoiPhucPhien();
    const unsubscribe = phienDangNhap.subscribe(() => {
      requestId.current++;
      setToken(null); setUser(null); setKhachHang(null); setAuthStatus("guest"); setAuthError(null);
      void clearPrivateSession();
    });
    return () => { requestId.current++; unsubscribe(); };
  }, [khoiPhucPhien]);

  const dangNhap = useCallback(async (newToken: string, newUser: TaiKhoan, kh?: KhachHang | null) => {
    if (newUser.VaiTro !== "KhachHang" || !kh) throw new Error("Ứng dụng này chỉ hỗ trợ tài khoản Khách hàng có hồ sơ liên kết.");
    requestId.current++;
    // Clear account-scoped values first so switching A -> B cannot leak cached data.
    await AsyncStorage.multiRemove([...LEGACY_KEYS, ...PRIVATE_KEYS]);
    await tokenStore.set(newToken);
    setToken(newToken); setUser(newUser); setKhachHang(kh); setAuthError(null); setAuthStatus("authenticated");
  }, []);

  const dangXuat = useCallback(async () => {
    requestId.current++;
    await clearPrivateSession();
    setToken(null); setUser(null); setKhachHang(null); setAuthError(null); setAuthStatus("guest");
  }, []);

  const capNhatKhachHang = useCallback(async (kh: KhachHang) => {
    // Keep identity data in memory only; do not persist profile PII as authority.
    setKhachHang(kh);
  }, []);

  const value = useMemo(() => ({ token, user, khachHang, authStatus, authError, dangTai: authStatus === "restoring", dangNhap, dangXuat, capNhatKhachHang, khoiPhucPhien }), [token, user, khachHang, authStatus, authError, dangNhap, dangXuat, capNhatKhachHang, khoiPhucPhien]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
