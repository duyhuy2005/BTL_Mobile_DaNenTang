import { Router } from 'express';
import { execute, query, queryOne, sql, getPool } from '../config/database';

const router = Router();

// GET all deliveries with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { search, status, startDate, endDate, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let sqlQuery = `
      SELECT 
        GiaoHang.*,
        KhachHang.HoTen as TenKhachHang,
        KhachHang.SoDienThoai as SoDienThoaiKH,
        ROW_NUMBER() OVER (ORDER BY GiaoHang.NgayTao DESC) as RowNum
      FROM GiaoHang
      LEFT JOIN HoaDon ON GiaoHang.MaHoaDon = HoaDon.MaHoaDon
      LEFT JOIN KhachHang ON HoaDon.MaKhachHang = KhachHang.MaKhachHang
      WHERE 1=1
    `;
    const params: any = {};
    
    // Search by invoice code, customer name, phone
    if (search) {
      sqlQuery += ` AND (
        CAST(HoaDon.MaHoaDon AS NVARCHAR) LIKE @search 
        OR KhachHang.HoTen LIKE @search 
        OR KhachHang.SoDienThoai LIKE @search
        OR GiaoHang.SoDienThoai LIKE @search
        OR GiaoHang.MaVanDon LIKE @search
      )`;
      params.search = `%${search}%`;
    }
    
    // Filter by status
    if (status) {
      sqlQuery += ' AND GiaoHang.TrangThai = @status';
      params.status = status;
    }
    
    // Filter by date range
    if (startDate) {
      sqlQuery += ' AND GiaoHang.NgayGiao >= @startDate';
      params.startDate = startDate;
    }
    if (endDate) {
      sqlQuery += ' AND GiaoHang.NgayGiao <= @endDate';
      params.endDate = endDate;
    }
    
    const countSql = `SELECT COUNT(*) as total FROM (${sqlQuery}) as counted`;
    const total = await queryOne(countSql, params);
    
    sqlQuery = `
      SELECT * FROM (${sqlQuery}) as temp
      WHERE RowNum > @offset AND RowNum <= @offsetLimit
      ORDER BY RowNum
    `;
    params.offset = offset;
    params.offsetLimit = offset + Number(limit);
    
    const data = await query(sqlQuery, params);
    
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
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET delivery by ID
router.get('/:id', async (req, res) => {
  try {
    const delivery: any = await queryOne(`
      SELECT 
        GiaoHang.*,
        HoaDon.NgayLap,
        (SELECT SUM(ThanhTien) FROM ChiTietHoaDon WHERE ChiTietHoaDon.MaHoaDon = HoaDon.MaHoaDon) as TongTien,
        KhachHang.HoTen as TenKhachHang,
        KhachHang.SoDienThoai as SoDienThoaiKH,
        KhachHang.DiaChi as DiaChiKH
      FROM GiaoHang
      LEFT JOIN HoaDon ON GiaoHang.MaHoaDon = HoaDon.MaHoaDon
      LEFT JOIN KhachHang ON HoaDon.MaKhachHang = KhachHang.MaKhachHang
      WHERE GiaoHang.MaGiaoHang = @id
    `, { id: Number(req.params.id) });
    
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin giao hàng' });
    }
    
    // Get invoice details
    const chiTiet = await query(`
      SELECT 
        ChiTietHoaDon.*,
        SanPham.TenSanPham
      FROM ChiTietHoaDon
      LEFT JOIN SanPham ON ChiTietHoaDon.MaSanPham = SanPham.MaSanPham
      WHERE ChiTietHoaDon.MaHoaDon = @maHoaDon
    `, { maHoaDon: delivery.MaHoaDon });
    
    res.json({
      success: true,
      data: {
        ...delivery,
        chiTiet
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create delivery
router.post('/', async (req, res) => {
  try {
    const { 
      MaHoaDon, 
      DiaChiGiaoHang, 
      SoDienThoai,
      DonViVanChuyen, 
      MaVanDon, 
      NgayGiao, 
      PhiVanChuyen, 
      GhiChu 
    } = req.body;
    
    // Validate required fields
    if (!MaHoaDon || !DiaChiGiaoHang) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập đầy đủ thông tin bắt buộc' 
      });
    }
    
    // Check if invoice exists
    const invoice = await queryOne('SELECT MaHoaDon FROM HoaDon WHERE MaHoaDon = @id', { id: MaHoaDon });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    }
    
    // Check if delivery already exists for this invoice
    const existingDelivery = await queryOne(
      'SELECT MaGiaoHang FROM GiaoHang WHERE MaHoaDon = @maHoaDon', 
      { maHoaDon: MaHoaDon }
    );
    
    if (existingDelivery) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hóa đơn này đã có thông tin giao hàng' 
      });
    }
    
    const result = await execute(`
      INSERT INTO GiaoHang (
        MaHoaDon, DiaChiGiaoHang, SoDienThoai, DonViVanChuyen, 
        MaVanDon, NgayGiao, PhiVanChuyen, TrangThai, GhiChu
      )
      OUTPUT INSERTED.MaGiaoHang
      VALUES (
        @MaHoaDon, @DiaChiGiaoHang, @SoDienThoai, @DonViVanChuyen,
        @MaVanDon, @NgayGiao, @PhiVanChuyen, N'Chờ giao', @GhiChu
      )
    `, {
      MaHoaDon,
      DiaChiGiaoHang,
      SoDienThoai: SoDienThoai || null,
      DonViVanChuyen: DonViVanChuyen || null,
      MaVanDon: MaVanDon || null,
      NgayGiao: NgayGiao || null,
      PhiVanChuyen: PhiVanChuyen || 0,
      GhiChu: GhiChu || null
    });
    
    const maGiaoHang = result.recordset[0].MaGiaoHang;
    
    res.status(201).json({
      success: true,
      message: 'Tạo thông tin giao hàng thành công',
      data: { MaGiaoHang: maGiaoHang }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update delivery
router.put('/:id', async (req, res) => {
  try {
    const { 
      DiaChiGiaoHang, 
      SoDienThoai,
      DonViVanChuyen, 
      MaVanDon, 
      NgayGiao, 
      PhiVanChuyen, 
      GhiChu 
    } = req.body;
    
    const result = await execute(`
      UPDATE GiaoHang
      SET 
        DiaChiGiaoHang = @DiaChiGiaoHang,
        SoDienThoai = @SoDienThoai,
        DonViVanChuyen = @DonViVanChuyen,
        MaVanDon = @MaVanDon,
        NgayGiao = @NgayGiao,
        PhiVanChuyen = @PhiVanChuyen,
        GhiChu = @GhiChu,
        NgayCapNhat = GETDATE()
      WHERE MaGiaoHang = @id
    `, {
      id: Number(req.params.id),
      DiaChiGiaoHang,
      SoDienThoai: SoDienThoai || null,
      DonViVanChuyen: DonViVanChuyen || null,
      MaVanDon: MaVanDon || null,
      NgayGiao: NgayGiao || null,
      PhiVanChuyen: PhiVanChuyen || 0,
      GhiChu: GhiChu || null
    });
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin giao hàng' });
    }
    
    res.json({ success: true, message: 'Cập nhật thông tin giao hàng thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update delivery status
router.put('/:id/status', async (req, res) => {
  try {
    const { TrangThai, GhiChu } = req.body;
    
    // Validate status
    const validStatuses = ['Chờ giao', 'Đang giao', 'Đã giao', 'Giao thất bại', 'Đã hủy'];
    if (!validStatuses.includes(TrangThai)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Trạng thái không hợp lệ' 
      });
    }
    
    const result = await execute(`
      UPDATE GiaoHang
      SET 
        TrangThai = @TrangThai,
        GhiChu = CASE WHEN @GhiChu IS NOT NULL THEN @GhiChu ELSE GhiChu END,
        NgayCapNhat = GETDATE()
      WHERE MaGiaoHang = @id
    `, {
      id: Number(req.params.id),
      TrangThai,
      GhiChu: GhiChu || null
    });
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin giao hàng' });
    }
    
    res.json({ 
      success: true, 
      message: `Cập nhật trạng thái thành "${TrangThai}" thành công` 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE delivery
router.delete('/:id', async (req, res) => {
  try {
    const result = await execute(
      'DELETE FROM GiaoHang WHERE MaGiaoHang = @id', 
      { id: Number(req.params.id) }
    );
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin giao hàng' });
    }
    
    res.json({ success: true, message: 'Xóa thông tin giao hàng thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET delivery statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await queryOne(`
      SELECT 
        COUNT(*) as TongDonGiao,
        SUM(CASE WHEN TrangThai = N'Chờ giao' THEN 1 ELSE 0 END) as ChoGiao,
        SUM(CASE WHEN TrangThai = N'Đang giao' THEN 1 ELSE 0 END) as DangGiao,
        SUM(CASE WHEN TrangThai = N'Đã giao' THEN 1 ELSE 0 END) as DaGiao,
        SUM(CASE WHEN TrangThai = N'Giao thất bại' THEN 1 ELSE 0 END) as ThatBai,
        SUM(PhiVanChuyen) as TongPhiVanChuyen
      FROM GiaoHang
    `);
    
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
