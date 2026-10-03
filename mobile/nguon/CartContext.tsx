import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/nguon/AuthContext";
import { gioHangService } from "@/dich_vu/gioHang";

type CartContextValue = { cartCount: number; refreshCartCount: () => Promise<void>; updateCartCount: (count: number) => void };
const CartContext = createContext<CartContextValue>({ cartCount: 0, refreshCartCount: async () => {}, updateCartCount: () => {} });

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { token, authStatus } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const requestSequence = useRef(0);
  const updateCartCount = useCallback((count: number) => {
    if (Number.isSafeInteger(count) && count >= 0) {
      requestSequence.current++;
      setCartCount(count);
    }
  }, []);

  const refreshCartCount = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (!token || authStatus !== "authenticated") { setCartCount(0); return; }
    try {
      const response = await gioHangService.layGioHang(token);
      if (sequence === requestSequence.current) {
        setCartCount(response.data.items.reduce((sum, item) => sum + Math.max(0, Number(item.SoLuong) || 0), 0));
      }
    } catch (error) {
      // Keep the last known badge instead of presenting a network/API failure as an empty cart.
      if (__DEV__) console.warn("[Cart] Không thể đồng bộ số lượng giỏ hàng", error);
    }
  }, [authStatus, token]);

  useEffect(() => {
    requestSequence.current++;
    if (authStatus === "guest") setCartCount(0);
    else if (authStatus === "authenticated") void refreshCartCount();
    return () => { requestSequence.current++; };
  }, [authStatus, token, refreshCartCount]);

  const value = useMemo(() => ({ cartCount, refreshCartCount, updateCartCount }), [cartCount, refreshCartCount, updateCartCount]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
