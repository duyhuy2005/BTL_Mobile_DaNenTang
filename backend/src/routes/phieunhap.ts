import { Router } from 'express';
import { query, queryOne, getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/phieunhap
router.get('/', async (_req, res) => {
  try {
    const data = await query(`
      SELECT
        PN.MaPhieuNhap,
        PN.NgayNhap,
        PN.TongTien,
        PN.GhiChu,
        PN.TrangThai,
        PN.NgayTao,
        NCC.TenNCC,
        TK.TenDangNhap AS NguoiTao,
        COUNT(CT.MaChiTiet) AS SoDongCT
      FROM PhieuNhapKho PN
      LEFT JOIN NhaCungCap NCC ON PN.MaNCC       = NCC.MaNCC
      LEFT JOIN TaiKhoan   TK  ON PN.NguoiTao    = TK.MaTaiKhoan
      LEFT JOIN ChiTietPhieuNhap CT ON PN.MaPhieuNhap = CT.MaPhieuNhap
      GROUP BY PN.MaPhieuNhap, PN.NgayNhap, PN.TongTien, PN.GhiChu,
               PN.TrangThai, PN.NgayTao, NCC.TenNCC, TK.TenDangNhap
      ORDER BY PN.NgayTao DESC
    `, {});
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/phieunhap/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const phieu = await queryOne<any>(`
      SELECT PN.*, NCC.TenNCC, TK.TenDangNhap AS NguoiTao
      FROM PhieuNhapKho PN
      LEFT JOIN NhaCungCap NCC ON PN.MaNCC    = NCC.MaNCC
      LEFT JOIN TaiKhoan   TK  ON PN.NguoiTao = TK.MaTaiKhoan
      WHERE PN.MaPhieuNhap = @id
    `, { id });

    if (!phieu) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập' });

    const chiTiet = await query(`
      SELECT CT.*, SP.TenSanPham, SP.HinhAnh, SP.SoLuong AS TonKhoHienTai
      FROM ChiTietPhieuNhap CT
      LEFT JOIN SanPham SP ON CT.MaSanPham = SP.MaSanPham
      WHERE CT.MaPhieuNhap = @id
    `, { id });

    res.json({ success: true, data: { ...phieu, chiTiet } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/phieunhap - Tạo phiếu nhập + cập nhật tồn kho (transaction)
router.post('/', async (req: AuthRequest, res) => {
  if (req.user?.VaiTro !== 'Admin')
    return res.status(403).json({ success: false, message: 'Chỉ Admin mới nhập kho được' });

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { MaNCC, NgayNhap, GhiChu, chiTiet } = req.body;

    if (!chiTiet || !Array.isArray(chiTiet) || chiTiet.length === 0)
      return res.status(400).json({ success: false, message: 'Phiếu nhập phải có ít nhất 1 sản phẩm' });

    // Validate từng dòng
    for (const item of chiTiet) {
      if (!item.MaSanPham || !item.SoLuong || item.SoLuong <= 0)
        return res.status(400).json({ success: false, message: 'Số lượng nhập phải > 0' });
      if (!item.GiaNhap || item.GiaNhap < 0)
        return res.status(400).json({ success: false, message: 'Giá nhập không hợp lệ' });
    }

    await transaction.begin();

    // 1. Tính tổng tiền
    const tongTien = chiTiet.reduce((sum: number, item: any) =>
      sum + (item.SoLuong * item.GiaNhap), 0);

    // 2. Tạo phiếu nhập
    const phieuReq = new sql.Request(transaction);
    phieuReq.input('MaNCC',    sql.Int,          MaNCC || null);
    phieuReq.input('NgayNhap', sql.DateTime,     NgayNhap ? new Date(NgayNhap) : new Date());
    phieuReq.input('TongTien', sql.Decimal(18,2), tongTien);
    phieuReq.input('GhiChu',   sql.NVarChar(500), GhiChu || null);
    phieuReq.input('NguoiTao', sql.Int,          req.user!.MaTaiKhoan);

    const phieuResult = await phieuReq.query(`
      INSERT INTO PhieuNhapKho (MaNCC, NgayNhap, TongTien, GhiChu, NguoiTao)
      OUTPUT INSERTED.MaPhieuNhap
      VALUES (@MaNCC, @NgayNhap, @TongTien, @GhiChu, @NguoiTao)
    `);
    const maPhieuNhap = phieuResult.recordset[0].MaPhieuNhap;

    // 3. Xử lý từng dòng chi tiết
    for (const item of chiTiet) {
      // Lấy tồn kho hiện tại
      const spReq = new sql.Request(transaction);
      spReq.input('maSP', sql.Int, item.MaSanPham);
      const spResult = await spReq.query(`SELECT SoLuong FROM SanPham WHERE MaSanPham = @maSP`);
      if (spResult.recordset.length === 0)
        throw new Error(`Không tìm thấy sản phẩm ID=${item.MaSanPham}`);

      const soLuongTruoc = spResult.recordset[0].SoLuong;
      const soLuongSau   = soLuongTruoc + item.SoLuong;
      const thanhTien    = item.SoLuong * item.GiaNhap;

      // Insert chi tiết phiếu nhập
      const ctReq = new sql.Request(transaction);
      ctReq.input('MaPhieuNhap', sql.Int,          maPhieuNhap);
      ctReq.input('MaSanPham',   sql.Int,          item.MaSanPham);
      ctReq.input('SoLuong',     sql.Int,          item.SoLuong);
      ctReq.input('GiaNhap',     sql.Decimal(18,2), item.GiaNhap);
      ctReq.input('ThanhTien',   sql.Decimal(18,2), thanhTien);
      await ctReq.query(`
        INSERT INTO ChiTietPhieuNhap (MaPhieuNhap, MaSanPham, SoLuong, GiaNhap, ThanhTien)
        VALUES (@MaPhieuNhap, @MaSanPham, @SoLuong, @GiaNhap, @ThanhTien)
      `);

      // Cập nhật tồn kho SanPham
      const updateReq = new sql.Request(transaction);
      updateReq.input('soLuongMoi', sql.Int, soLuongSau);
      updateReq.input('maSP',       sql.Int, item.MaSanPham);
      await updateReq.query(`UPDATE SanPham SET SoLuong = @soLuongMoi WHERE MaSanPham = @maSP`);

      // Ghi lịch sử kho
      const lskReq = new sql.Request(transaction);
      lskReq.input('MaSanPham',     sql.Int,          item.MaSanPham);
      lskReq.input('LoaiGiaoDich',  sql.NVarChar(20),  'IMPORT');
      lskReq.input('SoLuong',       sql.Int,          item.SoLuong);
      lskReq.input('SoLuongTruoc',  sql.Int,          soLuongTruoc);
      lskReq.input('SoLuongSau',    sql.Int,          soLuongSau);
      lskReq.input('LoaiThamChieu', sql.NVarChar(50),  'PhieuNhap');
      lskReq.input('MaThamChieu',   sql.Int,          maPhieuNhap);
      lskReq.input('GhiChu',        sql.NVarChar(500), `Phieu nhap #PN${String(maPhieuNhap).padStart(3,'0')}`);
      lskReq.input('NguoiThucHien', sql.Int,          req.user!.MaTaiKhoan);
      await lskReq.query(`
        INSERT INTO LichSuKho (MaSanPham, LoaiGiaoDich, SoLuong, SoLuongTruoc, SoLuongSau,
                               LoaiThamChieu, MaThamChieu, GhiChu, NguoiThucHien)
        VALUES (@MaSanPham, @LoaiGiaoDich, @SoLuong, @SoLuongTruoc, @SoLuongSau,
                @LoaiThamChieu, @MaThamChieu, @GhiChu, @NguoiThucHien)
      `);
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: `Nhập kho thành công. Phiếu #PN${String(maPhieuNhap).padStart(3,'0')}`,
      data: { MaPhieuNhap: maPhieuNhap }
    });
  } catch (err: any) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
