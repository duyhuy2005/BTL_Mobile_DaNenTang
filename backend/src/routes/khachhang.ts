import { Router } from 'express';
import { execute, query, queryOne } from '../config/database';

const router = Router();

// GET all customers
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClauses = [];
    const params: any = {};
    
    if (search) {
      whereClauses.push('(HoTen LIKE @search OR SoDienThoai LIKE @search OR Email LIKE @search)');
      params.search = `%${search}%`;
    }
    
    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    
    // Count total
    const countSql = `SELECT COUNT(*) as total FROM KhachHang ${whereSQL}`;
    const total = await queryOne(countSql, params);
    
    // Get paginated data with invoice count
    const dataSql = `
      SELECT 
        KhachHang.*,
        (SELECT COUNT(*) FROM HoaDon WHERE HoaDon.MaKhachHang = KhachHang.MaKhachHang) as SoHoaDon
      FROM KhachHang
      ${whereSQL}
      ORDER BY MaKhachHang DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;
    params.offset = offset;
    params.limit = Number(limit);
    
    const data = await query(dataSql, params);
    
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
    console.error('Error in GET /khachhang:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET customer by ID
router.get('/:id', async (req, res) => {
  try {
    const data = await queryOne('SELECT * FROM KhachHang WHERE MaKhachHang = @id', { id: Number(req.params.id) });
    
    if (!data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }
    
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create customer
router.post('/', async (req, res) => {
  try {
    const { MaTaiKhoan, HoTen, SoDienThoai, Email, DiaChi } = req.body;
    
    // Validate Vietnamese mobile phone number
    const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/;
    if (!phoneRegex.test(SoDienThoai)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại di động Việt Nam 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.' 
      });
    }
    
    const result = await execute(`
      INSERT INTO KhachHang (MaTaiKhoan, HoTen, SoDienThoai, Email, DiaChi, TrangThai)
      OUTPUT INSERTED.MaKhachHang
      VALUES (@MaTaiKhoan, @HoTen, @SoDienThoai, @Email, @DiaChi, N'Hoạt động')
    `, { MaTaiKhoan, HoTen, SoDienThoai, Email, DiaChi });
    
    res.status(201).json({
      success: true,
      message: 'Thêm khách hàng thành công',
      data: { MaKhachHang: result.recordset[0].MaKhachHang }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  try {
    const { HoTen, SoDienThoai, Email, DiaChi, TrangThai } = req.body;
    
    // Validate Vietnamese mobile phone number
    const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/;
    if (!phoneRegex.test(SoDienThoai)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại di động Việt Nam 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.' 
      });
    }
    
    const result = await execute(`
      UPDATE KhachHang
      SET HoTen = @HoTen,
          SoDienThoai = @SoDienThoai,
          Email = @Email,
          DiaChi = @DiaChi,
          TrangThai = @TrangThai
      WHERE MaKhachHang = @id
    `, { HoTen, SoDienThoai, Email, DiaChi, TrangThai, id: Number(req.params.id) });
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }
    
    res.json({ success: true, message: 'Cập nhật khách hàng thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE customer
router.delete('/:id', async (req, res) => {
  try {
    const result = await execute('DELETE FROM KhachHang WHERE MaKhachHang = @id', { id: Number(req.params.id) });
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }
    
    res.json({ success: true, message: 'Xóa khách hàng thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
