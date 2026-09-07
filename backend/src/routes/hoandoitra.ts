import { Router } from 'express';
import { execute, query, queryOne, sql, getPool } from '../config/database';

const router = Router();

// GET all return requests with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { search, type, status, startDate, endDate, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let sqlQuery = `
      SELECT 
        HoanDoiTra.*,
        KhachHang.HoTen as TenKhachHang,
        KhachHang.SoDienThoai,
        NhanVien.HoTen as TenNguoiXuLy,
        (SELECT COUNT(*) FROM ChiTietHoanDoiTra WHERE ChiTietHoanDoiTra.MaHoanDoiTra = HoanDoiTra.MaHoanDoiTra) as SoSanPham,
        ROW_NUMBER() OVER (ORDER BY HoanDoiTra.NgayYeuCau DESC) as RowNum
      FROM HoanDoiTra
      LEFT JOIN HoaDon ON HoanDoiTra.MaHoaDon = HoaDon.MaHoaDon
      LEFT JOIN KhachHang ON HoanDoiTra.MaKhachHang = KhachHang.MaKhachHang
      LEFT JOIN NhanVien ON HoanDoiTra.NguoiXuLy = NhanVien.MaNhanVien
      WHERE 1=1
    `;
    const params: any = {};
    
    // Search by invoice code, customer name, product
    if (search) {
      sqlQuery += ` AND (
        CAST(HoaDon.MaHoaDon AS NVARCHAR) LIKE @search 
        OR KhachHang.HoTen LIKE @search 
        OR KhachHang.SoDienThoai LIKE @search
      )`;
      params.search = `%${search}%`;
    }
    
    // Filter by request type
    if (type) {
      sqlQuery += ' AND HoanDoiTra.LoaiYeuCau = @type';
      params.type = type;
    }
    
    // Filter by status
    if (status) {
      sqlQuery += ' AND HoanDoiTra.TrangThai = @status';
      params.status = status;
    }
    
    // Filter by date range
    if (startDate) {
      sqlQuery += ' AND HoanDoiTra.NgayYeuCau >= @startDate';
      params.startDate = startDate;
    }
    if (endDate) {
      sqlQuery += ' AND HoanDoiTra.NgayYeuCau <= @endDate';
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

// GET return request by ID with details
router.get('/:id', async (req, res) => {
  try {
    const returnRequest: any = await queryOne(`
      SELECT 
        HoanDoiTra.*,
        HoaDon.NgayLap,
        KhachHang.HoTen as TenKhachHang,
        KhachHang.SoDienThoai,
        KhachHang.DiaChi,
        NhanVien.HoTen as TenNguoiXuLy
      FROM HoanDoiTra
      LEFT JOIN HoaDon ON HoanDoiTra.MaHoaDon = HoaDon.MaHoaDon
      LEFT JOIN KhachHang ON HoanDoiTra.MaKhachHang = KhachHang.MaKhachHang
      LEFT JOIN NhanVien ON HoanDoiTra.NguoiXuLy = NhanVien.MaNhanVien
      WHERE HoanDoiTra.MaHoanDoiTra = @id
    `, { id: Number(req.params.id) });
    
    if (!returnRequest) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu hoàn/đổi trả' });
    }
    
    // Get return request details
    const chiTiet = await query(`
      SELECT 
        ChiTietHoanDoiTra.*,
        SanPham.TenSanPham,
        SanPham.SoLuong as SoLuongTonKho
      FROM ChiTietHoanDoiTra
      LEFT JOIN SanPham ON ChiTietHoanDoiTra.MaSanPham = SanPham.MaSanPham
      WHERE ChiTietHoanDoiTra.MaHoanDoiTra = @id
    `, { id: Number(req.params.id) });
    
    res.json({
      success: true,
      data: {
        ...returnRequest,
        chiTiet
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create return request
router.post('/', async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    
    const { 
      MaHoaDon, 
      MaKhachHang, 
      LoaiYeuCau, 
      LyDo, 
      MoTaChiTiet, 
      ChiTiet 
    } = req.body;
    
    // Validate required fields
    if (!MaHoaDon || !MaKhachHang || !LoaiYeuCau || !ChiTiet || ChiTiet.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập đầy đủ thông tin bắt buộc' 
      });
    }
    
    // Validate request type
    if (!['Đổi hàng', 'Trả hàng'].includes(LoaiYeuCau)) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Loại yêu cầu không hợp lệ' 
      });
    }
    
    // Create return request
    const requestReq = new sql.Request(transaction);
    requestReq.input('MaHoaDon', sql.Int, MaHoaDon);
    requestReq.input('MaKhachHang', sql.Int, MaKhachHang);
    requestReq.input('LoaiYeuCau', sql.NVarChar, LoaiYeuCau);
    requestReq.input('LyDo', sql.NVarChar, LyDo || null);
    requestReq.input('MoTaChiTiet', sql.NVarChar, MoTaChiTiet || null);
    
    const requestResult = await requestReq.query(`
      INSERT INTO HoanDoiTra (
        MaHoaDon, MaKhachHang, LoaiYeuCau, LyDo, MoTaChiTiet, TrangThai
      )
      OUTPUT INSERTED.MaHoanDoiTra
      VALUES (
        @MaHoaDon, @MaKhachHang, @LoaiYeuCau, @LyDo, @MoTaChiTiet, N'Chờ xử lý'
      )
    `);
    
    const maHoanDoiTra = requestResult.recordset[0].MaHoanDoiTra;
    
    // Insert return request details
    let tongTien = 0;
    for (const item of ChiTiet) {
      // Verify product exists in invoice
      const invoiceDetailReq = new sql.Request(transaction);
      invoiceDetailReq.input('MaHoaDon', sql.Int, MaHoaDon);
      invoiceDetailReq.input('MaSanPham', sql.Int, item.MaSanPham);
      
      const invoiceDetail = await invoiceDetailReq.query(`
        SELECT SoLuong, DonGia 
        FROM ChiTietHoaDon 
        WHERE MaHoaDon = @MaHoaDon AND MaSanPham = @MaSanPham
      `);
      
      if (invoiceDetail.recordset.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false, 
          message: `Sản phẩm không tồn tại trong hóa đơn` 
        });
      }
      
      const maxQuantity = invoiceDetail.recordset[0].SoLuong;
      const donGia = invoiceDetail.recordset[0].DonGia;
      
      if (item.SoLuong > maxQuantity) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false, 
          message: `Số lượng vượt quá số lượng trong hóa đơn` 
        });
      }
      
      const thanhTien = item.SoLuong * donGia;
      tongTien += thanhTien;
      
      const detailReq = new sql.Request(transaction);
      detailReq.input('MaHoanDoiTra', sql.Int, maHoanDoiTra);
      detailReq.input('MaSanPham', sql.Int, item.MaSanPham);
      detailReq.input('SoLuong', sql.Int, item.SoLuong);
      detailReq.input('DonGia', sql.Decimal(18, 2), donGia);
      detailReq.input('ThanhTien', sql.Decimal(18, 2), thanhTien);
      detailReq.input('TrangThaiSanPham', sql.NVarChar, item.TrangThaiSanPham || null);
      
      await detailReq.query(`
        INSERT INTO ChiTietHoanDoiTra (
          MaHoanDoiTra, MaSanPham, SoLuong, DonGia, ThanhTien, TrangThaiSanPham
        )
        VALUES (
          @MaHoanDoiTra, @MaSanPham, @SoLuong, @DonGia, @ThanhTien, @TrangThaiSanPham
        )
      `);
    }
    
    // Update total refund amount
    const updateReq = new sql.Request(transaction);
    updateReq.input('MaHoanDoiTra', sql.Int, maHoanDoiTra);
    updateReq.input('SoTienHoan', sql.Decimal(18, 2), tongTien);
    await updateReq.query('UPDATE HoanDoiTra SET SoTienHoan = @SoTienHoan WHERE MaHoanDoiTra = @MaHoanDoiTra');
    
    await transaction.commit();
    
    res.status(201).json({
      success: true,
      message: 'Tạo yêu cầu hoàn/đổi trả thành công',
      data: { MaHoanDoiTra: maHoanDoiTra }
    });
  } catch (err: any) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT approve return request
router.put('/:id/approve', async (req, res) => {
  try {
    const { NguoiXuLy, GhiChuNguoiXuLy } = req.body;
    
    const result = await execute(`
      UPDATE HoanDoiTra
      SET 
        TrangThai = N'Đã duyệt',
        NgayXuLy = GETDATE(),
        NguoiXuLy = @NguoiXuLy,
        GhiChuNguoiXuLy = @GhiChuNguoiXuLy,
        NgayCapNhat = GETDATE()
      WHERE MaHoanDoiTra = @id AND TrangThai = N'Chờ xử lý'
    `, {
      id: Number(req.params.id),
      NguoiXuLy: NguoiXuLy || null,
      GhiChuNguoiXuLy: GhiChuNguoiXuLy || null
    });
    
    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể duyệt yêu cầu này' 
      });
    }
    
    res.json({ success: true, message: 'Duyệt yêu cầu thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT reject return request
router.put('/:id/reject', async (req, res) => {
  try {
    const { NguoiXuLy, GhiChuNguoiXuLy } = req.body;
    
    const result = await execute(`
      UPDATE HoanDoiTra
      SET 
        TrangThai = N'Từ chối',
        NgayXuLy = GETDATE(),
        NguoiXuLy = @NguoiXuLy,
        GhiChuNguoiXuLy = @GhiChuNguoiXuLy,
        NgayCapNhat = GETDATE()
      WHERE MaHoanDoiTra = @id AND TrangThai = N'Chờ xử lý'
    `, {
      id: Number(req.params.id),
      NguoiXuLy: NguoiXuLy || null,
      GhiChuNguoiXuLy: GhiChuNguoiXuLy || null
    });
    
    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể từ chối yêu cầu này' 
      });
    }
    
    res.json({ success: true, message: 'Từ chối yêu cầu thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT complete return request (update inventory)
router.put('/:id/complete', async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    
    // Get return request info
    const requestReq = new sql.Request(transaction);
    requestReq.input('id', sql.Int, Number(req.params.id));
    const requestResult = await requestReq.query(`
      SELECT * FROM HoanDoiTra WHERE MaHoanDoiTra = @id AND TrangThai = N'Đã duyệt'
    `);
    
    if (requestResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Yêu cầu chưa được duyệt hoặc không tồn tại' 
      });
    }
    
    const returnRequest = requestResult.recordset[0];
    
    // Get return details
    const detailsReq = new sql.Request(transaction);
    detailsReq.input('id', sql.Int, Number(req.params.id));
    const detailsResult = await detailsReq.query(`
      SELECT * FROM ChiTietHoanDoiTra WHERE MaHoanDoiTra = @id
    `);
    
    // Update inventory based on request type
    for (const detail of detailsResult.recordset) {
      if (returnRequest.LoaiYeuCau === 'Trả hàng') {
        // Return: add quantity back to inventory
        const stockReq = new sql.Request(transaction);
        stockReq.input('SoLuong', sql.Int, detail.SoLuong);
        stockReq.input('MaSanPham', sql.Int, detail.MaSanPham);
        await stockReq.query('UPDATE SanPham SET SoLuong = SoLuong + @SoLuong WHERE MaSanPham = @MaSanPham');
      }
      // For 'Đổi hàng', inventory is handled separately when new product is issued
    }
    
    // Update return request status
    const updateReq = new sql.Request(transaction);
    updateReq.input('id', sql.Int, Number(req.params.id));
    await updateReq.query(`
      UPDATE HoanDoiTra 
      SET TrangThai = N'Hoàn tất', NgayCapNhat = GETDATE() 
      WHERE MaHoanDoiTra = @id
    `);
    
    await transaction.commit();
    
    res.json({ 
      success: true, 
      message: 'Hoàn tất xử lý yêu cầu và cập nhật tồn kho thành công' 
    });
  } catch (err: any) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE return request
router.delete('/:id', async (req, res) => {
  try {
    const result = await execute(
      'DELETE FROM HoanDoiTra WHERE MaHoanDoiTra = @id AND TrangThai = N\'Chờ xử lý\'', 
      { id: Number(req.params.id) }
    );
    
    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể xóa yêu cầu đã được xử lý' 
      });
    }
    
    res.json({ success: true, message: 'Xóa yêu cầu hoàn/đổi trả thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET return statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await queryOne(`
      SELECT 
        COUNT(*) as TongYeuCau,
        SUM(CASE WHEN TrangThai = N'Chờ xử lý' THEN 1 ELSE 0 END) as ChoXuLy,
        SUM(CASE WHEN TrangThai = N'Đã duyệt' THEN 1 ELSE 0 END) as DaDuyet,
        SUM(CASE WHEN TrangThai = N'Hoàn tất' THEN 1 ELSE 0 END) as HoanTat,
        SUM(CASE WHEN TrangThai = N'Từ chối' THEN 1 ELSE 0 END) as TuChoi,
        SUM(CASE WHEN LoaiYeuCau = N'Trả hàng' THEN 1 ELSE 0 END) as TraHang,
        SUM(CASE WHEN LoaiYeuCau = N'Đổi hàng' THEN 1 ELSE 0 END) as DoiHang,
        SUM(SoTienHoan) as TongTienHoan
      FROM HoanDoiTra
    `);
    
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET products from a specific invoice (for return form)
router.get('/invoice/:invoiceId/products', async (req, res) => {
  try {
    const products = await query(`
      SELECT 
        ChiTietHoaDon.*,
        SanPham.TenSanPham
      FROM ChiTietHoaDon
      LEFT JOIN SanPham ON ChiTietHoaDon.MaSanPham = SanPham.MaSanPham
      WHERE ChiTietHoaDon.MaHoaDon = @invoiceId
    `, { invoiceId: Number(req.params.invoiceId) });
    
    res.json({ success: true, data: products });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
