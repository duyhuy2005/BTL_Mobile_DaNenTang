import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { execute, getPool, query, queryOne, sql } from '../config/database';

const router = Router();

// GET all invoices
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let sqlQuery = `
      SELECT 
        HoaDon.*,
        KhachHang.HoTen as TenKhachHang,
        KhachHang.SoDienThoai,
        (SELECT SUM(SoLuong * DonGia) FROM ChiTietHoaDon WHERE ChiTietHoaDon.MaHoaDon = HoaDon.MaHoaDon) as TongTien,
        ROW_NUMBER() OVER (ORDER BY NgayLap DESC) as RowNum
      FROM HoaDon
      LEFT JOIN KhachHang ON HoaDon.MaKhachHang = KhachHang.MaKhachHang
      WHERE 1=1
    `;
    const params: any = {};
    
    if (search) {
      sqlQuery += ' AND (KhachHang.HoTen LIKE @search OR KhachHang.SoDienThoai LIKE @search)';
      params.search = `%${search}%`;
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

// GET invoice by ID with details
router.get('/:id', async (req, res) => {
  try {
    const invoice: any = await queryOne(`
      SELECT 
        HoaDon.*,
        KhachHang.HoTen as TenKhachHang,
        KhachHang.SoDienThoai,
        KhachHang.DiaChi,
        NhanVien.HoTen as TenNhanVien,
        (SELECT SUM(ThanhTien) FROM ChiTietHoaDon WHERE ChiTietHoaDon.MaHoaDon = HoaDon.MaHoaDon) as TongTien
      FROM HoaDon
      LEFT JOIN KhachHang ON HoaDon.MaKhachHang = KhachHang.MaKhachHang
      LEFT JOIN NhanVien ON HoaDon.MaNhanVien = NhanVien.MaNhanVien
      WHERE HoaDon.MaHoaDon = @id
    `, { id: Number(req.params.id) });
    
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    }
    
    const details = await query(`
      SELECT 
        ChiTietHoaDon.*,
        SanPham.TenSanPham
      FROM ChiTietHoaDon
      LEFT JOIN SanPham ON ChiTietHoaDon.MaSanPham = SanPham.MaSanPham
      WHERE ChiTietHoaDon.MaHoaDon = @id
    `, { id: Number(req.params.id) });
    
    res.json({
      success: true,
      data: {
        hoaDon: invoice,
        chiTiet: details
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create invoice
router.post('/', async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    
    const { MaKhachHang, MaNhanVien, PhuongThucThanhToan, GhiChu, ChiTiet } = req.body;
    
    const invoiceReq = new sql.Request(transaction);
    invoiceReq.input('MaKhachHang', sql.Int, MaKhachHang);
    invoiceReq.input('MaNhanVien', sql.Int, MaNhanVien);
    invoiceReq.input('PhuongThucThanhToan', sql.NVarChar, PhuongThucThanhToan || 'Tiền mặt');
    invoiceReq.input('TrangThai', sql.NVarChar, 'Đã thanh toán');
    invoiceReq.input('GhiChu', sql.NVarChar, GhiChu);
    
    const invoiceResult = await invoiceReq.query(`
      INSERT INTO HoaDon (MaKhachHang, MaNhanVien, NgayLap, PhuongThucThanhToan, TrangThai, GhiChu)
      OUTPUT INSERTED.MaHoaDon
      VALUES (@MaKhachHang, @MaNhanVien, GETDATE(), @PhuongThucThanhToan, @TrangThai, @GhiChu)
    `);
    
    const maHoaDon = invoiceResult.recordset[0].MaHoaDon;
    
    for (const item of ChiTiet) {
      const detailReq = new sql.Request(transaction);
      detailReq.input('MaHoaDon', sql.Int, maHoaDon);
      detailReq.input('MaSanPham', sql.Int, item.MaSanPham);
      detailReq.input('SoLuong', sql.Int, item.SoLuong);
      detailReq.input('DonGia', sql.Decimal(18, 2), item.DonGia);
      detailReq.input('ThanhTien', sql.Decimal(18, 2), item.SoLuong * item.DonGia);
      
      await detailReq.query(`
        INSERT INTO ChiTietHoaDon (MaHoaDon, MaSanPham, SoLuong, DonGia, ThanhTien)
        VALUES (@MaHoaDon, @MaSanPham, @SoLuong, @DonGia, @ThanhTien)
      `);
      
      const stockReq = new sql.Request(transaction);
      stockReq.input('SoLuong', sql.Int, item.SoLuong);
      stockReq.input('MaSanPham', sql.Int, item.MaSanPham);
      await stockReq.query('UPDATE SanPham SET SoLuong = SoLuong - @SoLuong WHERE MaSanPham = @MaSanPham');
    }
    
    await transaction.commit();
    
    res.status(201).json({
      success: true,
      message: 'Tạo hóa đơn thành công',
      data: { MaHoaDon: maHoaDon }
    });
  } catch (err: any) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET invoice PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice: any = await queryOne(`
      SELECT 
        HoaDon.*,
        KhachHang.HoTen as TenKhachHang,
        KhachHang.SoDienThoai,
        KhachHang.DiaChi
      FROM HoaDon
      LEFT JOIN KhachHang ON HoaDon.MaKhachHang = KhachHang.MaKhachHang
      WHERE HoaDon.MaHoaDon = @id
    `, { id: Number(req.params.id) });
    
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    }
    
    const details: any = await query(`
      SELECT 
        ChiTietHoaDon.*,
        SanPham.TenSanPham
      FROM ChiTietHoaDon
      LEFT JOIN SanPham ON ChiTietHoaDon.MaSanPham = SanPham.MaSanPham
      WHERE ChiTietHoaDon.MaHoaDon = @id
    `, { id: Number(req.params.id) });
    
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=HoaDon_${String(invoice.MaHoaDon).padStart(4, '0')}.pdf`);
    doc.pipe(res);
    
    // Remove Vietnamese accents function
    const removeAccents = (str: string) => {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
    };
    
    doc.fontSize(24).text('BEAUTY STORE', { align: 'center' });
    doc.fontSize(12).text('Cua hang my pham cao cap', { align: 'center' });
    doc.text('Dia chi: 123 Cau Giay, Ha Noi', { align: 'center' });
    doc.text('Dien thoai: 0123-456-789', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(18).text('HOA DON BAN HANG', { align: 'center', underline: true });
    doc.moveDown();
    
    doc.fontSize(11);
    doc.text(`Ngay lap: ${new Date(invoice.NgayLap).toLocaleString('vi-VN')}`);
    doc.text(`Khach hang: ${removeAccents(invoice.TenKhachHang || 'Khach le')}`);
    doc.text(`So dien thoai: ${invoice.SoDienThoai || 'Khong co'}`);
    doc.text(`Dia chi: ${removeAccents(invoice.DiaChi || 'Khong co')}`);
    doc.text(`Phuong thuc thanh toan: ${removeAccents(invoice.PhuongThucThanhToan)}`);
    doc.moveDown();
    
    const tableTop = doc.y;
    const sttX = 50, nameX = 100, qtyX = 350, priceX = 420, totalX = 490;
    
    doc.font('Helvetica-Bold');
    doc.text('STT', sttX, tableTop);
    doc.text('Ten san pham', nameX, tableTop);
    doc.text('SL', qtyX, tableTop);
    doc.text('Don gia', priceX, tableTop);
    doc.text('Thanh tien', totalX, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    doc.font('Helvetica');
    
    let y = tableTop + 25;
    let tongTien = 0;
    
    details.forEach((item: any, idx: number) => {
      doc.text((idx + 1).toString(), sttX, y);
      doc.text(removeAccents(item.TenSanPham), nameX, y, { width: 230 });
      doc.text(item.SoLuong.toString(), qtyX, y);
      doc.text(item.DonGia.toLocaleString('vi-VN'), priceX, y);
      doc.text(item.ThanhTien.toLocaleString('vi-VN'), totalX, y);
      tongTien += item.ThanhTien;
      y += 25;
    });
    
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 15;
    
    doc.font('Helvetica-Bold');
    doc.fontSize(14);
    doc.text('Tong tien:', priceX, y);
    doc.text(tongTien.toLocaleString('vi-VN') + ' d', totalX, y);
    
    doc.moveDown(3);
    doc.fontSize(11).font('Helvetica');
    doc.text('Cam on quy khach va hen gap lai!', { align: 'center' });
    
    doc.end();
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE invoice
router.delete('/:id', async (req, res) => {
  try {
    const result = await execute('DELETE FROM HoaDon WHERE MaHoaDon = @id', { id: Number(req.params.id) });
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    }
    
    res.json({ success: true, message: 'Xóa hóa đơn thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
