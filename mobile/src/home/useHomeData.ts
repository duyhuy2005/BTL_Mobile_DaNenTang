import { useCallback, useEffect, useRef, useState } from "react";
import { sanPhamService } from "@/dich_vu/sanPham";
import { gioHangService } from "@/dich_vu/gioHang";
import { yeuThichService } from "@/dich_vu/yeuThich";
import type { DanhMuc, SanPham } from "@/kieu_du_lieu/SanPham";

export function useHomeData(token: string | null, customerId?: number) {
  const [products, setProducts] = useState<SanPham[]>([]);
  const [deals, setDeals] = useState<SanPham[]>([]);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [categories, setCategories] = useState<DanhMuc[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [nextProductsPage, setNextProductsPage] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const results = await Promise.allSettled([
        sanPhamService.layDanhSach(token ?? undefined, { page: 1, limit: 12, sort: "new", chiSanPhamMoi: true }),
        sanPhamService.layDanhSach(token ?? undefined, { page: 1, limit: 8, chiKhuyenMai: true, sort: "newest" }),
        sanPhamService.layDanhMuc(token ?? undefined),
        token && customerId ? gioHangService.layGioHang(token) : Promise.resolve(null),
        token && customerId ? yeuThichService.layDanhSach(token) : Promise.resolve(null),
      ]);
      const [newest, promo, categoryResponse, cart, favorites] = results;
      if (newest.status !== "fulfilled" || !newest.value.success || !Array.isArray(newest.value.data)) throw new Error("Không thể tải danh sách sản phẩm mới");
      if (categoryResponse.status !== "fulfilled" || !categoryResponse.value.success || !Array.isArray(categoryResponse.value.data)) throw new Error("Không thể tải danh mục");
      setProducts(newest.value.data); setHasMoreProducts(newest.value.pagination.page < newest.value.pagination.totalPages); setNextProductsPage(newest.value.pagination.page + 1); setCategories(categoryResponse.value.data);
      if (promo.status === "fulfilled" && promo.value.success && Array.isArray(promo.value.data)) { setDeals(promo.value.data.filter((item) => item.DangKhuyenMai)); setDealsError(null); }
      else { setDeals([]); setDealsError(promo.status === "rejected" ? promo.reason?.message || "Không tải được ưu đãi" : "Phản hồi ưu đãi không hợp lệ"); }
      if (cart.status === "fulfilled" && cart.value?.success) setCartCount(cart.value.data.items.reduce((total, item) => total + Number(item.SoLuong), 0));
      else setCartCount(0);
      if (favorites.status === "fulfilled" && favorites.value?.success) setFavoriteIds(favorites.value.data.map((item) => Number(item.MaSanPham)));
      else setFavoriteIds([]);
    } catch (e: any) { setError(e?.message || "Không thể tải dữ liệu BeautyStore"); }
    finally { setLoading(false); }
  }, [token, customerId]);

  useEffect(() => {
    const expiries = [...products, ...deals].map((item) => item.newUntil ? Date.parse(item.newUntil) : NaN).filter((time) => Number.isFinite(time) && time > Date.now());
    if (!expiries.length) return;
    const timer = setTimeout(() => { void load(); }, Math.min(Math.min(...expiries) - Date.now() + 10, 2_147_000_000));
    return () => clearTimeout(timer);
  }, [products, deals, load]);

  const loadMoreProducts = useCallback(async () => {
    if (loadingMoreRef.current || loading || !hasMoreProducts) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const response = await sanPhamService.layDanhSach(token ?? undefined, { page: nextProductsPage, limit: 12, sort: "new", chiSanPhamMoi: true });
      if (!response.success || !Array.isArray(response.data)) throw new Error("Không thể tải thêm sản phẩm mới");
      setProducts((current) => {
        const seen = new Set(current.map((item) => item.MaSanPham));
        return [...current, ...response.data.filter((item) => !seen.has(item.MaSanPham))];
      });
      setHasMoreProducts(response.pagination.page < response.pagination.totalPages);
      setNextProductsPage(response.pagination.page + 1);
    } finally { loadingMoreRef.current = false; setLoadingMore(false); }
  }, [loadingMore, loading, hasMoreProducts, nextProductsPage, token]);

  const addToCart = useCallback(async (productId: number) => {
    if (!token) throw new Error("Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng");
    const product = products.find((item) => item.MaSanPham === productId);
    if (product && Number(product.SoLuong) <= 0) throw new Error("Sản phẩm hiện đã hết hàng");
    await gioHangService.themSanPham(productId, 1, token);
    await load();
  }, [token, products, load]);

  const toggleFavorite = useCallback(async (productId: number) => {
    if (!token) throw new Error("Bạn cần đăng nhập để lưu sản phẩm yêu thích");
    const wasFavorite = favoriteIds.includes(productId);
    if (wasFavorite) await yeuThichService.xoa(productId, token);
    else await yeuThichService.them(productId, token);
    setFavoriteIds((ids) => wasFavorite ? ids.filter((id) => id !== productId) : ids.includes(productId) ? ids : [...ids, productId]);
  }, [token, favoriteIds]);

  return { products, deals, dealsError, categories, cartCount, favoriteIds, loading, loadingMore, hasMoreProducts, error, reload: load, loadMoreProducts, addToCart, toggleFavorite };
}
