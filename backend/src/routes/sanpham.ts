import { Router } from 'express';
import { execute, query, queryOne } from '../config/database';

const router = Router();

// GET all products
router.get('/', async (req, res) => {
  try {
    const { search, maDanhMuc, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let sql = `
      SELECT 
        SanPham.*,
        DanhMuc.TenDanhMuc,
        ROW_NUMBER() OVER (ORDER BY SanPham.MaSanPham DESC) as RowNum
      FROM SanPham
      LEFT JOIN DanhMuc ON SanPham.MaDanhMuc = DanhMuc.MaDanhMuc
      WHERE 1=1
    `;
    const params: any = {};
    
    if (search) {
      sql += ' AND (SanPham.TenSanPham LIKE @search OR SanPham.ThuongHieu LIKE @search)';
      params.search = `%${search}%`;
    }
    if (maDanhMuc) {
      sql += ' AND SanPham.MaDanhMuc = @maDanhMuc';
      params.maDanhMuc = Number(maDanhMuc);
    }
    
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as counted`;
    const total = await queryOne(countSql, params);
    
    sql = `
      SELECT * FROM (${sql}) as temp
      WHERE RowNum > @offset AND RowNum <= @offsetLimit
      ORDER BY RowNum
    `;
    params.offset = offset;
    params.offsetLimit = offset + Number(limit);
    
    const data = await query(sql, params);
    
    res.json({
      success: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: total.total,
        totalPages: Math.ceil(total.total / Number(limit))
      }
    });
  } catch (err: any) {
    console.error('Products API error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET product by ID
router.get('/:id', async (req, res) => {
  try {
    const data = await queryOne(`
      SELECT SanPham.*, DanhMuc.TenDanhMuc
      FROM SanPham
      LEFT JOIN DanhMuc ON SanPham.MaDanhMuc = DanhMuc.MaDanhMuc
      WHERE SanPham.MaSanPham = @id
    `, { id: Number(req.params.id) });
    
    if (!data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }
    
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create product
router.post('/', async (req, res) => {
  try {
    const { TenSanPham, MaDanhMuc, ThuongHieu, GiaNhap, GiaBan, SoLuong, MoTa, HinhAnh } = req.body;
    
    const result = await execute(`
      INSERT INTO SanPham (TenSanPham, MaDanhMuc, ThuongHieu, GiaNhap, GiaBan, SoLuong, MoTa, HinhAnh)
      OUTPUT INSERTED.MaSanPham
      VALUES (@TenSanPham, @MaDanhMuc, @ThuongHieu, @GiaNhap, @GiaBan, @SoLuong, @MoTa, @HinhAnh)
    `, { TenSanPham, MaDanhMuc, ThuongHieu, GiaNhap, GiaBan, SoLuong, MoTa, HinhAnh });
    
    res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm thành công',
      data: { MaSanPham: result.recordset[0].MaSanPham }
    });
  } catch (err: any) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update product
router.put('/:id', async (req, res) => {
  try {
    const { TenSanPham, MaDanhMuc, ThuongHieu, GiaNhap, GiaBan, SoLuong, MoTa, HinhAnh } = req.body;
    
    const result = await execute(`
      UPDATE SanPham
      SET TenSanPham = @TenSanPham,
          MaDanhMuc = @MaDanhMuc,
          ThuongHieu = @ThuongHieu,
          GiaNhap = @GiaNhap,
          GiaBan = @GiaBan,
          SoLuong = @SoLuong,
          MoTa = @MoTa,
          HinhAnh = @HinhAnh
      WHERE MaSanPham = @id
    `, { TenSanPham, MaDanhMuc, ThuongHieu, GiaNhap, GiaBan, SoLuong, MoTa, HinhAnh, id: Number(req.params.id) });
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }
    
    res.json({ success: true, message: 'Cập nhật sản phẩm thành công' });
  } catch (err: any) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    const result = await execute('DELETE FROM SanPham WHERE MaSanPham = @id', { id: Number(req.params.id) });
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }
    
    res.json({ success: true, message: 'Xóa sản phẩm thành công' });
  } catch (err: any) {
    console.error('Delete product error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
