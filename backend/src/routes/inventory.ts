import { Router } from 'express';
import { query, queryOne } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/inventory - Danh sách tồn kho (tìm kiếm, lọc, phân trang)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const page   = parseInt(req.query.page  as string) || 1;
    const limit  = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search      = (req.query.search      as string) || '';
    const maDanhMuc   = (req.query.maDanhMuc   as string) || '';
    const thuongHieu  = (req.query.thuongHieu  as string) || '';
    const trangThai   = (req.query.trangThai   as string) || '';

    const params: any = { offset, limit };
    let where = 'WHERE 1=1';

    if (search) {
      where += ` AND (SP.TenSanPham LIKE @search OR SP.ThuongHieu LIKE @search OR CAST(SP.MaSanPham AS NVARCHAR) LIKE @search)`;
      params.search = `%${search}%`;
    }
    if (maDanhMuc) {
      where += ` AND SP.MaDanhMuc = @maDanhMuc`;
      params.maDanhMuc = parseInt(maDanhMuc);
    }
    if (thuongHieu) {
      where += ` AND SP.ThuongHieu = @thuongHieu`;
      params.thuongHieu = thuongHieu;
    }
    if (trangThai === 'con_hang')   where += ` AND SP.SoLuong > 10`;
    if (trangThai === 'sap_het')    where += ` AND SP.SoLuong BETWEEN 1 AND 10`;
    if (trangThai === 'het_hang')   where += ` AND SP.SoLuong = 0`;

    const data = await query(`
      SELECT
        SP.MaSanPham,
        SP.TenSanPham,
        SP.ThuongHieu,
        SP.GiaNhap,
        SP.GiaBan,
        SP.GiaKhuyenMai,
        SP.SoLuong,
        SP.HinhAnh,
        SP.TrangThai,
        DM.TenDanhMuc,
        CASE
          WHEN SP.SoLuong = 0          THEN N'het_hang'
          WHEN SP.SoLuong BETWEEN 1 AND 10 THEN N'sap_het'
          ELSE N'con_hang'
        END AS TrangThaiKho
      FROM SanPham SP
      LEFT JOIN DanhMuc DM ON SP.MaDanhMuc = DM.MaDanhMuc
      ${where}
      ORDER BY SP.TenSanPham
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, params);

    const countResult = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM SanPham SP LEFT JOIN DanhMuc DM ON SP.MaDanhMuc = DM.MaDanhMuc ${where}`,
      params
    ) || { total: 0 };

    res.json({
      success: true,
      data,
      pagination: { page, limit, total: countResult.total, totalPages: Math.ceil(countResult.total / limit) }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/statistics - Thống kê tồn kho
router.get('/statistics', async (_req, res) => {
  try {
    const stats = await queryOne<any>(`
      SELECT
        COUNT(*)                                                        AS tongSanPham,
        SUM(CASE WHEN SoLuong = 0 THEN 1 ELSE 0 END)                   AS hetHang,
        SUM(CASE WHEN SoLuong BETWEEN 1 AND 10 THEN 1 ELSE 0 END)      AS sapHet,
        SUM(CASE WHEN SoLuong > 10 THEN 1 ELSE 0 END)                  AS conHang,
        ISNULL(SUM(SoLuong * GiaNhap), 0)                              AS giaTriTonKho
      FROM SanPham
    `, {}) || {};

    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/alerts - Sản phẩm sắp hết / hết hàng
router.get('/alerts', async (_req, res) => {
  try {
    const data = await query(`
      SELECT TOP 20
        SP.MaSanPham,
        SP.TenSanPham,
        SP.SoLuong,
        SP.HinhAnh,
        DM.TenDanhMuc,
        CASE
          WHEN SP.SoLuong = 0 THEN N'het_hang'
          ELSE N'sap_het'
        END AS TrangThaiKho
      FROM SanPham SP
      LEFT JOIN DanhMuc DM ON SP.MaDanhMuc = DM.MaDanhMuc
      WHERE SP.SoLuong <= 10
      ORDER BY SP.SoLuong ASC
    `, {});
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/transactions - Hoạt động gần đây
router.get('/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await query(`
      SELECT TOP(@limit)
        LSK.MaGiaoDich,
        LSK.LoaiGiaoDich,
        LSK.SoLuong,
        LSK.SoLuongTruoc,
        LSK.SoLuongSau,
        LSK.LoaiThamChieu,
        LSK.MaThamChieu,
        LSK.GhiChu,
        LSK.NgayGiaoDich,
        SP.TenSanPham,
        SP.HinhAnh,
        TK.TenDangNhap AS NguoiThucHien
      FROM LichSuKho LSK
      LEFT JOIN SanPham SP  ON LSK.MaSanPham     = SP.MaSanPham
      LEFT JOIN TaiKhoan TK ON LSK.NguoiThucHien = TK.MaTaiKhoan
      ORDER BY LSK.NgayGiaoDich DESC
    `, { limit });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/:productId - Chi tiết + lịch sử một sản phẩm
router.get('/:productId', async (req, res) => {
  try {
    const id = parseInt(req.params.productId);

    const product = await queryOne<any>(`
      SELECT
        SP.*,
        DM.TenDanhMuc
      FROM SanPham SP
      LEFT JOIN DanhMuc DM ON SP.MaDanhMuc = DM.MaDanhMuc
      WHERE SP.MaSanPham = @id
    `, { id });

    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

    const history = await query(`
      SELECT TOP 20
        LSK.MaGiaoDich,
        LSK.LoaiGiaoDich,
        LSK.SoLuong,
        LSK.SoLuongTruoc,
        LSK.SoLuongSau,
        LSK.LoaiThamChieu,
        LSK.MaThamChieu,
        LSK.GhiChu,
        LSK.NgayGiaoDich,
        TK.TenDangNhap AS NguoiThucHien
      FROM LichSuKho LSK
      LEFT JOIN TaiKhoan TK ON LSK.NguoiThucHien = TK.MaTaiKhoan
      WHERE LSK.MaSanPham = @id
      ORDER BY LSK.NgayGiaoDich DESC
    `, { id });

    res.json({ success: true, data: { ...product, lichSu: history } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
