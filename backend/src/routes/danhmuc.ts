import { Router } from 'express';
import { execute, query, queryOne } from '../config/database';

const router = Router();

// GET all categories
router.get('/', async (req, res) => {
  try {
    const data = await query(`
      SELECT 
        DanhMuc.*,
        (SELECT COUNT(*) FROM SanPham WHERE SanPham.MaDanhMuc = DanhMuc.MaDanhMuc) as SoSanPham
      FROM DanhMuc
      ORDER BY TenDanhMuc
    `);
    
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Error in GET /danhmuc:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET category by ID
router.get('/:id', async (req, res) => {
  try {
    const data = await queryOne('SELECT * FROM DanhMuc WHERE MaDanhMuc = @id', { id: Number(req.params.id) });
    
    if (!data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    }
    
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create category
router.post('/', async (req, res) => {
  try {
    const { TenDanhMuc, MoTa, HinhAnh } = req.body;
    
    const result = await execute(`
      INSERT INTO DanhMuc (TenDanhMuc, MoTa, HinhAnh, TrangThai)
      OUTPUT INSERTED.MaDanhMuc
      VALUES (@TenDanhMuc, @MoTa, @HinhAnh, 1)
    `, { TenDanhMuc, MoTa, HinhAnh });
    
    res.status(201).json({
      success: true,
      message: 'Thêm danh mục thành công',
      data: { MaDanhMuc: result.recordset[0].MaDanhMuc }
    });
  } catch (err: any) {
    console.error('Error in POST /danhmuc:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update category
router.put('/:id', async (req, res) => {
  try {
    let { TenDanhMuc, MoTa, HinhAnh, TrangThai } = req.body;
    
    // Convert TrangThai to bit (0 or 1)
    if (TrangThai === 'Hoạt động' || TrangThai === true || TrangThai === '1') {
      TrangThai = 1;
    } else if (TrangThai === 'Khóa' || TrangThai === false || TrangThai === '0') {
      TrangThai = 0;
    } else {
      TrangThai = 1; // Default to active
    }
    
    const result = await execute(`
      UPDATE DanhMuc
      SET TenDanhMuc = @TenDanhMuc,
          MoTa = @MoTa,
          HinhAnh = @HinhAnh,
          TrangThai = @TrangThai
      WHERE MaDanhMuc = @id
    `, { TenDanhMuc, MoTa, HinhAnh, TrangThai, id: Number(req.params.id) });
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    }
    
    res.json({ success: true, message: 'Cập nhật danh mục thành công' });
  } catch (err: any) {
    console.error('Error in PUT /danhmuc:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE category
router.delete('/:id', async (req, res) => {
  try {
    const result = await execute('DELETE FROM DanhMuc WHERE MaDanhMuc = @id', { id: Number(req.params.id) });
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    }
    
    res.json({ success: true, message: 'Xóa danh mục thành công' });
  } catch (err: any) {
    console.error('Error in DELETE /danhmuc:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
