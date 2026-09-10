import { Router } from 'express';
import { execute, query, queryOne } from '../config/database';

const router = Router();

// GET - Lấy danh sách sản phẩm yêu thích của khách hàng
router.get('/:maKhachHang', async (req, res) => {
  try {
    const { maKhachHang } = req.params;
    
    const data = await query(`
      SELECT 
        yt.MaYeuThich,
        yt.MaKhachHang,
        yt.MaSanPham,
        yt.NgayThem,
        yt.GhiChu,
        sp.TenSanPham,
        sp.GiaBan,
        sp.GiaKhuyenMai,
        sp.HinhAnh,
        sp.ThuongHieu,
        sp.SoLuong,
        sp.TrangThai,
        dm.TenDanhMuc
      FROM SanPhamYeuThich yt
      INNER JOIN SanPham sp ON yt.MaSanPham = sp.MaSanPham
      LEFT JOIN DanhMuc dm ON sp.MaDanhMuc = dm.MaDanhMuc
      WHERE yt.MaKhachHang = @maKhachHang
      ORDER BY yt.NgayThem DESC
    `, { maKhachHang: Number(maKhachHang) });
    
    res.json({
      success: true,
      data,
      total: data.length
    });
  } catch (err: any) {
    console.error('Get favorites error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST - Thêm sản phẩm vào danh sách yêu thích
router.post('/', async (req, res) => {
  try {
    const { MaKhachHang, MaSanPham, GhiChu } = req.body;
    
    // Kiểm tra đã tồn tại chưa
    const existing = await queryOne(`
      SELECT * FROM SanPhamYeuThich 
      WHERE MaKhachHang = @MaKhachHang AND MaSanPham = @MaSanPham
    `, { MaKhachHang, MaSanPham });
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Sản phẩm đã có trong danh sách yêu thích' 
      });
    }
    
    const result = await execute(`
      INSERT INTO SanPhamYeuThich (MaKhachHang, MaSanPham, GhiChu)
      OUTPUT INSERTED.MaYeuThich
      VALUES (@MaKhachHang, @MaSanPham, @GhiChu)
    `, { MaKhachHang, MaSanPham, GhiChu: GhiChu || null });
    
    res.status(201).json({
      success: true,
      message: 'Đã thêm vào danh sách yêu thích',
      data: { MaYeuThich: result.recordset[0].MaYeuThich }
    });
  } catch (err: any) {
    console.error('Add favorite error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE - Xóa sản phẩm khỏi danh sách yêu thích
router.delete('/:maYeuThich', async (req, res) => {
  try {
    const { maYeuThich } = req.params;
    
    const result = await execute(`
      DELETE FROM SanPhamYeuThich WHERE MaYeuThich = @maYeuThich
    `, { maYeuThich: Number(maYeuThich) });
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sản phẩm yêu thích' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Đã xóa khỏi danh sách yêu thích' 
    });
  } catch (err: any) {
    console.error('Delete favorite error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE - Xóa theo MaKhachHang và MaSanPham
router.delete('/:maKhachHang/:maSanPham', async (req, res) => {
  try {
    const { maKhachHang, maSanPham } = req.params;
    
    const result = await execute(`
      DELETE FROM SanPhamYeuThich 
      WHERE MaKhachHang = @maKhachHang AND MaSanPham = @maSanPham
    `, { 
      maKhachHang: Number(maKhachHang), 
      maSanPham: Number(maSanPham) 
    });
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sản phẩm yêu thích' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Đã xóa khỏi danh sách yêu thích' 
    });
  } catch (err: any) {
    console.error('Delete favorite error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET - Kiểm tra sản phẩm có trong danh sách yêu thích không
router.get('/check/:maKhachHang/:maSanPham', async (req, res) => {
  try {
    const { maKhachHang, maSanPham } = req.params;
    
    const existing = await queryOne(`
      SELECT MaYeuThich FROM SanPhamYeuThich 
      WHERE MaKhachHang = @maKhachHang AND MaSanPham = @maSanPham
    `, { 
      maKhachHang: Number(maKhachHang), 
      maSanPham: Number(maSanPham) 
    });
    
    res.json({
      success: true,
      isFavorite: !!existing,
      maYeuThich: existing?.MaYeuThich || null
    });
  } catch (err: any) {
    console.error('Check favorite error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
