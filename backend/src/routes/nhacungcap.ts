import { Router } from 'express';
import { query, queryOne, execute } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/nhacungcap
router.get('/', async (_req, res) => {
  try {
    const data = await query(`
      SELECT
        NCC.MaNCC,
        NCC.TenNCC,
        NCC.SoDienThoai,
        NCC.Email,
        NCC.DiaChi,
        NCC.GhiChu,
        NCC.TrangThai,
        NCC.NgayTao,
        COUNT(PN.MaPhieuNhap)          AS SoPhieuNhap,
        ISNULL(SUM(PN.TongTien), 0)     AS TongTienNhap
      FROM NhaCungCap NCC
      LEFT JOIN PhieuNhapKho PN ON NCC.MaNCC = PN.MaNCC
      GROUP BY NCC.MaNCC, NCC.TenNCC, NCC.SoDienThoai,
               NCC.Email, NCC.DiaChi, NCC.GhiChu, NCC.TrangThai, NCC.NgayTao
      ORDER BY NCC.TrangThai DESC, NCC.TenNCC
    `, {});
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/nhacungcap/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ncc = await queryOne(`SELECT * FROM NhaCungCap WHERE MaNCC = @id`, { id });
    if (!ncc) return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
    res.json({ success: true, data: ncc });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/nhacungcap
router.post('/', async (req: AuthRequest, res) => {
  try {
    if (req.user?.VaiTro !== 'Admin')
      return res.status(403).json({ success: false, message: 'Chỉ Admin mới thực hiện được' });

    const { TenNCC, SoDienThoai, Email, DiaChi, GhiChu } = req.body;
    if (!TenNCC) return res.status(400).json({ success: false, message: 'Tên nhà cung cấp là bắt buộc' });

    const result = await execute(`
      INSERT INTO NhaCungCap (TenNCC, SoDienThoai, Email, DiaChi, GhiChu)
      OUTPUT INSERTED.MaNCC
      VALUES (@TenNCC, @SoDienThoai, @Email, @DiaChi, @GhiChu)
    `, { TenNCC, SoDienThoai: SoDienThoai || null, Email: Email || null, DiaChi: DiaChi || null, GhiChu: GhiChu || null });

    res.status(201).json({ success: true, message: 'Thêm nhà cung cấp thành công', data: { MaNCC: result.recordset[0]?.MaNCC } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/nhacungcap/:id
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    if (req.user?.VaiTro !== 'Admin')
      return res.status(403).json({ success: false, message: 'Chỉ Admin mới thực hiện được' });

    const id = parseInt(req.params.id);
    const { TenNCC, SoDienThoai, Email, DiaChi, GhiChu, TrangThai } = req.body;

    const existing = await queryOne(`SELECT MaNCC FROM NhaCungCap WHERE MaNCC = @id`, { id });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });

    await execute(`
      UPDATE NhaCungCap
      SET TenNCC = @TenNCC, SoDienThoai = @SoDienThoai, Email = @Email,
          DiaChi = @DiaChi, GhiChu = @GhiChu, TrangThai = @TrangThai
      WHERE MaNCC = @id
    `, { TenNCC, SoDienThoai: SoDienThoai || null, Email: Email || null, DiaChi: DiaChi || null, GhiChu: GhiChu || null, TrangThai: TrangThai ?? 1, id });

    res.json({ success: true, message: 'Cập nhật nhà cung cấp thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/nhacungcap/:id (soft delete - ngừng sử dụng)
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    if (req.user?.VaiTro !== 'Admin')
      return res.status(403).json({ success: false, message: 'Chỉ Admin mới thực hiện được' });

    const id = parseInt(req.params.id);
    await execute(`UPDATE NhaCungCap SET TrangThai = 0 WHERE MaNCC = @id`, { id });
    res.json({ success: true, message: 'Đã ngừng sử dụng nhà cung cấp' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
