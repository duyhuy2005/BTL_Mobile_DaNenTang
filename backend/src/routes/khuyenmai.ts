import { Router } from 'express';
import { query, queryOne, execute } from '../config/database';

const router = Router();

// GET all promotions
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: any = { offset, limit };

    if (search) {
      where += ` AND (TenKhuyenMai LIKE @search OR MoTa LIKE @search)`;
      params.search = `%${search}%`;
    }

    // Dùng bảng SanPham.GiaKhuyenMai đang có sẵn — tạo bảng KhuyenMai logic từ sản phẩm
    const data = await query(`
      SELECT
        MaSanPham         AS MaKhuyenMai,
        TenSanPham        AS TenSanPham,
        GiaBan            AS GiaBan,
        GiaKhuyenMai      AS GiaKhuyenMai,
        CASE 
          WHEN GiaBan > 0 AND GiaKhuyenMai IS NOT NULL AND GiaKhuyenMai > 0
          THEN CAST(ROUND((GiaBan - GiaKhuyenMai) * 100.0 / GiaBan, 0) AS INT)
          ELSE 0
        END               AS PhanTramGiam,
        HinhAnh,
        TrangThai
      FROM SanPham
      WHERE GiaKhuyenMai IS NOT NULL AND GiaKhuyenMai > 0
        AND GiaKhuyenMai < GiaBan
      ORDER BY PhanTramGiam DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, { offset, limit });

    const countResult = await queryOne<{ total: number }>(`
      SELECT COUNT(*) as total FROM SanPham
      WHERE GiaKhuyenMai IS NOT NULL AND GiaKhuyenMai > 0 AND GiaKhuyenMai < GiaBan
    `, {});

    res.json({
      success: true,
      data,
      pagination: {
        page, limit,
        total: countResult?.total || 0,
        totalPages: Math.ceil((countResult?.total || 0) / limit)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const total = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM SanPham WHERE GiaKhuyenMai IS NOT NULL AND GiaKhuyenMai > 0 AND GiaKhuyenMai < GiaBan`, {}
    ) || { total: 0 };

    const avgDiscount = await queryOne<{ avg: number }>(
      `SELECT CAST(AVG(CASE WHEN GiaBan > 0 THEN (GiaBan - GiaKhuyenMai) * 100.0 / GiaBan ELSE 0 END) AS INT) as avg
       FROM SanPham WHERE GiaKhuyenMai IS NOT NULL AND GiaKhuyenMai > 0 AND GiaKhuyenMai < GiaBan`, {}
    ) || { avg: 0 };

    const maxDiscount = await queryOne<{ max: number }>(
      `SELECT CAST(MAX((GiaBan - GiaKhuyenMai) * 100.0 / GiaBan) AS INT) as max
       FROM SanPham WHERE GiaKhuyenMai IS NOT NULL AND GiaKhuyenMai > 0 AND GiaKhuyenMai < GiaBan`, {}
    ) || { max: 0 };

    res.json({
      success: true,
      data: {
        tongSanPhamKhuyenMai: total.total,
        giaGiamTrungBinh: avgDiscount.avg,
        giaGiamCaoNhat: maxDiscount.max
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update gia khuyen mai cho san pham
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { GiaKhuyenMai } = req.body;

    const sp = await queryOne<{ MaSanPham: number; GiaBan: number }>(`SELECT MaSanPham, GiaBan FROM SanPham WHERE MaSanPham = @id`, { id });
    if (!sp) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

    if (GiaKhuyenMai !== null && GiaKhuyenMai !== undefined && Number(GiaKhuyenMai) >= sp.GiaBan) {
      return res.status(400).json({ success: false, message: 'Giá khuyến mãi phải nhỏ hơn giá bán' });
    }

    await execute(
      `UPDATE SanPham SET GiaKhuyenMai = @gia WHERE MaSanPham = @id`,
      { gia: GiaKhuyenMai || null, id }
    );

    res.json({ success: true, message: 'Cập nhật giá khuyến mãi thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE (xoa khuyen mai - set GiaKhuyenMai = NULL)
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await execute(`UPDATE SanPham SET GiaKhuyenMai = NULL WHERE MaSanPham = @id`, { id });
    res.json({ success: true, message: 'Đã xóa khuyến mãi cho sản phẩm' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
