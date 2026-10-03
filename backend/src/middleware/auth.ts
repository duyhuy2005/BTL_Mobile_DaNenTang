import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    MaTaiKhoan: number;
    TenDangNhap: string;
    VaiTro: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  let decoded: any;
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Không có token xác thực' });
    }
    
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'beauty_store_secret') as any;
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
  }
  try {
    const role = normalizeRole(decoded.VaiTro);
    const account = await queryOne<{ TrangThai: unknown; VaiTro: unknown; TrangThaiKhach: unknown }>(
      `SELECT tk.TrangThai,tk.VaiTro,kh.TrangThai TrangThaiKhach FROM TaiKhoan tk LEFT JOIN KhachHang kh ON kh.MaTaiKhoan=tk.MaTaiKhoan WHERE tk.MaTaiKhoan=@id`,
      { id: Number(decoded.MaTaiKhoan) },
    );
    const active = (value: unknown) => value === true || ['1', 'true', 'hoat dong', 'active'].includes(String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').trim().toLowerCase());
    if (!account || !active(account.TrangThai) || normalizeRole(account.VaiTro) !== role || (role === 'KhachHang' && !active(account.TrangThaiKhach))) {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa, chưa kích hoạt hoặc thiếu hồ sơ được liên kết' });
    }
    req.user = { ...decoded, VaiTro: role };
    next();
  } catch (err) {
    console.error('Authentication account-state check failed:', err);
    return res.status(503).json({ success: false, message: 'Không thể xác minh trạng thái tài khoản lúc này' });
  }
}

export function authorizeAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.VaiTro !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
  }
  next();
}

/** Allows public catalogue reads without a token while preserving a valid user's role
 * for the same routes' protected stats and mutation endpoints. Invalid/stale tokens
 * are ignored here; protected handlers still reject the request without req.user.
 */
export async function authenticateOptional(req: AuthRequest, _res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  if (!authorization) return next();

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "beauty_store_secret") as any;
    const role = normalizeRole(decoded.VaiTro);
    const account = await queryOne<{ TrangThai: unknown; VaiTro: unknown; TrangThaiKhach: unknown }>(
      `SELECT tk.TrangThai,tk.VaiTro,kh.TrangThai TrangThaiKhach
       FROM TaiKhoan tk LEFT JOIN KhachHang kh ON kh.MaTaiKhoan=tk.MaTaiKhoan
       WHERE tk.MaTaiKhoan=@id`,
      { id: Number(decoded.MaTaiKhoan) },
    );
    const active = (value: unknown) => value === true || ["1", "true", "hoat dong", "active"].includes(
      String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").trim().toLowerCase(),
    );
    // Optional auth must not turn a stale JWT into an authenticated principal.
    // Public catalogue reads still proceed as guest; protected route handlers see no req.user.
    if (account && active(account.TrangThai) && normalizeRole(account.VaiTro) === role && (role !== "KhachHang" || active(account.TrangThaiKhach))) {
      req.user = { ...decoded, VaiTro: role };
    }
  } catch {
    // Catalogue GETs are public. Stale JWTs and transient status-check failures
    // must never authorize protected handlers mounted behind optional auth.
    req.user = undefined;
  }
  next();
}

export function authorizeRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
    if (!roles.includes(req.user.VaiTro)) return res.status(403).json({ success: false, message: "Không có quyền truy cập" });
    next();
  };
}

/** Converts legacy Vietnamese database values to the API's canonical role names. */
export function normalizeRole(role: unknown): string {
  const value = String(role ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (value === "khachhang" || value === "customer") return "KhachHang";
  if (value === "nhanvien" || value === "employee" || value === "staff") return "NhanVien";
  if (value === "admin" || value === "administrator") return "Admin";
  return String(role ?? "");
}
